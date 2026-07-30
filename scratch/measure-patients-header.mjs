/**
 * ЗАМЕР ШАПКИ КАРТОТЕКИ в живом браузере. Только чтение: ни одного клика,
 * который что-то создаёт или сохраняет.
 *
 * Отвечает числами на два вопроса ведущего:
 *   1. Правда ли поле поиска и поле умного создания выглядят одинаково —
 *      сравниваются ВЫЧИСЛЕННЫЕ стили, а не уменьшенная картинка.
 *   4. Лежит ли иконка лупы на тексте подсказки — измеряются рамки иконки,
 *      поля и фактическая ширина текста подсказки шрифтом самого поля.
 *
 * ВХОД БЕЗ /api/auth/login: маршрут входа читает таблицу users, а Postgres
 * сейчас не завершает рукопожатие, поэтому логин повис бы. Токены берутся из
 * .ops-shot-tokens.json — они подписаны сервером и живут до августа.
 *
 * Запуск: node scratch/measure-patients-header.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(path.join(repoRoot, ".ops-shot-tokens.json"), "utf8"));
const WEB = "http://127.0.0.1:5173/";

const COMPARED_PROPERTIES = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderTopStyle",
  "borderTopColor",
  "borderTopLeftRadius",
  "backgroundColor",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "color",
  "boxShadow",
  "height",
  "lineHeight",
  "textTransform",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("pageerror", (error) => console.log(`[ошибка страницы] ${error.message}`));

await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate((payload) => {
  localStorage.setItem("dente_clinic_token", payload.clinicToken);
  localStorage.setItem("dente_staff_token", payload.staffToken);
  if (payload.organizationId) localStorage.setItem("dente_clinic_tenant_id", payload.organizationId);
  localStorage.setItem("dente_workspace_role", "owner");
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem(
    "dental-crm:onboarding:v1",
    JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }),
  );
  localStorage.setItem(
    "dental-crm:web-ui-preferences:v1",
    JSON.stringify({
      version: 1,
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingDismissedAt: new Date().toISOString(),
      onboardingDraftMode: false,
      savedAt: new Date().toISOString(),
    }),
  );
  localStorage.setItem(
    "dente_onboarding_dismissed_v1",
    JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }),
  );
}, { ...tokens, organizationId: tokens.organizationId ?? tokens.user?.organizationId ?? null });

await page.goto(`${WEB}#patients`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.location.hash = "#patients";
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});

let found = false;
for (let attempt = 0; attempt < 40; attempt += 1) {
  found = await page.evaluate(
    () => Boolean(document.querySelector(".patients-search-box input") && document.querySelector(".smart-input-wrapper input:not([style*='display: none'])")),
  );
  if (found) break;
  await page.waitForTimeout(500);
}
if (!found) {
  const where = await page.evaluate(() => ({
    hash: window.location.hash,
    title: document.title,
    panels: [...document.querySelectorAll("[id]")].map((node) => node.id).slice(0, 25),
  }));
  console.log("ШАПКА КАРТОТЕКИ НЕ НАЙДЕНА. Где мы:", JSON.stringify(where));
  await page.screenshot({ path: path.join(repoRoot, "scratch", "measure-patients-header-НЕ_НАЙДЕНО.png") });
  await browser.close();
  process.exit(1);
}

const measured = await page.evaluate((properties) => {
  const searchInput = document.querySelector(".patients-search-box input");
  const smartInput = document.querySelector(".smart-input-wrapper input[aria-label='Быстрый ввод пациентов']");
  const searchBox = document.querySelector(".patients-search-box");
  const smartGroup = document.querySelector(".smart-create-group");
  const icon = document.querySelector(".patients-search-box svg");
  const createButton = document.querySelector(".quick-create-action");

  const styleOf = (node) => {
    if (!node) return null;
    const computed = getComputedStyle(node);
    const out = {};
    for (const property of properties) out[property] = computed[property];
    return out;
  };
  const boxOf = (node) => {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2), w: +rect.width.toFixed(2), h: +rect.height.toFixed(2), right: +rect.right.toFixed(2) };
  };

  /* Ширина текста подсказки — шрифтом самого поля, а не на глаз. */
  const textWidth = (node, text) => {
    if (!node) return null;
    const computed = getComputedStyle(node);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    return +context.measureText(text).width.toFixed(2);
  };

  const searchStyle = styleOf(searchInput);
  const smartStyle = styleOf(smartInput);
  const same = [];
  const different = [];
  for (const property of properties) {
    if (searchStyle?.[property] === smartStyle?.[property]) same.push(property);
    else different.push({ property, поиск: searchStyle?.[property], создание: smartStyle?.[property] });
  }

  return {
    поиск: {
      placeholder: searchInput?.getAttribute("placeholder") ?? null,
      ariaLabel: searchInput?.getAttribute("aria-label") ?? null,
      type: searchInput?.getAttribute("type") ?? null,
      стиль: searchStyle,
      рамка: boxOf(searchInput),
      ширинаТекстаПодсказки: textWidth(searchInput, searchInput?.getAttribute("placeholder") ?? ""),
      видимаяПодписьРядом: null,
    },
    создание: {
      placeholder: smartInput?.getAttribute("placeholder") ?? null,
      ariaLabel: smartInput?.getAttribute("aria-label") ?? null,
      type: smartInput?.getAttribute("type") ?? null,
      стиль: smartStyle,
      рамка: boxOf(smartInput),
      ширинаТекстаПодсказки: textWidth(smartInput, smartInput?.getAttribute("placeholder") ?? ""),
    },
    совпавшихСвойств: same.length,
    всегоСвойств: properties.length,
    совпали: same,
    различия: different,
    зоны: {
      поискБокс: { фон: searchBox ? getComputedStyle(searchBox).backgroundColor : null, рамка: searchBox ? getComputedStyle(searchBox).borderTopWidth + " " + getComputedStyle(searchBox).borderTopColor : null, box: boxOf(searchBox) },
      группаСоздания: { фон: smartGroup ? getComputedStyle(smartGroup).backgroundColor : null, рамка: smartGroup ? getComputedStyle(smartGroup).borderTopWidth + " " + getComputedStyle(smartGroup).borderTopColor : null, box: boxOf(smartGroup) },
      фоныОтличаются: Boolean(searchBox && smartGroup && getComputedStyle(searchBox).backgroundColor !== getComputedStyle(smartGroup).backgroundColor),
    },
    лупа: {
      рамка: boxOf(icon),
      paddingLeftПоля: searchStyle?.paddingLeft ?? null,
      левыйКрайТекста: searchInput ? +(searchInput.getBoundingClientRect().x + parseFloat(searchStyle?.paddingLeft ?? "0") + parseFloat(searchStyle?.borderTopWidth ?? "0")).toFixed(2) : null,
      правыйКрайИконки: icon ? +icon.getBoundingClientRect().right.toFixed(2) : null,
    },
    кнопкаСоздать: { текст: createButton?.textContent?.trim() ?? null, рамка: boxOf(createButton), disabled: createButton?.disabled ?? null },
    видимыеПодписи: [...document.querySelectorAll(".patients-header label, .patients-header .field-label, .patients-header legend")].map((node) => node.textContent?.trim()),
    строкСписка: document.querySelectorAll(".patient-row").length,
    пустоеСостояние: document.querySelector(".patient-empty-state")?.textContent?.trim()?.slice(0, 120) ?? null,
    подсказкаСоздания: document.querySelector(".quick-create-guidance")?.textContent?.trim() ?? null,
  };
}, COMPARED_PROPERTIES);

console.log(JSON.stringify(measured, null, 2));
writeFileSync(path.join(repoRoot, "scratch", "measure-patients-header.json"), JSON.stringify(measured, null, 2), "utf8");

const header = await page.$(".patients-header");
if (header) {
  await header.screenshot({ path: path.join(repoRoot, "scratch", "measure-patients-header-ЗАМЕР.png") });
}

await browser.close();
