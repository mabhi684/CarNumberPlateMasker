import cv2
import os
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from ultralytics import YOLO
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from typing import Tuple, Optional
import shutil
import uuid

# Initialize FastAPI App
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
model_lp = YOLO('models/LP-detection.pt')  # License plate detection
# model_car = YOLO('yolov8n.pt')  # Car detection (COCO pretrained)
model_car = YOLO('models/LP-detection.pt')  # Car detection (COCO pretrained)

# Configuration
UPLOAD_FOLDER = "static/uploads/"
OUTPUT_FOLDER = "static/output/"
TARGET_SIZE = (1024, 576)
LICENSE_PLATE_CLASS_ID = 0  # Adjust based on your LP model
CAR_CLASS_IDS = [2, 5, 7]  # COCO classes: car, bus, truck

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class ImageProcessor:
    @staticmethod
    def get_car_bbox(image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect largest vehicle in the image
        Returns (x1, y1, x2, y2) or None
        """
        results = model_car(image)
        car_boxes = []

        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                if cls in CAR_CLASS_IDS:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    car_boxes.append((x1, y1, x2, y2))

        return max(car_boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1])) if car_boxes else None

    @staticmethod
    def mask_license_plates(image: np.ndarray) -> np.ndarray:
        """
        Detect and mask license plates with white rectangles
        """
        results = model_lp(image)
        for result in results:
            for box in result.boxes:
                if int(box.cls[0]) == LICENSE_PLATE_CLASS_ID:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    image[y1:y2, x1:x2] = (255, 255, 255)  # White mask
        return image

    @staticmethod
    def smart_crop_resize(image: np.ndarray, car_box: Optional[Tuple[int, int, int, int]] = None) -> np.ndarray:
        """
        Crop image around detected car (or center) and resize to target dimensions
        """
        h, w = image.shape[:2]
        target_width, target_height = TARGET_SIZE
        target_aspect = target_width / target_height
        current_aspect = w / h

        # Calculate new crop dimensions
        if current_aspect > target_aspect:
            new_w = int(h * target_aspect)
            new_h = h
        else:
            new_h = int(w / target_aspect)
            new_w = w

        # Determine crop coordinates
        if car_box:
            x1_car, y1_car, x2_car, y2_car = car_box
            center_x = (x1_car + x2_car) // 2
            center_y = (y1_car + y2_car) // 2

            x1 = max(0, center_x - new_w // 2)
            y1 = max(0, center_y - new_h // 2)
            x1 = min(x1, w - new_w)
            y1 = min(y1, h - new_h)
        else:
            x1 = (w - new_w) // 2
            y1 = (h - new_h) // 2

        x2 = x1 + new_w
        y2 = y1 + new_h

        cropped = image[y1:y2, x1:x2]
        return cv2.resize(cropped, TARGET_SIZE, interpolation=cv2.INTER_AREA)


def process_image(image_path: str) -> str:
    """
    Full processing pipeline:
    1. Detect car position
    2. Mask license plates
    3. Crop around car
    4. Resize to target dimensions
    """
    img = cv2.imread(image_path)

    # Detect car before masking to avoid interference
    car_box = ImageProcessor.get_car_bbox(img)

    # Process image
    masked_img = ImageProcessor.mask_license_plates(img)
    final_img = ImageProcessor.smart_crop_resize(masked_img, car_box)

    # Save result
    output_path = os.path.join(OUTPUT_FOLDER, os.path.basename(image_path))
    cv2.imwrite(output_path, final_img)
    return output_path


# API Endpoints
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    # Save uploaded file
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Process image
    output_path = process_image(file_path)

    return {
        "message": "Image processed successfully",
        "image_url": f"/static/output/{file.filename}"
    }


@app.get("/output/{filename}")
async def get_processed_image(filename: str):
    return FileResponse(os.path.join(OUTPUT_FOLDER, filename))