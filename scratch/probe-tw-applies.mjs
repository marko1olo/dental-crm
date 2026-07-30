import { chromium } from "playwright";

const WEB = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(WEB, { waitUntil: "domcontentloaded" });
await p.evaluate(
  async ({ api, owner }) => {
    const r = await fetch(`${api}/api/auth/clinic/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });
    const bd = await r.json();
    const s = await fetch(`${api}/api/auth/staff/unlock`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-dente-clinic-token": bd.clinicToken },
      body: JSON.stringify({ userId: owner, pinCode: "0000" }),
    });
    const sb = await s.json();
    localStorage.setItem("dente_clinic_token", bd.clinicToken);
    localStorage.setItem("dente_staff_token", sb.staffToken);
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
  },
  { api: API, owner: OWNER },
);
await p.goto(`${WEB}/#visit`, { waitUntil: "domcontentloaded" });
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);

console.log(
  JSON.stringify(
    await p.evaluate(() => {
      const report = {};
      // Есть ли в документе таблица с утилитами вовсе?
      let utilityRules = 0;
      let flexRule = null;
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        const walk = (list) => {
          for (const r of list) {
            if (r.cssRules) { walk(r.cssRules); continue; }
            if (!r.selectorText) continue;
            if (/^\.(flex|items-center|gap-2|text-xs|w-12|h-12|rounded-full)$/.test(r.selectorText)) {
              utilityRules += 1;
              if (r.selectorText === ".flex") flexRule = r.cssText.slice(0, 80);
            }
          }
        };
        walk(rules);
      }
      report.utilityRulesFound = utilityRules;
      report.flexRule = flexRule;

      const check = (cls) => {
        const el = document.querySelector(`.${CSS.escape(cls)}`);
        if (!el) return `${cls}: элемента нет в DOM`;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          cls,
          display: cs.display,
          gap: cs.gap,
          fontSize: cs.fontSize,
          w: Math.round(r.width),
          h: Math.round(r.height),
          tag: el.tagName.toLowerCase(),
        };
      };
      report.samples = ["flex", "items-center", "gap-2", "text-xs", "w-12", "rounded-full"].map(check);
      report.layerSupported = typeof CSSLayerBlockRule !== "undefined";
      return report;
    }),
    null,
    1,
  ),
);
await b.close();
