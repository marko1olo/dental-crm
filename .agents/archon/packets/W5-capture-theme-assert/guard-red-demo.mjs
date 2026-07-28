/**
 * Снимки рабочих панелей: обзвон, отправка сообщений, рассылки, отчёты.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ СЦЕНАРИЙ
 * Существующий scripts/dente-redesign-shots.mjs снимает разделы целиком в одной
 * теме. Здесь нужно другое: те же четыре панели в светлой, тёмной и ночной теме
 * плюс узкий экран — именно там ломается вёрстка, и именно это нельзя проверить
 * чтением исходников.
 *
 * Тема переключается через собственное хранилище приложения — тем же вызовом,
 * что и переключатель в интерфейсе, — и перед КАЖДЫМ снимком проверяется, какая
 * тема на самом деле применена к <html>. Подробности — у applyTheme и
 * assertThemeBeforeShot ниже.
 *
 * ТРЕБУЕТСЯ живой веб-сервер на 127.0.0.1:5173. Без него сценарий падает, а не
 * делает вид, что снял: снимок несуществующей страницы — это ложное
 * доказательство.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

/*
 * ============================================================================
 * ЭТО НЕ КОНВЕЙЕР. Это ЧЕРНОВАЯ КОПИЯ scripts/ops-panels-shots.mjs с НАРОЧНО
 * ПОДЛОЖЕННЫМ ДЕФЕКТОМ — чтобы показать, что новая проверка темы краснеет.
 * Охрана, про которую никто не доказал, что она умеет краснеть, — не охрана.
 *
 * Подложено ровно то, что случилось в жизни (VISUAL_VERDICT.md, аддендум C1):
 * тема применена правильно, а затем, ПЕРЕД снимком, data-theme подменяется на
 * «night» — так же, как это делает приложение при перезагрузке страницы или
 * горячей замене модуля темы. Ожидаемый результат: прогон падает, файл
 * light_*.png с ночными пикселями на диск НЕ попадает.
 *
 * Пишет в отдельный каталог и на отдельный порт отладки: настоящие плиты не
 * трогает. Отличия от конвейера — только четыре: OUT, cdpPort, профиль браузера
 * и блок ПОДЛОГ ниже.
 * ============================================================================
 */
const OUT = path.join(process.env.TEMP || "C:/tmp", "w5-guard-demo-shots");
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9351;
/** Время старта: попадает в theme-audit.json, чтобы плиты нельзя было спутать со вчерашними. */
const runStartedAt = new Date().toISOString();

