/*
 * ИЗМЕРИТЕЛЬ ВЫСОТЫ ШАПКИ — не тест и не конвейер снимков.
 *
 * ЗАЧЕМ. Бриф пакета BB2 требует высоту `.topbar` на 390/900/1440/1600px ДО и
 * ПОСЛЕ правки, «измеренную одним и тем же способом», и прямого ответа на
 * вопрос, снизилась ли высота на 1600px. Два предыдущих запуска пакета этого
 * ответа не дали: они считали арифметикой по таблице стилей и честно писали, что
 * знак разницы на 1600px НЕИЗВЕСТЕН, потому что ширину видимой подписи
 * «Заблокировать» без браузера измерить нечем.
 *
 * Браузер в проекте есть: AGENTS.md:219 называет headless Chromium штатным
 * инструментом, и он лежит в кеше ms-playwright. Снимков этот файл не делает —
 * только читает `getBoundingClientRect()`. Конвейер снимков принадлежит лиду.
 *
 * ЧТО ЭТО НЕ ЕСТЬ, СКАЗАНО СРАЗУ. Это НЕ рендер живого React-приложения. Разметка
 * шапки воспроизведена здесь вручную по JSX (`workspaceShell.tsx` на HEAD — для
 * «после», `git show f34840348^` — для «до») и по императивному построителю группы
 * (`WorkspaceActions.tsx:70-99`, `dom.host.dataset.placement = "header"` :327).
 * Поэтому:
 *   - абсолютные числа — числа ЭТОГО стенда, а не production;
 *   - «до» и «после» отличаются РОВНО составом `.top-actions`; поддерево
 *     `.topbar-context` побайтово одинаково в обеих ветках. Значит РАЗНИЦА
 *     измерена корректно, и именно разницу требует бриф.
 *
 * Таблицы стилей берутся настоящие и в настоящем порядке из `main.tsx:8-27`, минус
 * `tailwind.css`: он требует компиляции плагином Vite. В шапке нет ни одной утилиты
 * Tailwind (проверено по JSX), поэтому на раскладку шапки это не влияет; исключение
 * названо в отчёте.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const stylesDir = resolve(repoRoot, "apps/web/src/styles");

/* Реальный порядок из main.tsx:8-27. tailwind.css исключён — нужен компилятор. */
const styleSheets = [
	"main.css",
	"shadow-analyst.css",
	"patients-redesign.css",
	"premium.css",
	"dente-redesign.css",
	"token-aliases.css",
	"touch-targets.css",
	"overflow-fixes.css",
	"contrast-fixes.css",
	"dente-operations.css",
	"onboarding-wizard.css",
];

const actionsCssPath = resolve(
	repoRoot,
	"apps/web/src/components/workspaceActions/workspaceActions.css",
);

/* Группа помощника: `.dnt-actions-mount--header` > `.dnt-actions[data-placement=header]`
 * > `.dnt-actions__notice` + `.dnt-actions__bar` > 3 слота `display: contents`.
 * Подписи — из workspaceActionsLabels.ts (search/voice/help). Подсказка
 * `.dnt-actions__control-hint` в шапке `display: none` (workspaceActions.css:186),
 * поэтому на ширину не влияет, но в разметке присутствует, как в исходнике. */
function groupMarkup() {
	const control = (label, hint, extraClass) => `
    <div class="dnt-actions__slot">
      <button type="button" class="dnt-actions__control${extraClass}">
        <svg class="dnt-actions__control-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"></svg>
        <span class="dnt-actions__control-text">
          <span class="dnt-actions__control-label">${label}</span>
          <span class="dnt-actions__control-hint">${hint}</span>
        </span>
      </button>
    </div>`;
	return `
  <div class="dnt-actions-mount dnt-actions-mount--header">
    <div id="dnt-actions-host" class="dnt-actions" data-placement="header" role="group" aria-label="Голос и поиск">
      <div class="dnt-actions__slot dnt-actions__notice"></div>
      <div class="dnt-actions__bar">
        ${control("Поиск", "Найти пациента, раздел или действие", "")}
        ${control("Голос", "Держите кнопку и говорите — текст попадёт в карту", " dnt-actions__control--primary")}
        ${control("Справка", "Какие команды понимает помощник", "")}
      </div>
    </div>
  </div>`;
}

