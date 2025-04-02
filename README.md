# Car Number Plate Masker

A web application that detects and masks license plates in car images using YOLOv8.

## Features

- Upload car images
- Automatic license plate detection
- License plate masking
- Download processed images
- Responsive design

## Local Development

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
uvicorn app.main:app --reload
```

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Deployment to Render

1. Create a GitHub repository and push your code

2. Go to [render.com](https://render.com) and sign up

3. Create a new Web Service:
   - Connect your GitHub repository
   - Select the repository
   - Render will automatically detect the `render.yaml` file
   - Click "Create Web Service"

4. Wait for deployment to complete

## Environment Variables

### Backend
- `PYTHON_VERSION`: Python version to use (default: 3.9.0)

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

## Project Structure

```
CarNumberPlateMasker/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── models/
│   │   └── LP-detection.pt
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ImageUploader.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── render.yaml
```

## License

MIT 