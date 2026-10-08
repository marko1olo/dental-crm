const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/?demo=true#leads", { waitUntil: "domcontentloaded", timeout: 25000 });

  // Wait for splash screen to disappear
  console.log("Waiting for app mount...");
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка системы") && text.length > 500;
  }, { timeout: 20000 });

  // Dismiss tour modal if visible
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const dismiss = btns.find((b) => b.innerText.includes("Больше не показывать") || b.innerText.includes("Понятно, я сам"));
    if (dismiss) dismiss.click();
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  const outDir = path.resolve(__dirname, "screenshots");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Leads Light
  const leadsLight = path.join(outDir, "proof_leads_kanban_light.png");
  await page.screenshot({ path: leadsLight });
  console.log("Captured Leads Light:", leadsLight, fs.statSync(leadsLight).size);

  // 2. Leads Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    localStorage.setItem("dente_theme_mode", "dark");
  });
  await page.waitForTimeout(500);
  const leadsDark = path.join(outDir, "proof_leads_kanban_dark.png");
  await page.screenshot({ path: leadsDark });
  console.log("Captured Leads Dark:", leadsDark, fs.statSync(leadsDark).size);

  // 3. Navigate to Marketing
  console.log("Navigating to Marketing...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    window.location.hash = "marketing";
  });
  await page.waitForTimeout(2000);
  const mktLight = path.join(outDir, "proof_marketing_dashboard_light.png");
  await page.screenshot({ path: mktLight });
  console.log("Captured Marketing Light:", mktLight, fs.statSync(mktLight).size);

  // 4. Marketing Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(500);
  const mktDark = path.join(outDir, "proof_marketing_dashboard_dark.png");
  await page.screenshot({ path: mktDark });
  console.log("Captured Marketing Dark:", mktDark, fs.statSync(mktDark).size);

  // 5. Open Telephony Drawer
  console.log("Opening Telephony incoming call drawer...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    window.location.hash = "leads";
  });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    // Open telephony side drawer with sample call
    window.dispatchEvent(new CustomEvent("dente:incoming-call", {
      detail: {
        callId: "test-call-proof-final",
        phone: "+7 (916) 789-45-12",
        callerName: "Смирнов Алексей Петрович",
        direction: "inbound",
        status: "ringing",
        recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        durationSeconds: 94,
        isLeadCaptured: false,
        transcript: [
          { speaker: "patient", text: "Здравствуйте! Хочу записаться на консультацию по имплантации к хирургу Воронову.", startTimeSeconds: 0, endTimeSeconds: 6 },
          { speaker: "operator", text: "Добрый день, Алексей Петрович! Доктор принимает во вторник и четверг. Записать на 14:00?", startTimeSeconds: 7, endTimeSeconds: 14 }
        ]
      }
    }));
  });
  await page.waitForTimeout(2000);

  const telDrawer = page.locator('[data-testid="telephony-patient-side-drawer"]');
  if (await telDrawer.count() > 0) {
    const telPath = path.join(outDir, "proof_telephony_drawer_light.png");
    await page.screenshot({ path: telPath });
    console.log("Captured Telephony Drawer:", telPath, fs.statSync(telPath).size);
  } else {
    console.log("Telephony drawer not opened by event, checking drawer buttons...");
  }

  await browser.close();
  console.log("Done!");
})();
