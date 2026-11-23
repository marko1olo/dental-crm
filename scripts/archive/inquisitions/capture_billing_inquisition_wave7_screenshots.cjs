/**
 * scripts/capture_billing_inquisition_wave7_screenshots.cjs
 *
 * Fast, rock-solid Playwright runner for Wave 7 Billing Inquisition Modals.
 * Invariants:
 * - Uses channel: "msedge" (native Windows edge browser).
 * - Anti-Blank Guard with minimum file size verification (>= 25KB).
 * - Direct DOM click interaction.
 * - Viewports: 1440x900 (PC Light & Dark).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUTPUT_DIR = path.resolve(__dirname, "../docs/screenshots/billing_inquisition_wave7");

async function main() {
  console.log(">>> [Inquisition] Starting Wave 7 Billing Screen Capture with Microsoft Edge...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const targets = [
    {
      name: "01_cash_register_checkout_pc_light.png",
      view: "checkout",
      theme: "light",
      interact: async (page) => {
        console.log(">>> [01] Selecting Cash tender and +2000 quick bill...");
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-tender-cash"]')?.click();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-quick-bill-2000"]')?.click();
        });
        await page.waitForTimeout(300);
      },
    },
    {
      name: "02_cash_register_checkout_pc_dark.png",
      view: "checkout",
      theme: "dark",
      interact: async (page) => {
        console.log(">>> [02] Selecting Cash tender (Dark)...");
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-tender-cash"]')?.click();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-quick-bill-2000"]')?.click();
        });
        await page.waitForTimeout(300);
      },
    },
    {
      name: "03_split_payment_modal_pc_light.png",
      view: "split",
      theme: "light",
      interact: async (page) => {
        console.log(">>> [03] Selecting 50/50 split preset...");
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-preset-50-50"]')?.click();
        });
        await page.waitForTimeout(400);
      },
    },
    {
      name: "04_split_payment_modal_pc_dark.png",
      view: "split",
      theme: "dark",
      interact: async (page) => {
        console.log(">>> [04] Selecting 50/50 split preset (Dark)...");
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-preset-50-50"]')?.click();
        });
        await page.waitForTimeout(400);
      },
    },
    {
      name: "05_deposit_topup_modal_pc_light.png",
      view: "deposit",
      theme: "light",
      interact: async (page) => {
        console.log(">>> [05] Selecting +20 000 ₽ deposit preset...");
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-deposit-preset-20000"]')?.click();
        });
        await page.waitForTimeout(400);
      },
    },
    {
      name: "06_deposit_topup_modal_pc_dark.png",
      view: "deposit",
      theme: "dark",
      interact: async (page) => {
        console.log(">>> [06] Selecting +20 000 ₽ deposit preset (Dark)...");
        await page.evaluate(() => {
          document.querySelector('[data-testid="btn-deposit-preset-20000"]')?.click();
        });
        await page.waitForTimeout(400);
      },
    },
  ];

  try {
    for (const target of targets) {
      console.log(`\n========================================`);
      console.log(`>>> Capturing ${target.name} (View: ${target.view}, Theme: ${target.theme})...`);
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });

      const url = `http://127.0.0.1:5173/billing_inquisition_preview.html?view=${target.view}&theme=${target.theme}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);

      if (target.interact) {
        await target.interact(page);
      }

      await page.waitForTimeout(400);

      const filePath = path.join(OUTPUT_DIR, target.name);
      await page.screenshot({ path: filePath, fullPage: false });
      const stat = fs.statSync(filePath);

      if (stat.size < 25000) {
        throw new Error(`Screenshot ${target.name} is suspiciously small (${stat.size} bytes)! Blank screen guard failed.`);
      }

      console.log(`>>> [OK] Saved: ${filePath} (${stat.size} bytes)`);
      await page.close();
    }
    console.log("\n>>> ALL 6 SCREENSHOTS SUCCESSFULLY CAPTURED AND PASSED ANTI-BLANK GUARD!");
  } catch (err) {
    console.error(">>> Error during screenshot capture:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
