import { chromium } from "playwright";

const WEB = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
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
    localStorage.removeItem("dente_ui_preferences_v1");
  },
  { api: API, owner: OWNER },
);
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);

console.log(
  JSON.stringify(
    await p.evaluate(() => {
      const pick = (s) => {
        const el = document.querySelector(s);
        if (!el) return `${s}: НЕТ`;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          sel: s,
          display: cs.display,
          bgColor: cs.backgroundColor,
          bgImage: cs.backgroundImage.slice(0, 90),
          rect: `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.left)},${Math.round(r.top)}`,
          gridCols: cs.gridTemplateColumns,
        };
      };
      return [
        pick("main.app-shell"),
        pick("section.workspace"),
        pick("section.onboarding-shell"),
      ];
    }),
    null,
    1,
  ),
);
await b.close();