const res = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}). Запустите npm run dev.`);
});
if (!res.ok) throw new Error(`Веб-сервер ответил ${res.status}`);

await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "w5-guard-demo-profile");
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

/**
 * Сценарий теперь МОЖЕТ упасть посередине: проверка темы обрывает прогон, а не
 * дописывает подложный снимок. Без этой строки каждое такое падение оставляло бы
 * висеть headless-браузер на общей машине.
 */
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
      /* браузер ещё поднимается */
    }
    await sleep(1000);
  }
  throw new Error("Отладочный порт браузера не отвечает");
}

const pageTarget = await getPageTarget();

const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let messageId = 0;
const pending = new Map();
/**
 * Ошибки страницы собираются всегда. Без этого пустой снимок ничего не
 * объясняет: панель может отсутствовать из-за вёрстки, из-за доступа или из-за
 * упавшего при отрисовке компонента, и различить это по картинке невозможно.
 */
const pageErrors = [];
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params?.exceptionDetails;
    pageErrors.push(details?.exception?.description || details?.text || "исключение без описания");
    return;
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
    const text = (message.params.args || [])
      .map((arg) => arg.description || arg.value || "")
      .join(" ")
      .trim();
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
  if (result.exceptionDetails) {
    throw new Error(`Ошибка в странице: ${result.exceptionDetails.text}`);
  }
  return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

/**
 * Вход в кабинет. Без токенов приложение показывает форму входа, и снимать
 * нечего. Токены выдаёт scripts/../seedOpsScreenshotDemo.ts и кладёт в файл
 * рядом; он временный и в репозиторий не попадает.
 */
const tokenFile = path.join(process.cwd(), ".ops-shot-tokens.json");
if (!existsSync(tokenFile)) {
  throw new Error(
    `Нет ${tokenFile}. Сначала: cd apps/api && npx tsx src/scripts/seedOpsScreenshotDemo.ts > ../../.ops-shot-tokens.json`,
  );
}
const { clinicToken, staffToken } = JSON.parse(await readFile(tokenFile, "utf8"));

await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    // Мастер первого запуска перекрывает весь экран: для новой организации он
    // показывается всегда. Гасим его тем же ключом, что и кнопка «пропустить».
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: webBaseUrl + "/" });

/**
 * Ждём именно рабочий кабинет, а не «просто загрузилось». Раздел подключается
 * лениво, и снимок, сделанный раньше времени, показал бы экран входа — то есть
 * ложное доказательство.
 */
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
      await evaluate(`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`);
    }
    await sleep(1200);
  }
  throw new Error("Рабочий кабинет не открылся: снимать нечего");
}

await waitForWorkspace();
console.log("Рабочий кабинет открыт");

/**
 * СОСТОЯНИЕ ТЕМЫ, СЧИТАННОЕ СО СТРАНИЦЫ.
 *
 * Возвращает не «что мы просили», а «что применено»: значение data-theme,
 * режим в хранилище приложения и отпечаток палитры — вычисленные значения всех
 * пользовательских свойств, которые вообще зависят от темы.
 *
 * Список имён токенов здесь намеренно НЕ зашит. Он берётся из самих правил CSS:
 * токен считается зависящим от темы, если объявлен в блоках хотя бы двух разных
 * тем. Зашитый список разошёлся бы с палитрой, а расхождение означало бы, что
 * охрана проверяет не то, что рисуется.
 */
const THEMES = ["light", "dark", "night"];

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
    const values = varying.map((name) => name + ":" + computed.getPropertyValue(name).trim());
    /* Пустым считается только токен, который для ТЕКУЩЕЙ темы объявлен, но не
       разрешился: значит цепочка var() оборвалась, и плашка покрасится в
       ничто. Токен, которого в этой теме просто нет, — не дефект. */
    const declaredHere = varying.filter((name) => themesOfToken.get(name).has(activeTheme));
    return {
      dataTheme: activeTheme,
      mode: store ? store.getState().themeMode : null,
      storeAvailable: Boolean(store),
      className: root.className,
      colorScheme: root.style.colorScheme,
      tokenCount: varying.length,
      declaredHere: declaredHere.length,
      empty: declaredHere.filter((name) => !computed.getPropertyValue(name).trim()),
      values,
    };
  })()
`;

/** Отпечаток палитры: короткий хеш от «имя:значение» всех тем-зависимых токенов. */
function paletteFingerprint(values) {
  return createHash("sha256").update(values.join("\n")).digest("hex").slice(0, 12);
}

async function readThemeState() {
  const state = await evaluate(THEME_STATE_EXPRESSION);
  if (!state) throw new Error("Страница не вернула состояние темы");
  return { ...state, fingerprint: paletteFingerprint(state.values) };
}

/** Текущий размер окна — часть ключа отпечатка: часть тем-зависимых токенов объявлена внутри @media. */
let currentViewport = "не задан";

/**
 * ПЕРЕКЛЮЧЕНИЕ ТЕМЫ ЧЕРЕЗ ХРАНИЛИЩЕ ПРИЛОЖЕНИЯ, А НЕ ЧЕРЕЗ АТРИБУТ РУКАМИ.
 *
 * ЧТО БЫЛО СЛОМАНО. Раньше здесь писался ключ localStorage «dente_theme» и
 * руками выставлялись data-theme и классы dark/light. Ключ «dente_theme» не
 * читает НИКТО: приложение хранит режим в «dente_theme_mode»
 * (apps/web/src/store/themeStore.ts:5). То есть конвейер ни разу не сообщил
 * приложению тему — он только подменял атрибут на <html>. Атрибут держится лишь
 * до следующего применения темы приложением: перезагрузка страницы Vite после
 * правки, повторная инициализация модуля темы при горячей замене, смена
 * системной темы в режиме «auto» — любое из этих событий вызывает
 * applyThemeToRoot (apps/web/src/AppShell.tsx:66) и молча возвращает data-theme
 * к значению из хранилища. Так «светлая» плита получила ночные пиксели
 * (VISUAL_VERDICT.md, аддендум C1).
 *
 * ЧТО ТЕПЕРЬ. Вызывается setThemeMode — та же функция, что и у переключателя в
 * интерфейсе (workspaceShell.tsx:353). Она сама пишет правильный ключ и сама
 * ведёт к applyThemeToRoot, поэтому источник истины один, а перезагрузка
 * страницы посреди прогона возвращает ТУ ЖЕ тему, а не чужую. Затем сценарий
 * ждёт, пока тема действительно применится, а не спит наугад.
 */
