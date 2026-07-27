/**
 * Снимает мастер переноса в живом интерфейсе и прогоняет его через настоящий API.
 *
 * Не «проверка вёрстки», а проверка работы: скрипт входит в систему, открывает
 * вкладку импорта, заливает настоящий файл DBF в cp866 через тот же диалог, что
 * и оператор, дожидается карты соответствия, запускает сухой прогон и снимает
 * акт сверки. Если на любом шаге интерфейс не показал ожидаемого, скрипт падает.
 *
 * Скриншоты нужны, чтобы посмотреть глазами: числа могут сойтись, а панель —
 * разъехаться или оказаться нечитаемой в тёмной теме.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const WEB_URL = process.env.DENTE_WEB_URL ?? "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("screenshots/migration-wizard");
const LOGIN = process.env.DENTE_DEMO_LOGIN ?? "clinic@example.com";
const TOKENS_FILE = process.env.DENTE_TOKENS_FILE ?? null;
const PASSWORD = process.env.DENTE_DEMO_PASSWORD ?? "dente2026";

/** Настоящие подписанные токены, если переданы файлом. */
let TOKENS = null;
if (TOKENS_FILE) {
  const { readFile } = await import("node:fs/promises");
  TOKENS = JSON.parse(await readFile(TOKENS_FILE, "utf8"));
}

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Кодирует текст в однобайтовую кодировку через обратную таблицу декодера. */
function encodeSingleByte(text, encoding) {
  const decoder = new TextDecoder(encoding);
  const map = new Map();
  for (let byte = 0; byte <= 0xff; byte += 1) {
    const code = decoder.decode(Uint8Array.of(byte)).codePointAt(0);
    if (code !== undefined && !map.has(code)) map.set(code, byte);
  }
  return Buffer.from([...text].map((char) => map.get(char.codePointAt(0)) ?? 0x3f));
}

/** Собирает настоящий файл DBF: заголовок, описатели полей, записи. */
function buildDbf(fields, records, languageDriver, encoding) {
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = fields.reduce((sum, field) => sum + field.length, 0) + 1;

  const header = Buffer.alloc(headerLength, 0);
  header[0] = 0x03;
  header[1] = 124;
  header[2] = 3;
  header[3] = 15;
  header.writeUInt32LE(records.length, 4);
  header.writeUInt16LE(headerLength, 8);
  header.writeUInt16LE(recordLength, 10);
  header[29] = languageDriver;

  fields.forEach((field, index) => {
    const offset = 32 + index * 32;
    Buffer.from(field.name, "ascii").copy(header, offset, 0, Math.min(10, field.name.length));
    header[offset + 11] = field.type.charCodeAt(0);
    header[offset + 16] = field.length;
  });
  header[headerLength - 1] = 0x0d;

  const body = records.map((record) => {
    const buffer = Buffer.alloc(recordLength, 0x20);
    buffer[0] = 0x20;
    let offset = 1;
    fields.forEach((field, index) => {
      const bytes = encodeSingleByte(record[index] ?? "", encoding);
      bytes.copy(buffer, offset, 0, Math.min(field.length, bytes.length));
      offset += field.length;
    });
    return buffer;
  });

  return Buffer.concat([header, ...body, Buffer.from([0x1a])]);
}

await mkdir(OUT_DIR, { recursive: true });

const SURNAMES = ["Иванов", "Петров", "Сидоров", "Кузнецов", "Смирнов", "Волков", "Морозов", "新"];
const GIVEN = ["Александр", "Мария", "Дмитрий", "Анна", "Сергей", "Ольга"];
const PATRONYMIC = ["Иванович", "Сергеевна", "Петрович", "Андреевна"];

const dbf = buildDbf(
  [
    { name: "NKART", type: "C", length: 6 },
    { name: "FIO", type: "C", length: 44 },
    { name: "TEL", type: "C", length: 20 },
    { name: "DROJD", type: "D", length: 8 },
    { name: "PRIM", type: "C", length: 40 }
  ],
  Array.from({ length: 120 }, (_, index) => {
    const female = index % 2 === 1;
    const surname = `${SURNAMES[index % 7]}${female ? "а" : ""}`;
    const given = GIVEN[Math.floor(index / 7) % GIVEN.length];
    const patronymic = PATRONYMIC[Math.floor(index / 42) % PATRONYMIC.length];
    return [
      String(1000 + index),
      `${surname} ${given} ${patronymic}`,
      `+7900${String(1000000 + index).slice(-7)}`,
      `${1950 + (index % 60)}${String((index % 12) + 1).padStart(2, "0")}${String((index % 28) + 1).padStart(2, "0")}`,
      index % 9 === 0 ? "" : `Перенос строки ${index + 1}`
    ];
  }),
  0x65,
  "ibm866"
);

const dbfPath = path.join(OUT_DIR, "PACIENT.DBF");
await writeFile(dbfPath, dbf);
console.log(`\n=== Мастер переноса в живом интерфейсе ===`);
console.log(`Образец: ${dbfPath}, ${(dbf.length / 1024).toFixed(1)} КБ, 120 записей в cp866\n`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "ru-RU" });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

