import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent
HTML_FILE = BASE_DIR / "pdf_template.html"
PDF_FILE = BASE_DIR / "Thenar_Study_Guide_AR.pdf"

def main():
    print(f"Compiling PDF from {HTML_FILE}...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(HTML_FILE.as_uri(), wait_until="networkidle")
        
        # Wait for Cairo & Inter fonts
        page.evaluate("document.fonts.ready")
        
        # Small wait for images to render
        page.wait_for_timeout(1500)
        
        print("Generating PDF layout...")
        page.pdf(
            path=str(PDF_FILE),
            format="A4",
            print_background=True,
            margin={
                "top": "16mm",
                "bottom": "16mm",
                "left": "14mm",
                "right": "14mm"
            }
        )
        browser.close()

    size_mb = PDF_FILE.stat().st_size / (1024 * 1024)
    print(f"[OK] PDF compiled successfully: {PDF_FILE} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
