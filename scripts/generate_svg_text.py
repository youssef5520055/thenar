import sys
import numpy as np
import cv2

sys.stdout.reconfigure(encoding="utf-8")

def contour_to_svg_path(contours, hier, offset_x=450, offset_y=140):
    if len(contours) == 0:
        return ""
    
    path_d = []
    # hier is [Next, Previous, First_Child, Parent]
    for i, cnt in enumerate(contours):
        pts = cnt.reshape(-1, 2)
        if len(pts) < 3:
            continue
        # start path
        d = f"M {pts[0][0] + offset_x} {pts[0][1] + offset_y}"
        for pt in pts[1:]:
            d += f" L {pt[0] + offset_x} {pt[1] + offset_y}"
        d += " Z"
        path_d.append(d)
    return " ".join(path_d)

from PIL import Image

p = r"C:/Users/laptop.house/.gemini/antigravity/brain/5ee67ec9-084a-47a7-920e-f7098b09656d/.user_uploaded/media_1793966847278_aeb6cf11.png"
arr = np.array(Image.open(p).convert("RGBA"))
card_bg = np.array([11, 14, 20])
diff = np.linalg.norm(arr[:, :, :3].astype(float) - card_bg, axis=2)

text_diff = diff[140:310, 450:800]
title_bin = ((text_diff > 90) & (np.arange(170)[:, None] < 90)).astype(np.uint8) * 255
tagline_bin = ((text_diff > 35) & (np.arange(170)[:, None] >= 90)).astype(np.uint8) * 255

contours_t, hier_t = cv2.findContours(title_bin, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
contours_g, hier_g = cv2.findContours(tagline_bin, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)

title_d = contour_to_svg_path(contours_t, hier_t)
tagline_d = contour_to_svg_path(contours_g, hier_g)

print(f"Title path commands length: {len(title_d)}")
print(f"Tagline path commands length: {len(tagline_d)}")
