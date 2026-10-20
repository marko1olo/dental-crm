const { chromium } = require("playwright");
const http = require("node:http");

async function getLiveClinicLogin() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 4100,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve(JSON.parse(b)));
      },
    );
    req.write(JSON.stringify({ email: "clinic@example.com", password: "dente2026" }));
    req.end();
  });
}

(async () => {
  const login = await getLiveClinicLogin();
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(
    ({ t, s, u }) => {
      localStorage.setItem("dente_clinic_token", t);
      localStorage.setItem("dente_staff_token", s);
      localStorage.setItem("dente_active_session_token", s);
      localStorage.setItem("dente_active_user_id", u.id);
      localStorage.setItem("dente_active_role", "doctor");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
    },
    { t: login.clinicToken, s: login.staffToken, u: login.user },
  );
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/#visit");
  await page.waitForTimeout(4000);
  await page.click('[data-testid="visit-header-more-actions-btn"]');
  await page.waitForTimeout(500);
  await page.click('[data-testid="visit-more-action-stage-payment"]');
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const el = document.querySelector(".stage-payment-modal-container");
    const ov = document.querySelector(".stage-payment-modal-overlay");
    if (!el) return "NO ELEMENT FOUND";
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    const ovS = ov ? window.getComputedStyle(ov) : null;
    const ovR = ov ? ov.getBoundingClientRect() : null;
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      display: s.display,
      visibility: s.visibility,
      opacity: s.opacity,
      zIndex: s.zIndex,
      overlay: ovS ? { display: ovS.display, zIndex: ovS.zIndex, pos: ovS.position, rect: ovR } : null,
      parent: el.parentElement?.className,
    };
  });
  const offenders = await page.evaluate(() => {
    const el = document.querySelector(".stage-payment-modal-overlay");
    if (!el) return "NO OVERLAY";
    const list = [];
    let cur = el.parentElement;
    while (cur && cur !== document.body) {
      const cs = window.getComputedStyle(cur);
      if (cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" || cs.contain !== "none") {
        list.push({ tag: cur.tagName, class: cur.className, transform: cs.transform, filter: cs.filter, contain: cs.contain });
      }
      cur = cur.parentElement;
    }
    return list;
  });
  console.log("OFFENDING ANCESTORS:", JSON.stringify(offenders, null, 2));
})();
