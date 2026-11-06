import asyncio
import os
import sys
from playwright.async_api import async_playwright
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

def lum(r, g, b):
    def channel(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

def contrast_ratio(rgb1, rgb2):
    l1 = lum(rgb1[0], rgb1[1], rgb1[2])
    l2 = lum(rgb2[0], rgb2[1], rgb2[2])
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

async def test_button():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for theme in ["light", "dark"]:
            page = await browser.new_page(viewport={"width": 1440, "height": 900})
            await page.goto("http://localhost:5173/#/")
            await page.wait_for_timeout(1000)
            
            # Set theme
            if theme == "dark":
                await page.evaluate("""() => {
                    document.documentElement.classList.add('dark');
                    document.querySelector('.sol-root')?.setAttribute('data-theme', 'dark');
                }""")
            else:
                await page.evaluate("""() => {
                    document.documentElement.classList.remove('dark');
                    document.querySelector('.sol-root')?.setAttribute('data-theme', 'light');
                }""")
            await page.wait_for_timeout(300)
            
            # Click simulate genuine owner button
            sim_btn = page.locator("button:has-text('Simulate Owner Unlock'), button:has-text('محاكاة فتح المالك')")
            if await sim_btn.count() > 0:
                await sim_btn.click()
                print(f"[{theme}] Clicked Simulate Genuine Owner...")
                # Wait for UNLOCKED state or pull door button to appear
                pull_btn = page.locator("button:has-text('Pull door open'), button:has-text('اسحب الباب لفتحه')")
                await pull_btn.wait_for(state="visible", timeout=6000)
                
                # Get computed styles of the button and its icon
                btn_styles = await pull_btn.evaluate("""el => {
                    const comp = window.getComputedStyle(el);
                    const svgComp = window.getComputedStyle(el.querySelector('svg'));
                    const spanComp = window.getComputedStyle(el.querySelector('span'));
                    return {
                        bg: comp.backgroundColor,
                        color: comp.color,
                        svgColor: svgComp.color,
                        spanColor: spanComp.color,
                        border: comp.borderColor
                    };
                }""")
                print(f"[{theme}] Pull Door Button computed styles:", btn_styles)
                
                # Parse RGB
                def parse_rgb(s):
                    import re
                    m = re.search(r'rgba?\((\d+),\s*(\d+),\s*(\d+)', s)
                    return [int(m.group(1)), int(m.group(2)), int(m.group(3))]
                
                bg_rgb = parse_rgb(btn_styles['bg'])
                fg_rgb = parse_rgb(btn_styles['spanColor'])
                cr = contrast_ratio(bg_rgb, fg_rgb)
                print(f"[{theme}] Contrast Ratio: {cr:.2f}:1")
                
                # Take screenshot of the button
                os.makedirs("study/assets/verification", exist_ok=True)
                await pull_btn.screenshot(path=f"study/assets/verification/pull_door_btn_{theme}.png")
                await page.screenshot(path=f"study/assets/verification/dashboard_unlocked_{theme}.png")
            else:
                print(f"[{theme}] Simulate button not found!")
                
            await page.close()
            
        await browser.close()

asyncio.run(test_button())
