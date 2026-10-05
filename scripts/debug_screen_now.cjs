const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-token");
    localStorage.setItem("dente_staff_token", "live-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "dark");
  });

  const page = await ctx.newPage();
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", role: "owner" } }) });
    }
    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "1", patientId: "pat-1", title: "KaVo 3D" }]) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });

  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const openBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 15000 });
  await openBtn.click();
  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 20000 });
  console.log("Modal opened.");

  const demoBtn = await page.$('[data-testid="cbct-btn-load-demo-empty"]');
  if (demoBtn) {
    await demoBtn.click();
    console.log("Clicked demo. Waiting 10s...");
    await page.waitForTimeout(10000);
  }

  await page.screenshot({ path: "debug_modal_screen.png" });
  console.log("Saved debug_modal_screen.png");

  // Dump all data-testid in header
  const headerTestIds = await page.$$eval("nav, header, [role='tablist'], button", (els) =>
    els.map((el) => el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.innerText.trim()).filter(Boolean)
  );
  console.log("Header and buttons:", headerTestIds.slice(0, 30));

  await browser.close();
}

main().catch(console.error);