async function applyTheme(theme) {
  const applied = await evaluate(`
    (() => {
      const store = window.__useThemeStore;
      if (!store) return { ok: false };
      store.getState().setThemeMode(${JSON.stringify(theme)});
      return { ok: true };
    })()
  `);
  if (!applied?.ok) {
    throw new Error(
      `Хранилище темы недоступно (window.__useThemeStore не найден): приложение не загрузилось, снимать нечего. Тема «${theme}» не применена.`,
    );
  }

  const deadline = Date.now() + 15000;
  let state = null;
  while (Date.now() < deadline) {
    state = await readThemeState();
    if (state.dataTheme === theme && state.mode === theme && state.tokenCount > 0 && state.empty.length === 0) {
      return state;
    }
    await sleep(150);
  }
  throw new Error(
    `Тема «${theme}» не применилась за 15 с: data-theme «${state?.dataTheme}», режим «${state?.mode}», тем-зависимых токенов ${state?.tokenCount ?? 0}, пустых ${state?.empty?.length ?? 0}.`,
  );
}

/**
 * ПРОВЕРКА ПЕРЕД КАЖДЫМ СНИМКОМ. Здесь конвейер перестаёт быть источником
 * подложных доказательств.
 *
 * Снимок с ночными пикселями под именем light_* — это выдуманное
 * доказательство, ровно та болезнь, ради которой всё это делается. Поэтому
 * прогон ПАДАЕТ, а не предупреждает: файл с чужой темой не должен попасть на
 * диск и быть подшит как плита темы.
 *
 * Проверяется четыре вещи:
 *  1) data-theme совпадает с темой, под именем которой файл будет записан;
 *  2) режим в хранилище приложения тот же — иначе перезагрузка вернёт другую тему;
 *  3) все тем-зависимые токены имеют значение — пустой var() в background даёт
 *     чёрную плашку поверх текста (VISUAL_VERDICT.md, B1.1);
 *  4) отпечаток палитры этой темы НЕ совпадает с отпечатком другой темы при том
 *     же размере окна. Совпадение значит: атрибут переставили, а палитра не
 *     сменилась — то есть снимки двух тем окажутся одинаковыми.
 */
const paletteByThemeAndViewport = new Map();

