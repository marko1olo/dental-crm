import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    console.log(`[${m.type()}]`, m.text());
  }
});
page.on("pageerror", (e) => {
  console.error("PAGE ERROR:", e.message);
  console.error(e.stack);
});

await page.addInitScript(() => {
  localStorage.setItem("dente_demo_showcase", "true");
  localStorage.setItem("dente_tour_completed", "true");
  localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
  localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
  localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
});

await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const demoEntry = page.locator("text=Быстрый вход в Демо-тур").first();
if (await demoEntry.isVisible({ timeout: 2000 }).catch(() => false)) {
  await demoEntry.click();
  await page.waitForTimeout(1000);
}
const launchBtn = page.locator(".auth-submit-btn--glow").first();
if (await launchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await launchBtn.click();
  await page.waitForTimeout(2000);
}

await page.waitForTimeout(2000);

console.log("Triggering call...");
await page.evaluate(() => {
  const store = (window).__denteTelephonyStore;
  if (store) {
    store.getState().triggerIncomingCall({
      callId: "call-1",
      phone: "+7 925 876-54-32",
      patientId: "01a00000-0000-0000-0000-000000000002",
      patientName: "Воронов Дмитрий Игоревич",
      status: "answered",
      durationSeconds: 3,
      recordingUrl: "https://example.com/audio/call-sample.mp3",
      provider: "sip",
    });
  }
});

await page.waitForTimeout(2000);
await page.screenshot({ path: "scratch-test-call.png" });
await browser.close();
