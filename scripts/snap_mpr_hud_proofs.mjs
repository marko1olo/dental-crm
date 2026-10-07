import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/943d12e9-f0eb-4ae4-9b9a-a81607ca87f9");
const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

for (const d of [targetDir, brainDir, parentBrainDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function capture() {
  console.log("1. Launching Chrome with WebGL support...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=swiftshader"
    ]
  });

  for (const theme of ["dark", "light"]) {
    console.log(`\n--- Starting capture for theme: ${theme} ---`);
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });

    await ctx.addInitScript((th) => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_training_mode_completed", "true");
      localStorage.setItem("dente_training_active", "false");
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: "pat-1",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
    }, theme);

    const page = await ctx.newPage();

    // Abort external fonts to prevent hanging in offline/sandbox
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    // Mock minimal API responses
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман" }],
          appointments: [],
        }),
      });
    });

    page.on("console", (msg) => console.log(`[PAGE LOG ${theme}]`, msg.type(), msg.text()));
    page.on("pageerror", (err) => console.log(`[PAGE ERROR ${theme}]`, err.message));

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Waiting for modal selector...");
    try {
      await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });
    } catch (e) {
      console.log("Timeout waiting for cbct-studio-modal, taking debug screenshot of current DOM...");
      await page.screenshot({ path: path.join(targetDir, `debug_failed_${theme}.png`) });
      throw e;
    }
    console.log("CBCT Studio modal opened!");
    await page.waitForTimeout(3000);

    // Helper for instantaneous CDP screenshot (avoids WebGL RAF hangs)
    async function snapCdp(filePath) {
      const cdp = await ctx.newCDPSession(page);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      await cdp.detach();
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
    }

    // Capture standard 4-quadrant edge-to-edge view
    const mprName = `cbct_mpr_edge_to_edge_${theme}.png`;
    const pMpr = path.join(targetDir, mprName);
    await snapCdp(pMpr);
    fs.copyFileSync(pMpr, path.join(brainDir, mprName));
    fs.copyFileSync(pMpr, path.join(parentBrainDir, mprName));
    console.log(`Saved ${mprName} (${(fs.statSync(pMpr).size / 1024).toFixed(1)} KB)`);

    // In dark theme, also maximize axial viewport to prove 100% full-bleed canvas
    if (theme === "dark") {
      const expandBtn = await page.$('[data-testid="btn-viewport-expand-axial"]');
      if (expandBtn) {
        console.log("Clicking expand axial button...");
        await expandBtn.click();
        await page.waitForTimeout(1500);

        const maxName = `cbct_mpr_maximized_axial_dark.png`;
        const pMax = path.join(targetDir, maxName);
        await snapCdp(pMax);
        fs.copyFileSync(pMax, path.join(brainDir, maxName));
        fs.copyFileSync(pMax, path.join(parentBrainDir, maxName));
        console.log(`Saved ${maxName} (${(fs.statSync(pMax).size / 1024).toFixed(1)} KB)`);
      }
    }

    await ctx.close();
  }

  await browser.close();
  console.log("\nALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

capture().catch(err => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