async function assertThemeBeforeShot(theme, fileName) {
  const state = await readThemeState();
  const where = `${fileName} (ожидалась тема «${theme}»)`;

  // Имя файла и заявленная тема должны совпадать. Это ловит не приложение, а
  // ошибку в самом сценарии: снимок, названный чужой темой, — та же ложь.
  const namedTheme = THEMES.find((candidate) => fileName.includes(candidate));
  if (namedTheme && namedTheme !== theme) {
    throw new Error(
      `${where}: имя файла говорит о теме «${namedTheme}». Ошибка в сценарии, а не в приложении: имя и снимаемая тема разошлись.`,
    );
  }

  if (state.dataTheme !== theme) {
    throw new Error(
      `${where}: на <html> применена тема «${state.dataTheme || "нет атрибута"}», режим хранилища «${state.mode}». Снимок с чужой темой под этим именем — подложное доказательство, прогон остановлен.`,
    );
  }
  if (state.mode !== theme) {
    throw new Error(
      `${where}: атрибут data-theme верный, но режим в хранилище приложения «${state.mode}». Перезагрузка страницы вернёт другую тему, снимку доверять нельзя.`,
    );
  }
  if (state.tokenCount === 0) {
    throw new Error(
      `${where}: в загруженных стилях не найдено ни одного токена, зависящего от темы. Палитра не загрузилась — снимать нечего.`,
    );
  }
  if (state.empty.length > 0) {
    throw new Error(
      `${where}: тем-зависимые токены без значения (${state.empty.length}): ${state.empty.slice(0, 6).join(", ")}. Пустой var() красит плашку в чёрное поверх текста.`,
    );
  }

  const key = `${theme}@${currentViewport}`;
  const known = paletteByThemeAndViewport.get(key);
  if (known && known !== state.fingerprint) {
    throw new Error(
      `${where}: палитра темы «${theme}» изменилась посреди прогона (${known} -> ${state.fingerprint}). Плиты одной темы сняты в разных палитрах.`,
    );
  }
  if (!known) {
    for (const [otherKey, otherFingerprint] of paletteByThemeAndViewport) {
      if (otherFingerprint !== state.fingerprint) continue;
      const [otherTheme, otherViewport] = otherKey.split("@");
      if (otherTheme === theme || otherViewport !== currentViewport) continue;
      throw new Error(
        `${where}: палитра совпала с темой «${otherTheme}» при том же размере окна (отпечаток ${state.fingerprint}). Атрибут темы переставлен, а цвета не сменились.`,
      );
    }
    paletteByThemeAndViewport.set(key, state.fingerprint);
  }

  return state;
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800,
  });
  currentViewport = `${width}x${height}`;
}

async function goToView(view) {
  // Раздел переключается якорем: пункты бокового меню — это <a href="#schedule">.
  // Клик по кнопке искать не нужно, и на узком экране меню другое.
  return evaluate(`
    (() => {
      if (window.location.hash === "#" + ${JSON.stringify(view)}) {
        // Тот же раздел: событие hashchange не сработает, обновляем вручную.
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = ${JSON.stringify(view)};
      }
      return window.location.hash;
    })()
  `);
}

/** Панель подключается лениво: ждём её появления, а не спим наугад. */
async function waitForPanel(testId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await evaluate(`Boolean(document.querySelector('[data-testid="${testId}"]'))`);
    if (found) return true;
    await sleep(500);
  }
  return false;
}

/**
 * Что этот прогон реально записал: имя файла, заявленная тема, применённая тема,
 * отпечаток палитры, md5 и размер. Ложится рядом со снимками как их
 * происхождение и служит основой аудита в конце прогона.
 */
const shotLog = [];

async function writeShot(fileName, base64, theme, themeState, note) {
  const buffer = Buffer.from(base64, "base64");
  await writeFile(path.join(OUT, fileName), buffer);
  shotLog.push({
    file: fileName,
    theme,
    dataTheme: themeState?.dataTheme ?? null,
    storeMode: themeState?.mode ?? null,
    palette: themeState?.fingerprint ?? null,
    viewport: currentViewport,
    md5: createHash("md5").update(buffer).digest("hex"),
    bytes: buffer.length,
    diagnostic: fileName.includes("_ПУСТО"),
  });
  console.log(`  ✓ ${fileName} (${note}, тема «${themeState?.dataTheme ?? "?"}», палитра ${themeState?.fingerprint ?? "?"})`);
  return buffer;
}

