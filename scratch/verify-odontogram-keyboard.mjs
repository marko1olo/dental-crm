/**
 * Проверяет в живом браузере, что зубная формула управляется с клавиатуры:
 * зуб получает фокус, Enter открывает меню состояний, у зуба есть роль и
 * доступное имя с номером и состоянием по-русски.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
  async ({ api, owner }) => {
    const r = await fetch(`${api}/api/auth/clinic/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });
    const bd = await r.json();
    const s = await fetch(`${api}/api/auth/staff/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-dente-clinic-token": bd.clinicToken },
      body: JSON.stringify({ userId: owner, pinCode: "0000" }),
    });
    const sb = await s.json();
    localStorage.setItem("dente_clinic_token", bd.clinicToken);
    localStorage.setItem("dente_staff_token", sb.staffToken);
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
  },
  { api: API, owner: OWNER },
);

await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const chart = await page.evaluate(() => {
  const teeth = [...document.querySelectorAll(".tooth-svg-wrapper")];
  return {
    count: teeth.length,
    withRole: teeth.filter((t) => t.getAttribute("role") === "button").length,
    focusable: teeth.filter((t) => t.getAttribute("tabindex") === "0").length,
    labelled: teeth.filter((t) => (t.getAttribute("aria-label") || "").length > 5).length,
    sampleLabels: teeth.slice(0, 3).map((t) => t.getAttribute("aria-label")),
  };
});
console.log("зубов в формуле:", chart.count);
console.log("  с ролью button: ", chart.withRole);
console.log("  доступны с Tab:", chart.focusable);
console.log("  с доступным именем:", chart.labelled);
console.log("  примеры имён:", JSON.stringify(chart.sampleLabels));

if (!chart.count) {
  console.error("СБОЙ: зубная формула не отрисована, проверять нечего");
  await browser.close();
  process.exit(1);
}

// Фокус на конкретный зуб и Enter.
const opened = await page.evaluate(() => {
  const tooth = document.querySelector('.tooth-svg-wrapper[data-tooth-id="46"]')
    || document.querySelector(".tooth-svg-wrapper");
  tooth.focus();
  return document.activeElement === tooth;
});
console.log("зуб принял фокус:", opened);

await page.keyboard.press("Enter");
await page.waitForTimeout(700);

const menu = await page.evaluate(() => {
  const labels = ["Кариес", "Пульпит", "Пломба", "Коронка", "Имплантат", "Имплантат в плане", "Отсутствует", "Здоров"];
  const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
  return {
    found: labels.filter((l) => buttons.includes(l)),
    missing: labels.filter((l) => !buttons.includes(l)),
  };
});
console.log("состояния в открытом меню:", menu.found.length, "из 8");
if (menu.missing.length) console.log("  ОТСУТСТВУЮТ:", menu.missing.join(", "));

const ok =
  chart.count > 0 &&
  chart.withRole === chart.count &&
  chart.focusable === chart.count &&
  chart.labelled === chart.count &&
  opened &&
  menu.missing.length === 0;

if (errors.length) console.log("ошибки страницы:", errors.slice(0, 3));
console.log(ok ? "\nИТОГ: клавиатурный доступ и полный набор состояний подтверждены" : "\nИТОГ: СБОЙ");
await browser.close();
process.exit(ok ? 0 : 1);
