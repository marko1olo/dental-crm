/**
 * scripts/capture-telephony-perfect-4state.cjs
 *
 * Canonical Red Team 4-State Proofs for Telephony & Softphone Studio:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844, Apple HIG)
 * 4. Mobile Dark (390x844, Apple HIG)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

process.env.NO_PROXY = "127.0.0.1,localhost";
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function getAuthTokens() {
  const uniqueId = Date.now();
  let clinicToken = "demo-clinic-token";
  let staffToken = "demo-staff-token";
  let organizationId = "demo-org-id";
  let ownerUserId = "demo-user-id";

  try {
    const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: "Клиника ДЕНТЕ (Телефония)",
        email: `telephony-proof-${uniqueId}@dente-clinic.ru`,
        password: "Password123!",
        ownerName: "Д-р Воронов А. В.",
        ownerPin: "1234",
      }),
    });
    if (initRes.ok) {
      const initData = await initRes.json();
      clinicToken = initData.clinicToken;
      organizationId = initData.organizationId;
      ownerUserId = initData.ownerUserId;

      const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-clinic-token": clinicToken,
        },
        body: JSON.stringify({ userId: ownerUserId, pinCode: "1234" }),
      });
      if (unlockRes.ok) {
        const unlockData = await unlockRes.json();
        staffToken = unlockData.staffToken;
      }
    }
  } catch (err) {
    console.log("Using fallback demo auth tokens:", err.message);
  }

  return { clinicToken, staffToken, organizationId, ownerUserId };
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, theme);
  await page.waitForTimeout(500);
}

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`  -> [VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB >= 20KB)`);
  return size;
}

async function captureState(page, filename) {
  await page.waitForTimeout(600);
  const targetPath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
  verifyProof(targetPath);
  return targetPath;
}

async function main() {
  console.log("=== Provisioning Session for Telephony 4-State Proofs ===");
  const auth = await getAuthTokens();
  console.log("Tokens ready:", { orgId: auth.organizationId });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--no-proxy-server",
      "--proxy-bypass-list=<-loopback>",
    ],
  });

  const setupStorage = async (page) => {
    await page.addInitScript(({ ct, st, orgId, uid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_organization_id", orgId);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
    }, {
      ct: auth.clinicToken,
      st: auth.staffToken,
      orgId: auth.organizationId,
      uid: auth.ownerUserId,
    });
  };

  const url = "http://127.0.0.1:5173/?demo=true#telephony";

  try {
    // -----------------------------------------------------------------
    // 1. DESKTOP CONTEXT (1440x900)
    // -----------------------------------------------------------------
    console.log("\n[Phase 1] Desktop Context (1440x900)...");
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupStorage(desktopPage);

    console.log(`Navigating to ${url}...`);
    await desktopPage.goto(url, { waitUntil: "domcontentloaded" });
    
    console.log("Waiting for telephony studio root element...");
    await desktopPage.waitForSelector('[data-testid="telephony-studio-modal-root"]', { state: "visible", timeout: 20000 });
    console.log("Telephony Studio visible on Desktop!");

    // 1.1 PC Light
    console.log("Capturing 01_telephony_pc_light_1440x900.png...");
    await setTheme(desktopPage, "light");
    await captureState(desktopPage, "01_telephony_pc_light_1440x900.png");

    // 1.2 PC Dark
    console.log("Capturing 02_telephony_pc_dark_1440x900.png...");
    await setTheme(desktopPage, "dark");
    await captureState(desktopPage, "02_telephony_pc_dark_1440x900.png");

    await desktopPage.close();

    // -----------------------------------------------------------------
    // 2. MOBILE CONTEXT (390x844 Apple HIG)
    // -----------------------------------------------------------------
    console.log("\n[Phase 2] Mobile Context (390x844 Apple HIG)...");
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await setupStorage(mobilePage);

    console.log(`Navigating mobile page to ${url}...`);
    await mobilePage.goto(url, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector('[data-testid="telephony-studio-modal-root"]', { state: "visible", timeout: 20000 });
    console.log("Telephony Studio visible on Mobile!");

    // 2.1 Mobile Light (Journal tab)
    console.log("Capturing 03_telephony_mobile_light_390x844.png (Journal Tab)...");
    await setTheme(mobilePage, "light");
    await captureState(mobilePage, "03_telephony_mobile_light_390x844.png");

    // 2.2 Mobile Dark (Switch to Dialer tab for rich details & dialpad view)
    console.log("Switching to 'Набор' tab on mobile...");
    const dialerTabBtn = mobilePage.getByRole("button", { name: "Набор" });
    if (await dialerTabBtn.isVisible().catch(() => false)) {
      await dialerTabBtn.click();
      await mobilePage.waitForTimeout(500);
    }
    console.log("Capturing 04_telephony_mobile_dark_390x844.png (Dialer & Call Card Tab)...");
    await setTheme(mobilePage, "dark");
    await captureState(mobilePage, "04_telephony_mobile_dark_390x844.png");

    await mobilePage.close();

    console.log("\n=======================================================");
    console.log("ALL 4-STATE TELEPHONY PROOFS CAPTURED AND VERIFIED!");
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL capture error:", err);
  process.exit(1);
});
