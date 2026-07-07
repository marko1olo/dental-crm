const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'docs', 'proofs', 'ui_audit', 'radial_menu');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function testRadialMenu(theme, isMobile) {
  const device = isMobile ? devices['iPhone 12'] : { viewport: { width: 1440, height: 900 } };
  const prefix = isMobile ? 'mobile' : 'pc';
  const name = `radial_${prefix}_${theme}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...device, colorScheme: theme });
  const page = await context.newPage();
  page.on('console', msg => console.log(msg.text()));

  console.log(`\nRunning ${name}...`);

  try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.location.hash = '#/odontogram'; });
    await page.waitForTimeout(2500);

    // Set theme
    if (theme === 'dark') {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.body.setAttribute('data-theme', 'dark');
      });
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.body.setAttribute('data-theme', 'light');
      });
    }

    await page.waitForTimeout(1500);

    // Screenshot before click - whole odontogram section
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}_before.png`), fullPage: true });
    console.log(`  Saved ${name}_before.png`);

    // Find first tooth wrapper and click it
    const tooth = await page.locator('.tooth-svg-wrapper').first();
    const toothBox = await tooth.boundingBox();
    
    if (!toothBox) {
      console.log(`  ERROR: tooth not found`);
      return;
    }

    console.log(`  Clicking tooth at x=${toothBox.x + toothBox.width/2}, y=${toothBox.y + toothBox.height/2}`);
    await tooth.click();
    await page.waitForTimeout(800);

    // Screenshot with menu open
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}_menu_open.png`), fullPage: true });
    console.log(`  Saved ${name}_menu_open.png`);

    // Check if radial menu appeared
    const menu = await page.locator('.tooth-radial-menu').first();
    const menuVisible = await menu.isVisible().catch(() => false);
    console.log(`  Radial menu visible: ${menuVisible}`);

    if (menuVisible) {
      const menuBox = await menu.boundingBox();
      console.log(`  Menu position: x=${menuBox?.x?.toFixed(0)}, y=${menuBox?.y?.toFixed(0)}, w=${menuBox?.width?.toFixed(0)}, h=${menuBox?.height?.toFixed(0)}`);
      
      // Check if menu is within viewport
      const vw = await page.evaluate(() => window.innerWidth);
      const vh = await page.evaluate(() => window.innerHeight);
      const overflowRight = menuBox ? (menuBox.x + menuBox.width) > vw : null;
      const overflowBottom = menuBox ? (menuBox.y + menuBox.height) > vh : null;
      console.log(`  Viewport: ${vw}x${vh} | Overflow right: ${overflowRight} | Overflow bottom: ${overflowBottom}`);

      // Count menu buttons
      const buttons = await page.locator('.tooth-menu-btn').count();
      console.log(`  Menu buttons count: ${buttons}`);

      // Try clicking a button (Caries)
      const cariesBtn = await page.locator('.tooth-menu-btn.caries').first();
      const cariesVisible = await cariesBtn.isVisible().catch(() => false);
      if (cariesVisible) {
        await cariesBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}_after_caries.png`), fullPage: true });
        console.log(`  Saved ${name}_after_caries.png`);
      }
    } else {
      // Try to get any error info
      const allElements = await page.evaluate(() => {
        const menus = document.querySelectorAll('.tooth-radial-menu');
        return menus.length;
      });
      console.log(`  Radial menu DOM elements: ${allElements}`);
    }

    // Also test middle tooth (11) which should be near center
    // Click close/outside to dismiss
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Click tooth 11 (central incisor - near middle of arch)
    const allTeeth = await page.locator('.tooth-svg-wrapper').all();
    if (allTeeth.length > 7) {
      await allTeeth[7].click(); // tooth 11
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}_center_tooth.png`), fullPage: true });
      console.log(`  Saved ${name}_center_tooth.png`);
    }

  } catch (e) {
    console.error(`  ERROR in ${name}:`, e.message);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}_error.png`), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

async function main() {
  await testRadialMenu('light', false);  // PC light
  await testRadialMenu('dark', false);   // PC dark
  await testRadialMenu('light', true);   // Mobile light
  await testRadialMenu('dark', true);    // Mobile dark
  console.log('\nAll radial menu tests completed.');
}

main();
