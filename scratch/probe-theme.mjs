import { chromium } from "playwright";

const WEB = "http://127.0.0.1:5173";
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

await p.goto(WEB, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
console.log("до установки:", await p.evaluate(() => ({
  ls: localStorage.getItem("dente_theme_mode"),
  theme: document.documentElement.dataset.theme,
  cls: document.documentElement.className,
})));

await p.evaluate(() => localStorage.setItem("dente_theme_mode", "dark"));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);

console.log("после reload:", await p.evaluate(() => ({
  ls: localStorage.getItem("dente_theme_mode"),
  theme: document.documentElement.dataset.theme,
  cls: document.documentElement.className,
  storeMode: window.__useThemeStore ? window.__useThemeStore.getState().themeMode : "нет стора",
  htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bodyBgImage: getComputedStyle(document.body).backgroundImage.slice(0, 80),
  bgAppToken: getComputedStyle(document.documentElement).getPropertyValue("--bg-app"),
  bgToken: getComputedStyle(document.documentElement).getPropertyValue("--bg"),
})));

// Теперь через стор, как это делает переключатель в интерфейсе.
await p.evaluate(() => window.__useThemeStore.getState().setThemeMode("dark"));
await p.waitForTimeout(800);
console.log("после setThemeMode('dark'):", await p.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  cls: document.documentElement.className,
  htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bgAppToken: getComputedStyle(document.documentElement).getPropertyValue("--bg-app"),
})));

await b.close();