/** Снимок конкретной панели по её data-testid, а не всей страницы. */
async function shootPanel(testId, fileName, theme) {
  await waitForPanel(testId);
  const box = await evaluate(`
    (() => {
      const node = document.querySelector('[data-testid="${testId}"]');
      if (!node) return null;
      node.scrollIntoView({ block: "start" });
      const rect = node.getBoundingClientRect();
      return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
    })()
  `);
  if (!box || box.width < 10 || box.height < 10) {
    console.log(`  ✗ ${fileName}: панель [${testId}] не найдена на странице`);
    // Последние ошибки страницы печатаются рядом с провалом, а не в конце:
    // именно они чаще всего и есть причина.
    for (const error of pageErrors.slice(-3)) console.log(`     ошибка страницы: ${error.split("\n")[0]}`);
    // И снимок того, что оказалось на экране вместо панели. Без него остаётся
    // только гадать между вёрсткой, доступом и не тем разделом.
    const missShot = await send("Page.captureScreenshot", { format: "png" });
    const missState = await readThemeState();
    const missName = fileName.replace(/\.png$/, "_ПУСТО.png");
    await writeShot(missName, missShot.data, theme, missState, "что на экране вместо панели");
    // Диагностический кадр записан ДО проверки темы намеренно: он нужен, даже
    // если тема оказалась чужой. А проверка всё равно обрывает прогон — иначе
    // файл с именем light_* и ночными пикселями попал бы в доказательства.
    await assertThemeBeforeShot(theme, missName);
    return false;
  }

  await sleep(400);

  // ---------------------- ПОДЛОГ (только в этой копии) ----------------------
  // Приложение «применяет тему заново» и возвращает ночную — ровно то, что
  // делает applyThemeToRoot после перезагрузки страницы. Настоящий конвейер
  // этих трёх строк не содержит.
  if (theme === "light") {
    await evaluate(`(() => { document.documentElement.dataset.theme = "night"; return true; })()`);
  }
  // --------------------------------------------------------------------------

  // Проверка вплотную к затвору: между переключением темы и этим кадром были
  // переход в раздел, ожидания и подготовка данных — за это время приложение
  // могло применить тему заново.
  const themeState = await assertThemeBeforeShot(theme, fileName);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.min(1600, Math.round(box.width)),
      height: Math.min(4000, Math.round(box.height)),
      scale: 1,
    },
    captureBeyondViewport: true,
  });
  await writeShot(fileName, shot.data, theme, themeState, `${Math.round(box.width)}×${Math.round(box.height)}`);
  return true;
}

async function shootViewport(fileName, theme) {
  const themeState = await assertThemeBeforeShot(theme, fileName);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeShot(fileName, shot.data, theme, themeState, "весь экран");
}

/** Снимок области страницы: раздел целиком, во всю высоту и с уменьшением. */
async function shootClipped(fileName, theme, clip) {
  const themeState = await assertThemeBeforeShot(theme, fileName);
  const shot = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
  await writeShot(fileName, shot.data, theme, themeState, `высота ${clip.height}, масштаб ${clip.scale}`);
}

