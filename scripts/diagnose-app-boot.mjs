import { chromium } from "playwright";

async function diagnose() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--proxy-server=direct://", "--proxy-bypass-list=*"],
  });

  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("dente_organization_id", "org-1");
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_workspace_perspective", "owner");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode_v1", "true");
    sessionStorage.setItem("dente_unlocked", "true");
  });

  page.on("console", (m) => console.log(`[PAGE LOG] ${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => console.error(`[PAGE ERROR]`, e.stack));
  page.on("requestfailed", (r) => console.error(`[NET FAILED] ${r.method()} ${r.url()} -> ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    if (r.status() >= 400) {
      console.error(`[HTTP ${r.status()}] ${r.request().method()} ${r.url()}`);
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
  await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "commit" });
  await new Promise((r) => setTimeout(r, 6000));

  const state = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText.slice(0, 300),
      appStore: window.__useAppStore ? Object.keys(window.__useAppStore.getState()) : null,
      authTokens: {
        clinic: localStorage.getItem("dente_clinic_token"),
        staff: localStorage.getItem("dente_staff_token"),
        showcase: localStorage.getItem("dente_demo_showcase"),
      },
    };
  });
  console.log("APP STATE:", JSON.stringify(state, null, 2));

  await browser.close();
}

diagnose().catch(console.error);
