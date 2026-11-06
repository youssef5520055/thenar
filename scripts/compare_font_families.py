import asyncio
from playwright.async_api import async_playwright
from PIL import Image
import numpy as np

fonts = [
    "Inter",
    "Roboto",
    "Segoe UI",
    "Arial",
    "Plus Jakarta Sans",
    "Space Grotesk",
    "Outfit",
    "Montserrat",
    "Poppins"
]

html = f"""
<!DOCTYPE html>
<html>
<head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Montserrat:wght@400;500&family=Outfit:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500&family=Poppins:wght@400;500&family=Roboto:wght@400;500&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
<style>
  body {{
    margin: 0;
    padding: 20px;
    background: #0B0E14;
    color: white;
  }}
  .row {{
    margin-bottom: 20px;
    display: flex;
    align-items: baseline;
    gap: 20px;
  }}
  .name {{
    width: 160px;
    font-family: monospace;
    font-size: 14px;
    color: #94a3b8;
  }}
  .sample {{
    font-size: 58px;
    line-height: 1;
    color: #f8fafc;
  }}
</style>
</head>
<body>
"""

for font in fonts:
    for weight in [400, 500]:
        html += f"""
        <div class="row">
          <div class="name">{font} {weight}</div>
          <div class="sample" style="font-family: '{font}', sans-serif; font-weight: {weight};">Thenar</div>
        </div>
        """

html += "</body></html>"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1000, "height": 1400})
        await page.set_content(html)
        await page.wait_for_timeout(3000)
        await page.screenshot(path="font_samples.png")
        await browser.close()
    print("Saved font_samples.png")

asyncio.run(main())
