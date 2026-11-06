import sys
import numpy as np
import cv2
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

p = r"C:/Users/laptop.house/.gemini/antigravity/brain/5ee67ec9-084a-47a7-920e-f7098b09656d/.user_uploaded/media_1793966847278_aeb6cf11.png"
im = Image.open(p).convert("RGBA")
arr = np.array(im)

card_bg = np.array([11, 14, 20])
diff = np.linalg.norm(arr[:, :, :3].astype(float) - card_bg, axis=2)

# Text region: x from 450 to 800, y from 140 to 310
text_diff = diff[140:310, 450:800]

# Threshold to separate title and tagline
# Title "Thenar" is bright white (diff > 100)
# Tagline is slate-400 (diff > 35)
title_bin = ((text_diff > 90) & (np.arange(170)[:, None] < 90)).astype(np.uint8) * 255
tagline_bin = ((text_diff > 35) & (np.arange(170)[:, None] >= 90)).astype(np.uint8) * 255

contours_t, hier_t = cv2.findContours(title_bin, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
contours_g, hier_g = cv2.findContours(tagline_bin, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)

print(f"Found {len(contours_t)} contours for Title")
print(f"Found {len(contours_g)} contours for Tagline")
