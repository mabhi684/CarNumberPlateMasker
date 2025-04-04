import cv2
import os
import uuid
import logging
import numpy as np
import torch
from pathlib import Path
from typing import Tuple, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from ultralytics import YOLO
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Monkey patch for PyTorch compatibility
from ultralytics.nn.tasks import torch_safe_load


def patched_load(file):
    return torch.load(file, map_location='cpu', weights_only=False)


torch_safe_load = patched_load

# Initialize logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI App
app = FastAPI(
    title="Car Number Plate Masker",
    description="API for masking license plates in car images",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://carnumberplatemasker.onrender.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Path Configuration
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
STATIC_DIR = BASE_DIR / "static"

UPLOAD_FOLDER = STATIC_DIR / "uploads"
OUTPUT_FOLDER = STATIC_DIR / "output"
LP_MODEL_PATH = MODEL_DIR / "LP-detection.pt"
CAR_MODEL_PATH = MODEL_DIR / "yolov8m.pt"

TARGET_SIZE = (1024, 576)
LICENSE_PLATE_CLASS_ID = 0
CAR_CLASS_IDS = [2, 5, 7]

# Create directories
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

# Model Loading with Validation
try:
    logger.info("Initializing models...")
    assert LP_MODEL_PATH.exists(), "License plate model file missing"
    assert CAR_MODEL_PATH.exists(), "Vehicle detection model file missing"

    model_lp = YOLO(str(LP_MODEL_PATH))
    model_car = YOLO(str(CAR_MODEL_PATH))

    logger.info("Models loaded successfully")
except Exception as e:
    logger.error(f"Model initialization failed: {str(e)}")
    raise RuntimeError("Failed to initialize models") from e

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Serve frontend static files
app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="frontend")

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


class ImageProcessor:
    @staticmethod
    def get_car_bbox(image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect largest vehicle in the image"""
        try:
            results = model_car(image)
            car_boxes = []

            for result in results:
                for box in result.boxes:
                    cls = int(box.cls[0])
                    if cls in CAR_CLASS_IDS:
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        car_boxes.append((x1, y1, x2, y2))

            return max(car_boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1])) if car_boxes else None

        except Exception as e:
            logger.error(f"Vehicle detection failed: {str(e)}")
            return None

    @staticmethod
    def mask_license_plates(image: np.ndarray) -> np.ndarray:
        """Original license plate masking logic"""
        results = model_lp(image)
        for result in results:
            for box in result.boxes:
                if int(box.cls[0]) == LICENSE_PLATE_CLASS_ID:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    image[y1:y2, x1:x2] = (255, 255, 255)
        return image

    @staticmethod
    def resize_to_aspect_ratio(image: np.ndarray, car_box: Optional[Tuple[int, int, int, int]] = None) -> np.ndarray:
        """
        Preserved original resizing logic with car detection enhancement
        Maintains 16:9 aspect ratio using center crop or car-centered crop
        """
        h, w = image.shape[:2]
        target_width, target_height = TARGET_SIZE
        target_aspect = target_width / target_height
        current_aspect = w / h

        # Calculate crop dimensions
        if current_aspect > target_aspect:
            new_w = int(h * target_aspect)
            new_h = h
        else:
            new_h = int(w / target_aspect)
            new_w = w

        # Calculate crop coordinates
        if car_box:
            # Center crop around detected car
            x1_car, y1_car, x2_car, y2_car = car_box
            center_x = (x1_car + x2_car) // 2
            center_y = (y1_car + y2_car) // 2

            x1 = max(0, center_x - new_w // 2)
            y1 = max(0, center_y - new_h // 2)
            x1 = min(x1, w - new_w)
            y1 = min(y1, h - new_h)
        else:
            # Original center crop
            x1 = (w - new_w) // 2
            y1 = (h - new_h) // 2

        x2 = x1 + new_w
        y2 = y1 + new_h

        cropped = image[y1:y2, x1:x2]
        return cv2.resize(cropped, TARGET_SIZE, interpolation=cv2.INTER_AREA)


def process_image(image_path: str) -> str:
    """Image processing pipeline"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Invalid image file")

        # Detect vehicle
        car_box = ImageProcessor.get_car_bbox(img)

        # Process image
        masked_img = ImageProcessor.mask_license_plates(img)
        final_img = ImageProcessor.resize_to_aspect_ratio(masked_img, car_box)

        # Save result
        output_path = OUTPUT_FOLDER / Path(image_path).name
        cv2.imwrite(str(output_path), final_img)
        return str(output_path)

    except Exception as e:
        logger.error(f"Processing failed for {image_path}: {str(e)}")
        raise


# API Endpoints (remain unchanged)
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    try:
        file_ext = Path(file.filename).suffix
        unique_name = f"{uuid.uuid4()}{file_ext}"
        save_path = UPLOAD_FOLDER / unique_name

        with open(save_path, "wb") as f:
            content = await file.read()
            f.write(content)

        output_path = process_image(str(save_path))
        return JSONResponse({
            "message": "Success",
            "image_url": f"/static/output/{Path(output_path).name}"
        })

    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Processing error: {str(e)}"}
        )


@app.get("/output/{filename}")
async def get_processed_image(filename: str):
    file_path = OUTPUT_FOLDER / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))