"""
Depth map for a cover image, used for the parallax effect behind button instruments
(src/components/Player/InstrumentScene.js). Light = near, dark = far.

Runs Depth Anything V2 (small) locally with onnxruntime — no GPU needed:

    python3 -m venv .depthenv
    .depthenv/bin/pip install onnxruntime numpy pillow
    curl -L -o depth-anything-v2-small.onnx \\
        https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
    .depthenv/bin/python scripts/depth-map.py depth-anything-v2-small.onnx cover-image-landscape.webp cover-depth.webp [thin] [far]

thin (default 11): near things narrower than this many pixels across (in the half-size map) are
removed from the depth map, so they move with what is behind them. A thin pole would otherwise be
torn away from its background. Measure what you want gone and what must stay — on the Esterhøj
cover the pole is 8–9 px and the people 11–13 px. 0 keeps everything.

far (default 0.28, 0–1): everything further away than this is treated as one far layer that moves
as a whole. Set it at the depth of the horizon (on Esterhøj, the ridge of the hill is ~0.25), so
the sky and the horizon don't move against each other — a pole or a person crossing the horizon
would otherwise kink there. 0 keeps the full depth.

Then upload cover-depth.webp next to the cover and point `coverDepth` in src/data/instruments.js at it.
"""
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

model, src, out = sys.argv[1:4]
thin = int(sys.argv[4]) if len(sys.argv) > 4 else 11
far = float(sys.argv[5]) if len(sys.argv) > 5 else 0.28

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
depth = np.clip((depth - far) / (1 - far), 0, 1)

# Half the cover's size is plenty; a slight blur keeps the edges from tearing when shifted
result = Image.fromarray((depth * 255).astype(np.uint8)).resize((W // 2, H // 2), Image.BICUBIC)

# Horizontal opening (min, then max over `thin` pixels across): bright = near, so this erases near
# things narrower than `thin` while wider ones — and anything tall but wide — keep their shape
if thin:
    a = np.asarray(result).astype(np.uint8)
    pad = thin // 2
    window = lambda x, f: f(np.lib.stride_tricks.sliding_window_view(np.pad(x, ((0, 0), (pad, pad)), mode='edge'), thin, axis=1), axis=2)
    result = Image.fromarray(window(window(a, np.min), np.max).astype(np.uint8))

result.filter(ImageFilter.GaussianBlur(3)).save(out, quality=85)
print(f'{src} -> {out} ({W // 2}x{H // 2})')
