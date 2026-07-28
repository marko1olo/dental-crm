/**
 * Снимки всех разделов в светлой и тёмной теме, на настольном экране и на
 * телефоне.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО И ПОЧЕМУ ЭТОТ ФАЙЛ ПРАВИЛИ
 * 1. Тема не проверялась перед снимком. Имя файла отражало тему, которую
 *    сценарий ХОТЕЛ, а не которая была применена к <html>. Тот же класс дефекта
 *    в соседнем сценарии дал плиту light_duplicateAlert.png с ночными пикселями
 *    (VISUAL_VERDICT.md, аддендум C1).
 * 2. waitForViewReady предупреждал и шёл дальше. Из-за этого шесть картинок с
 *    экраном ошибки Vite и снимок экрана ввода PIN легли в папку под именами
 *    разделов и тем (VISUAL_VERDICT.md, §0 и A0.1). Стоячее правило оттуда:
 *    прогон, в котором ожидание раздела не дождалось, надо выбрасывать, а не
 *    подшивать. Теперь он падает.
 * 3. Побайтово одинаковые файлы никто не считал: 56 файлов при 44 уникальных
 *    md5, четырнадцать клонов в двух группах. Теперь считает сценарий и падает.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-redesign-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9331;
/** Время старта: попадает в theme-audit.json, чтобы снимки нельзя было спутать со вчерашними. */
const runStartedAt = new Date().toISOString();

// 1. Enforce Live Server HTTP 200 Check
try {
  const res = await fetch(webBaseUrl);
  if (!res.ok) {
    throw new Error(`Web server returned status ${res.status}`);
  }
} catch (e) {
  throw new Error(
    `LIVE SERVER REQUIRED: Web server at ${webBaseUrl} is offline (${e.message}). Start server with npm run dev before running screenshots.`
  );
}

await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-shot-profile");
await mkdir(tmpProfile, { recursive: true });

const browser = spawn(browserPath, [
  "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run",
  "--remote-allow-origins=*", `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${tmpProfile}`, "--window-size=1440,900", `${webBaseUrl}/`,
], { stdio: ["ignore", "ignore", "pipe"] });

