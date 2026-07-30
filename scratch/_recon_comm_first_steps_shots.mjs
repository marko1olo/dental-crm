/**
 * РАЗВЕДКА: раздел «Связь» (#communications) в трёх темах и на узком экране.
 *
 * Зачем не scripts/ops-panels-shots.mjs: тот держит ведущий и править его нельзя,
 * а он снимает ОТДЕЛЬНЫЕ панели по data-testid плюс раздел целиком только в
 * светлой теме. Здесь нужно другое: весь раздел во всех трёх темах и на узком
 * экране, ПЛЮС машинный обход DOM, который считает блоки «ничего нет» и их
 * порядок относительно полей ввода. По картинке порядок можно только угадать.
 *
 * Ничего не правит в дереве. Пишет только в .dente-recon-shots.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-recon-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9357;
const THEMES = ["light", "dark", "night"];

const res = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}).`);
});
if (!res.ok) throw new Error(`Веб-сервер ответил ${res.status}`);

await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-recon-comm-profile");
await mkdir(tmpProfile, { recursive: true });

const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${tmpProfile}`,
    "--window-size=1600,1000",
    `${webBaseUrl}/`,
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
process.on("exit", () => {
  try {
    browser.kill();
  } catch {
    /* уже мёртв */
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPageTarget(retries = 40) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      /* браузер поднимается */
    }
    await sleep(1000);
  }
  throw new Error("Отладочный порт браузера не отвечает");
}

const pageTarget = await getPageTarget();
const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, {
  perMessageDeflate: false,
  maxPayload: 512 * 1024 * 1024,
});
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let messageId = 0;
const pending = new Map();
const pageErrors = [];
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params?.exceptionDetails;
    pageErrors.push(details?.exception?.description || details?.text || "исключение без описания");
    return;
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
    const text = (message.params.args || []).map((arg) => arg.description || arg.value || "").join(" ").trim();
    if (text) pageErrors.push(text);
    return;
  }
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  const id = ++messageId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method}: нет ответа`));
      }
    }, 30000);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`Ошибка в странице: ${result.exceptionDetails.text}`);
  return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

const tokenFile = path.join("C:/Clinic_MVP/dental-crm", ".ops-shot-tokens.json");
if (!existsSync(tokenFile)) throw new Error(`Нет ${tokenFile}`);
const { clinicToken, staffToken } = JSON.parse(await readFile(tokenFile, "utf8"));

await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: webBaseUrl + "/" });

async function waitForWorkspace(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await evaluate(`
      (() => {
        const sidebar = document.querySelector('.sidebar, nav .nav-item');
        const login = document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ");
        const wizard = document.body.textContent?.includes("Быстрая настройка CRM Dente");
        return { ready: Boolean(sidebar) && !login && !wizard, login: Boolean(login), wizard: Boolean(wizard) };
      })()
    `);
    if (state?.ready) return true;
    if (state?.wizard) {
      await evaluate(
        `window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`,
      );
    }
    await sleep(1200);
  }
  /* Диагностика вместо догадки: что именно на экране. */
  const where = await evaluate(`
    (() => ({
      hash: window.location.hash,
      href: window.location.href,
      text: (document.body.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 600),
      pin: Boolean(document.querySelector(".staff-pin-pad, .pin-lock-screen")),
      sidebar: Boolean(document.querySelector(".sidebar")),
      navItem: Boolean(document.querySelector("nav .nav-item")),
      storage: Object.keys(window.localStorage),
    }))()
  `);
  const stuck = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT, "ДИАГНОСТИКА_кабинет_не_открылся.png"), Buffer.from(stuck.data, "base64"));
  throw new Error(
    `Рабочий кабинет не открылся. Адрес «${where?.href}», PIN: ${where?.pin}, .sidebar: ${where?.sidebar}, nav .nav-item: ${where?.navItem}\n` +
      `Ключи localStorage: ${(where?.storage ?? []).join(", ")}\n` +
      `Ошибки страницы: ${pageErrors.slice(-4).join(" || ") || "(нет)"}\n` +
      `Текст экрана: ${where?.text}`,
  );
}
await waitForWorkspace();
console.log("Кабинет открыт");

/** Состояние темы, считанное со страницы (тот же приём, что у ведущего). */
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
        const themes = selector.split("[data-theme=").slice(1)
          .map((part) => part.slice(0, part.indexOf("]")).split('"').join("").split("'").join("").trim())
          .filter(Boolean);
        if (!themes.length) continue;
        for (let i = 0; i < rule.style.length; i += 1) {
          const name = rule.style.item(i);
          if (!name.startsWith("--")) continue;
          let seen = themesOfToken.get(name);
          if (!seen) { seen = new Set(); themesOfToken.set(name, seen); }
          for (const theme of themes) seen.add(theme);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try { collect(sheet.cssRules); } catch { /* чужой источник */ }
    }
    const computed = getComputedStyle(root);
    const activeTheme = root.dataset.theme || "";
    const varying = [...themesOfToken.entries()].filter((e) => e[1].size > 1).map((e) => e[0]).sort();
    const values = varying.map((name) => name + ":" + computed.getPropertyValue(name).trim());
    const declaredHere = varying.filter((name) => themesOfToken.get(name).has(activeTheme));
    return {
      dataTheme: activeTheme,
      mode: store ? store.getState().themeMode : null,
      className: root.className,
      tokenCount: varying.length,
      empty: declaredHere.filter((name) => !computed.getPropertyValue(name).trim()),
      values,
    };
  })()
`;
const fingerprint = (values) => createHash("sha256").update(values.join("\n")).digest("hex").slice(0, 12);

