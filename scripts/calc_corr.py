import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

orig = np.array(Image.open("text_crop.png").convert("RGB")).astype(float)
test = np.array(Image.open("inter_render_test.png").convert("RGB")).astype(float)

# Compare the title area: y in [10, 80], x in [10, 300]
orig_t = orig[10:80, 10:300]
test_t = test[10:80, 10:300]

# Normalized correlation
orig_norm = orig_t - np.mean(orig_t)
test_norm = test_t - np.mean(test_t)
corr = np.sum(orig_norm * test_norm) / (np.sqrt(np.sum(orig_norm**2)) * np.sqrt(np.sum(test_norm**2)))
print(f"Correlation between Inter rendering and original Thenar text: {corr:.4f}")
