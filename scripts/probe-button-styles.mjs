import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto("http://127.0.0.1:5173/?demo=true#schedule");
  await page.waitForTimeout(3000);
  
  // Set dark theme
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  });
  await page.waitForTimeout(1000);

  const tomorrowBtn = page.locator('[data-testid="schedule-mobile-segment-tomorrow"]');
  const styles = await tomorrowBtn.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      className: el.className,
      parentBg: window.getComputedStyle(el.parentElement).backgroundColor,
    };
  });
  console.log("Tomorrow Button Styles:", styles);
  await browser.close();
}

run();
