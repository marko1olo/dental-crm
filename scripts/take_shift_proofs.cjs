const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function provisionSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clean clinic session via API...");
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "ООО «Денте Стоматология»",
      email: `doctor-shift-${uniqueId}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Барабаш С. В.",
      ownerPin: "1234",
    }),
  });
  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  // Open shift on backend so shift is active
  try {
    await fetch(`${API_BASE}/api/fiscal/shift/open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dente-clinic-token": initData.clinicToken,
        "x-dente-staff-token": unlockData.staffToken,
      },
      body: JSON.stringify({ openedByUserId: initData.ownerUserId }),
    });
  } catch (e) {
    console.warn("Could not pre-open shift on backend:", e);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function saveProof(page, filename, targetDirs, clipSelector = null) {
  let buffer;
  if (clipSelector) {
    const el = await page.$(clipSelector);
    if (el) {
      buffer = await el.screenshot();
    } else {
      buffer = await page.screenshot();
    }
  } else {
    buffer = await page.screenshot();
  }

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const targetFile = path.join(dir, filename);
    fs.writeFileSync(targetFile, buffer);
    const size = fs.statSync(targetFile).size;
    console.log(`Saved ${filename} -> ${targetFile} (${size} bytes)`);
  }
}

async function main() {
  const auth = await provisionSession();
  console.log("[Provisioning] Auth ready:", auth.ownerUserId);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const targetDirs = [
    "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\shift",
    "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d93c9822-d8c2-48b0-8ca3-1e9fb5b4b5ff",
    "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\2d41233f-cb42-451b-b625-8a85401ad490",
  ];

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ ct, st, uid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_user_id", uid);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_doctor_shift_active", "true");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      onboardingDismissed: true,
      onboardingStep: "done",
      version: 1,
    }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        mode: "doctor",
        role: "doctor",
        activeRole: "doctor",
      })
    );
  }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

  const page = await context.newPage();
  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

  console.log("Navigating to http://127.0.0.1:5173/#shift...");
  await page.goto("http://127.0.0.1:5173/#shift", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const debugPath = path.join("C:\\Clinic_MVP\\dental-crm\\scripts", "probe_shift_debug.png");
  await page.screenshot({ path: debugPath });
  console.log("Captured debug screenshot to", debugPath);

  await page.waitForSelector('[data-testid="shift-view-desktop"]', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // 1. shift_cockpit_pc_light.png
  console.log("Capturing shift_cockpit_pc_light.png...");
  await saveProof(page, "shift_cockpit_pc_light.png", targetDirs);

  // 2. shift_chairs_status_pc_light.png
  console.log("Capturing shift_chairs_status_pc_light.png...");
  await saveProof(page, "shift_chairs_status_pc_light.png", targetDirs, '[data-testid="shift-chair-status-card"]');

  // 3. Open close modal
  console.log("Opening close shift modal...");
  const toggleBtn = await page.$('[data-testid="shift-toggle-btn"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForSelector('[data-testid="doctor-shift-close-modal"]', { timeout: 10000 });
    await page.waitForTimeout(600);
  }

  // 4. shift_open_close_modal_pc_light.png
  console.log("Capturing shift_open_close_modal_pc_light.png...");
  await saveProof(page, "shift_open_close_modal_pc_light.png", targetDirs);

  // Switch to dark theme
  console.log("Switching to dark theme...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(600);

  // 5. shift_open_close_modal_pc_dark.png
  console.log("Capturing shift_open_close_modal_pc_dark.png...");
  await saveProof(page, "shift_open_close_modal_pc_dark.png", targetDirs);

  // Close the modal
  const closeBtn = await page.$('[data-testid="doctor-shift-close-modal"] button');
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(600);
  }

  // 6. shift_cockpit_pc_dark.png
  console.log("Capturing shift_cockpit_pc_dark.png...");
  await saveProof(page, "shift_cockpit_pc_dark.png", targetDirs);

  // 7. shift_chairs_status_pc_dark.png
  console.log("Capturing shift_chairs_status_pc_dark.png...");
  await saveProof(page, "shift_chairs_status_pc_dark.png", targetDirs, '[data-testid="shift-chair-status-card"]');

  await browser.close();
  console.log("All 6 shift screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
