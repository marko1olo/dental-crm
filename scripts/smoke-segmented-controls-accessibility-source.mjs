import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

/*
 * СТРАЖ ДОСТУПНОСТИ СЕГМЕНТНЫХ ПЕРЕКЛЮЧАТЕЛЕЙ.
 *
 * Ни одно требование НЕ УДАЛЕНО. Правится ТОЛЬКО то, как страж читает исходники
 * и как докладывает. Продукт этой правкой не тронут.
 *
 * ГЛАВНАЯ НАХОДКА: СЕМЬ ТРЕБОВАНИЙ БЫЛИ ЗЕЛЁНЫМИ ПО КОММЕНТАРИЮ.
 *
 * apps/web/src/SettingsView.tsx:1935-2007 — блочный комментарий ПОСЛЕ `return`,
 * куда сложены строки разметки, и среди них ровно семь `aria-pressed={...}`:
 * режим клиники, роль сотрудника, специальность сотрудника, рабочие дни
 * расписания и три переключателя оснащения кресла. Страж сравнивал СЫРОЙ текст
 * файла через `.includes()`, поэтому закомментированная строка «выполняла»
 * требование к разметке. Это тот же класс подделки, что `// Compliance: …` в
 * useSettingsDerivations.tsx, только в другом файле и другой формы.
 *
 * ЗАМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. Проба сравнила выполнение всех 36 требований по
 * сырому тексту и по тексту без комментариев на 9 файлах разметки плюс все
 * домены логики: переворачиваются РОВНО 7 требований, все в SettingsView.tsx, и
 * ни одного ложного переворота в других файлах (длина текста при вырезке
 * сохраняется, JSX-текст и строки не затрагиваются).
 *
 * Поэтому ниже сначала вырезаются комментарии, а требования ищутся только в
 * КОДЕ. Ни одно из этих семи требований от этого не пропало: шесть нашлись
 * живыми в components/settings/SettingsClinicTab.tsx (класс STALE — переезд при
 * разборе монолита), седьмое там же, но с optional chaining (класс BRITTLE).
 */
function codeOnly(source) {
	let out = "";
	let i = 0;
	const n = source.length;
	while (i < n) {
		const c = source[i];
		const next = source[i + 1];
		if (c === "/" && next === "/") {
			while (i < n && source[i] !== "\n") {
				out += " ";
				i += 1;
			}
			continue;
		}
		if (c === "/" && next === "*") {
			while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
				out += source[i] === "\n" ? "\n" : " ";
				i += 1;
			}
			out += "  ";
			i += 2;
			continue;
		}
		if (c === '"' || c === "'" || c === "`") {
			const quote = c;
			out += c;
			i += 1;
			while (i < n) {
				if (source[i] === "\\") {
					out += source[i] + (source[i + 1] ?? "");
					i += 2;
					continue;
				}
				out += source[i];
				if (source[i] === quote) {
					i += 1;
					break;
				}
				i += 1;
			}
			continue;
		}
		out += c;
		i += 1;
	}
	return out;
}

const appSource = [
	readFileSync("apps/web/src/App.tsx", "utf8"),
	readAppLogicSourceSync(),
	readFileSync("apps/web/src/ImagingView.tsx", "utf8"),
	readFileSync("apps/web/src/VisitView.tsx", "utf8"),
]
	.map(codeOnly)
	.join("\n");

/*
 * НАБОР ФАЙЛОВ НАСТРОЕК: МОНОЛИТ ПЛЮС ЖИВЫЕ ВКЛАДКИ (класс STALE).
 *
 * SettingsView.tsx разобран на вкладки и рендерит их по условию активной
 * вкладки: SettingsClinicTab — строка 1586, SettingsPricesTab — 1831,
 * SettingsAiTab — 1835, SettingsImportsTab — 1894. Это ЖИВЫЕ поверхности, а не
 * мёртвые копии, поэтому набор расширен, а требования не ослаблены.
 */
const settingsSource = [
	readFileSync("apps/web/src/SettingsView.tsx", "utf8"),
	readFileSync(
		"apps/web/src/components/settings/SettingsClinicTab.tsx",
		"utf8",
	),
	readFileSync(
		"apps/web/src/components/settings/SettingsPricesTab.tsx",
		"utf8",
	),
	readFileSync("apps/web/src/components/settings/SettingsAiTab.tsx", "utf8"),
	readFileSync(
		"apps/web/src/components/settings/SettingsImportsTab.tsx",
		"utf8",
	),
]
	.map(codeOnly)
	.join("\n");