async function readThemeState() {
  const state = await evaluate(THEME_STATE_EXPRESSION);
  if (!state) throw new Error("Страница не вернула состояние темы");
  return { ...state, fingerprint: fingerprint(state.values) };
}

async function applyTheme(theme) {
  const applied = await evaluate(`
    (() => {
      const store = window.__useThemeStore;
      if (!store) return { ok: false };
      store.getState().setThemeMode(${JSON.stringify(theme)});
      return { ok: true };
    })()
  `);
  if (!applied?.ok) throw new Error(`Хранилище темы недоступно, тема «${theme}» не применена`);
  const deadline = Date.now() + 15000;
  let state = null;
  while (Date.now() < deadline) {
    state = await readThemeState();
    if (state.dataTheme === theme && state.mode === theme && state.tokenCount > 0 && state.empty.length === 0) return state;
    await sleep(150);
  }
  throw new Error(
    `Тема «${theme}» не применилась: data-theme «${state?.dataTheme}», режим «${state?.mode}», пустых токенов ${state?.empty?.length ?? 0}`,
  );
}

let currentViewport = "не задан";
async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 800 });
  currentViewport = `${width}x${height}`;
}

async function goToCommunications() {
  await evaluate(`
    (() => {
      if (window.location.hash === "#communications") {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = "communications";
      }
      return window.location.hash;
    })()
  `);
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const ready = await evaluate(
      `Boolean(document.querySelector("#communications, .communications-panel")) && !document.querySelector('#communications[aria-busy="true"], .communications-panel[aria-busy="true"]')`,
    );
    if (ready) {
      await sleep(1200);
      return true;
    }
    await sleep(250);
  }
  throw new Error("Раздел «Связь» не открылся");
}

const shotLog = [];
async function writeShot(fileName, base64, theme, state, note) {
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength < 12000) {
    throw new Error(`Кадр «${fileName}» весит ${buffer.byteLength} байт — это пустой лист, а не раздел.`);
  }
  await writeFile(path.join(OUT, fileName), buffer);
  const md5 = createHash("md5").update(buffer).digest("hex");
  shotLog.push({ file: fileName, theme, dataTheme: state?.dataTheme, palette: state?.fingerprint, viewport: currentViewport, md5, bytes: buffer.length });
  console.log(`  ✓ ${fileName} (${note}, тема «${state?.dataTheme}», палитра ${state?.fingerprint}, md5 ${md5.slice(0, 12)})`);
}

