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

const OUT = "C:/Clinic_MVP/dental-crm/.dente-ops-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9341;
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

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-ops-shot-profile");
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

/**
 * ОТВЕТ КОМАНДЫ, ПОТЕРЯННЫЙ ПРИ ПЕРЕЗАГРУЗКЕ СТРАНИЦЫ, — НЕ АВАРИЯ.
 *
 * Каждая команда CDP — обещание в `pending`. Когда страница перезагружается,
 * браузер отвечает отказом сразу на все команды, которые были в полёте, включая
 * те, чей вызывающий кадр уже размотан восстановлением. Такой отказ никто не
 * ждёт, и Node убивал процесс необработанным отказом — посреди прогона, который
 * УЖЕ успешно восстановился и снимал дальше. Измерено: два восстановления
 * прошли, третий отказ в полёте уронил прогон.
 *
 * Здесь такие отказы отбрасываются с отметкой в выводе. Всё остальное по-прежнему
 * роняет прогон: молча проглоченный отказ команды — это подложный снимок.
 */
process.on("unhandledRejection", (reason) => {
  if (isContextDestroyed(reason)) {
    console.log("  ↻ отброшен ответ команды, потерянной при перезагрузке страницы");
    return;
  }
  console.error("Необработанный отказ:", reason);
  process.exitCode = 1;
  process.exit(1);
});

/**
 * Ждём вкладку, УЖЕ ОТКРЫТУЮ НА ПРИЛОЖЕНИИ, а не первую попавшуюся.
 *
 * ЧТО ЛОМАЛОСЬ. Браузер отдаёт вкладку в /json/list раньше, чем она уходит с
 * about:blank на переданный в командной строке адрес. Первое же обращение
 * сценария — запись токенов входа в window.localStorage, а на about:blank
 * хранилище недоступно по происхождению: страница бросает отказ доступа. Наружу
 * это выглядело как «Ошибка в странице: Uncaught» без единого слова о причине,
 * то есть снимков нет и непонятно почему. Гонку видно только под нагрузкой
 * машины, когда браузер запускается медленнее обычного.
 *
 * Молчаливого запаса здесь нет: если вкладки на приложении не появилось,
 * сценарий обязан сказать, ЧТО он вместо неё видел.
 */
async function getPageTarget(retries = 60) {
  let lastSeen = [];
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await response.json();
      lastSeen = targets.filter((target) => target.type === "page").map((target) => target.url);
      const page = targets.find((target) => target.type === "page" && String(target.url).startsWith(webBaseUrl));
      if (page) return page;
    } catch {
      /* браузер ещё поднимается */
    }
    await sleep(1000);
  }
  if (lastSeen.length === 0) {
    throw new Error(`Отладочный порт браузера ${cdpPort} не отдал ни одной вкладки за ${retries} с. Браузер не запустился.`);
  }
  throw new Error(
    `Вкладка на ${webBaseUrl} не открылась за ${retries} с. Открытые вкладки: ${lastSeen.join(", ")}. ` +
      "Проверьте, отвечает ли веб-сервер разработки.",
  );
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

/**
 * Запас времени на ответ браузера.
 *
 * Тридцати секунд хватало на тихой машине. На общей — восемь участков правят
 * дерево, идут наборы тестов, рядом живёт headless-браузер — снимок страницы во
 * всю высоту в них не укладывается, и прогон падал с «нет ответа» на середине.
 * Съёмка кадра вынесена в отдельный, больший запас: она единственная тяжёлая
 * команда здесь, остальным лишнее ожидание ни к чему.
 */
const REPLY_TIMEOUT_MS = 45_000;
const SCREENSHOT_TIMEOUT_MS = 120_000;

