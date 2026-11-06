import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    for theme in ["light", "dark"]:
        page.goto("http://localhost:5173/#/")
        page.evaluate(f"""() => {{
            if ('{theme}' === 'dark') {{
                document.documentElement.classList.add('dark');
                document.querySelector('.sol-root')?.setAttribute('data-theme', 'dark');
            }} else {{
                document.documentElement.classList.remove('dark');
                document.querySelector('.sol-root')?.setAttribute('data-theme', 'light');
            }}
        }}""")
        page.wait_for_timeout(400)
        
        js = """() => {
            function lum(r, g, b) {
                function ch(c) {
                    c = c / 255.0;
                    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                }
                return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
            }
            function cr(rgb1, rgb2) {
                const l1 = lum(rgb1[0], rgb1[1], rgb1[2]);
                const l2 = lum(rgb2[0], rgb2[1], rgb2[2]);
                return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            }
            function parseRgb(s) {
                if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
                const m_srgb = s.match(/color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)/);
                if (m_srgb) {
                    return [
                        Math.round(parseFloat(m_srgb[1]) * 255),
                        Math.round(parseFloat(m_srgb[2]) * 255),
                        Math.round(parseFloat(m_srgb[3]) * 255),
                        m_srgb[4] !== undefined ? parseFloat(m_srgb[4]) : 1.0
                    ];
                }
                const m = s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
                if (m) {
                    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1.0];
                }
                return null;
            }
            function composite(fg, bg) {
                const a1 = fg[3] !== undefined ? fg[3] : 1.0;
                const a2 = bg[3] !== undefined ? bg[3] : 1.0;
                const a_out = a1 + a2 * (1.0 - a1);
                if (a_out === 0) return [0, 0, 0, 0.0];
                const r = Math.round((fg[0] * a1 + bg[0] * a2 * (1.0 - a1)) / a_out);
                const g = Math.round((fg[1] * a1 + bg[1] * a2 * (1.0 - a1)) / a_out);
                const b = Math.round((fg[2] * a1 + bg[2] * a2 * (1.0 - a1)) / a_out);
                return [r, g, b, a_out];
            }
            function getBg(el) {
                let layers = [];
                let curr = el;
                while (curr && curr !== document.documentElement) {
                    const bgStr = window.getComputedStyle(curr).backgroundColor;
                    const parsed = parseRgb(bgStr);
                    if (parsed && parsed[3] > 0) {
                        layers.unshift(parsed);
                    }
                    curr = curr.parentElement;
                }
                const isDark = document.documentElement.classList.contains('dark');
                let res = isDark ? [17, 17, 17, 1.0] : [239, 239, 237, 1.0];
                for (const l of layers) {
                    res = composite(l, res);
                }
                return res;
            }

            const fails = [];
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
                if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
                const st = window.getComputedStyle(el);
                if (st.visibility === 'hidden' || st.display === 'none') continue;
                let txt = '';
                for (const c of el.childNodes) {
                    if (c.nodeType === Node.TEXT_NODE) txt += c.nodeValue.trim();
                }
                if (txt.length > 0) {
                    const fg = parseRgb(st.color) || [0, 0, 0, 1.0];
                    const bg = getBg(el);
                    const ratio = cr(fg, bg);
                    const isLarge = parseFloat(st.fontSize) >= 24 || (parseFloat(st.fontSize) >= 18.66 && parseInt(st.fontWeight) >= 700);
                    const req = isLarge ? 3.0 : 4.5;
                    if (ratio < req) {
                        fails.push({ text: txt.substring(0, 25), tag: el.tagName, fg: st.color, bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`, ratio: ratio.toFixed(2), req });
                    }
                }
            }
            return fails;
        }"""
        fails = page.evaluate(js)
        print(f"Dashboard [{theme}]: {len(fails)} failures")
        for f in fails[:8]:
            print("  ", f)
    browser.close()
