import puppeteer from "puppeteer";

const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";

async function main() {
  const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника Диагностики",
      email: `diag-${Date.now()}@test.local`,
      password: "Password123!",
      ownerName: "Д-р Тестов",
      ownerPin: "123456"
    })
  });
  const initData = await initRes.json();
  console.log("[AUTH] init:", initData.ok, initData.organizationId);

  const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" })
  });
  const unlockData = await unlockRes.json();
  console.log("[AUTH] staffToken:", unlockData.ok);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"]
  });

  const page = await browser.newPage();
  page.on("console", msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", err => console.log(`[BROWSER ERROR] ${err.message}`));
  page.on("response", res => {
    if (res.url().includes("/api/")) {
      console.log(`[API RESPONSE] ${res.status()} ${res.url()}`);
    }
  });

  await page.evaluateOnNewDocument((ct, st) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      onboardingDismissed: true,
      soundNotificationsMuted: false
    }));
  }, initData.clinicToken, unlockData.staffToken);

  console.log("[PUPPETEER] Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const content = await page.evaluate(() => {
    const boot = document.querySelector(".boot-state");
    const shell = document.querySelector(".app-shell");
    const h1 = document.querySelector("h1")?.innerText;
    const p = document.querySelector("p")?.innerText;
    const bodyHtml = document.body.innerHTML.slice(0, 300);
    return { hasBoot: !!boot, hasShell: !!shell, h1, p, bodyHtml };
  });

  console.log("[PUPPETEER] Page evaluation:", content);
  await browser.close();
}

main().catch(console.error);
