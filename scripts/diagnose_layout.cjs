const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/");
  await page.waitForTimeout(1000);

  // 1. Click Demo Tour button
  const demoBtn = page.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoBtn.isVisible()) {
    console.log("Clicking Demo Tour button...");
    await demoBtn.click();
    await page.waitForTimeout(1000);
    const launchBtn = page.locator(".auth-submit-btn--glow").first();
    if (await launchBtn.isVisible()) {
      console.log("Launching Therapist role...");
      await launchBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // 2. Dismiss tour modals & spotlights properly
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-tour-step]'
    ).forEach((el) => el.remove());
    const btns = Array.from(document.querySelectorAll("button"));
    const dismiss = btns.find((b) => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить")));
    if (dismiss) dismiss.click();
  });
  await page.waitForTimeout(1000);

  // 3. Click "Приём" in patient card to open live visit
  console.log("Looking for 'Приём' button in patient card...");
  const openVisitBtn = page.locator('[data-testid="patient-card-open-visit-btn"]').first();
  if (await openVisitBtn.isVisible()) {
    console.log("Clicking 'Приём' button to launch live visit...");
    await openVisitBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("'Приём' button not visible, checking current URL...");
  }

  // Dismiss any tour modals
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-tour-step]'
    ).forEach((el) => el.remove());
    const btns = Array.from(document.querySelectorAll("button"));
    const dismiss = btns.find((b) => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить")));
    if (dismiss) dismiss.click();
  });
  await page.waitForTimeout(1000);

  // Click tab "Зубная формула" in Visit view
  const formulaTab = page.locator(
    'button:has-text("Зубная формула"), [role="tab"]:has-text("Зубная формула"), [data-testid="visit-subtab-odontogram"]'
  ).first();
  if (await formulaTab.isVisible()) {
    console.log("Clicking 'Зубная формула' tab in visit view...");
    await formulaTab.click();
    await page.waitForTimeout(1500);
  }

  // Dismiss any tour modals that reappeared
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-tour-step]'
    ).forEach((el) => el.remove());
    const btns = Array.from(document.querySelectorAll("button"));
    const dismiss = btns.find((b) => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить")));
    if (dismiss) dismiss.click();
  });
  await page.waitForTimeout(1000);

  const detailedInspection = await page.evaluate(() => {
    const toothChart = document.querySelector(".tooth-chart-container, .odontogram-view-container, .teeth-row");
    
    // Trace parents of toothChart up to body
    const parents = [];
    let curr = toothChart;
    while (curr && curr !== document.body) {
      const r = curr.getBoundingClientRect();
      const style = window.getComputedStyle(curr);
      parents.push({
        tag: curr.tagName,
        cls: (curr.className || "").toString().slice(0, 60),
        id: curr.id,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        scroll: { left: curr.scrollLeft, width: curr.scrollWidth, clientW: curr.clientWidth },
        overflow: style.overflow,
        overflowX: style.overflowX,
        display: style.display,
        position: style.position,
      });
      curr = curr.parentElement;
    }

    // Check teeth bounding rects
    const teeth = [18, 17, 16, 11, 21, 27, 28, 48, 47, 46, 41, 31, 37, 38];
    const teethCoords = {};
    for (const num of teeth) {
      const el = document.querySelector(`[data-tooth-id="${num}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        teethCoords[num] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      } else {
        teethCoords[num] = null;
      }
    }

    const el16 = document.querySelector('[data-tooth-id="16"]');
    const el16Style = el16 ? window.getComputedStyle(el16) : null;
    const el16Svg = el16 ? el16.querySelector('svg') : null;
    const el16SvgStyle = el16Svg ? window.getComputedStyle(el16Svg) : null;

    const row = document.querySelector('.teeth-row');
    const rowStyle = row ? window.getComputedStyle(row) : null;

    const quadGroup = document.querySelector('.tooth-quadrant-group');
    const quadStyle = quadGroup ? window.getComputedStyle(quadGroup) : null;

    return {
      windowScroll: { x: window.scrollX, y: window.scrollY, innerW: window.innerWidth, innerH: window.innerHeight },
      docScroll: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
      row: row ? {
        rect: row.getBoundingClientRect(),
        width: rowStyle.width,
        gap: rowStyle.gap,
      } : null,
      quad: quadGroup ? {
        rect: quadGroup.getBoundingClientRect(),
        width: quadStyle.width,
        gap: quadStyle.gap,
      } : null,
      tooth16: el16 ? {
        rect: el16.getBoundingClientRect(),
        width: el16Style.width,
        minWidth: el16Style.minWidth,
        padding: el16Style.padding,
        svgWidth: el16SvgStyle ? el16SvgStyle.width : null,
        svgHeight: el16SvgStyle ? el16SvgStyle.height : null,
      } : null,
      teethCoords,
    };
  });

  console.log("Detailed Inspection:", JSON.stringify(detailedInspection, null, 2));
  await browser.close();
})();
