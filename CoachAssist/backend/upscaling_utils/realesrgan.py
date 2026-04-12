import subprocess
import os
import platform

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
SYSTEM = platform.system().lower()

if SYSTEM == "windows":
    REALSRCAN_DIR = os.path.join(BASE_DIR, "realesrgan-windows")
    REALSRCAN_BIN = os.path.join(REALSRCAN_DIR, "realesrgan-ncnn-vulkan.exe")

elif SYSTEM == "darwin":  # macOS
    REALSRCAN_DIR = os.path.join(BASE_DIR, "realesrgan-macos")
    REALSRCAN_BIN = os.path.join(REALSRCAN_DIR, "realesrgan-ncnn-vulkan")

elif SYSTEM == "linux":
    REALSRCAN_DIR = os.path.join(BASE_DIR, "realesrgan-linux")
    REALSRCAN_BIN = os.path.join(REALSRCAN_DIR, "realesrgan-ncnn-vulkan")

else:
    raise RuntimeError(f"Unsupported OS: {SYSTEM}")




def upscale_frames(input_dir: str, output_dir: str, model: str = "realesrgan-x4plus"):
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(REALSRCAN_BIN):
        raise RuntimeError(f"Real-ESRGAN binary not found: {REALSRCAN_BIN}")

    cmd = [
        REALSRCAN_BIN,
        "-i", input_dir,
        "-o", output_dir,
        "-n", model,
        "-m", os.path.join(REALSRCAN_DIR, "models")
    ]

    print("Running command:", " ".join(cmd))

    result = subprocess.run(
        cmd,
        cwd=REALSRCAN_DIR,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"Real-ESRGAN failed:\n{result.stderr}")

    return output_dir