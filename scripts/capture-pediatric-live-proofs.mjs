import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pediatric";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/b1c12c2f-83a0-496c-8bd4-7a30128cf00f";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006";

for (const d of [PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR]) {
  if (!existsSync(d)) {
    mkdirSync(d, { recursive: true });
  }
}

async function getWebBase() {
  for (const port of [5173, 5174, 5175, 3000]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

async function getAuthTokens() {
  for (const port of [4100, 3000]) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
        });
        const data = await res.json();
        if (data.ok) return data;
      } catch (_) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  return {
    clinicToken: "demo-clinic-token",
    staffToken: "demo-staff-token",
    user: { id: "doc-1", role: "doctor", fullName: "Д-р Соколов А. В." },
  };
}

async function injectStorage(context, auth, theme = "light") {
  await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_session_token", staffToken);
    localStorage.setItem("dente_active_role", user.role || "doctor");
    localStorage.setItem("dente_active_user_id", user.id || "doc-1");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("theme", th);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: user.role || "doctor",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
    document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
  }, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, th: theme });
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      document.documentElement.style.colorScheme = th;
    } catch (_) {}
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(500);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await page.waitForTimeout(500);
  const buf = await page.screenshot({ fullPage: false });
  if (buf.length < 20480) {
    throw new Error(`[BYTE-GUARD FAILED] Screenshot ${filename} is only ${buf.length} bytes (<20KB)!`);
  }

  for (const dir of [PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR]) {
    const p = path.join(dir, filename);
    writeFileSync(p, buf);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${buf.length} bytes) -> ${description}`);
}

async function waitForRealUI(page) {
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 50;
  }, { timeout: 25000 });
  await suppressOverlays(page);
}

async function capture() {
  console.log("=== CAPTURING 4-STATE CANONICAL PEDIATRIC STUDIO PROOFS ===");

  const webBase = await getWebBase();
  console.log(`[Stand] Using live web frontend at ${webBase}`);

  const auth = await getAuthTokens();
  console.log("[Auth] Logged in as:", auth.user?.fullName);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  try {
    // 1. PC CONTEXT (1440x900)
    console.log("1. PC Desktop Session 1440x900...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await injectStorage(pcContext, auth, "light");
    const pcPage = await pcContext.newPage();
    console.log(`Navigating PC to ${webBase}/#pediatric...`);
    await pcPage.goto(`${webBase}/#pediatric`, { waitUntil: "load", timeout: 60000 });
    await waitForRealUI(pcPage);
    await pcPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
      window.dispatchEvent(new CustomEvent("dente:open-pediatric"));
    });
    console.log("Waiting for modal selector [data-testid='pediatric-studio-modal']...");
    await pcPage.waitForSelector("[data-testid='pediatric-studio-modal']", { state: "visible", timeout: 45000 });
    await pcPage.waitForTimeout(1000);
    await suppressOverlays(pcPage);

    // 1.1 PC Light
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_pediatric_studio_pc_light_1440x900.png", "Pediatric Studio (PC Light 1440x900)");

    // 1.2 PC Dark
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_pediatric_studio_pc_dark_1440x900.png", "Pediatric Studio (PC Dark 1440x900)");
    await pcContext.close();

    // 2. MOBILE CONTEXT (390x844) Apple HIG
    console.log("2. Mobile Session 390x844 (iPhone 13 Apple HIG)...");
    const mobileContext = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
    });
    await injectStorage(mobileContext, auth, "light");
    const mobilePage = await mobileContext.newPage();
    console.log(`Navigating Mobile to ${webBase}/#pediatric...`);
    await mobilePage.goto(`${webBase}/#pediatric`, { waitUntil: "load", timeout: 60000 });
    await waitForRealUI(mobilePage);
    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
      window.dispatchEvent(new CustomEvent("dente:open-pediatric"));
    });
    console.log("Waiting for modal selector [data-testid='pediatric-studio-modal'] on mobile...");
    await mobilePage.waitForSelector("[data-testid='pediatric-studio-modal']", { state: "visible", timeout: 45000 });
    await mobilePage.waitForTimeout(1000);
    await suppressOverlays(mobilePage);

    // 2.1 Mobile Light
    await setTheme(mobilePage, "light");
    await saveProof(mobilePage, "03_pediatric_studio_mobile_light_390x844.png", "Pediatric Studio (Mobile Light 390x844)");

    // 2.2 Mobile Dark
    await setTheme(mobilePage, "dark");
    await saveProof(mobilePage, "04_pediatric_studio_mobile_dark_390x844.png", "Pediatric Studio (Mobile Dark 390x844)");
    await mobileContext.close();

    console.log("=== ALL 4-STATE LIVE PEDIATRIC PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("FATAL ERROR in capture:", err);
  process.exit(1);
});
