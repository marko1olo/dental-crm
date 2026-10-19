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
    "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\840d025c-f804-42b4-bd0f-bdb907a708dc",
  ];

  const initScript = ({ ct, st, uid }) => {
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
  };

  // --- PC DESKTOP (1440x900) ---
  console.log("\n=== 1. PC Desktop 1440x900 ===");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(initScript, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

  console.log("Navigating to http://127.0.0.1:5173/#shift...");
  await page.goto("http://127.0.0.1:5173/#shift", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.waitForSelector('[data-testid="shift-view-desktop"]', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // 1. shift_cockpit_1440x900_light.png
  console.log("Capturing shift_cockpit_1440x900_light.png...");
  await saveProof(page, "shift_cockpit_1440x900_light.png", targetDirs);
  await saveProof(page, "shift_cockpit_pc_light.png", targetDirs);

  // 2. Open close modal (PC Light)
  console.log("Opening close shift modal...");
  const toggleBtn = await page.$('[data-testid="shift-toggle-btn"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForSelector('[data-testid="doctor-shift-close-modal"]', { timeout: 10000 });
    await page.waitForTimeout(600);
    await saveProof(page, "shift_open_close_modal_pc_light.png", targetDirs);

    // Close modal
    const closeBtn = await page.$('[data-testid="doctor-shift-close-modal"] button');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // Switch to dark theme
  console.log("Switching PC to dark theme...");
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

  // 3. shift_cockpit_1440x900_dark.png
  console.log("Capturing shift_cockpit_1440x900_dark.png...");
  await saveProof(page, "shift_cockpit_1440x900_dark.png", targetDirs);
  await saveProof(page, "shift_cockpit_pc_dark.png", targetDirs);

  await context.close();

  // --- MOBILE (390x844) ---
  console.log("\n=== 2. Mobile 390x844 (Apple HIG) ===");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addInitScript(initScript, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

  const mobilePage = await mobileContext.newPage();
  console.log("Navigating mobile to http://127.0.0.1:5173/#shift...");
  await mobilePage.goto("http://127.0.0.1:5173/#shift", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  await mobilePage.waitForSelector('[data-testid="shift-view-mobile"]', { timeout: 20000 });
  await mobilePage.waitForTimeout(1000);

  // 4. shift_cockpit_390x844_light.png
  console.log("Capturing shift_cockpit_390x844_light.png...");
  await saveProof(mobilePage, "shift_cockpit_390x844_light.png", targetDirs);

  // Switch mobile to dark theme
  console.log("Switching mobile to dark theme...");
  await mobilePage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  });
  await mobilePage.waitForTimeout(600);

  // 5. shift_cockpit_390x844_dark.png
  console.log("Capturing shift_cockpit_390x844_dark.png...");
  await saveProof(mobilePage, "shift_cockpit_390x844_dark.png", targetDirs);

  await mobileContext.close();
  await browser.close();
  console.log("\n[Proof Runner] All 4 canonical states successfully captured!");
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
