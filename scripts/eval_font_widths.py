import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

# Let's inspect the font_samples.png and compute the character widths for each row
im = Image.open("font_samples.png").convert("RGBA")
arr = np.array(im)
bg = np.array([11, 14, 20])
diff = np.linalg.norm(arr[:, :, :3].astype(float) - bg, axis=2)

# The samples are on the right side: x > 200
# Let's find rows with text
row_diff = np.max(diff[:, 200:], axis=1)

# Find contiguous row bands
in_band = False
bands = []
start_y = 0
for y, v in enumerate(row_diff):
    if v > 50 and not in_band:
        in_band = True
        start_y = y
    elif v <= 50 and in_band:
        in_band = False
        bands.append((start_y, y - 1))

font_names = [
    "Inter 400", "Inter 500",
    "Roboto 400", "Roboto 500",
    "Segoe UI 400", "Segoe UI 500",
    "Arial 400", "Arial 500",
    "Plus Jakarta Sans 400", "Plus Jakarta Sans 500",
    "Space Grotesk 400", "Space Grotesk 500",
    "Outfit 400", "Outfit 500",
    "Montserrat 400", "Montserrat 500",
    "Poppins 400", "Poppins 500"
]

print(f"Found {len(bands)} bands:")
for i, (sy, ey) in enumerate(bands):
    name = font_names[i] if i < len(font_names) else f"Row {i}"
    # find characters in this band
    sub = diff[sy:ey+1, 200:]
    col_v = np.max(sub, axis=0)
    # find character spans
    c_spans = []
    in_c = False
    sc = 0
    for x, cv in enumerate(col_v):
        if cv > 50 and not in_c:
            in_c = True
            sc = x
        elif cv <= 50 and in_c:
            in_c = False
            c_spans.append((sc, x - 1))
    if in_c:
        c_spans.append((sc, len(col_v) - 1))
    
    widths = [x2 - x1 + 1 for x1, x2 in c_spans]
    print(f"{name:24s}: {len(widths)} chars, widths={widths}")