/* Значок внутри кнопок клиники. Размер задаёт CSS (`.primary-button svg`,
 * `.secondary-button svg` — 15px; `.icon-button svg` — 16px), а не атрибут:
 * у замка «до» стоял size={20}, и таблица стилей его перебивала. */
const glyph =
	'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"></svg>';

/* СОСТАВ «ДО» — дословно git show f34840348^:apps/web/src/workspaceShell.tsx.
 * Роль как на кадре, который судил лид (владелец на #analytics):
 * showAdministrationTopActions = true, showDoctorVisitShortcut = false. */
function actionsBefore() {
	return `
  <div class="top-actions">
    ${groupMarkup()}
    <a class="icon-button" href="#settings" title="Настройки импорта и экспорта" aria-label="Настройки импорта и экспорта">${glyph}</a>
    <button class="secondary-button compact-top-button" type="button">${glyph} Настроить</button>
    <button aria-label="Открыть диктовку приема" class="icon-button top-dictation-button" type="button" title="Голосовая заметка">${glyph}</button>
    <button aria-label="Заблокировать сессию" class="icon-button top-lock-button" type="button" title="Заблокировать сессию">${glyph}</button>
    <button class="primary-button" type="button">${glyph} Запись</button>
  </div>`;
}

/* СОСТАВ «ПОСЛЕ» — дословно workspaceShell.tsx:624-744 на HEAD, та же роль. */
function actionsAfter() {
	return `
  <div class="top-actions">
    ${groupMarkup()}
    <button class="primary-button" type="button" title="Открыть записи и добавить приём">${glyph} Запись</button>
    <button class="secondary-button compact-top-button" type="button" title="Открыть мастер настройки клиники">${glyph} Настроить</button>
    <button class="secondary-button compact-top-button" type="button" title="Запереть рабочее место — вернуться можно по ПИН-коду">${glyph} Заблокировать</button>
  </div>`;
}

/* СОСТАВ «ПРЕДЛОЖЕНО» — то же, что «после», но «Запись» стоит ПЕРВОЙ.
 *
 * Проверяемая гипотеза: строка flex всегда кладёт на себя хотя бы один элемент,
 * значит первый элемент в порядке следования не может быть перенесён НИКОГДА.
 * Замер «после» показал, что на 900px «Запись» всё ещё уезжает на вторую строку —
 * группа помощника (297.61px, `flex: 0 0 auto`) одна съедает первую. Эта ветка
 * существует, чтобы решение принималось по числу, а не по надежде. */
function actionsProposed() {
	return `
  <div class="top-actions">
    <button class="primary-button" type="button" title="Открыть записи и добавить приём">${glyph} Запись</button>
    ${groupMarkup()}
    <button class="secondary-button compact-top-button" type="button" title="Открыть мастер настройки клиники">${glyph} Настроить</button>
    <button class="secondary-button compact-top-button" type="button" title="Запереть рабочее место — вернуться можно по ПИН-коду">${glyph} Заблокировать</button>
  </div>`;
}

/* Поддерево контекста ОДИНАКОВО в обеих ветках: это контрольная величина.
 * Состав — workspaceShell.tsx:550-579 (eyebrow + h1 + переключатель роли +
 * RecentPatientHistoryWidget с классом .workspace-role-switcher
 * .recent-patients-header-dropdown, RecentPatientHistoryWidget.tsx:79-90). */
function contextMarkup(clinicName) {
	return `
  <div class="topbar-context">
    <div class="topbar-clinic">
      <p class="eyebrow">вторник · 28 июля 2026</p>
      <h1>${clinicName}</h1>
    </div>
    <details class="workspace-role-switcher" aria-label="Рабочая роль">
      <summary><span>Роль</span><strong>Владелец</strong></summary>
    </details>
    <details class="workspace-role-switcher recent-patients-header-dropdown">
      <summary><span>Недавние</span><strong>Иванова А. П.</strong></summary>
    </details>
  </div>`;
}

