/**
 * Показывает, какое правило CSS реально выигрывает для свойства на элементе:
 * перебирает все загруженные таблицы стилей и ищет совпадающие селекторы.
 */
import { chromium } from "playwright";

const WEB = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const TARGET = process.argv[2] || "section.workspace";
const PROPS = (process.argv[3] || "max-width,width,padding,margin").split(",");

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
    localStorage.removeItem("dente_ui_preferences_v1");
  },
  { api: API, owner: OWNER },
);
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);

const res = await p.evaluate(
  ({ target, props }) => {
    const el = document.querySelector(target);
    if (!el) return { error: `нет элемента ${target}` };
    const hits = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list, media) => {
        for (const rule of list) {
          if (rule.cssRules && rule.conditionText !== undefined) {
            walk(rule.cssRules, rule.conditionText);
            continue;
          }
          if (!rule.selectorText) continue;
          let matches = false;
          try { matches = el.matches(rule.selectorText); } catch { continue; }
          if (!matches) continue;
          for (const prop of props) {
            const v = rule.style.getPropertyValue(prop);
            if (v) {
              hits.push({
                prop, value: v,
                important: rule.style.getPropertyPriority(prop) === "important",
                selector: rule.selectorText.slice(0, 90),
                media: media || null,
                href: (sheet.href || "inline").split("/").pop().split("?")[0],
              });
            }
          }
        }
      };
      walk(rules);
    }
    const cs = getComputedStyle(el);
    const computed = {};
    for (const prop of props) computed[prop] = cs.getPropertyValue(prop);
    return { computed, inline: el.getAttribute("style"), hits };
  },
  { target: TARGET, props: PROPS },
);

console.log(`ЦЕЛЬ: ${TARGET}`);
console.log("вычислено:", res.computed);
console.log("инлайн:", res.inline);
console.log("правила (в порядке каскада):");
for (const h of res.hits || []) {
  console.log(`  ${h.prop}: ${h.value}${h.important ? " !important" : ""}   ← ${h.selector}  [${h.href}${h.media ? " @" + h.media : ""}]`);
}
await b.close();