async function assertTheme(theme, fileName) {
  const state = await readThemeState();
  if (state.dataTheme !== theme || state.mode !== theme) {
    throw new Error(`${fileName}: применена тема «${state.dataTheme}»/режим «${state.mode}», ожидалась «${theme}»`);
  }
  if (state.empty.length) throw new Error(`${fileName}: пустых тем-зависимых токенов ${state.empty.length}`);
  return state;
}

async function shootFull(fileName, theme, width, scale) {
  const state = await assertTheme(theme, fileName);
  const height = await evaluate("Math.min(document.body.scrollHeight, 12000)");
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width, height, scale },
    captureBeyondViewport: true,
  });
  await writeShot(fileName, shot.data, theme, state, `высота ${height}, масштаб ${scale}`);
  return height;
}

/** Читаемый ломоть: полный масштаб, окно по вертикали. */
async function shootSlice(fileName, theme, width, y, height) {
  const state = await assertTheme(theme, fileName);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y, width, height, scale: 1 },
    captureBeyondViewport: true,
  });
  await writeShot(fileName, shot.data, theme, state, `y=${y}..${y + height}, масштаб 1`);
}

/**
 * МАШИННЫЙ ОБХОД. Считает блоки «ничего нет» и поля ввода в порядке документа с
 * координатами. Порядок и «вперемешку с полями ввода» — это утверждения, которые
 * надо мерить, а не смотреть.
 */
const PROBE = `
  (() => {
    const root = document.querySelector("#communications") || document.querySelector(".communications-panel");
    if (!root) return { error: "раздел не найден" };
    const EMPTYISH = /(пока нет|нет\\.|нет$|пуста|пусто|не подключ|не найдено|отсутству|ничего не|нет активных|нет данных|нет сообщений|не уйдут)/i;

    const all = [...root.querySelectorAll("*")];
    const ownText = (node) => {
      let text = "";
      for (const child of node.childNodes) {
        if (child.nodeType === 3) text += child.textContent;
      }
      return text.replace(/\\s+/g, " ").trim();
    };

    /* Кандидат в «сообщение о пустоте»: узел, чей СОБСТВЕННЫЙ текст похож на
       сообщение о пустоте, либо узел с классом пустого состояния. Собственный
       текст, а не textContent — иначе каждый родитель тоже попадёт в список. */
    const emptyBlocks = [];
    for (const node of all) {
      const isEmptyStateComponent = node.classList.contains("dnt-empty-state");
      const text = isEmptyStateComponent ? node.textContent.replace(/\\s+/g, " ").trim() : ownText(node);
      if (!text || text.length > 300) continue;
      if (!isEmptyStateComponent && !EMPTYISH.test(text)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") continue;
      emptyBlocks.push({
        kind: isEmptyStateComponent ? "EmptyState-компонент" : "текст",
        tag: node.tagName.toLowerCase(),
        cls: (node.className || "").toString().slice(0, 70),
        testid: node.getAttribute("data-testid") || "",
        y: Math.round(rect.y + window.scrollY),
        h: Math.round(rect.height),
        text,
      });
    }
    /* Убираем вложенные дубли: если EmptyState-компонент уже посчитан, его
       внутренний абзац отдельным сообщением не считаем. */
    const componentRanges = emptyBlocks.filter((b) => b.kind === "EmptyState-компонент").map((b) => [b.y, b.y + b.h]);
    const deduped = emptyBlocks.filter(
      (b) => b.kind === "EmptyState-компонент" || !componentRanges.some(([from, to]) => b.y >= from && b.y + b.h <= to),
    );

    const fields = [...root.querySelectorAll("input, textarea, select")]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 4 && rect.height > 4;
      })
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          type: node.getAttribute("type") || "",
          label: node.getAttribute("aria-label") || node.getAttribute("placeholder") || node.getAttribute("name") || "",
          y: Math.round(rect.y + window.scrollY),
        };
      });

    /* Крупные карточки раздела в порядке документа: заголовок + есть ли внутри
       пустое сообщение + сколько полей ввода. Это и есть «устройство экрана». */
    const cards = [...root.querySelectorAll(".panel, .section-card, .dnt-card, [data-testid]")]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.height > 60 && rect.width > 200;
      })
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const heading = node.querySelector("h1, h2, h3, h4");
        return {
          testid: node.getAttribute("data-testid") || "",
          cls: (node.className || "").toString().slice(0, 60),
          heading: heading ? heading.textContent.replace(/\\s+/g, " ").trim().slice(0, 90) : "",
          y: Math.round(rect.y + window.scrollY),
          h: Math.round(rect.height),
          fields: node.querySelectorAll("input, textarea, select").length,
          buttons: node.querySelectorAll("button").length,
        };
      })
      .sort((a, b) => a.y - b.y);

    return {
      viewportWidth: window.innerWidth,
      pageHeight: document.body.scrollHeight,
      rootHeight: Math.round(root.getBoundingClientRect().height),
      emptyBlocks: deduped.sort((a, b) => a.y - b.y),
      fields: fields.sort((a, b) => a.y - b.y),
      cards,
    };
  })()
`;