/*
 * РЕЕСТР ОБЪЯВЛЕННОГО ДОЛГА. КЛЮЧ — ТЕКСТ ТРЕБОВАНИЯ ДОСЛОВНО.
 * Идиом взят из scripts/smoke-settings-view-source.mjs (KNOWN_MISSING_SETTINGS_SURFACES).
 *
 * Класс REAL — поверхности НЕТ НИГДЕ: ни в разметке, ни в комментариях, ни под
 * другим именем атрибута. Закрыть такой долг = НАПИСАТЬ ДОСТУПНОСТЬ в продукте,
 * а не добавить файл в набор и не подставить сегодняшнее написание.
 *
 * ХРАПОВИК В ОБРАТНУЮ СТОРОНУ: если требование из реестра НАЧНЁТ выполняться,
 * страж падает с кодом 2 и требует убрать запись. Плюс проверяется, что каждая
 * запись реестра была ОПРОБОВАНА — иначе удалённое требование оставит в реестре
 * вечную строку «этого нет».
 */
const KNOWN_MISSING_SEGMENTED_SURFACES = new Map([
	/*
	 * Реестр ПУСТ, и это состояние, а не забытая уборка.
	 *
	 * Последняя запись — «Settings recognition preset picker must expose selected
	 * state» — снята после того, как доступность была НАПИСАНА: пресеты
	 * распознавания стали группой переключателей (role="radiogroup") из элементов
	 * role="radio" с атрибутом aria-checked, и обход клавиатурой идёт через
	 * выбранный элемент. Обратный храповик сам этого и потребовал: он упал с кодом
	 * 2 и сказал убрать запись, иначе реестр начнёт врать.
	 *
	 * Пустой реестр означает: все требования этого стража сегодня выполняются.
	 * Новую запись сюда добавляют только вместе с ИЗМЕРЕННОЙ причиной — что именно
	 * в продукте отсутствует и что теряет человек, который этим пользуется.
	 */
]);

const missing = [];
const debtDeclared = [];
const debtClosed = [];
const exercised = new Set();

function requireIn(source, snippet, message) {
	requireSatisfied(source.includes(snippet), message);
}

function requirePattern(source, pattern, message) {
	requireSatisfied(pattern.test(source), message);
}

function requireSatisfied(satisfied, message) {
	exercised.add(message);
	const debtReason = KNOWN_MISSING_SEGMENTED_SURFACES.get(message);
	if (!satisfied) {
		if (debtReason) {
			debtDeclared.push(`${message}\n    ${debtReason}`);
			return;
		}
		missing.push(message);
		return;
	}
	if (debtReason) {
		debtClosed.push(message);
	}
}

/*
 * СОСТОЯНИЕ ВЫБОРА ЗАКРЕПЛЯЕТСЯ ПО СВЯЗИ, А НЕ ПО НАПИСАНИЮ АТРИБУТА.
 *
 * Класс BRITTLE: часть требований краснела за то, что разметка стала
 * ПРАВИЛЬНЕЕ. Замеры 29.07.2026:
 *
 *   ImagingView.tsx:618,627 — кнопки фильтра снимков получили role="tab" и
 *   выражают выбор через aria-selected. Для role="tab" это ЕДИНСТВЕННЫЙ верный
 *   атрибут: aria-pressed определён для кнопок-переключателей, а не для вкладок.
 *   Требование «expose selected state» выполнено лучше, чем просили.
 *
 *   SettingsPricesTab.tsx:475,549 — переключатели заменены на НАТИВНЫЕ
 *   input[type=radio] и input[type=checkbox] с `checked={...}`. Нативное
 *   состояние выбора доступнее любого aria-атрибута, и заодно там сменилось имя
 *   переменной цикла (`kind` -> `key`).
 *
 *   SettingsClinicTab.tsx:424 — режим клиники читается через optional chaining
 *   (`dashboard?.clinicSettings?.profile?.mode`).
 *
 * Поэтому образец принимает ЛЮБОЙ атрибут, который несёт состояние выбора
 * (aria-pressed / aria-selected / нативный checked), но ТРЕБУЕТ, чтобы он был
 * привязан именно к тому выражению, которое и означает «этот элемент выбран».
 * Подставлять сегодняшнее написание было нельзя: это снова прибило бы требование
 * к имени переменной и к сорту атрибута.
 */
const SELECTED_STATE_ATTRIBUTES = "(?:aria-pressed|aria-selected|checked)";

/** Выражение выбора: точки могут быть опциональными, пробелы свободные. */
function selectionExpression(expression) {
	return expression
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		.split("\\.")
		.join("\\??\\.")
		.split(" ")
		.join("\\s*");
}