// Сценарий теперь может упасть посередине: проверка темы и ожидание раздела
// обрывают прогон. Без этой строки каждое падение оставляло бы headless-браузер
// висеть на общей машине.
process.on("exit", () => {
  try {
    browser.kill();
  } catch {
    /* уже мёртв */
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTargets(retries = 40) {
  for (let i = 0; i < retries; i++) {
    try { const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`); const t = await r.json(); if (t.length) return t; } catch {}
    await sleep(1000);
  }
  throw new Error("CDP not ready");
}
const targets = await getTargets();
const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
socket.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (!msg.id) return;
  const req = pending.get(msg.id);
  if (!req) return;
  pending.delete(msg.id);
  if (msg.error) req.reject(new Error(msg.error.message));
  else req.resolve(msg.result);
};
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = () => rej(new Error("WS fail")); });
const cdp = {
  send(method, params = {}) {
    id++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }));
  }
};

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

async function setViewport(width, height, mobile) {
  if (mobile) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
  } else {
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  }
  // Размер окна — часть ключа отпечатка палитры: часть тем-зависимых токенов
  // может быть объявлена внутри @media.
  currentViewport = `${width}x${height}${mobile ? " mobile" : ""}`;
  await sleep(500);
}

async function evaluate(expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r?.result?.value;
}

const THEMES = ["light", "dark", "night"];

/**
 * СОСТОЯНИЕ ТЕМЫ, СЧИТАННОЕ СО СТРАНИЦЫ: не «что просили», а «что применено».
 * Отпечаток палитры — вычисленные значения всех пользовательских свойств,
 * которые вообще зависят от темы. Список имён не зашит: токен считается
 * тем-зависимым, если объявлен в блоках хотя бы двух разных тем. Зашитый список
 * разошёлся бы с палитрой, а расхождение значило бы, что охрана проверяет не то,
 * что рисуется.
 */
const THEME_STATE_EXPRESSION = `
  (() => {
    const root = document.documentElement;
    const store = window.__useThemeStore;
    const themesOfToken = new Map();
    const collect = (rules) => {
      for (const rule of rules) {
        if (rule.cssRules) collect(rule.cssRules);
        const selector = rule.selectorText;
        if (!selector || !rule.style) continue;
        const themes = selector
          .split("[data-theme=")
          .slice(1)
          .map((part) => part.slice(0, part.indexOf("]")).split('"').join("").split("'").join("").trim())
          .filter(Boolean);
        if (!themes.length) continue;
        for (let index = 0; index < rule.style.length; index += 1) {
          const name = rule.style.item(index);
          if (!name.startsWith("--")) continue;
          let seen = themesOfToken.get(name);
          if (!seen) {
            seen = new Set();
            themesOfToken.set(name, seen);
          }
          for (const theme of themes) seen.add(theme);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        collect(sheet.cssRules);
      } catch {
        /* чужой источник (шрифты Google): правила недоступны, палитры там нет */
      }
    }
    const computed = getComputedStyle(root);
    const activeTheme = root.dataset.theme || "";
    const varying = [...themesOfToken.entries()]
      .filter((entry) => entry[1].size > 1)
      .map((entry) => entry[0])
      .sort();
    const declaredHere = varying.filter((name) => themesOfToken.get(name).has(activeTheme));
    return {
      dataTheme: activeTheme,
      mode: store ? store.getState().themeMode : null,
      className: root.className,
      tokenCount: varying.length,
      declaredHere: declaredHere.length,
      empty: declaredHere.filter((name) => !computed.getPropertyValue(name).trim()),
      values: varying.map((name) => name + ":" + computed.getPropertyValue(name).trim()),
    };
  })()
`;

async function readThemeState() {
  const state = await evaluate(THEME_STATE_EXPRESSION);
  if (!state) throw new Error("Страница не вернула состояние темы");
  return { ...state, fingerprint: createHash("sha256").update(state.values.join("\n")).digest("hex").slice(0, 12) };
}

/**
 * Тема переключается ТОЛЬКО через хранилище приложения — тем же вызовом, что и
 * переключатель в интерфейсе. Прежний вариант дополнительно писал themeMode в
 * два блока настроек, которых не читает никто (`rg themeMode apps/web` даёт
 * только themeStore, themeClasses, AppShell, workspaceShell и QrGatewayPanel),
 * и переставлял data-theme руками — то есть обходил единственный источник
 * истины. И он же гасил экран блокировки кликом по `button:not([disabled])`, то
 * есть по первой попавшейся включённой кнопке на странице. Это убрано: PIN
 * набирается в nav() адресно, а слепой клик по чужой кнопке в функции темы —
 * способ нажать «Удалить» и не узнать об этом.
 */
async function setTheme(theme) {
  const applied = await evaluate(`(() => {
    const store = window.__useThemeStore;
    if (!store) return false;
    store.getState().setThemeMode('${theme}');
    return true;
  })()`);
  if (!applied) {
    throw new Error(`Хранилище темы недоступно (window.__useThemeStore): приложение не загрузилось, тема «${theme}» не применена`);
  }

  const deadline = Date.now() + 15000;
  let state = null;
  while (Date.now() < deadline) {
    state = await readThemeState();
    if (state.dataTheme === theme && state.mode === theme && state.tokenCount > 0 && state.empty.length === 0) {
      console.log(`theme ${theme}: data-theme «${state.dataTheme}», режим «${state.mode}», токенов ${state.tokenCount}, палитра ${state.fingerprint}`);
      return state;
    }
    await sleep(150);
  }
  throw new Error(
    `Тема «${theme}» не применилась за 15 с: data-theme «${state?.dataTheme}», режим «${state?.mode}», пустых тем-зависимых токенов ${state?.empty?.length ?? 0}`,
  );
}

/**
 * ПРОВЕРКА ПЕРЕД КАЖДЫМ СНИМКОМ. Снимок с чужой темой под именем light_* — это
 * выдуманное доказательство, поэтому прогон падает, а не предупреждает.
 */
const paletteByThemeAndViewport = new Map();
let currentViewport = "не задан";

async function assertThemeBeforeShot(theme, name) {
  const state = await readThemeState();
  const where = `${name}.png (ожидалась тема «${theme}»)`;

  const namedTheme = THEMES.find((candidate) => name.includes(candidate));
  if (namedTheme && namedTheme !== theme) {
    throw new Error(`${where}: имя файла говорит о теме «${namedTheme}». Имя и снимаемая тема разошлись — ошибка в сценарии.`);
  }
  if (state.dataTheme !== theme) {
    throw new Error(
      `${where}: на <html> применена тема «${state.dataTheme || "нет атрибута"}», режим хранилища «${state.mode}». Прогон остановлен: снимок с чужой темой под этим именем — подложное доказательство.`,
    );
  }
  if (state.mode !== theme) {
    throw new Error(`${where}: атрибут верный, но режим в хранилище «${state.mode}». Перезагрузка вернёт другую тему.`);
  }
  if (state.tokenCount === 0) {
    throw new Error(`${where}: в загруженных стилях нет ни одного тем-зависимого токена. Палитра не загрузилась.`);
  }
  if (state.empty.length > 0) {
    throw new Error(`${where}: тем-зависимые токены без значения (${state.empty.length}): ${state.empty.slice(0, 6).join(", ")}.`);
  }

  const key = `${theme}@${currentViewport}`;
  const known = paletteByThemeAndViewport.get(key);
  if (known && known !== state.fingerprint) {
    throw new Error(`${where}: палитра темы «${theme}» изменилась посреди прогона (${known} -> ${state.fingerprint}).`);
  }
  if (!known) {
    for (const [otherKey, otherFingerprint] of paletteByThemeAndViewport) {
      if (otherFingerprint !== state.fingerprint) continue;
      const [otherTheme, otherViewport] = otherKey.split("@");
      if (otherTheme === theme || otherViewport !== currentViewport) continue;
      throw new Error(`${where}: палитра совпала с темой «${otherTheme}» при том же размере окна (${state.fingerprint}). Атрибут переставлен, цвета не сменились.`);
    }
    paletteByThemeAndViewport.set(key, state.fingerprint);
  }

  return state;
}

async function waitForViewReady(viewName) {
  const panelMap = {
    shift: '#shift, .shift-hero, .panel',
    schedule: '#schedule, .schedule-panel',
    patients: '#patients, .patients-panel',
    imaging: '#imaging, .imaging-panel',
    visit: '#visit, .visit-panel',
    documents: '#documents, .documents-panel',
    finance: '#finance, .finance-panel',
    analytics: '#analytics, .analytics-panel',
    communications: '#communications, .communications-panel',
    settings: '#settings, .settings-zone',
    marketing: '#marketing, .marketing-panel'
  };
  const sel = panelMap[viewName] || '.panel';
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(`Boolean(document.querySelector('${sel}') && !document.querySelector('${sel}[aria-busy="true"]'))`);
    if (ready) {
      await sleep(500);
      return;
    }
    await sleep(250);
  }
  /**
   * Раньше здесь стоял console.warn и прогон шёл дальше. Именно так шесть
   * снимков экрана ошибки Vite легли в папку под именами трёх тем, а экран
   * ввода PIN — под именем раздела документов (VISUAL_VERDICT.md §0, A0.1).
   * Стоячее правило оттуда: такой прогон выбрасывают, а не подшивают. Снимок
   * того, что осталось на экране, пишется рядом — иначе причину не отличить.
   */
  const stuck = await cdp.send("Page.captureScreenshot", { format: "png" });
  const stuckName = `НЕ_ОТКРЫЛСЯ_${viewName}.png`;
  await writeFile(path.join(OUT, stuckName), Buffer.from(stuck.data, "base64"));
  throw new Error(
    `Раздел «${viewName}» не открылся за 10 с: контейнер ${sel} не появился или остался aria-busy. Снимать нечего, прогон остановлен. Что было на экране: ${stuckName}`,
  );
}

async function nav(viewName) {
  await evaluate(`(() => {
    try {
      if (!localStorage.getItem("dente_staff_token")) {
        localStorage.setItem("dente_staff_token", "demo-staff-token");
        localStorage.setItem("dente_clinic_token", "demo-clinic-token");
        localStorage.setItem("dente_workspace_role", "owner");
      }
    } catch(e) {}
  })()`);

  await evaluate(`(() => {
    try {
      const pinPad = document.querySelector('.staff-pin-pad, .pin-lock-screen');
      if (pinPad) {
        const staffCard = document.querySelector('.staff-card, .staff-member-item');
        if (staffCard) staffCard.click();
        const zeroBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '0');
        if (zeroBtn) {
          for (let i = 0; i < 4; i++) zeroBtn.click();
        }
      }
    } catch(e) {}
  })()`);

  const selector = `aside.sidebar nav a[href="#${viewName}"], .dnt-bottom-nav a[href="#${viewName}"]`;
  const success = await evaluate(`(() => {
    const link = document.querySelector('${selector}');
    if (link) {
      link.click();
      return true;
    }
    window.location.hash = "#${viewName}";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return false;
  })()`);
  await waitForViewReady(viewName);
}

/** Что прогон реально записал: имя, заявленная и применённая тема, палитра, md5. */
const shotLog = [];

async function shot(name, theme) {
  // Проверка вплотную к затвору: между переключением темы и этим кадром были
  // переход в раздел и ожидания, за которые приложение могло применить тему
  // заново из своего хранилища.
  const themeState = await assertThemeBeforeShot(theme, name);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const buf = Buffer.from(data, "base64");
  await writeFile(path.join(OUT, `${name}.png`), buf);
  shotLog.push({
    file: `${name}.png`,
    theme,
    dataTheme: themeState.dataTheme,
    storeMode: themeState.mode,
    palette: themeState.fingerprint,
    viewport: currentViewport,
    md5: createHash("md5").update(buf).digest("hex"),
    bytes: buf.length,
  });
  console.log(`shot ${name}.png (${Math.round(buf.length / 1024)}KB, тема «${themeState.dataTheme}», палитра ${themeState.fingerprint})`);
}

// bootstrap demo session via localStorage tokens & seed owner role preferences
await sleep(3000);
await evaluate(`(async () => {
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@clinic.com', password: 'password' })
    });
    const data = await r.json();
    if (data.clinicToken && data.staffToken) {
      localStorage.setItem("dente_clinic_token", data.clinicToken);
      localStorage.setItem("dente_staff_token", data.staffToken);
      localStorage.setItem("dente_clinic_tenant_id", data.user.organizationId || "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingDismissedAt: new Date().toISOString(),
        onboardingDraftMode: false,
        themeMode: "light",
        savedAt: new Date().toISOString()
      }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        onboardingDismissed: true,
        selectedWorkspaceRole: "owner",
        onboardingDismissedAt: new Date().toISOString(),
        onboardingDraftMode: false,
        themeMode: "light"
      }));
      localStorage.setItem("dente_onboarding_dismissed_v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
    } else {
      console.error("Login failed in screenshot script:", data);
    }
  } catch (e) {
    console.error("Screenshot login error:", e);
  }
})()`);

async function waitForWorkspace() {
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(`Boolean(document.querySelector('.shift-hero, .panel, .today-schedule-box, .section-card'))`);
    if (ready) return;
    await sleep(500);
  }
}

await evaluate(`window.location.reload()`);
await waitForWorkspace();
await sleep(2000);

const allViews = ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "analytics", "communications", "settings", "marketing"];

// 1. DESKTOP LIGHT (1440x900)
await setViewport(1440, 900, false);
await setTheme("light");
for (const v of allViews) {
  await nav(v);
  await shot(`desktop_light_${v}`, "light");
}

// Desktop collapsed sidebar screenshot
await nav("shift");
await evaluate(`(() => { const b = document.querySelector('.sidebar-collapse-button'); if (b) b.click(); return !!b; })()`);
await sleep(700);
await shot("desktop_light_shift_collapsed", "light");
await evaluate(`(() => { const b = document.querySelector('.sidebar-collapse-button'); if (b) b.click(); return !!b; })()`);
await sleep(700);

// 2. DESKTOP DARK (1440x900)
await setTheme("dark");
for (const v of allViews) {
  await nav(v);
  await shot(`desktop_dark_${v}`, "dark");
}

// 3. MOBILE LIGHT (390x844)
await setViewport(390, 844, true);
await setTheme("light");
for (const v of allViews) {
  await nav(v);
  await shot(`mobile_light_${v}`, "light");
}

// 4. MOBILE DARK (390x844)
await setTheme("dark");
for (const v of allViews) {
  await nav(v);
  await shot(`mobile_dark_${v}`, "dark");
}

socket.close();

/**
 * АУДИТ ПРОГОНА. Раньше побайтовые совпадения считал человек — и нашёл 56 файлов
 * при 44 уникальных md5: четырнадцать клонов одного снимка экрана ошибки Vite,
 * разложенных по именам разделов и тем (VISUAL_VERDICT.md §0, A0). Прогон, который
 * это выдал, вышел с кодом 0. Теперь считает сценарий и падает: каждый файл — свой
 * раздел, своя тема или свой размер окна, побайтово одинаковых быть не может.
 */
const byHash = new Map();
for (const entry of shotLog) {
  const group = byHash.get(entry.md5) ?? [];
  group.push(entry);
  byHash.set(entry.md5, group);
}

await writeFile(
  path.join(OUT, "theme-audit.json"),
  JSON.stringify(
    {
      startedAt: runStartedAt,
      finishedAt: new Date().toISOString(),
      out: OUT,
      palettes: [...paletteByThemeAndViewport].map(([key, fingerprint]) => ({ key, fingerprint })),
      shots: shotLog.length,
      uniqueMd5: byHash.size,
      files: shotLog,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`\nСнимков записано: ${shotLog.length}, уникальных md5: ${byHash.size}`);
for (const [key, fingerprint] of paletteByThemeAndViewport) console.log(`  палитра ${key}: ${fingerprint}`);
console.log(`Происхождение каждого снимка: ${path.join(OUT, "theme-audit.json")}`);

const collisions = [...byHash.values()].filter((group) => group.length > 1);
if (collisions.length > 0) {
  for (const group of collisions) {
    console.error(`  побайтово одинаковы: ${group.map((entry) => `${entry.file} (тема ${entry.theme}, ${entry.viewport})`).join(", ")}`);
  }
  throw new Error(
    `Аудит прогона: ${collisions.length} групп(а) побайтово одинаковых снимков. Разные разделы, темы и размеры окна не могут дать один файл — снимки не отражают то, чем названы.`,
  );
}
console.log("Done");