function page(variant, clinicName) {
	const links = [
		...styleSheets.map((f) => pathToFileURL(resolve(stylesDir, f)).href),
		pathToFileURL(actionsCssPath).href,
	]
		.map((href) => `<link rel="stylesheet" href="${href}">`)
		.join("\n    ");

	const actions = variant === "before" ? actionsBefore() : actionsAfter();

	return `<!doctype html>
<html lang="ru" data-theme="light">
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    ${links}
  </head>
  <body>
    <main class="app-shell dente-redesign" data-collapsed="false">
      <aside class="sidebar" data-collapsed="false"></aside>
      <section class="workspace view-analytics" id="workspace-content">
        <header class="topbar">
          ${contextMarkup(clinicName)}
          ${actions}
        </header>
      </section>
    </main>
  </body>
</html>`;
}

/* Читается в браузере. Строки flex определяются по offsetTop: элементы с одним
 * offsetTop лежат на одной строке. Это прямое чтение раскладки, а не вывод из CSS. */
const probe = () => {
	const round = (n) => Math.round(n * 100) / 100;
	const topbar = document.querySelector(".topbar");
	const actions = document.querySelector(".top-actions");
	const context = document.querySelector(".topbar-context");

	const visible = (el) => {
		const cs = getComputedStyle(el);
		if (cs.display === "none" || cs.visibility === "hidden") return false;
		const r = el.getBoundingClientRect();
		return r.width > 0 && r.height > 0;
	};

	const children = [...actions.children].filter(visible);

	/* СТРОКИ ОПРЕДЕЛЯЮТСЯ ПО ЦЕНТРУ, А НЕ ПО offsetTop.
	 *
	 * Первая версия этого измерителя считала строки по `offsetTop` и насчитала три
	 * там, где их две. Причина: `.top-actions` — `align-items: center`
	 * (dente-redesign.css:391), а элементы разной высоты (группа 42px, кнопки 36px)
	 * при центрировании получают РАЗНЫЙ offsetTop, лёжа на ОДНОЙ строке. Числа того
	 * прогона выброшены.
	 *
	 * Центры соседних строк расходятся минимум на высоту элемента плюс row-gap
	 * (36 + 8 = 44px), поэтому допуск 18px разделяет строки и не разделяет
	 * центрированные элементы внутри строки. */
	const centre = (el) => {
		const r = el.getBoundingClientRect();
		return r.top + r.height / 2;
	};
	const lines = [];
	for (const c of children.map(centre).sort((a, b) => a - b)) {
		if (!lines.length || Math.abs(c - lines[lines.length - 1]) > 18)
			lines.push(c);
	}
	const lineOf = (el) => {
		const c = centre(el);
		let best = 0;
		for (let i = 1; i < lines.length; i += 1) {
			if (Math.abs(c - lines[i]) < Math.abs(c - lines[best])) best = i;
		}
		return best + 1;
	};

	const describe = (el) => {
		const r = el.getBoundingClientRect();
		/* Видимая подпись = собственный текст элемента без учёта скрытых узлов.
		 * innerText учитывает display:none, textContent — нет; поэтому innerText. */
		const own = (el.innerText || "").trim();
		return {
			tag: el.tagName.toLowerCase(),
			cls: el.className,
			visibleLabel: own || null,
			accessibleName: el.getAttribute("aria-label") || own || null,
			title: el.getAttribute("title") || null,
			width: round(r.width),
			line: lineOf(el),
		};
	};

	/* Кнопки внутри группы считаются отдельно: группа — один flex-элемент строки,
	 * но управляющих элементов в ней три. */
	const groupControls = [...actions.querySelectorAll(".dnt-actions__control")]
		.filter(visible)
		.map((el) => ({
			cls: el.className,
			visibleLabel: (el.innerText || "").trim() || null,
			width: round(el.getBoundingClientRect().width),
		}));

	const book = children.find((el) => el.classList.contains("primary-button"));

	return {
		topbarHeight: round(topbar.getBoundingClientRect().height),
		topbarWidth: round(topbar.getBoundingClientRect().width),
		actionsHeight: round(actions.getBoundingClientRect().height),
		actionsWidth: round(actions.getBoundingClientRect().width),
		contextHeight: round(context.getBoundingClientRect().height),
		actionsLineCount: lines.length,
		flexChildren: children.length,
		interactiveControls:
			children.filter((el) => !el.classList.contains("dnt-actions-mount"))
				.length + groupControls.length,
		unlabelled: children
			.filter((el) => !el.classList.contains("dnt-actions-mount"))
			.filter((el) => !(el.innerText || "").trim()).length,
		bookLine: book ? lineOf(book) : null,
		bookIsAlone: book
			? children.filter((el) => lineOf(el) === lineOf(book)).length === 1
			: null,
		golosLoaded: document.fonts.check('600 13px "Golos Text"'),
		fontUsed: getComputedStyle(document.body).fontFamily.split(",")[0].trim(),
		children: children.map(describe),
		groupControls,
	};
};

