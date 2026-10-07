import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/ortho_protocol_preview.html?theme=dark&view=materials", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const bar = document.querySelector(".dente-segmented-bar");
    const buttons = bar ? Array.from(bar.querySelectorAll("button")) : [];
    
    return {
      barClasses: bar?.className,
      barComputed: bar ? {
        bg: window.getComputedStyle(bar).backgroundColor,
        border: window.getComputedStyle(bar).border,
      } : null,
      buttons: buttons.map(b => ({
        text: b.textContent?.trim(),
        className: b.className,
        computed: {
          bg: window.getComputedStyle(b).backgroundColor,
          color: window.getComputedStyle(b).color,
          border: window.getComputedStyle(b).border,
          boxShadow: window.getComputedStyle(b).boxShadow,
          height: window.getComputedStyle(b).height,
        }
      }))
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch(console.error);
