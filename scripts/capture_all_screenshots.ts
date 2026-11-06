import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = 'http://127.0.0.1:5173';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const THEMES = ['dark', 'light'] as const;
const LANGUAGES = ['en', 'ar'] as const;

async function setupPageContext(
  browser: Browser,
  vp: (typeof VIEWPORTS)[number],
  theme: 'dark' | 'light',
  lang: 'en' | 'ar'
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });

  await context.addInitScript(
    ({ t, l }) => {
      const current = localStorage.getItem('thenar_companion_state_v1');
      const parsed = current ? JSON.parse(current) : {};
      parsed.theme = t;
      parsed.language = l;
      localStorage.setItem('thenar_companion_state_v1', JSON.stringify(parsed));
    },
    { t: theme, l: lang }
  );

  const page = await context.newPage();
  return { context, page };
}

async function captureScreenMatrix(browser: Browser) {
  console.log('--- Starting Complete Screenshot Matrix Capture ---');

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const lang of LANGUAGES) {
        console.log(`\nCapturing [${vp.name}] [${theme}] [${lang}]...`);
        const outDir = path.resolve(process.cwd(), `docs/screenshots/${vp.name}/${theme}/${lang}`);
        fs.mkdirSync(outDir, { recursive: true });

        const { context, page } = await setupPageContext(browser, vp, theme, lang);

        try {
          // 1. Dashboard
          await page.goto(`${BASE_URL}/#/`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(outDir, 'dashboard.png') });

          // 2. Notifications Center
          const notifBtn = page.locator('button[aria-label="Notifications"]').first();
          if (await notifBtn.isVisible()) {
            await notifBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(outDir, 'notifications.png') });
            // Close notif
            await notifBtn.click();
            await page.waitForTimeout(300);
          }

          // 3. Live Session (Mid-session with charts moving)
          await page.goto(`${BASE_URL}/#/live`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
          const playBtn = page.locator('button:has(.lucide-play)').first();
          if (await playBtn.isVisible()) {
            await playBtn.click();
            await page.waitForTimeout(1600);
          }
          await page.screenshot({ path: path.join(outDir, 'live-session.png') });

          const stopBtn = page.locator('button:has(.lucide-square)').first();
          if (await stopBtn.isVisible()) {
            await stopBtn.click();
            await page.waitForTimeout(300);
          }

          // 4. Attempt Log
          await page.goto(`${BASE_URL}/#/log`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(outDir, 'attempt-log.png') });

          // 5. Attempt Detail Drawer + Replay
          // On desktop it's in tbody tr, on mobile it's in card div
          const rowItem = page.locator('tbody tr, div[class*="cursor-pointer"]:has(.lucide-chevron-right)').first();
          if (await rowItem.isVisible()) {
            await rowItem.click();
            await page.waitForTimeout(700);
            await page.screenshot({ path: path.join(outDir, 'attempt-detail.png') });
          }

          // 6. Enrollment Profile (Fresh navigation to clear any modal)
          await page.goto(`${BASE_URL}/#/profile`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(outDir, 'profile.png') });

          // 7. Analytics
          await page.goto(`${BASE_URL}/#/analytics`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(outDir, 'analytics.png') });

          // 8. Attack Simulator
          await page.goto(`${BASE_URL}/#/attack`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(outDir, 'attack-simulator.png') });

          // 9. Settings
          await page.goto(`${BASE_URL}/#/settings`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(outDir, 'settings.png') });
        } finally {
          await context.close();
        }
      }
    }
  }
}

