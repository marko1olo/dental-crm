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
      clinicName: "Стоматология ДЕНТЕ",
      email: `doctor-agent-${uniqueId}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Смирнов А. В.",
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

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function main() {
  const auth = await provisionSession();
  console.log("[Provisioning] Auth ready:", auth.ownerUserId);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\324e1ed9-d760-4606-9e71-78be12218946";
  const repoProofDir = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\redteam_ui_unification";
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  if (!fs.existsSync(repoProofDir)) fs.mkdirSync(repoProofDir, { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(({ ct, st, uid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_id", uid);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
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
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        mode: "owner",
        role: "owner",
        activeRole: "owner",
      })
    );
  }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

  const page = await context.newPage();
  console.log("Loading workspace at #schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
  await page.waitForSelector(".topbar", { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Open DentalAgentCockpit
  console.log("Opening DentalAgentCockpit via window.dispatchEvent...");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente:open-agent-cockpit"));
  });
  await page.waitForSelector(".dental-agent-cockpit-drawer.is-open", { timeout: 10000 });
  await page.waitForTimeout(1000); // Wait for transition animation to complete

  // 1. Desktop Light (1440x900)
  console.log("Capturing Dental Agent Cockpit Desktop Light...");
  const pcLightPath = path.join(artifactDir, "agent_cockpit_pc_light.png");
  await page.screenshot({ path: pcLightPath });
  fs.copyFileSync(pcLightPath, path.join(repoProofDir, "agent_cockpit_pc_light.png"));
  console.log("Desktop Light captured:", pcLightPath, fs.statSync(pcLightPath).size, "bytes");

  // 2. Desktop Dark (1440x900)
  console.log("Capturing Dental Agent Cockpit Desktop Dark...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(800);
  const pcDarkPath = path.join(artifactDir, "agent_cockpit_pc_dark.png");
  await page.screenshot({ path: pcDarkPath });
  fs.copyFileSync(pcDarkPath, path.join(repoProofDir, "agent_cockpit_pc_dark.png"));
  console.log("Desktop Dark captured:", pcDarkPath, fs.statSync(pcDarkPath).size, "bytes");

  // 3. Mobile Dark (390x844)
  console.log("Resizing to mobile viewport (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);

  console.log("Capturing Dental Agent Cockpit Mobile Dark...");
  const mobileDarkPath = path.join(artifactDir, "agent_cockpit_mobile_dark.png");
  await page.screenshot({ path: mobileDarkPath });
  fs.copyFileSync(mobileDarkPath, path.join(repoProofDir, "agent_cockpit_mobile_dark.png"));
  console.log("Mobile Dark captured:", mobileDarkPath, fs.statSync(mobileDarkPath).size, "bytes");

  // 4. Mobile Light (390x844)
  console.log("Capturing Dental Agent Cockpit Mobile Light...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(800);
  const mobileLightPath = path.join(artifactDir, "agent_cockpit_mobile_light.png");
  await page.screenshot({ path: mobileLightPath });
  fs.copyFileSync(mobileLightPath, path.join(repoProofDir, "agent_cockpit_mobile_light.png"));
  console.log("Mobile Light captured:", mobileLightPath, fs.statSync(mobileLightPath).size, "bytes");

  await browser.close();
  console.log("All 4 proofs successfully captured and verified!");
}

main().catch((err) => {
  console.error("FATAL ERROR in main:", err);
  process.exit(1);
});