const widths = [390, 900, 1440, 1600];
const clinicName = process.argv[2] || "Стоматология, 1 кабинет";

const browser = await chromium.launch();
const results = {};

for (const variant of ["before", "after"]) {
	results[variant] = {};
	const ctx = await browser.newContext({
		viewport: { width: 1600, height: 900 },
	});
	const p = await ctx.newPage();
	/* Страница КЛАДЁТСЯ НА ДИСК и открывается как file://, а не подаётся через
	 * setContent. Первый прогон этого измерителя дал у body шрифт Times New Roman и
	 * побайтово одинаковые «до»/«после»: документ setContent живёт не на file://, и
	 * Chromium блокирует у него подгрузку file://-подресурсов — ни одна таблица
	 * стилей не применилась, а стенд честно измерил неоформленный HTML. Числа того
	 * прогона выброшены целиком. */
	const htmlPath = resolve(here, `harness-${variant}.html`);
	writeFileSync(htmlPath, page(variant, clinicName), "utf8");
	await p.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
	/* Стенд обязан доказать САМ, что оформление приехало: если правила не
	 * применились, любое число ниже — измерение голого HTML. */
	const styled = await p.evaluate(() => {
		const cs = getComputedStyle(document.querySelector(".topbar"));
		return { display: cs.display, paddingLeft: cs.paddingLeft };
	});
	if (styled.display !== "flex") {
		throw new Error(
			`Таблицы стилей не применились: .topbar display=${styled.display}, ожидался flex. Измерять нечего.`,
		);
	}
	/* Шрифт может грузиться из сети. Ждём готовности, иначе ширины снимутся на
	 * подменном шрифте у одной ветки и на настоящем у другой. */
	await p.evaluate(() => document.fonts.ready);

	for (const width of widths) {
		await p.setViewportSize({ width, height: 900 });
		await p.evaluate(
			() =>
				new Promise((r) =>
					requestAnimationFrame(() => requestAnimationFrame(r)),
				),
		);
		results[variant][width] = await p.evaluate(probe);
	}

	/* Собственная ширина строки действий без конкуренции за место: стенд
	 * расширяется так, что переносу заведомо негде случиться. Это и есть «рычаг»,
	 * величина без зависимости от длины названия клиники. */
	await p.setViewportSize({ width: 1600, height: 900 });
	const intrinsic = await p.evaluate(() => {
		const context = document.querySelector(".topbar-context");
		const actions = document.querySelector(".top-actions");
		const prevCtx = context.style.display;
		context.style.display = "none";
		/* `width: max-content` + запрет переноса даёт СОБСТВЕННУЮ ширину содержимого.
		 * Прошлый вариант растягивал `.topbar` до 5000px и получал 5000 в обеих
		 * ветках: `.top-actions` — flex-элемент и занимал предоставленное место, то
		 * есть измерялся контейнер, а не кнопки. */
		const prevWrap = actions.style.flexWrap;
		const prevWidth = actions.style.width;
		actions.style.flexWrap = "nowrap";
		actions.style.width = "max-content";
		const r = actions.getBoundingClientRect();
		const w = Math.round(r.width * 100) / 100;
		const h = Math.round(r.height * 100) / 100;
		actions.style.flexWrap = prevWrap;
		actions.style.width = prevWidth;
		context.style.display = prevCtx;
		return { intrinsicActionsWidth: w, intrinsicActionsHeight: h };
	});
	results[variant].intrinsic = intrinsic;

	await ctx.close();
}

await browser.close();
console.log(JSON.stringify({ clinicName, results }, null, 2));
