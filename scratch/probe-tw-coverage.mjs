/**
 * Считает по всем экранам, какая доля элементов с утилитарными классами
 * реально получила ожидаемое свойство. Рукописный CSS проекта не размечен
 * слоями и поэтому приоритетнее утилит — эта проба показывает, где именно
 * он их перебивает.
 */
import { chromium } from "playwright";

const WEB = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VIEWS = ["shift", "schedule", "patients", "visit", "documents", "finance", "settings"];

const CHECKS = [
  { cls: "flex", prop: "display", want: "flex" },
  { cls: "grid", prop: "display", want: "grid" },
  { cls: "items-center", prop: "align-items", want: "center" },
  { cls: "justify-between", prop: "justify-content", want: "space-between" },
  { cls: "flex-col", prop: "flex-direction", want: "column" },
  { cls: "gap-2", prop: "gap", want: "8px" },
  { cls: "text-xs", prop: "font-size", want: "12px" },
  { cls: "font-semibold", prop: "font-weight", want: "600" },
  { cls: "rounded-lg", prop: "border-radius", want: "8px" },
  { cls: "w-full", prop: "width", want: null },
];

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
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
  },
  { api: API, owner: OWNER },
);

const totals = new Map();
for (const view of VIEWS) {
  await p.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1800);
  const res = await p.evaluate((checks) => {
    const out = {};
    for (const c of checks) {
      const els = [...document.querySelectorAll(`.${CSS.escape(c.cls)}`)].filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
      });
      let ok = 0;
      const losers = [];
      for (const el of els) {
        const v = getComputedStyle(el).getPropertyValue(c.prop);
        if (c.want === null || v === c.want) ok += 1;
        else if (losers.length < 3) losers.push(`${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).filter((x) => !x.includes(":")).slice(0, 2).join(".")}=${v}`);
      }
      out[c.cls] = { total: els.length, ok, losers };
    }
    return out;
  }, CHECKS);
  for (const [cls, v] of Object.entries(res)) {
    if (!totals.has(cls)) totals.set(cls, { total: 0, ok: 0, losers: [] });
    const t = totals.get(cls);
    t.total += v.total;
    t.ok += v.ok;
    for (const l of v.losers) if (t.losers.length < 6 && !t.losers.includes(l)) t.losers.push(l);
  }
}

console.log("класс            видимых  применилось   доля");
for (const [cls, t] of totals) {
  const pct = t.total ? Math.round((100 * t.ok) / t.total) : 0;
  console.log(`  ${cls.padEnd(16)} ${String(t.total).padStart(5)} ${String(t.ok).padStart(11)}   ${pct}%`);
  if (t.ok < t.total && t.losers.length) console.log(`      перебито: ${t.losers.join("  ")}`);
}
await b.close();