function send(method, params = {}) {
  const id = ++messageId;
  const timeoutMs = method === "Page.captureScreenshot" ? SCREENSHOT_TIMEOUT_MS : REPLY_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method}: нет ответа за ${Math.round(timeoutMs / 1000)} с`));
      }
    }, timeoutMs);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    /*
     * exceptionDetails.text у V8 — почти всегда голое «Uncaught», без причины.
     * Настоящее сообщение лежит в exception.description; выражение печатается
     * первой строкой, потому что в сценарии таких вызовов десятки и по одному
     * «Uncaught» не понять, какой из них упал.
     */
    const details = result.exceptionDetails;
    const reason =
      details.exception?.description || details.exception?.value || details.text || "исключение без описания";
    const firstLine = expression.trim().split("\n")[0].slice(0, 120);
    throw new Error(`Ошибка в странице: ${reason}\n  выражение: ${firstLine}`);
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
    `Нет ${tokenFile}. Сначала: cd apps/api && npx tsx src/scripts/seedOpsScreenshotDemo.ts > ../../.ops-shot-tokens.json` +
      "\n\nНА ЧИСТОЙ МАШИНЕ этой команды достаточно. ЕСЛИ ДЕМО-КЛИНИКА УЖЕ ЗАСЕЯНА — сид 2026-08-06 " +
      "получил защиту от разрушения и повторный прогон ОТКАЖЕТСЯ, потому что зачистка стёрла бы " +
      "существующие строки. Он печатает построчный отчёт по таблицам и заканчивает так:\n" +
      "    ОТКАЗ: зачистка удалила бы N существующих строк демо-клиники d0000000-0000-4000-8000-00000000d001.\n" +
      '    Чтобы разрешить это осознанно, задайте DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES".\n' +
      "    Ничего не удалено, транзакция откачена.\n" +
      "Тогда команда такая:\n" +
      "    cd apps/api && DENTAL_ALLOW_DESTRUCTIVE_DB_RESET=YES npx tsx src/scripts/seedOpsScreenshotDemo.ts > ../../.ops-shot-tokens.json\n" +
      "Значение сверяется точно: подойдёт только YES. При NODE_ENV=production сид отказывает " +
      "безусловно, с флагом и без — демо-данные в боевую базу не сеются.\n\n" +
      "ВНИМАНИЕ НА ПЕРЕНАПРАВЛЕНИЕ. Отказ уходит в stderr, а в stdout не попадает ничего, поэтому " +
      `«>» всё равно создаёт ПУСТОЙ ${path.basename(tokenFile)}. Следующий запуск этого сценария ` +
      "тогда пройдёт мимо этой подсказки (файл существует) и упадёт на JSON.parse с «Unexpected end " +
      "of JSON input». Увидев это — удалите пустой файл и перечитайте абзац выше.\n\n" +
      "Выпускать токены ТОЛЬКО этим сидом. В scratch/ лежит recon-sign-shot-tokens.ts, который " +
      "подписывает их НЕВЕРНЫМ секретом: он не загружает .env, поэтому authTokenSecret() берёт " +
      "локальный секрет разработки из .data/dev-auth-secret вместо AUTH_TOKEN_SECRET. Сервер такие " +
      "токены не принимает и отвечает 401 «Требуется авторизация рабочего кабинета клиники» — это " +
      "выглядит как дефект входа, а не как чужой секрет, и один агент потратил на это шесть минут.",
  );
}
const { clinicToken, staffToken } = JSON.parse(await readFile(tokenFile, "utf8"));

/**
 * Токены входа в хранилище страницы. Отдельной функцией, потому что то же самое
 * приходится делать заново после перезагрузки страницы: localStorage выживает,
 * но сценарий всё равно обязан убедиться в этом сам, а не надеяться.
 */
async function applySessionTokens() {
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
}

await applySessionTokens();
await send("Page.navigate", { url: webBaseUrl + "/" });

/**
 * Ждём именно рабочий кабинет, а не «просто загрузилось». Раздел подключается
 * лениво, и снимок, сделанный раньше времени, показал бы экран входа — то есть
 * ложное доказательство.
 */
async function waitForWorkspace(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    /*
     * `document.body?.` — защита стоит ДО обращения, а не после.
     *
     * Здесь было `document.body.textContent?.includes(...)`: необязательная
     * цепочка после свойства не спасает от null у самого `document.body`, а он
     * бывает null, пока идёт переход на новый документ. Ожидание кабинета
     * падало с `TypeError: Cannot read properties of null` вместо того, чтобы
     * подождать ещё раз, — то есть ровно на своём рабочем случае. Проявляется
     * под нагрузкой машины, когда браузер отвечает медленнее.
     */
    const state = await evaluate(`
      (() => {
        const body = document.body;
        if (!body) return { ready: false, login: false, wizard: false, shiftLock: false, noBody: true };
        const sidebar = document.querySelector('.sidebar, nav .nav-item');
        const text = body.textContent || "";
        const login = text.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ");
        const wizard = text.includes("Быстрая настройка CRM Dente");
        /*
         * Экран разблокировки смены — ОТДЕЛЬНОЕ состояние, и его надо называть.
         * Он перекрывает кабинет целиком, бокового меню на нём нет, поэтому
         * прежняя проверка сообщала «меню не отрисовалось» — то есть отправляла
         * искать дефект вёрстки там, где программа просто не пускает внутрь.
         * Его же экран, снятый под именем раздела, уже попадал в доказательства:
         * файлы patients_*_full.png содержали не картотеку, а этот замок.
         */
        const shiftLock =
          Boolean(document.querySelector(".auth-staff-grid, .auth-staff-card")) ||
          text.includes("ВЫБЕРИТЕ СВОЙ ПРОФИЛЬ ДЛЯ РАЗБЛОКИРОВКИ СМЕНЫ");
        return { ready: Boolean(sidebar) && !login && !wizard && !shiftLock, login, wizard, shiftLock, noBody: false };
      })()
    `);
    lastState = state;
    if (state?.ready) return true;
    if (state?.wizard) {
      await evaluate(`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`);
    }
    await sleep(1200);
  }
  // Причина отказа называется, а не скрывается: экран входа, мастер первого
  // запуска и «документ так и не собрался» лечатся совершенно по-разному.
  const reason = lastState?.noBody
    ? "страница так и не собрала документ — вероятно, сервер разработки отдаёт ошибку сборки"
    : lastState?.login
      ? "показан экран входа — токены в .ops-shot-tokens.json устарели, пересоздайте их сидом"
      : lastState?.wizard
        ? "поверх экрана остался мастер первого запуска"
        : lastState?.shiftLock
          ? "программа стоит на экране разблокировки смены и внутрь не пускает — это не дефект вёрстки, " +
            "а закрытый вход: список сотрудников на нём пуст либо не прочитан"
          : "боковое меню кабинета не отрисовалось";
  /*
   * ОШИБКИ САМОЙ СТРАНИЦЫ ПЕЧАТАЮТСЯ ЗДЕСЬ, А НЕ ТОЛЬКО У НЕНАЙДЕННОЙ ПАНЕЛИ.
   *
   * Когда кабинет не открылся, причина почти всегда лежит в исключении при
   * отрисовке — и оно уже собрано в pageErrors, но раньше не показывалось.
   * Наружу выходило только «боковое меню не отрисовалось», то есть симптом без
   * причины: приходилось запускать заново и угадывать. В общем дереве это
   * обычное дело — соседняя правка ломает сборку, и сценарий обязан назвать
   * ошибку, а не отправлять искать её вслепую.
   */
  const lastErrors = pageErrors.slice(-3).map((error) => error.split("\n")[0]);
  const errorTail = lastErrors.length
    ? ` Последние ошибки страницы: ${lastErrors.join(" | ")}`
    : " Ошибок страницы не было — значит приложение отрисовало не тот экран, а не упало.";
  throw new Error(
    `Рабочий кабинет не открылся за ${Math.round(timeoutMs / 1000)} с: ${reason}. Снимать нечего.${errorTail}`,
  );
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
      // Запоминается только ПОДТВЕРЖДЁННАЯ тема: после перезагрузки восстановить
      // надо ту, под именем которой пишутся файлы, а не ту, которую попросили.
      session.theme = theme;
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

/**
 * Что сценарий уже настроил на странице. Нужно, чтобы после перезагрузки
 * вернуться в то же состояние, а не снимать светлую тему под именем ночной.
 */
const session = { theme: null, width: null, height: null };

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800,
  });
  currentViewport = `${width}x${height}`;
  session.width = width;
  session.height = height;
}

/**
 * СТРАНИЦА ПЕРЕЗАГРУЗИЛАСЬ ПОСРЕДИ СЪЁМКИ — И ЭТО НЕ РЕДКОСТЬ.
 *
 * Снимки идут через живой сервер разработки Vite. Любая правка исходников
 * apps/web — вторым инженером, агентом, самим человеком — вызывает горячую
 * перезагрузку, и браузер уничтожает контекст исполнения страницы. Все команды
 * CDP после этого отвечают `Execution context was destroyed`, и прогон падал
 * целиком: на диск попадала часть снимков, а остальные оставались от прошлого
 * раза. Молча — потому что имена файлов те же.
 *
 * Это делало визуальную проверку недоступной ровно тогда, когда она нужнее
 * всего: в общем дереве, где кто-то правит код. Измерено: прогон падал на
 * второй теме из трёх, и снимки тёмной и ночной оставались вчерашними.
 */
function isContextDestroyed(error) {
  return /Execution context was destroyed|Cannot find context with specified id|Inspected target navigated or closed|Session with given id not found/i.test(
    String(error?.message ?? error),
  );
}

/** Вернуть страницу в то состояние, в котором её застала перезагрузка. */
async function restoreSession() {
  await send("Page.navigate", { url: webBaseUrl + "/" });
  await sleep(1200);
  await applySessionTokens();
  await send("Page.navigate", { url: webBaseUrl + "/" });
  const ready = await waitForWorkspace();
  if (!ready) {
    throw new Error(
      "После перезагрузки страницы кабинет не открылся: снимать нечего. " +
        "Проверьте, что веб-сервер разработки на 5173 отвечает и что в исходниках нет ошибки сборки.",
    );
  }
  if (session.width && session.height) await setViewport(session.width, session.height);
  if (session.theme) await applyTheme(session.theme);
  await sleep(600);
}

/**
 * Повторить работу после перезагрузки. Попыток немного: если страница
 * перезагружается непрерывно, значит правки идут прямо сейчас, и ждать её
 * бессмысленно — честнее упасть с этим объяснением, чем снимать дрожащий экран.
 */
/**
 * ТЕМА СБИЛАСЬ САМА, БЕЗ ПЕРЕЗАГРУЗКИ.
 *
 * Проверка перед снимком (assertThemeBeforeShot) обрывала прогон, застав на
 * <html> не ту тему. Обрывала правильно: файл `night_*` со светлыми пикселями —
 * это подложное доказательство, ровно то, ради чего проверка и написана.
 *
 * Но причина обрыва оказалась не перезагрузкой: восстановлений в том прогоне
 * было ноль, а тема слетела с ночной на светлую посреди съёмки. Приложение
 * сбрасывает её само — при пересборке модуля хранилище темы поднимается заново
 * со значением по умолчанию. Терять из-за этого весь прогон незачем: тему надо
 * применить ещё раз и повторить шаг.
 *
 * Свойство, ради которого всё это существует, при этом сохраняется полностью:
 * снимок пишется ТОЛЬКО после подтверждённой темы. Восстановление ничего не
 * ослабляет — оно лишь заменяет обрыв повтором, а если тема не встаёт и со
 * второго раза, прогон всё равно падает.
 */
function isThemeDrift(error) {
  return /ожидалась тема/i.test(String(error?.message ?? error));
}

/**
 * Браузер не ответил в срок. Под нагрузкой это не поломка сценария и не дефект
 * приложения: страница занята, а вкладка после такого чаще всего заклинена.
 * Лечится тем же, чем перезагрузка, — возвратом в известное состояние.
 */
function isNoReply(error) {
  return /нет ответа за \d+ с/i.test(String(error?.message ?? error));
}

/**
 * Приложение ещё не поднялось: хранилище темы на странице отсутствует.
 *
 * Это тот же класс, что и перезагрузка, только замеченный с другой стороны.
 * Восстановление темы применяло её НЕМЕДЛЕННО и падало, если попадало в окно
 * между перезагрузкой и запуском модулей: «Хранилище темы недоступно
 * (window.__useThemeStore не найден)». Прогон при этом умирал на третьей теме,
 * потеряв уже снятые плиты, — при том, что лечится это ожиданием кабинета.
 */
function isAppNotLoaded(error) {
  return /Хранилище темы недоступно/i.test(String(error?.message ?? error));
}

async function withReloadRecovery(label, run, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt === attempts) throw error;
      if (isThemeDrift(error)) {
        console.log(
          `  ↻ ${label}: тема сбилась сама (приложение подняло хранилище заново), применяю «${session.theme}» и повторяю — попытка ${attempt + 1} из ${attempts}`,
        );
        /*
         * Кабинет ждём ПЕРЕД применением темы. Снос темы и перезагрузка — это
         * часто одно и то же событие, замеченное с разных сторон, и применение
         * темы в окно между перезагрузкой и запуском модулей падало с
         * «Хранилище темы недоступно», убивая прогон на третьей теме.
         */
        await waitForWorkspace();
        if (session.theme) await applyTheme(session.theme);
        await sleep(400);
        continue;
      }
      if (!isContextDestroyed(error) && !isNoReply(error) && !isAppNotLoaded(error)) throw error;
      console.log(
        isNoReply(error)
          ? `  ↻ ${label}: браузер не ответил в срок (машина загружена), возвращаю страницу в рабочее состояние и повторяю — попытка ${attempt + 1} из ${attempts}`
          : isAppNotLoaded(error)
            ? `  ↻ ${label}: приложение ещё не поднялось после перезагрузки, жду кабинет и повторяю — попытка ${attempt + 1} из ${attempts}`
            : `  ↻ ${label}: страница перезагрузилась (горячая перезагрузка Vite при правке исходников), восстанавливаю и повторяю — попытка ${attempt + 1} из ${attempts}`,
      );
      await restoreSession();
    }
  }
  throw new Error(`${label}: не удалось выполнить за ${attempts} попыток`);
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

/**
 * СНИМОК РАЗДЕЛА ОБЯЗАН ДОКАЗАТЬ, ЧТО ЭТО ТОТ САМЫЙ РАЗДЕЛ.
 *
 * Проверка темы (assertThemeBeforeShot) закрывала только один вид подлога:
 * ночные пиксели под именем light_*. ВТОРОЙ вид оставался открытым — чужой
 * ЭКРАН под именем раздела, и он уже случился. Файлы patients_light_full.png,
 * patients_dark_full.png, patients_night_full.png содержали не картотеку, а
 * экран разблокировки смены с текстом «В клинике пока нет ни одного
 * действующего сотрудника»: раздел требует открытой смены, а в
 * демонстрационной клинике снимков сотрудников нет. Три файла лежали как
 * доказательство вида картотеки в трёх темах, и по ним делались выводы о
 * вёрстке экрана, которого на них нет.
 *
 * Поэтому здесь передаётся признак раздела — селектор узла, который есть
 * только на нём. Не нашли: кадр всё равно записывается, но под именем с
 * пометкой _ПУСТО, то есть попасть в доказательства под чистым именем он
 * больше не может. Пометка та же, что у ненайденной панели: способ отличать
 * диагностический кадр от плиты в проекте уже есть, второго не нужно.
 */
async function assertSectionOnScreen(marker, fileName) {
  if (!marker) return null;
  const found = await evaluate(`Boolean(document.querySelector(${JSON.stringify(marker)}))`);
  if (found) return null;
  const onScreen = await evaluate(`(document.body?.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 160)`);
  console.log(`  ✗ ${fileName}: на экране не тот раздел (нет узла ${marker})`);
  console.log(`     видно вместо него: ${onScreen}`);
  for (const error of pageErrors.slice(-3)) console.log(`     ошибка страницы: ${error.split("\n")[0]}`);
  return onScreen || "раздел не опознан";
}

async function shootViewport(fileName, theme, marker = null) {
  const wrongSection = await assertSectionOnScreen(marker, fileName);
  const name = wrongSection ? fileName.replace(/\.png$/, "_ПУСТО.png") : fileName;
  const themeState = await assertThemeBeforeShot(theme, name);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeShot(name, shot.data, theme, themeState, wrongSection ? "НЕ ТОТ РАЗДЕЛ: " + wrongSection : "весь экран");
}

/** Снимок области страницы: раздел целиком, во всю высоту и с уменьшением. */
async function shootClipped(fileName, theme, clip, marker = null) {
  const wrongSection = await assertSectionOnScreen(marker, fileName);
  const name = wrongSection ? fileName.replace(/\.png$/, "_ПУСТО.png") : fileName;
  const themeState = await assertThemeBeforeShot(theme, name);
  const shot = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
  await writeShot(
    name,
    shot.data,
    theme,
    themeState,
    wrongSection ? "НЕ ТОТ РАЗДЕЛ: " + wrongSection : `высота ${clip.height}, масштаб ${clip.scale}`,
  );
}

const PANELS = [
  { view: "schedule", testId: "day-confirmations-panel", slug: "callList" },
  {
    view: "schedule",
    testId: "waitlist-drawer",
    slug: "waitlist",
    // Лист ожидания открывается кнопкой в шапке расписания. До этого экран
    // существовал, но не был смонтирован нигде: попасть в него было нельзя,
    // поэтому очередь всегда оставалась пустой. Снимок обязан доказывать
    // ровно это — что кнопка есть и что она открывает настоящий ящик, а не
    // что файл лежит в репозитории.
    prepare: `(async () => {
      // startsWith, а не точное равенство: на кнопке стоит число ждущих
      // («Лист ожидания · 3»). Точное сравнение находило кнопку только при
      // пустой очереди — то есть проверка отваливалась ровно тогда, когда
      // очередь наконец заполнили, и это выглядело как исчезнувший экран.
      const findButton = () =>
        [...document.querySelectorAll("button")].find(
          (node) => node.textContent?.trim().startsWith("Лист ожидания"),
        );
      /*
       * КНОПКУ НАДО ЖДАТЬ, А НЕ ЗАГЛЯДЫВАТЬ ОДИН РАЗ.
       *
       * Прежний вариант искал её сразу и, не найдя, тихо ничего не нажимал.
       * На узком экране (планшет 720x1100) шапка расписания отрисовывается
       * позже, и подготовка не успевала: в логе оставалось «кнопка найдена:
       * false», ящик не открывался, а диагностический кадр, снятый на пятнадцать
       * секунд позже, кнопку УЖЕ показывал. То есть гейт давал ЛОЖНЫЙ
       * ОТРИЦАТЕЛЬНЫЙ и читался как «на планшете у кресла лист ожидания
       * недостижим» — приговор функции, которой ничего не сделалось. Ложная
       * тревога в визуальной проверке хуже её отсутствия: по ней начинают
       * чинить работающее.
       */
      let button = findButton();
      for (let attempt = 0; attempt < 40 && !button; attempt += 1) {
        await new Promise((done) => setTimeout(done, 250));
        button = findButton();
      }
      if (button) button.click();
      await new Promise((done) => setTimeout(done, 1500));
      const drawer = document.querySelector('[data-testid="waitlist-drawer"]');
      // Маршрут проверяется отдельно от вёрстки: пустой ящик при 200 — это
      // верное поведение (очередь пуста), а пустой ящик при 401/404 — дефект,
      // и по картинке эти два случая не отличить.
      let api = "не проверялся";
      try {
        const response = await fetch("/api/waitlist");
        const body = response.ok ? await response.json() : null;
        const rows = Array.isArray(body?.items) ? body.items.length
          : Array.isArray(body?.waitlist) ? body.waitlist.length
          : Array.isArray(body) ? body.length : "форма ответа неизвестна";
        api = response.status + " записей: " + rows;
      } catch (error) {
        api = "запрос упал: " + error.message;
      }
      return (
        "кнопка найдена: " + Boolean(button) +
        ", ящик открыт: " + Boolean(drawer) +
        ", маршрут: " + api
      );
    })()`,
  },
  {
    // Раздел намеренно «patients», а не «visit»: пациента надо выбрать ДО того,
    // как открывать приём. Первая редакция ходила в картотеку изнутри подготовки
    // и не успевала — раздел подключается лениво, кадр получался с пустым
    // состоянием, и «полей ввода 0» означало не дефект карты, а мою спешку.
    // Пусть в раздел переводит сам конвейер, он ждёт после перехода.
    view: "patients",
    testId: "visit-view",
    slug: "visit",
    // Приём — самый частый экран смены и первое, что видит врач у кресла, но ни
    // один снимочный конвейер не показывал его С ВЫБРАННЫМ ПАЦИЕНТОМ: без выбора
    // экран отдаёт пустое состояние, и все прежние кадры приёма были им.
    // Поэтому пациент выбирается здесь же: заходим в картотеку, нажимаем строку
    // списка, возвращаемся на приём. Возвращается не «сделано», а состояние —
    // выбран ли пациент, отрисовались ли вкладки и сколько полей в карте видно.
    // Последнее важно: вкладки «ЭМК и Диктовка» читали из контекста поля,
    // которых там нет, и карта оставалась без единого поля.
    prepare: `(async () => {
      const wait = (ms) => new Promise((done) => setTimeout(done, ms));
      const openedName = () =>
        [...document.querySelectorAll("input")].find((node) => node.autocomplete === "name")?.value || "";

      /*
       * Ждём и строку списка, и ОТКРЫТУЮ карточку, а не спим наугад. Первые две
       * редакции спали фиксированно и снимали пустое состояние: на раннем панеле
       * данные клиники ещё грузятся, строк списка нет, нажимать нечего. Ошибка
       * при этом выглядела как дефект карты приёма («полей ввода 0»), то есть
       * ложное обвинение чужой правки. Клик повторяется, потому что первый может
       * прийти в момент перерисовки списка и потеряться.
       */
      let chosen = "";
      for (let attempt = 0; attempt < 24 && !chosen; attempt += 1) {
        const row = document.querySelector("article.patient-row");
        if (row) row.click();
        await wait(600);
        chosen = openedName();
      }
      if (!chosen) chosen = "(пациент не выбран)";

      window.location.hash = "visit";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      // Ждём именно раздел приёма: снимок раньше него — снимок картотеки.
      for (let attempt = 0; attempt < 24; attempt += 1) {
        if (document.querySelector('[data-testid="visit-view"]')) break;
        await wait(500);
      }
      await wait(1200);

      const view = document.querySelector('[data-testid="visit-view"]');
      const emptyState = Boolean(view && view.textContent?.includes("Пациент не выбран"));
      // Поля карты приёма считаются по реально отрисованным элементам ввода
      // внутри раздела, а не по наличию заголовка вкладки: заголовок был на месте
      // и когда полей не оставалось ни одного.
      const fields = view ? view.querySelectorAll("input, textarea, select").length : -1;
      const tabs = view
        ? [...view.querySelectorAll("button")].map((node) => node.textContent?.trim()).filter(Boolean).slice(0, 8)
        : [];
      return (
        "выбран: " + chosen +
        ", пустое состояние: " + emptyState +
        ", полей ввода в карте: " + fields +
        ", кнопки: " + tabs.join(" | ")
      );
    })()`,
  },
  { view: "communications", testId: "message-delivery-console", slug: "delivery" },
  { view: "communications", testId: "campaign-panel", slug: "campaigns" },
  { view: "analytics", testId: "manager-reports-panel", slug: "reports" },
  { view: "analytics", testId: "recall-list-panel", slug: "recall" },
  { view: "analytics", testId: "freed-slots-panel", slug: "freedSlots" },
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
  const applied = await withReloadRecovery(`применение темы ${theme}`, () => applyTheme(theme));
  console.log(
    `     применено: data-theme «${applied.dataTheme}», режим «${applied.mode}», класс «${applied.className}», тем-зависимых токенов ${applied.tokenCount} (объявлено в этой теме ${applied.declaredHere}), отпечаток палитры ${applied.fingerprint}`,
  );

  for (const panel of PANELS) {
    await withReloadRecovery(`${theme}/${panel.slug}`, async () => {
      const navigation = await goToView(panel.view);
      await sleep(1600);
      if (panel.prepare) {
        const outcome = await evaluate(panel.prepare);
        console.log(`     подготовка: ${outcome}`);
        await sleep(1400);
      }
      const ok = await shootPanel(panel.testId, `${theme}_${panel.slug}.png`, theme);
      if (!ok) console.log(`     переход в раздел: ${navigation}`);
    });
  }
}

// Узкий экран проверяется в одной теме: правила перестроения общие.
console.log("\nУзкий экран (планшет в портрете, 720×1100)");
await setViewport(720, 1100);
await applyTheme("light");
await sleep(800);
for (const panel of PANELS) {
  await withReloadRecovery(`narrow/${panel.slug}`, async () => {
    await goToView(panel.view);
    await sleep(1500);
    if (panel.prepare) {
      console.log(`     подготовка: ${await evaluate(panel.prepare)}`);
      await sleep(1400);
    }
    await shootPanel(panel.testId, `narrow_${panel.slug}.png`, "light");
  });
}

await withReloadRecovery("narrow/весь экран", () => shootViewport("narrow_full.png", "light"));

/**
 * Раздел финансов целиком. Нужен после того, как оттуда убрали четыре пустых
 * блока: снимок показывает, не осталось ли на их месте дыр в сетке.
 */
console.log("\nРаздел финансов целиком");
await setViewport(1600, 1000);
await withReloadRecovery("finance/весь раздел", async () => {
  await applyTheme("light");
  await goToView("finance");
  await sleep(2200);
  const financeHeight = await evaluate("Math.min(document.body.scrollHeight, 9000)");
  await shootClipped("finance_full.png", "light", { x: 0, y: 0, width: 1600, height: financeHeight, scale: 0.55 }, ".finance-split, .finance-list, [data-testid=\"finance-planning\"]");
});

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
  await withReloadRecovery(`patients/${theme}`, async () => {
    await applyTheme(theme);
    await goToView("patients");
    await sleep(1800);
    await shootViewport(`patients_${theme}_full.png`, theme, ".patients-panel, .patient-list, .patients-main-grid");
  });
}

/**
 * Раздел «Коммуникации» целиком, во всю высоту. Нужен, чтобы увидеть, что
 * находится НИЖЕ рабочих панелей: там висят виджеты, чьи адреса отвечают 404.
 */
console.log("\nРаздел коммуникаций целиком");
await setViewport(1600, 1000);
await withReloadRecovery("communications/весь раздел", async () => {
  await applyTheme("light");
  await sleep(800);
  await goToView("communications");
  await sleep(2500);

  const pageHeight = await evaluate("Math.min(document.body.scrollHeight, 12000)");
  await shootClipped("communications_full.png", "light", { x: 0, y: 0, width: 1600, height: pageHeight, scale: 0.5 }, "[data-testid=\"communications-view\"], .communications-summary-grid");
});

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
