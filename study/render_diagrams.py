import os
import sys
import glob
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent
MMD_DIR = BASE_DIR / "diagrams" / "mermaid"
SVG_DIR = BASE_DIR / "diagrams" / "svg"
PNG_DIR = BASE_DIR / "diagrams" / "png"
MERMAID_JS = BASE_DIR / "mermaid.min.js"

SVG_DIR.mkdir(parents=True, exist_ok=True)
PNG_DIR.mkdir(parents=True, exist_ok=True)

mermaid_code = MERMAID_JS.read_text(encoding="utf-8")

html_template = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      margin: 0;
      padding: 24px;
      background: #ffffff;
      display: inline-block;
    }}
    #container {{
      display: inline-block;
      background: #ffffff;
      padding: 16px;
      border-radius: 8px;
    }}
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
{mermaid_code}
  </script>
  <script>
    mermaid.initialize({{
      startOnLoad: false,
      theme: 'base',
      themeVariables: {{
        primaryColor: '#e6f7f5',
        primaryTextColor: '#0d2827',
        primaryBorderColor: '#1aa59a',
        lineColor: '#1aa59a',
        secondaryColor: '#fef7e6',
        tertiaryColor: '#f1f8f7',
        background: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        edgeLabelBackground: '#ffffff',
        actorBorder: '#1aa59a',
        actorBkg: '#e6f7f5',
        actorTextColor: '#0d2827',
        signalColor: '#1aa59a',
        signalTextColor: '#0d2827',
        labelBoxBkgColor: '#e6f7f5',
        labelBoxBorderColor: '#1aa59a',
        labelTextColor: '#0d2827',
        loopTextColor: '#0d2827',
        noteBorderColor: '#e9a23b',
        noteBkgColor: '#fff9e6',
        noteTextColor: '#4a3000'
      }}
    }});

    let counter = 0;
    window.renderMermaid = async function(code) {{
      counter++;
      const id = 'diagram_' + counter;
      try {{
        const {{ svg }} = await mermaid.render(id, code);
        const container = document.getElementById('container');
        container.innerHTML = svg;
        return {{ success: true, svg: svg }};
      }} catch (err) {{
        return {{ success: false, error: err.message || String(err) }};
      }}
    }};
  </script>
</body>
</html>"""

def main():
    mmd_files = sorted(glob.glob(str(MMD_DIR / "*.mmd")))
    print(f"Found {len(mmd_files)} diagrams to render...")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=2)
        page.set_content(html_template)
        page.wait_for_function("typeof window.renderMermaid === 'function'")

        for mmd_path_str in mmd_files:
            mmd_path = Path(mmd_path_str)
            name = mmd_path.stem
            code = mmd_path.read_text(encoding="utf-8")
            
            res = page.evaluate("code => window.renderMermaid(code)", code)
            if not res.get("success"):
                print(f"[ERROR] rendering {name}: {res.get('error')}")
                continue

            svg_content = res.get("svg")
            svg_file = SVG_DIR / f"{name}.svg"
            svg_file.write_text(svg_content, encoding="utf-8")

            # Screenshot container to PNG
            container = page.locator("#container")
            png_file = PNG_DIR / f"{name}.png"
            container.screenshot(path=str(png_file))
            print(f"[OK] Rendered {name} -> SVG & PNG")

        browser.close()

    print("All diagrams rendered successfully!")

if __name__ == "__main__":
    main()
