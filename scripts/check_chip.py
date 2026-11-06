from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://localhost:5173/')
    js = "() => window.getComputedStyle(document.querySelector('.sol-brand span:last-child')).backgroundColor"
    bg = page.evaluate(js)
    color = page.evaluate("() => window.getComputedStyle(document.querySelector('.sol-brand span:last-child')).color")
    print('Computed bg of Owner chip:', bg)
    print('Computed color of Owner chip:', color)
    browser.close()
