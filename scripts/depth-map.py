"""
Depth map for a cover image, used for the parallax effect behind button instruments
(src/components/Player/InstrumentScene.js). Light = near, dark = far.

Runs Depth Anything V2 (small) locally with onnxruntime — no GPU needed:

    python3 -m venv .depthenv
    .depthenv/bin/pip install onnxruntime numpy pillow
    curl -L -o depth-anything-v2-small.onnx \\
        https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
    .depthenv/bin/python scripts/depth-map.py depth-anything-v2-small.onnx cover-image-landscape.webp cover-depth.webp

Then upload cover-depth.webp next to the cover and point `coverDepth` in src/data/instruments.js at it.
"""
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

model, src, out = sys.argv[1:4]

img = Image.open(src).convert('RGB')
W, H = img.size

# The model wants sides that are multiples of 14, normalised like ImageNet
size = 518
x = np.asarray(img.resize((size * W // H // 14 * 14, size), Image.BICUBIC), dtype=np.float32) / 255.0
x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
x = x.transpose(2, 0, 1)[None].astype(np.float32)

session = ort.InferenceSession(model)
depth = session.run(None, {session.get_inputs()[0].name: x})[0][0]
depth = (depth - depth.min()) / (depth.max() - depth.min())

# Half the cover's size is plenty; a slight blur keeps the edges from tearing when shifted
result = Image.fromarray((depth * 255).astype(np.uint8)).resize((W // 2, H // 2), Image.BICUBIC)
result.filter(ImageFilter.GaussianBlur(2)).save(out, quality=85)
print(f'{src} -> {out} ({W // 2}x{H // 2})')
