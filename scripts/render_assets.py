import os
import sys
import asyncio
from playwright.async_api import async_playwright
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

# Let's read logo.svg
with open("logo.svg", "r", encoding="utf-8") as f:
    svg_data = f.read()

# Also create emblem-only SVG for favicons/icons
# In logo.svg, emblem fits in viewBox "0 0 260 236"
emblem_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 15 235 205" fill="none" width="100%" height="100%">
  <defs>
    <linearGradient id="thenar-dial-grad" x1="65" y1="110" x2="175" y2="165" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f28337" />
      <stop offset="28%" stop-color="#f59e0b" />
      <stop offset="68%" stop-color="#f06f58" />
      <stop offset="100%" stop-color="#ed4f8d" />
    </linearGradient>
  </defs>

  <g id="dial-emblem">
    <path
      d="M 163.4 177.3 A 58.0 58.0 0 0 1 69.7 131.6"
      stroke="#334155"
      stroke-width="12"
      stroke-linecap="butt"
    />
    <path
      d="M 69.7 131.6 A 58.0 58.0 0 1 1 163.4 177.3"
      stroke="url(#thenar-dial-grad)"
      stroke-width="12"
      stroke-linecap="round"
    />
    <circle cx="37.0" cy="158.0" r="12.0" fill="#f59e0b" />
    <circle cx="76.3" cy="43.7" r="8.5" fill="#f59e0b" />
    <circle cx="132.6" cy="33.5" r="8.5" fill="#f59e0b" />
    <circle cx="187.2" cy="53.9" r="8.5" fill="#f59e0b" />
    <circle cx="217.9" cy="101.8" r="8.5" fill="#f59e0b" />
  </g>
</svg>"""

with open("emblem.svg", "w", encoding="utf-8") as f:
    f.write(emblem_svg)

async def render_rasters():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # 1. Render logo at 4096px width (height = 4096 * 236 / 700 = 1381px)
        w_4k = 4096
        h_4k = int(round(w_4k * 236 / 700))
        page = await browser.new_page(viewport={"width": w_4k, "height": h_4k}, device_scale_factor=1)
        html_4k = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">
        <div style="width:{w_4k}px;height:{h_4k}px;">{svg_data}</div>
        </body></html>"""
        await page.set_content(html_4k)
        await page.screenshot(path="logo-4096.png", omit_background=True)
        print("Rendered logo-4096.png")
        
        # 2. Render emblem at 1024px
        page_emblem = await browser.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=1)
        html_emblem = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;">{emblem_svg}</div>
        </body></html>"""
        await page_emblem.set_content(html_emblem)
        await page_emblem.screenshot(path="emblem-1024.png", omit_background=True)
        print("Rendered emblem-1024.png")

        await browser.close()

asyncio.run(render_rasters())

# Downsample logo using high-quality Lanczos from 4096px
im_4k = Image.open("logo-4096.png")
for w in [2048, 1400, 1024, 700, 512, 256]:
    h = int(round(w * 236 / 700))
    resized = im_4k.resize((w, h), Image.Resampling.LANCZOS)
    if w == 1400:
        resized.save("logo@2x.png")
    elif w == 700:
        resized.save("logo.png")
    else:
        resized.save(f"logo-{w}.png")
    print(f"Generated logo at {w}x{h}")

# Downsample emblem for icons
im_emblem = Image.open("emblem-1024.png")
for s in [512, 192, 180, 48, 32, 16]:
    icon = im_emblem.resize((s, s), Image.Resampling.LANCZOS)
    if s == 512:
        icon.save("icon-512.png")
    elif s == 192:
        icon.save("icon-192.png")
    elif s == 180:
        icon.save("apple-touch-icon-180.png")
    elif s == 32:
        icon.save("favicon-32.png")
        icon.save("favicon.png")
    elif s == 16:
        icon.save("favicon-16.png")

# Multi-resolution ICO
icon_16 = Image.open("favicon-16.png")
icon_32 = Image.open("favicon-32.png")
icon_48 = im_emblem.resize((48, 48), Image.Resampling.LANCZOS)
icon_48.save("favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("Generated multi-resolution favicon.ico")