/**
 * Атрибут состояния привязан к выражению выбора — НАПРЯМУЮ ИЛИ ЧЕРЕЗ ПЕРЕМЕННУЮ.
 *
 * ПОЧЕМУ ДОБАВИЛАСЬ ВТОРАЯ ФОРМА. Прежняя проверка требовала, чтобы выражение
 * стояло ДОСЛОВНО внутри фигурных скобок атрибута. Это проверяло не факт, а
 * СПОСОБ ЗАПИСИ: как только выражение выносят в локальную переменную —
 *
 *     const selected = recognitionKind === preset.kind && recognitionTarget === preset.target;
 *     <button aria-checked={selected} …>
 *
 * — состояние выбора объявлено правильно и доступно скринридеру, а страж этого
 * НЕ ВИДИТ и продолжает считать требование невыполненным. Проверено на живой
 * правке: доступность написана, страж по-прежнему печатал «доступности нет».
 *
 * Хуже того, вынести выражение в переменную приходится по делу: тот же признак
 * нужен и `className`, и `tabIndex` группы переключателей, а тройное повторение
 * условия — это три места, где его можно разойтись.
 *
 * Страж, который заставляет писать хуже, чтобы он был доволен, будет обойдён или
 * выключен. Поэтому здесь принимаются ДВЕ формы, и вторая требует настоящей
 * связи: имя переменной должно быть ОБЪЯВЛЕНО через то самое выражение выбора, а
 * не просто совпасть по названию. Подставить любую переменную нельзя.
 */
function selectedStateBoundTo(expression) {
	const value = selectionExpression(expression);
	const direct = `${SELECTED_STATE_ATTRIBUTES}=\\{\\s*${value}\\s*\\}`;
	/*
	 * Имя переменной — латиница, цифры, `_` и `$`, как в JavaScript. Обратная
	 * ссылка `\\1` требует, чтобы в атрибуте стояло ИМЕННО то имя, которое
	 * объявлено через выражение выбора: иначе проверка принимала бы `aria-checked`
	 * от любой другой переменной, оказавшейся в файле.
	 */
	const viaVariable =
		`(?:const|let)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*${value}\\s*;` +
		`[\\s\\S]*?${SELECTED_STATE_ATTRIBUTES}=\\{\\s*\\1\\s*\\}`;
	return new RegExp(`(?:${direct})|(?:${viaVariable})`);
}

requireIn(
	appSource,
	'aria-current={step.id === onboardingStep ? "step" : undefined}',
	"Onboarding step buttons must expose the current step.",
);
requireIn(
	appSource,
	"aria-pressed={step.id === onboardingStep}",
	"Onboarding step buttons must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={selectedWorkspaceRole === role}",
	"Onboarding role picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={selectedSpecialty === specialty}",
	"Onboarding and visit specialty pickers must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={newStaffRole === role}",
	"Onboarding team role picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={newStaffSpecialty === specialty}",
	"Onboarding team specialty picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={clinicProfileDraft.workingDays.includes(day.value)}",
	"Onboarding clinic working-day toggles must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={pricelistSourceKind === kind}",
	"Onboarding price source picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={importSourceKind === kind}",
	"Onboarding patient import source picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={smartImportMode === mode}",
	"Onboarding smart import mode picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={documentIngestionTarget === target}",
	"Onboarding document route picker must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={imagingImportSourceKind === kind}",
	"Onboarding imaging source picker must expose selected state.",
);
requirePattern(
	appSource,
	selectedStateBoundTo('imagingKindFilter === "all"'),
	"Imaging all-filter button must expose selected state.",
);
requirePattern(
	appSource,
	selectedStateBoundTo("imagingKindFilter === kind"),
	"Imaging kind filter buttons must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={imagingViewerState.flipHorizontal}",
	"Imaging mirror toggle must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={imagingViewerState.inverted}",
	"Imaging inversion toggle must expose selected state.",
);
requireIn(
	appSource,
	"aria-pressed={selectedProtocolTemplate.id === template.id}",
	"Visit protocol template picker must expose selected state.",
);