async function captureSpecialStates(browser: Browser) {
  console.log('\n--- Capturing Special States: Hero Orb & Lock States ---');
  const outDir = path.resolve(process.cwd(), 'docs/screenshots/desktop/dark/en');
  fs.mkdirSync(outDir, { recursive: true });

  const { context, page } = await setupPageContext(
    browser,
    VIEWPORTS[0],
    'dark',
    'en'
  );

  try {
    // Reset lockout
    await page.addInitScript(() => {
      const current = localStorage.getItem('thenar_companion_state_v1');
      if (current) {
        const parsed = JSON.parse(current);
        parsed.failureCounter = 0;
        parsed.lockoutEndTime = null;
        parsed.lockState = 'LOCKED';
        localStorage.setItem('thenar_companion_state_v1', JSON.stringify(parsed));
      }
    });

    await page.goto(`${BASE_URL}/#/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 1. Hero Orb
    const orbWrap = page.locator('.sol-orb-wrap, canvas').first();
    if (await orbWrap.isVisible()) {
      await orbWrap.screenshot({ path: path.join(outDir, 'hero-orb.png') });
      console.log('✓ Captured hero-orb.png');
    }

    const lockCard = page.locator('.aspect-\\[16\\/9\\]').first();

    // 2. Lock State: Locked
    if (await lockCard.isVisible()) {
      await lockCard.screenshot({ path: path.join(outDir, 'lock-locked.png') });
      console.log('✓ Captured lock-locked.png');
    }

    // 3. Lock State: Unlocking
    const unlockBtn = page.locator('button:has-text("Simulate Owner Unlock")').first();
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await page.waitForTimeout(800);
      if (await lockCard.isVisible()) {
        await lockCard.screenshot({ path: path.join(outDir, 'lock-unlocking.png') });
        console.log('✓ Captured lock-unlocking.png');
      }

      await page.waitForTimeout(2000);

      // 4. Lock State: Door Open
      const doorOpenBtn = page.locator('button:has-text("Pull Door Open")').first();
      if (await doorOpenBtn.isVisible()) {
        await doorOpenBtn.click();
        await page.waitForTimeout(600);
        await lockCard.screenshot({ path: path.join(outDir, 'lock-door-open.png') });
        console.log('✓ Captured lock-door-open.png');

        const closeDoorBtn = page.locator('button:has-text("Close Door")').first();
        if (await closeDoorBtn.isVisible()) {
          await closeDoorBtn.click();
          await page.waitForTimeout(600);
        }
      }
    }

    // 5. Lock State: Lockout
    console.log('Triggering lockout...');
    await page.goto(`${BASE_URL}/#/attack`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    for (let i = 0; i < 3; i++) {
      const launchBtn = page.locator('button:has-text("Launch Physical Attack Sequence"), button:has-text("Simulate Attack")').first();
      if (await launchBtn.isVisible()) {
        await launchBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    await page.goto(`${BASE_URL}/#/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    if (await lockCard.isVisible()) {
      await lockCard.screenshot({ path: path.join(outDir, 'lock-lockout.png') });
      console.log('✓ Captured lock-lockout.png');
    }
  } finally {
    await context.close();
  }
}

async function copyReadmeAssets() {
  console.log('\n--- Copying Key Assets to docs/readme-assets/ ---');
  const readmeAssetsDir = path.resolve(process.cwd(), 'docs/readme-assets');
  fs.mkdirSync(readmeAssetsDir, { recursive: true });

  const copies: [string, string][] = [
    ['docs/screenshots/desktop/dark/en/dashboard.png', 'hero-dashboard-dark-en.png'],
    ['docs/screenshots/desktop/light/en/dashboard.png', 'hero-dashboard-light-en.png'],
    ['docs/screenshots/desktop/dark/ar/dashboard.png', 'hero-dashboard-dark-ar.png'],
    ['docs/screenshots/desktop/dark/en/live-session.png', 'live-session-dark-en.png'],
    ['docs/screenshots/desktop/dark/en/attempt-log.png', 'attempt-log-dark-en.png'],
    ['docs/screenshots/desktop/dark/en/attempt-detail.png', 'attempt-detail-dark-en.png'],
    ['docs/screenshots/desktop/dark/en/attack-simulator.png', 'attack-simulator-dark-en.png'],
    ['docs/screenshots/desktop/dark/en/analytics.png', 'analytics-dark-en.png'],
    ['docs/screenshots/desktop/dark/en/profile.png', 'profile-dark-en.png'],
    ['docs/screenshots/desktop/dark/en/settings.png', 'settings-dark-en.png'],
    ['docs/media/owner-unlock-flow.gif', 'owner-unlock-flow.gif'],
    ['public/logo.png', 'logo.png'],
    ['public/emblem.svg', 'emblem.svg'],
  ];

  for (const [srcRel, destName] of copies) {
    const src = path.resolve(process.cwd(), srcRel);
    const dest = path.join(readmeAssetsDir, destName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied ${destName}`);
    } else {
      console.warn(`! Not found: ${srcRel}`);
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await captureScreenMatrix(browser);
    await captureSpecialStates(browser);
    await copyReadmeAssets();
    console.log('\n🎉 ALL SCREENSHOTS AND MEDIA UPDATED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal screenshot capture error:', err);
  process.exit(1);
});