try {
  console.log("--- 1. Вход и переход на вкладку импорта");

  /**
   * Токены подставляются в хранилище напрямую. Они НАСТОЯЩИЕ: подписаны тем же
   * секретом, что проверяет сервер, и выпущены на существующую организацию.
   * Форма входа при этом не проверяется — она к переносу отношения не имеет, а
   * подбирать боевой пароль клиники ради скриншота недопустимо.
   */
  if (TOKENS !== null) {
    await page.addInitScript((tokens) => {
      window.localStorage.setItem("dente_clinic_token", tokens.clinicToken);
      window.localStorage.setItem("dente_staff_token", tokens.staffToken);
    }, TOKENS);
  }

  await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3500);

  // Демо-вход, если показана форма.
  const loginField = page.locator('input[type="email"], input[name="login"], input[placeholder*="почт" i]').first();
  if (await loginField.isVisible().catch(() => false)) {
    await loginField.fill(LOGIN);
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill(PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3500);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "01-после-входа.png") });

  /**
   * Экран первого запуска. Он появляется, пока клиника не выбрала режим, и
   * закрывает собой всё приложение — без него до настроек не дойти.
   */
  const onboardingDemo = page.getByText(/Попробовать демо-режим/i).first();
  if (await onboardingDemo.isVisible().catch(() => false)) {
    console.log("       пройден экран первого запуска");
    await onboardingDemo.click();
    await page.waitForTimeout(3000);
    // Мастер настройки может состоять из нескольких шагов: проходим до конца.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const next = page
        .getByRole("button", { name: /Далее|Продолжить|Готово|Начать работу|Пропустить/i })
        .first();
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "01b-после-первого-запуска.png") });
  }

  /**
   * Переход сразу на вкладку переноса через адресную строку.
   *
   * Заходить через боковое меню нельзя: раздел настроек открывается на вкладке
   * «клиника», а она сейчас падает в чужом, только что переписанном компоненте
   * SettingsClinicTab, и защитный контур гасит весь раздел целиком. Хэш-маршрут
   * ведёт прямо на нужную вкладку, минуя сломанную.
   */
  await page.goto(`${WEB_URL}/#settings/imports`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Если приложение всё же осталось на другой вкладке, доводим кликом.
  const importsTab = page.getByRole("button", { name: /Импорт|Перенос/i }).first();
  if (await importsTab.isVisible().catch(() => false)) {
    await importsTab.click();
    await page.waitForTimeout(1500);
  }

  const wizard = page.locator(".migration-wizard");
  const wizardVisible = await wizard.isVisible().catch(() => false);
  check("мастер переноса отображается", wizardVisible);

  if (!wizardVisible) {
    await page.screenshot({ path: path.join(OUT_DIR, "02-мастер-не-найден.png"), fullPage: true });
    throw new Error("Мастер переноса не найден на вкладке импорта.");
  }

  await wizard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await wizard.screenshot({ path: path.join(OUT_DIR, "02-шаг-источник.png") });
  console.log("       снят экран выбора источника");

  const dropTitle = await page.locator(".mw-drop-title").textContent();
  check("видна зона перетаскивания", (dropTitle ?? "").includes("Перетащите"), dropTitle ?? "");

  console.log("--- 2. Заливка файла через тот же диалог, что у оператора");
  await page.locator(".mw-file-input").setInputFiles(dbfPath);

  // Ждём карту соответствия: она появляется после заливки и сопоставления.
  await page.locator(".mw-mapping-table").waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForTimeout(600);

  const encodingText = await page.locator(".mw-source-meta").textContent();
  check("показана кодировка из заголовка DBF", (encodingText ?? "").includes("ibm866"), encodingText ?? "");

  const mappedRows = await page.locator(".mw-mapping-row:not(.mw-mapping-head)").count();
  check("карта соответствия заполнена", mappedRows >= 4, `строк в карте: ${mappedRows}`);

  const targets = await page.locator(".mw-col-target").allTextContents();
  check("ФИО сопоставлено", targets.includes("patient.fullName"), targets.join(", "));
  check("телефон сопоставлен", targets.includes("patient.phone"), targets.join(", "));

  /** Ключевая проверка приватности: на экран выводятся маски, а не значения. */
  const shapes = await page.locator(".mw-col-shapes").allTextContents();
  const shapesJoined = shapes.join(" ");
  check(
    "в примерах маски, а не настоящие ФИО",
    !/Иванов|Петров|Сидоров/.test(shapesJoined),
    shapesJoined.slice(0, 80)
  );

  const projected = await page.locator(".mw-proj-value").allTextContents();
  console.log(`       оценка: ${projected.join(" / ")}`);

  await wizard.screenshot({ path: path.join(OUT_DIR, "03-карта-соответствия.png") });
  console.log("       снят экран карты соответствия");

  console.log("--- 3. Сухой прогон");
  await page.getByRole("button", { name: "Сухой прогон" }).click();

  // Экран прогресса появляется сразу: запрос выполнения возвращает 202.
  await page.locator(".mw-running").waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  const runningVisible = await page.locator(".mw-running").isVisible().catch(() => false);
  if (runningVisible) {
    await wizard.screenshot({ path: path.join(OUT_DIR, "04-прогресс.png") });
    console.log("       снят экран прогресса");
  }

  // Ждём акт сверки.
  await page.locator(".mw-verdict").waitFor({ state: "visible", timeout: 90_000 });
  await page.waitForTimeout(600);

  const verdictText = await page.locator(".mw-verdict strong").textContent();
  check("показан итог сверки", (verdictText ?? "").length > 0, verdictText ?? "");
  check("сверка сошлась", (verdictText ?? "").includes("сошлась") && !(verdictText ?? "").includes("НЕ"), verdictText ?? "");

  /** Значок итога обязан быть виден: белое на белом — это пустой кружок. */
  const markContrast = await page.evaluate(() => {
    const mark = document.querySelector(".mw-verdict-mark");
    if (!mark) return null;
    const style = window.getComputedStyle(mark);
    return { background: style.backgroundColor, color: style.color, text: mark.textContent };
  });
  check(
    "значок итога различим (фон и текст разного цвета)",
    markContrast !== null && markContrast.background !== markContrast.color,
      );

  const counters = await page.locator(".mw-counter").allTextContents();
  console.log(`       счётчики: ${counters.map((text) => text.replace(/\s+/g, " ").trim()).join(" | ")}`);

  const checkTitles = await page.locator(".mw-check-body strong").allTextContents();
  check("показаны проверки сверки", checkTitles.length >= 4, `${checkTitles.length} проверок`);

  const failedChecks = await page.locator(".mw-check.is-bad").count();
  check("непройденных проверок нет", failedChecks === 0, `непройдено: ${failedChecks}`);

  await wizard.screenshot({ path: path.join(OUT_DIR, "05-акт-сверки.png") });
  console.log("       снят экран акта сверки");

  // Кнопка записи должна появиться только после успешного сухого прогона.
  const liveButton = page.getByRole("button", { name: "Перенести в базу" });
  check("кнопка записи появилась после сухого прогона", await liveButton.isVisible().catch(() => false));

  console.log("--- 4. Тёмная тема");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.classList.add("theme-dark");
  });
  await page.waitForTimeout(600);
  await wizard.screenshot({ path: path.join(OUT_DIR, "06-тёмная-тема.png") });

  /**
   * Контраст в тёмной теме проверяется вычислением, а не глазами: панель,
   * которая берёт цвет из переменной темы, останется читаемой, а захардкоженный
   * белый фон превратится в светлое пятно.
   */
  const contrast = await page.evaluate(() => {
    const panel = document.querySelector(".mw-panel");
    if (!panel) return null;
    const style = window.getComputedStyle(panel);
    return { background: style.backgroundColor, color: style.color };
  });
  console.log(`       панель в тёмной теме: фон ${contrast?.background}, текст ${contrast?.color}`);
  check("панель не белая в тёмной теме", contrast?.background !== "rgb(255, 255, 255)", contrast?.background ?? "нет");

  console.log("--- 5. Ошибки в консоли браузера");
  /**
   * Ошибки соседнего компонента отделяются от ошибок мастера.
   *
   * SettingsImportsTab («Умный разбор») падает независимо от переноса: при
   * выносе из SettingsView он потерял защитные  и теперь не получает часть
   * пропсов. Его падение перехватывает отдельная граница ошибок, и на мастер оно
   * не влияет — но в консоли оно есть, и делать вид, что его нет, нельзя.
   */
  /**
   * Шум и чужие ошибки отделяются от ошибок мастера.
   *
   * Шум — служебные сообщения браузера и 404 от посторонних эндпоинтов
   * (egisz-blank-permissions, ram-watchdogs и прочие), которых в этой сборке
   * нет и которые к переносу отношения не имеют.
   *
   * Чужое — падение соседнего «Умного разбора»: он потерял защитные проверки
   * при выносе из SettingsView и не получает часть пропсов. Его перехватывает
   * отдельная граница ошибок, мастера это не касается. Но в консоли оно есть, и
   * прятать его нельзя — оно печатается отдельной строкой.
   */
  const noise = /favicon|ResizeObserver|Download the React DevTools|Failed to load resource/i;
  const foreign = /SettingsImportsTab|Умный разбор/i;
  const relevantErrors = consoleErrors.filter((text) => !noise.test(text) && !foreign.test(text));
  const foreignErrors = consoleErrors.filter((text) => foreign.test(text));

  check("нет ошибок JavaScript в мастере переноса", relevantErrors.length === 0, relevantErrors.slice(0, 2).join(" | "));
  if (foreignErrors.length > 0) {
    console.log(
      `       (соседний «Умный разбор» падает своей ошибкой: она изолирована границей и мастера не касается)`
    );
  }
} catch (error) {
  failures += 1;
  console.error("\n!!! Проверка прервана:");
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  await page.screenshot({ path: path.join(OUT_DIR, "99-ошибка.png"), fullPage: true }).catch(() => undefined);
} finally {
  await browser.close();
  console.log(`\nСкриншоты: ${OUT_DIR}`);
  console.log(failures === 0 ? "\nВсе проверки прошли." : `\nПровалено проверок: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}
