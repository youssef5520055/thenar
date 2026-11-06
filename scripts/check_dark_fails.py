import sys
import re

sys.stdout.reconfigure(encoding="utf-8")

# Let's run a quick scan on 1 dark page to inspect what fails in dark
# Or write a small script to check dark mode directly
from playwright.sync_api import sync_playwright

JS_CHECK = """
() => {
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
        const m = s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [0, 0, 0];
    }
    function getBg(el) {
        let curr = el;
        while (curr) {
            const bg = window.getComputedStyle(curr).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return parseRgb(bg);
            curr = curr.parentElement;
        }
        return [17, 17, 17];
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
            const fg = parseRgb(st.color);
            const bg = getBg(el);
            const ratio = cr(fg, bg);
            const isLarge = parseFloat(st.fontSize) >= 24 || (parseFloat(st.fontSize) >= 18.66 && parseInt(st.fontWeight) >= 700);
            const req = isLarge ? 3.0 : 4.5;
            if (ratio < req) {
                fails.push({
                    text: txt.substring(0, 30),
                    tag: el.tagName,
                    fg: st.color,
                    bg: `rgb(${bg.join(',')})`,
                    ratio: ratio.toFixed(2),
                    req
                });
            }
        }
    }
    return fails;
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    for route in ["/", "/#/analytics", "/#/settings"]:
        page.goto(f"http://localhost:5173{route}")
        page.evaluate("""() => {
            document.documentElement.classList.add('dark');
            document.querySelector('.sol-root')?.setAttribute('data-theme', 'dark');
        }""")
        page.wait_for_timeout(500)
        fails = page.evaluate(JS_CHECK)
        print(f"Dark mode {route}: {len(fails)} failures")
        for f in fails[:5]:
            print("  ", f)
    browser.close()
