const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER ERROR LOG:", msg.text());
  });
  p.on("pageerror", (err) => console.log("BROWSER PAGEERROR:", err.message));
  await p.goto("http://127.0.0.1:5173/");
  await p.waitForTimeout(2000);
  const demoBtn = p.locator("button:has-text('Быстрый вход в Демо-тур')").first();
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await p.waitForTimeout(1000);
    const launch = p.locator(".auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    if (await launch.isVisible()) await launch.click();
    await p.waitForTimeout(3000);
  }
  await p.evaluate(() => {
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .tour-backdrop-clickable-zone").forEach((e) => e.remove());
  });

  // Switch to visit
  await p.evaluate(() => {
    window.location.hash = "#visit";
  });
  await p.waitForTimeout(3000);

  const visitInfo = await p.evaluate(() => {
    const ws = document.querySelector("#workspace-content");
    const appStore = window.__useAppStore ? window.__useAppStore.getState() : null;
    return {
      currentView: appStore ? appStore.currentView : null,
      dashboardPresent: Boolean(appStore && appStore.dashboard),
      patientsCount: appStore && appStore.dashboard ? (appStore.dashboard.patients || []).length : 0,
      activeVisit: appStore && appStore.dashboard ? appStore.dashboard.activeVisit : null,
      wsInnerHtml: ws ? ws.innerHTML.slice(0, 1000) : "no ws",
      wsText: ws ? ws.innerText.slice(0, 1000) : "no ws",
    };
  });
  console.log("VISIT INFO:", JSON.stringify(visitInfo, null, 2));
  await b.close();
})();
