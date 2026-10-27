"""
One-Command Hugging Face Spaces Docker Deployment Script for Veritas Backend
============================================================================
Usage:
    export HF_TOKEN="hf_your_write_token"
    python deploy_hf_space.py
"""

import os
import sys
from pathlib import Path
from huggingface_hub import HfApi

SPACE_HEADER = """---
title: Veritas AICTE Pre-Scrutiny API
emoji: ⚖️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Veritas AICTE Pre-Scrutiny, Document Forensics & Infrastructure CV API (SIH26261)
FastAPI + OpenCV + PyMuPDF + pikepdf + pyHanko + ONNXRuntime + supervision + imagehash backend.
"""


def deploy() -> None:
    token = os.environ.get("HF_TOKEN")
    if not token:
        print("ERROR: HF_TOKEN environment variable is required to push to Hugging Face Spaces.")
        print("Run: export HF_TOKEN='hf_...' && ./backend/.venv/bin/python backend/deploy_hf_space.py")
        sys.exit(1)

    api = HfApi(token=token)
    user_info = api.whoami()
    username = user_info["name"]
    repo_id = f"{username}/veritas-aicte-api"

    print(f"Creating/Updating Hugging Face Docker Space: {repo_id} ...")
    api.create_repo(
        repo_id=repo_id,
        repo_type="space",
        space_sdk="docker",
        exist_ok=True,
        private=False,
    )

    backend_dir = Path(__file__).parent
    readme_tmp = backend_dir / "README.md"
    readme_tmp.write_text(SPACE_HEADER, encoding="utf-8")

    try:
        api.upload_folder(
            folder_path=str(backend_dir),
            repo_id=repo_id,
            repo_type="space",
            ignore_patterns=[".venv/**", "__pycache__/**", "*.db", "storage/**"],
            commit_message="Deploy Veritas AICTE FastAPI + OpenCV + PyMuPDF backend",
        )
    finally:
        if readme_tmp.exists():
            readme_tmp.unlink()

    space_host = f"https://{username}-veritas-aicte-api.hf.space"
    print(f"SUCCESS! Backend Space deployed at: {space_host}")
    print(f"Swagger Docs: {space_host}/docs")


if __name__ == "__main__":
    deploy()
