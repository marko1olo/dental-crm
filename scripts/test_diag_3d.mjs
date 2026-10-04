import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-web-security", "--enable-webgl", "--use-gl=angle"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => console.log("[BROWSER]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));

  await page.goto("http://127.0.0.1:5173/#imaging");
  await page.waitForTimeout(2000);

  // Remove coach marks
  await page.evaluate(() => {
    document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
  });

  const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
  await openMprBtn.click({ force: true });
  await page.waitForTimeout(1500);

  const loadDemo = page.locator("[data-testid='cbct-btn-load-demo-empty']");
  if (await loadDemo.isVisible()) await loadDemo.click({ force: true });
  await page.waitForTimeout(5000);

  const mode3d = page.locator("[data-testid='cbct-btn-mode-volume3d']");
  if (await mode3d.isVisible()) await mode3d.click({ force: true });
  await page.waitForTimeout(2000);

  const diag = await page.evaluate(() => {
    const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
    const gl = canvas ? canvas.getContext("webgl2") : null;
    return {
      hasCanvas: !!canvas,
      width: canvas?.width,
      height: canvas?.height,
      hasGl: !!gl,
      canvasStyleBg: canvas?.style?.backgroundColor,
    };
  });
  console.log("DIAGNOSTICS:", JSON.stringify(diag));
  await browser.close();
}

main().catch(console.error);