requireIn(
	settingsSource,
	'role="tablist"',
	"Settings tabs must expose a tablist role.",
);
requireIn(
	settingsSource,
	'role="tab"',
	"Settings tab buttons must expose tab roles.",
);
requireIn(
	settingsSource,
	'role="tabpanel"',
	"Settings active tab content must expose a tabpanel role.",
);
requireIn(
	settingsSource,
	"aria-selected={tabSelected}",
	"Settings tabs must expose selected state through aria-selected.",
);
requireIn(
	settingsSource,
	"aria-controls={settingsTabPanelId(tab.id)}",
	"Settings tabs must point to the active panel id.",
);
requireIn(
	settingsSource,
	"tabIndex={tabSelected ? 0 : -1}",
	"Settings tabs must keep a single tab stop.",
);
requireIn(
	settingsSource,
	"handleSettingsTabKeyDown",
	"Settings tabs must support arrow-key navigation.",
);
requireIn(
	settingsSource,
	"const nextTabButtonId = settingsTabButtonId(nextTab.id);",
	"Settings tab keyboard navigation must compute the exact next tab button id.",
);
requireIn(
	settingsSource,
	"document.getElementById(nextTabButtonId)?.focus()",
	"Settings tab keyboard navigation must focus the exact target tab button.",
);
requireIn(
	settingsSource,
	"aria-pressed={tabSelected}",
	"Settings tabs must preserve pressed state for existing button styling and tests.",
);
requirePattern(
	settingsSource,
	selectedStateBoundTo("dashboard.clinicSettings.profile.mode === mode"),
	"Settings clinic mode picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={newStaffRole === role}",
	"Settings staff role picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={newStaffSpecialty === specialty}",
	"Settings staff specialty picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={scheduleDraft.workingDays.includes(day.value)}",
	"Settings schedule working-day toggles must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={newChairHasXraySensor}",
	"Settings chair RVG toggle must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={newChairHasMicroscope}",
	"Settings chair microscope toggle must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={newChairHasSurgeryKit}",
	"Settings chair surgery toggle must expose selected state.",
);
// Имя переменной цикла в продукте сменилось на `key` — образец не пиннит его.
requirePattern(
	settingsSource,
	new RegExp(
		`${SELECTED_STATE_ATTRIBUTES}=\\{\\s*pricelistSourceKind === \\w+\\s*\\}`,
	),
	"Settings price source picker must expose selected state.",
);
requirePattern(
	settingsSource,
	selectedStateBoundTo("usePricelistAi"),
	"Settings price AI toggle must expose selected state.",
);
requirePattern(
	settingsSource,
	selectedStateBoundTo(
		"recognitionKind === preset.kind && recognitionTarget === preset.target",
	),
	"Settings recognition preset picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={smartImportMode === mode}",
	"Settings smart import mode picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={imagingImportSourceKind === kind}",
	"Settings imaging source picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={typedDicomFirstFrameViewerState.flipHorizontal}",
	"Settings first-slice mirror toggle must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={typedDicomFirstFrameViewerState.inverted}",
	"Settings first-slice inversion toggle must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={importSourceKind === kind}",
	"Settings legacy import source picker must expose selected state.",
);
requireIn(
	settingsSource,
	"aria-pressed={documentIngestionTarget === target}",
	"Settings document ingestion route picker must expose selected state.",
);

const untestedDebt = [...KNOWN_MISSING_SEGMENTED_SURFACES.keys()].filter(
	(message) => !exercised.has(message),
);

const brokenLiveLock =
	missing.length > 0 || debtClosed.length > 0 || untestedDebt.length > 0;

if (missing.length > 0) {
	console.error(
		`СЛОМАН ЖИВОЙ ЛОК (${missing.length}) — ЭТО РЕГРЕССИЯ ДОСТУПНОСТИ, А НЕ СТАРОЕ ОТСУТСТВИЕ:`,
	);
	for (const item of missing) console.error(`  ! ${item}`);
}
if (debtClosed.length > 0) {
	console.error(
		`ДОЛГ ЗАКРЫТ по ${debtClosed.length} требованиям: они снова выполняются. ` +
			"Уберите их из KNOWN_MISSING_SEGMENTED_SURFACES в " +
			"scripts/smoke-segmented-controls-accessibility-source.mjs, иначе реестр начнёт врать:",
	);
	for (const item of debtClosed) console.error(`  + ${item}`);
}
if (untestedDebt.length > 0) {
	console.error(
		`РЕЕСТР РАЗОШЁЛСЯ С ПРОВЕРКАМИ (${untestedDebt.length}): записи есть, ` +
			"утверждений для них нет. Уберите их из KNOWN_MISSING_SEGMENTED_SURFACES:",
	);
	for (const item of untestedDebt) console.error(`  ? ${item}`);
}
if (debtDeclared.length > 0) {
	console.error(
		`ОБЪЯВЛЕННЫЙ ДОЛГ (${debtDeclared.length}) — доступности нет в продукте. ` +
			"Закрыть долг = написать её, а не расширить набор файлов:",
	);
	for (const item of debtDeclared) console.error(`  - ${item}`);
}

if (brokenLiveLock) process.exit(2);
if (debtDeclared.length > 0) process.exit(1);

console.log(
	JSON.stringify(
		{
			ok: true,
			guard: "segmented-controls-accessibility",
			checksRun: exercised.size,
			commentsStripped: true,
		},
		null,
		2,
	),
);
