import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

p = r"C:/Users/laptop.house/.gemini/antigravity/brain/5ee67ec9-084a-47a7-920e-f7098b09656d/.user_uploaded/media_1793966847278_aeb6cf11.png"
im = Image.open(p).convert("RGBA")
arr = np.array(im)

print(f"Image size: {im.size}")
sub = arr[:, 450:800, :3]
bright = np.max(sub, axis=2)
print(f"Max brightness in sub: {np.max(bright)}")

# Let's find y coordinates where bright > 150
y_t, x_t = np.where(bright > 150)
if len(y_t) > 0:
    print(f"Bright pixels: y in [{y_t.min()}, {y_t.max()}], x in [{x_t.min() + 450}, {x_t.max() + 450}]")

# Let's inspect the text letters in detail
# Crop text
text_crop = Image.fromarray(arr[150:310, 460:785])
text_crop.save("text_crop.png")
print("Saved text_crop.png")
