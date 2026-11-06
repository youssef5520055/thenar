import sys
import numpy as np
from PIL import Image, ImageFont, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")

# Let's inspect the original image text
orig_im = Image.open("text_crop.png")
w, h = orig_im.size

# Let's create an image to render with Inter.ttf
test_im = Image.new("RGBA", (w, h), (11, 14, 20, 255))
draw = ImageDraw.Draw(test_im)

# Let's test font sizes
# Earlier we found Thenar cap height in orig is ~56px.
# In Inter, size 76 gives cap height ~56px.
font_title = ImageFont.truetype("Inter.ttf", 76)
font_tagline = ImageFont.truetype("Inter.ttf", 25)

# In original, Thenar is at x ~ 11, y ~ 7 relative to text_crop (which started at x=460, y=150)
draw.text((11, 7), "Thenar", fill=(248, 250, 252, 255), font=font_title)
draw.text((11, 115), "“It knows how you open.”", fill=(148, 163, 184, 255), font=font_tagline)

test_im.save("inter_render_test.png")
print("Saved inter_render_test.png")
