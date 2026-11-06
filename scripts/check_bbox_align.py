import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

orig = np.array(Image.open("text_crop.png").convert("RGB"))
test = np.array(Image.open("inter_render_test.png").convert("RGB"))
bg = np.array([11, 14, 20])

diff_o = np.linalg.norm(orig.astype(float) - bg, axis=2) > 30
diff_t = np.linalg.norm(test.astype(float) - bg, axis=2) > 30

yo, xo = np.where(diff_o[:80, :])
yt, xt = np.where(diff_t[:80, :])

print(f"Orig title bbox: y in [{yo.min()}, {yo.max()}], x in [{xo.min()}, {xo.max()}]")
print(f"Test title bbox: y in [{yt.min()}, {yt.max()}], x in [{xt.min()}, {xt.max()}]")
