import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

im = Image.open("text_crop.png").convert("RGBA")
arr = np.array(im)
bg = np.array([11, 14, 20])
diff = np.linalg.norm(arr[:, :, :3].astype(float) - bg, axis=2)

print("ASCII representation of 'a' (x in [210, 253], y in [25, 75]):")
for y in range(25, 75):
    line = ""
    for x in range(210, 254):
        val = diff[y, x]
        if val < 40:
            line += " "
        elif val < 120:
            line += "."
        elif val < 250:
            line += "o"
        else:
            line += "#"
    if line.strip():
        print(f"{y:2d}: {line}")
