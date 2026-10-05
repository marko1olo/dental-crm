const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token");
    localStorage.setItem("dente_staff_token", "audit-token");
    localStorage.setItem("dente_active_session_token", "audit-token");
    localStorage.setItem("dente_active_role", "owner");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_workspace_perspective", "presentation");
  });
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="tp-tab-phased4"]', { timeout: 15000 });
  await page.click('[data-testid="tp-tab-phased4"]');
  await page.waitForTimeout(1000);

  const scrollInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const scrollables = all.filter((el) => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight;
    });
    return scrollables.map((el) => ({
      tag: el.tagName,
      id: el.id,
      className: typeof el.className === "string" ? el.className.slice(0, 50) : "",
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
  });
  console.log("Scrollable elements:", JSON.stringify(scrollInfo, null, 2));
  await browser.close();
}

main().catch(console.error);
