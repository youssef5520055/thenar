import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

p = r"C:/Users/laptop.house/.gemini/antigravity/brain/5ee67ec9-084a-47a7-920e-f7098b09656d/.user_uploaded/media_1793966847278_aeb6cf11.png"
im = Image.open(p).convert("RGBA")
arr = np.array(im)

# Let's inspect the vertical projection in x in [460, 785]
text_sub = arr[150:310, 460:785, :3]
bg = np.array([11, 14, 20])
diff = np.linalg.norm(text_sub.astype(float) - bg, axis=2)

v_proj = np.max(diff, axis=1)
for i, d in enumerate(v_proj):
    y = 150 + i
    if d > 15:
        # Check average color of bright pixels on this row
        row_fg = text_sub[i][diff[i] > 15]
        mean_c = np.mean(row_fg, axis=0).astype(int)
        print(f"y={y:3d}: diff={d:5.1f}, count={len(row_fg):3d}, color=rgb({mean_c[0]},{mean_c[1]},{mean_c[2]})")
