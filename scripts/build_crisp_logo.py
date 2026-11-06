import sys
import os
import asyncio
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from playwright.async_api import async_playwright
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

# 1. Load font
font = TTFont("Inter.ttf")
glyph_set = font.getGlyphSet()
hmtx = font["hmtx"]
upm = font["head"].unitsPerEm

def text_to_svg_paths(text, font_size, start_x, baseline_y, letter_spacing_em=0.0):
    scale = font_size / upm
    paths = []
    curr_x = start_x
    cmap = font.getBestCmap()
    
    for char in text:
        code = ord(char)
        glyph_name = cmap.get(code)
        if not glyph_name or glyph_name not in glyph_set:
            glyph_name = ".notdef"
        
        advance_width, lsb = hmtx[glyph_name]
        
        char_pen = SVGPathPen(glyph_set)
        tpen = TransformPen(char_pen, (scale, 0, 0, -scale, curr_x, baseline_y))
        glyph_set[glyph_name].draw(tpen)
        cmd = char_pen.getCommands()
        if cmd.strip():
            paths.append(cmd)
        
        curr_x += (advance_width + letter_spacing_em * upm) * scale
        
    return " ".join(paths), curr_x

title_path, end_x_title = text_to_svg_paths("Thenar", 76.0, 351.5, 131.1, letter_spacing_em=0.045)
tagline_path, end_x_tagline = text_to_svg_paths("“It knows how you open.”", 25.5, 352.5, 193.1, letter_spacing_em=0.015)

# ViewBox dimensions
# Leftmost: Dot 1 at x = 37.0 - 12 = 25.0
# Rightmost: Tagline ends around 670.0
# Topmost: Dot 3 at y = 33.5 - 8.5 = 25.0
# Bottommost: Tagline descenders at y = 202.0
# Total width ~ 675, with padding ~ 700. Height ~ 215, with padding ~ 236.

svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 236" fill="none" width="100%" height="100%">
  <defs>
    <linearGradient id="thenar-dial-grad" x1="65" y1="110" x2="175" y2="165" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f28337" />
      <stop offset="28%" stop-color="#f59e0b" />
      <stop offset="68%" stop-color="#f06f58" />
      <stop offset="100%" stop-color="#ed4f8d" />
    </linearGradient>
  </defs>

  <!-- Dial Emblem -->
  <g id="dial-emblem">
    <!-- Bottom Slate-Blue Arc -->
    <path
      d="M 163.4 177.3 A 58.0 58.0 0 0 1 69.7 131.6"
      stroke="#334155"
      stroke-width="12"
      stroke-linecap="butt"
    />

    <!-- Top Gradient Arc with Rounded Caps -->
    <path
      d="M 69.7 131.6 A 58.0 58.0 0 1 1 163.4 177.3"
      stroke="url(#thenar-dial-grad)"
      stroke-width="12"
      stroke-linecap="round"
    />

    <!-- 5 Constellation Dots (Amber-500) -->
    <circle cx="37.0" cy="158.0" r="12.0" fill="#f59e0b" />
    <circle cx="76.3" cy="43.7" r="8.5" fill="#f59e0b" />
    <circle cx="132.6" cy="33.5" r="8.5" fill="#f59e0b" />
    <circle cx="187.2" cy="53.9" r="8.5" fill="#f59e0b" />
    <circle cx="217.9" cy="101.8" r="8.5" fill="#f59e0b" />
  </g>

  <!-- Typography -->
  <g id="typography">
    <!-- Wordmark "Thenar" -->
    <path d="{title_path}" fill="#f8fafc" />

    <!-- Tagline "“It knows how you open.”" -->
    <path d="{tagline_path}" fill="#94a3b8" />
  </g>
</svg>
"""

# Save svg file
with open("logo.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)

print("Saved logo.svg successfully!")