const PANELS = [
  { view: "schedule", testId: "day-confirmations-panel", slug: "callList" },
  { view: "communications", testId: "message-delivery-console", slug: "delivery" },
  { view: "communications", testId: "campaign-panel", slug: "campaigns" },
  { view: "analytics", testId: "manager-reports-panel", slug: "reports" },
  { view: "analytics", testId: "recall-list-panel", slug: "recall" },
  { view: "patients", testId: "patient-duplicate-merge-queues-widget", slug: "duplicates" },
  {
    view: "patients",
    testId: "patient-duplicate-alert",
    slug: "duplicateAlert",
    // Предупреждение живёт внутри карточки конкретного пациента, а раздел
    // открывается на первом по списку. Открываем именно того, у кого дубль есть,
    // иначе снимать нечего — и это будет не дефект, а верное поведение.
    // Возвращает не «сделано», а состояние: кликнули ли, отрисована ли вкладка
    // карточки и что ответил маршрут. Когда снимок не удаётся, из строки видно,
    // где обрыв, — иначе пришлось бы гадать между вёрсткой, доступом и данными.
    prepare: `(async () => {
      const wanted = "Орлова Марина Петровна";
      // Клик именно по строке списка, найденной по заголовку: поиск по
      // произвольным контейнерам выбирал не того пациента — снимок показал
      // открытую карточку постороннего человека, у которого дублей нет.
      const heading = [...document.querySelectorAll("article.patient-row h3")].find(
        (node) => node.textContent?.trim() === wanted,
      );
      const hit = heading?.closest("article.patient-row");
      if (hit) hit.click();
      await new Promise((done) => setTimeout(done, 1200));
      const overview = Boolean(document.querySelector('[data-testid="patient-overview-tab"]'));
      // Какая карточка ОТКРЫТА на самом деле: клик по элементу списка мог не
      // выбрать пациента, и тогда отсутствие предупреждения — верное поведение
      // для другого пациента, а не дефект.
      const nameInput = [...document.querySelectorAll("input")].find((node) => node.autocomplete === "name");
      const openedName = nameInput?.value || "(поле ФИО не найдено)";
      let api = "не проверялся";
      try {
        const response = await fetch("/api/patients/duplicates");
        const body = response.ok ? await response.json() : null;
        api = response.status + (body ? " пар: " + body.candidates.length : "");
      } catch (error) {
        api = "запрос упал: " + error.message;
      }
      // Замер подсказки «следующее действие» в списке: на снимке она оказалась
      // чёрной плашкой с чёрным текстом. Считанные значения точнее, чем догадки
      // по картинке.
      // Ширины ключевых контейнеров раздела: по снимку не отличить «сетка
      // схлопнулась» от «панель узкая» — а лечится это в разных местах.
      const widthOf = (selector) => {
        const node = document.querySelector(selector);
        return node ? Math.round(node.getBoundingClientRect().width) : -1;
      };
      const widths =
        "окно " + window.innerWidth +
        ", .patients-panel " + widthOf(".patients-panel") +
        ", .patients-main-grid " + widthOf(".patients-main-grid") +
        ", .patient-list " + widthOf(".patient-list") +
        ", .patient-clinical-grid " + widthOf(".patient-clinical-grid");

      const chip = document.querySelector(".patient-next-action");
      let chipStyle = "плашка не найдена";
      if (chip) {
        const computed = getComputedStyle(chip);
        const root = document.documentElement;
        chipStyle =
          "фон " + computed.backgroundColor + " / текст " + computed.color +
          " | html: класс «" + root.className + "», data-theme «" + root.getAttribute("data-theme") + "»" +
          " | --srf-chip-soft: " + getComputedStyle(root).getPropertyValue("--srf-chip-soft").trim();
      }
      return (
        "ширины: " + widths + " | клик: " + Boolean(hit) + ", карточка отрисована: " + overview +
        ", маршрут: " + api + ", подсказка: " + chipStyle
      );
    })()`,
  },
];

await setViewport(1600, 1000);
await sleep(2500);

for (const theme of THEMES) {
  console.log(`\nТема: ${theme}`);
  const applied = await applyTheme(theme);
  console.log(
    `     применено: data-theme «${applied.dataTheme}», режим «${applied.mode}», класс «${applied.className}», тем-зависимых токенов ${applied.tokenCount} (объявлено в этой теме ${applied.declaredHere}), отпечаток палитры ${applied.fingerprint}`,
  );

  for (const panel of PANELS) {
    const navigation = await goToView(panel.view);
    await sleep(1600);
    if (panel.prepare) {
      const outcome = await evaluate(panel.prepare);
      console.log(`     подготовка: ${outcome}`);
      await sleep(1400);
    }
    const ok = await shootPanel(panel.testId, `${theme}_${panel.slug}.png`, theme);
    if (!ok) console.log(`     переход в раздел: ${navigation}`);
  }
}

// Узкий экран проверяется в одной теме: правила перестроения общие.
console.log("\nУзкий экран (планшет в портрете, 720×1100)");
await setViewport(720, 1100);
await applyTheme("light");
await sleep(800);
for (const panel of PANELS) {
  await goToView(panel.view);
  await sleep(1500);
  if (panel.prepare) {
    console.log(`     подготовка: ${await evaluate(panel.prepare)}`);
    await sleep(1400);
  }
  await shootPanel(panel.testId, `narrow_${panel.slug}.png`, "light");
}

await shootViewport("narrow_full.png", "light");

/**
 * Раздел финансов целиком. Нужен после того, как оттуда убрали четыре пустых
 * блока: снимок показывает, не осталось ли на их месте дыр в сетке.
 */
console.log("\nРаздел финансов целиком");
await setViewport(1600, 1000);
await applyTheme("light");
await goToView("finance");
await sleep(2200);
const financeHeight = await evaluate("Math.min(document.body.scrollHeight, 9000)");
await shootClipped("finance_full.png", "light", { x: 0, y: 0, width: 1600, height: financeHeight, scale: 0.55 });

