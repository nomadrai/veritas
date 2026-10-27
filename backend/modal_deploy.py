"""
Veritas AICTE Pre-Scrutiny Backend — Modal.com 16 GB RAM Cloud Deployment
=========================================================================
Deploys the complete FastAPI + OpenCV + PyMuPDF + pikepdf + pyHanko + supervision
backend on Modal with 16 GB RAM and persistent volume storage.
"""

from pathlib import Path
import modal

BACKEND_DIR = Path(__file__).parent

# Build the container image with all system C/C++ libraries and Python dependencies
veritas_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1", "libglib2.0-0", "qpdf")
    .pip_install(
        "fastapi[standard]>=0.115.0",
        "uvicorn>=0.30.0",
        "python-multipart>=0.0.9",
        "pymupdf>=1.24.0",
        "pikepdf>=9.0.0",
        "pyhanko>=0.25.0",
        "opencv-python-headless>=4.10.0",
        "pillow>=10.4.0",
        "numpy>=1.26.0",
        "scipy>=1.13.0",
        "imagehash>=4.3.1",
        "PyWavelets>=1.6.0",
        "exifread>=3.0.0",
        "qrcode>=7.4.2",
        "piexif>=1.1.3",
        "pydantic>=2.8.0",
        "onnxruntime>=1.19.0",
        "supervision>=0.24.0",
    )
    .add_local_dir(
        str(BACKEND_DIR),
        remote_path="/root/backend",
        ignore=[".venv", "__pycache__", "*.db", "storage"],
    )
)

app = modal.App("veritas-aicte-api", image=veritas_image)


@app.function(
    memory=16384,  # 16 GB RAM allocated for high-DPI PDF & OpenCV Forensics
    cpu=4.0,       # 4 vCPU cores
    scaledown_window=300,
)
@modal.asgi_app()
def fastapi_app():
    import sys

    sys.path.insert(0, "/root/backend")
    from main import app as veritas_fastapi_app
    from seed_generator import ensure_seeded

    ensure_seeded()
    return veritas_fastapi_app
