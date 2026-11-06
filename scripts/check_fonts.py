import os
import sys
import numpy as np
from PIL import Image, ImageFont, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")

# Let's inspect the characters in "Thenar"
# Text starts at x=471
im = Image.open("text_crop.png")
print("Text crop size:", im.size)

# List common system fonts in Windows
fonts_dir = r"C:\Windows\Fonts"
sample_fonts = ["segoeui.ttf", "arial.ttf", "calibri.ttf", "consola.ttf", "trebuc.ttf"]

for f in sample_fonts:
    full = os.path.join(fonts_dir, f)
    if os.path.exists(full):
        print("Found system font:", f)
