const { chromium } = require("playwright");

const todayDate = new Date().toLocaleDateString("en-CA");
const studiesArray = [
  {
    id: "02b00000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientFullName: "Захаров Игорь Дмитриевич",
    kind: "cbct",
    modality: "CT",
    title: "3D КЛКТ KaVo OP 3D Pro",
    status: "available",
  },
];

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
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(studiesArray) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });

  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const openBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 15000 });
  await openBtn.click();
  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 20000 });
  console.log("Modal opened.");

  // Check buttons before load
  const buttonsBefore = await page.$$eval("button", (btns) =>
    btns.map((b) => ({ text: b.innerText.trim(), testid: b.getAttribute("data-testid") })).filter((b) => b.text || b.testid)
  );
  console.log("Found buttons in modal:", buttonsBefore.slice(0, 15));

  const demoBtn = await page.$('[data-testid="cbct-btn-load-demo-empty"]');
  if (demoBtn) {
    console.log("Clicking load demo volume...");
    await demoBtn.click();
    console.log("Waiting 12s for volume decode...");
    await page.waitForTimeout(12000);
  }

  await page.screenshot({ path: "probe_studio_state.png" });
  console.log("Saved probe_studio_state.png");

  const buttonsAfter = await page.$$eval("button", (btns) =>
    btns.map((b) => ({ text: b.innerText.trim(), testid: b.getAttribute("data-testid") })).filter((b) => b.text || b.testid)
  );
  console.log("Found buttons after volume load:", buttonsAfter.slice(0, 20));

  await browser.close();
}

main().catch(console.error);
