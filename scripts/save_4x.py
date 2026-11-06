import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

orig = Image.open("text_crop.png")
# Save 4x nearest neighbor of original text
orig.resize((orig.width * 4, orig.height * 4), Image.NEAREST).save("orig_text_4x.png")
print("Saved orig_text_4x.png")
