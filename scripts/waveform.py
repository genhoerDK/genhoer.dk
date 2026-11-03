"""
Waveform for the timeline player (src/components/Player/interfaces/Timeline.js): the loudness of
a track in `bins` slices, 0–100, as JSON. Needs ffmpeg and numpy.

    python3 scripts/waveform.py https://cdn.genhoer.dk/media/<folder>/<name>.mp3 public/waveforms/<folder>/<name>.json [bins]

The player finds it by convention: cdn.genhoer.dk/media/<folder>/<name>.mp3 →
public/waveforms/<folder>/<name>.json. Without one the timeline just has no waveform.
"""
import json
import subprocess
import sys

import numpy as np

src, out = sys.argv[1:3]
bins = int(sys.argv[3]) if len(sys.argv) > 3 else 400

# Decode to mono 8 kHz floats — plenty for loudness
raw = subprocess.run(
    ['ffmpeg', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'],
    check=True, capture_output=True,
).stdout
samples = np.frombuffer(raw, dtype=np.float32)

# RMS per slice, then a gentle curve so quiet passages still show
rms = np.array([np.sqrt(np.mean(chunk ** 2)) if len(chunk) else 0 for chunk in np.array_split(samples, bins)])
level = (rms / (rms.max() or 1)) ** 0.6

with open(out, 'w') as f:
    json.dump([round(float(v) * 100) for v in level], f, separators=(',', ':'))
print(f'{src} -> {out} ({bins} bins, {len(samples) / 8000:.0f} s)')
