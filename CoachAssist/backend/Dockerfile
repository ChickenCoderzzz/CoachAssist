FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies if required (e.g., for OpenCV or other C-extensions)
# RUN apt-get update && apt-get install -y gcc libgl1-mesa-glx libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the current directory contents (including backend folder)
COPY . .

# IMPORTANT: Ensure uvicorn runs from the /app directory so `backend.main:app` can resolve correctly
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