const probes = {};

await setViewport(1600, 1000);
await sleep(2000);

for (const theme of THEMES) {
  console.log(`\nТема: ${theme}`);
  const applied = await applyTheme(theme);
  console.log(`  применено: data-theme «${applied.dataTheme}», режим «${applied.mode}», палитра ${applied.fingerprint}`);
  await goToCommunications();
  await sleep(1500);
  const height = await shootFull(`comm_${theme}_full.png`, theme, 1600, 0.5);
  if (theme === "light") {
    // Читаемые ломти только в светлой теме: правила раскладки общие, а читать
    // текст надо в одной теме, а не в трёх.
    for (let y = 0, index = 1; y < Math.min(height, 6000); y += 1000, index += 1) {
      await shootSlice(`comm_light_slice${index}.png`, theme, 1600, y, Math.min(1000, height - y));
    }
    probes.desktop = await evaluate(PROBE);
  }
}

console.log("\nУзкий экран 720×1100");
await setViewport(720, 1100);
await applyTheme("light");
await goToCommunications();
await sleep(1500);
await shootFull("comm_light_narrow720_full.png", "light", 720, 0.6);
probes.narrow720 = await evaluate(PROBE);

console.log("\nТелефон 390×844");
await setViewport(390, 844);
await applyTheme("light");
await goToCommunications();
await sleep(1500);
await shootFull("comm_light_phone390_full.png", "light", 390, 0.85);
probes.phone390 = await evaluate(PROBE);

await writeFile(
  path.join(OUT, "comm-probe.json"),
  JSON.stringify({ startedAt: new Date().toISOString(), shots: shotLog, pageErrors: pageErrors.slice(-10), probes }, null, 2),
  "utf8",
);

socket.close();

console.log(`\nСнимки: ${OUT}`);
const byHash = new Map();
for (const entry of shotLog) {
  const group = byHash.get(entry.md5) ?? [];
  group.push(entry);
  byHash.set(entry.md5, group);
}
console.log(`Кадров: ${shotLog.length}, уникальных md5: ${byHash.size}`);
const collisions = [...byHash.values()].filter((group) => group.length > 1);
for (const group of collisions) {
  console.error(`  ПОДДЕЛКА: побайтово одинаковы ${group.map((e) => `${e.file} (${e.theme}, ${e.viewport})`).join(", ")}`);
}
for (const key of Object.keys(probes)) {
  const probe = probes[key];
  console.log(`\n=== ${key}: окно ${probe.viewportWidth}, высота страницы ${probe.pageHeight} ===`);
  console.log(`сообщений о пустоте: ${probe.emptyBlocks?.length ?? "?"}, полей ввода: ${probe.fields?.length ?? "?"}`);
  for (const block of probe.emptyBlocks ?? []) {
    console.log(`  y=${String(block.y).padStart(5)} [${block.kind}] ${block.text.slice(0, 130)}`);
  }
  console.log("  --- поля ввода ---");
  for (const field of probe.fields ?? []) console.log(`  y=${String(field.y).padStart(5)} ${field.tag}/${field.type} «${field.label}»`);
}
if (collisions.length) throw new Error(`${collisions.length} групп(а) побайтово одинаковых кадров`);
console.log("\nГотово");
