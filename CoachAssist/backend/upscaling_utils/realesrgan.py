import subprocess
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

REALSRCAN_DIR = os.path.join(
    BASE_DIR,
    "realesrgan-ncnn-vulkan-windows"
)

REALSRCAN_BIN = os.path.join(
    REALSRCAN_DIR,
    "realesrgan-ncnn-vulkan.exe"
)


def upscale_frames(input_dir: str, output_dir: str, model: str = "realesrgan-x4plus"):
    os.makedirs(output_dir, exist_ok=True)

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

    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)

    if result.returncode != 0:
        raise RuntimeError(f"Real-ESRGAN failed:\n{result.stderr}")

    return output_dir