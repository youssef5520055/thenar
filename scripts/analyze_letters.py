import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

im = Image.open("text_crop.png").convert("RGBA")
arr = np.array(im)
bg = np.array([11, 14, 20])
diff = np.linalg.norm(arr[:, :, :3].astype(float) - bg, axis=2)

# Title is in row 10 to 80
title = diff[10:80, :]
col_prof = np.max(title, axis=0)

# Print columns where title is present
in_char = False
start_col = 0
chars = []
for col, val in enumerate(col_prof):
    if val > 50 and not in_char:
        in_char = True
        start_col = col
    elif val <= 50 and in_char:
        in_char = False
        chars.append((start_col, col - 1))

if in_char:
    chars.append((start_col, len(col_prof) - 1))

letters = ["T", "h", "e", "n", "a", "r"]
print(f"Found {len(chars)} letter segments for title:")
for i, (sc, ec) in enumerate(chars):
    let = letters[i] if i < len(letters) else "?"
    w = ec - sc + 1
    # Find vertical extent for this letter
    char_sub = title[:, sc:ec+1]
    y_idx, _ = np.where(char_sub > 50)
    h = y_idx.max() - y_idx.min() + 1
    print(f"  Letter '{let}': x_rel in [{sc:3d}, {ec:3d}] (w={w:2d}), y_rel in [{y_idx.min():2d}, {y_idx.max():2d}] (h={h:2d})")
