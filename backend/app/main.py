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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get port from environment variable with fallback
PORT = int(os.environ.get("PORT", 8000))

# Initialize FastAPI App
app = FastAPI(
    title="Car Number Plate Masker",
    description="API for masking license plates in car images",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get base directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Configuration
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "static", "output")
MODELS_DIR = os.path.join(BASE_DIR, "models")
TARGET_SIZE = (1024, 576)
LICENSE_PLATE_CLASS_ID = 0
CAR_CLASS_IDS = [2, 5, 7]

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

print(f"Current working directory: {os.getcwd()}")
print(f"BASE_DIR: {BASE_DIR}")
print(f"MODELS_DIR: {MODELS_DIR}")
print(f"Files in MODELS_DIR: {os.listdir(MODELS_DIR) if os.path.exists(MODELS_DIR) else 'Directory not found'}")

try:
    # Load Models with absolute paths
    model_lp = YOLO('backend/models/license_plate.pt')
    # model_lp = YOLO(os.path.join(, 'license_plate.pt'))
    # model_car = YOLO(os.path.join(MODELS_DIR, 'yolov8n.pt'))
    model_car = YOLO('backend/models/car.pt')
except Exception as e:
    print(f"Error loading models: {str(e)}")
    print(f"Current directory contents: {os.listdir('.')}")
    raise

# Mount static files with absolute path
static_path = os.path.join(BASE_DIR, "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")
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
    try:
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)

        # Save uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Process image
        output_path = process_image(file_path)
        output_filename = os.path.basename(output_path)

        return JSONResponse({
            "message": "Image processed successfully",
            "image_url": f"/static/output/{output_filename}"
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Error processing image: {str(e)}"}
        )


@app.get("/output/{filename}")
async def get_processed_image(filename: str):
    return FileResponse(os.path.join(OUTPUT_FOLDER, filename))


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)