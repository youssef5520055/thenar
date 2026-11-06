import asyncio
from playwright.async_api import async_playwright
from PIL import Image
import numpy as np

html_content = """
<!DOCTYPE html>
<html>
<head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body {
    margin: 0;
    padding: 40px;
    background: #0B0E14;
    color: white;
  }
  .test-row {
    margin-bottom: 30px;
  }
  .inter-500 {
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 78px;
    letter-spacing: 0.05em;
  }
  .inter-400 {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 78px;
    letter-spacing: 0.05em;
  }
  .tagline-inter {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 26px;
    color: #94a3b8;
  }
</style>
</head>
<body>
  <div class="test-row">
    <div class="inter-400" id="inter400">Thenar</div>
    <div class="tagline-inter" id="tagline">“It knows how you open.”</div>
  </div>
  <div class="test-row">
    <div class="inter-500" id="inter500">Thenar</div>
  </div>
</body>
</html>
"""

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1000, "height": 800})
        await page.set_content(html_content)
        await page.wait_for_timeout(2000) # wait for fonts to load
        await page.screenshot(path="font_test.png")
        await browser.close()
    print("Saved font_test.png")

asyncio.run(run())