/**
 * Карточка пациента во всех трёх темах целиком. Здесь плотнее всего узлы с
 * классами Tailwind (`dark:bg-slate-800` и подобные), а Tailwind включается
 * классом dark. Пока класс не ставился в ночной теме, эти узлы оставались
 * светлыми на тёмном фоне — увидеть это можно только снимком раздела, а не
 * снимком отдельной панели.
 */
console.log("\nРаздел картотеки целиком: проверка зон Tailwind");
await setViewport(1600, 1000);
for (const theme of THEMES) {
  await applyTheme(theme);
  await goToView("patients");
  await sleep(1800);
  await shootViewport(`patients_${theme}_full.png`, theme);
}

/**
 * Раздел «Коммуникации» целиком, во всю высоту. Нужен, чтобы увидеть, что
 * находится НИЖЕ рабочих панелей: там висят виджеты, чьи адреса отвечают 404.
 */
console.log("\nРаздел коммуникаций целиком");
await setViewport(1600, 1000);
await applyTheme("light");
await sleep(800);
await goToView("communications");
await sleep(2500);

const pageHeight = await evaluate("Math.min(document.body.scrollHeight, 12000)");
await shootClipped("communications_full.png", "light", { x: 0, y: 0, width: 1600, height: pageHeight, scale: 0.5 });

socket.close();

/**
 * АУДИТ ПРОГОНА. Раньше его делал лид руками — и именно так нашёлся снимок
 * light_duplicateAlert.png, побайтово равный ночному (VISUAL_VERDICT.md, C1).
 * Прогон, который это допустил, вышел с кодом 0: «35 файлов, 33 уникальных md5»
 * пришлось считать человеку. Теперь считает сценарий и падает сам.
 *
 * Правило простое: каждый файл — своя панель, своя тема или свой размер окна.
 * Двух побайтово одинаковых плит быть не может. Диагностические кадры «_ПУСТО»
 * из правила исключены: это снимок всего экрана вместо ненайденной панели, и
 * две подряд идущие неудачи законно дают один и тот же кадр.
 */
const plates = shotLog.filter((entry) => !entry.diagnostic);
const misses = shotLog.filter((entry) => entry.diagnostic);
const byHash = new Map();
for (const entry of plates) {
  const group = byHash.get(entry.md5) ?? [];
  group.push(entry);
  byHash.set(entry.md5, group);
}

const manifest = {
  startedAt: runStartedAt,
  finishedAt: new Date().toISOString(),
  out: OUT,
  palettes: [...paletteByThemeAndViewport].map(([key, fingerprint]) => ({ key, fingerprint })),
  plates: plates.length,
  uniqueMd5: byHash.size,
  diagnostics: misses.map((entry) => entry.file),
  shots: shotLog,
};
await writeFile(path.join(OUT, "theme-audit.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`\nСнимки: ${OUT}`);
console.log(`Плит записано: ${plates.length}, уникальных md5: ${byHash.size}. Диагностических «ПУСТО»: ${misses.length}${misses.length ? " — " + misses.map((entry) => entry.file).join(", ") : ""}`);
for (const { key, fingerprint } of manifest.palettes) console.log(`  палитра ${key}: ${fingerprint}`);
console.log("Три темы одной панели — три разных файла:");
for (const panel of PANELS) {
  const row = THEMES.map((theme) => {
    const entry = plates.find((item) => item.file === `${theme}_${panel.slug}.png`);
    return `${theme} ${entry ? entry.md5.slice(0, 12) : "нет плиты"}`;
  });
  console.log(`  ${panel.slug}: ${row.join(" | ")}`);
}
console.log(`Происхождение каждой плиты: ${path.join(OUT, "theme-audit.json")}`);

const collisions = [...byHash.values()].filter((group) => group.length > 1);
if (collisions.length > 0) {
  for (const group of collisions) {
    console.error(`  побайтово одинаковы: ${group.map((entry) => `${entry.file} (тема ${entry.theme}, ${entry.viewport})`).join(", ")}`);
  }
  throw new Error(
    `Аудит прогона: ${collisions.length} групп(а) побайтово одинаковых плит. Разные панели, темы и размеры окна не могут дать один файл — снимки не отражают то, чем названы.`,
  );
}
