import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

# Let's inspect the font test and original text
orig_im = Image.open("text_crop.png").convert("L")
test_im = Image.open("font_test.png").convert("L")

print("Orig text crop size:", orig_im.size)
print("Test image size:", test_im.size)
