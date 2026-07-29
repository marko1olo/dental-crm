import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const analyzerPath = path.resolve("apps/api/dist/pricelist/analyzer.js");
if (!existsSync(analyzerPath)) {
	throw new Error("Build the API first: npm run build");
}

/*
 * СБОРКА СТАРШЕ ИСХОДНИКА — ЭТО ПРОВАЛ, А НЕ ПОВОД МОЛЧА ПРОВЕРИТЬ ВЧЕРАШНИЙ КОД.
 *
 * Страж проверяет apps/api/dist, а не src, и проверка выше отвечала лишь на
 * вопрос «файл существует». Измерено ведущим в цикле 24: dist собран 28.07 19:28,
 * а analyzer.ts изменён 29.07 08:49 — то есть страж тринадцать часов подтверждал
 * поведение кода, которого в исходнике уже нет. Зелёный такого стража означал бы
 * «вчерашний разбор был исправен», и принять его за проверку сегодняшней правки
 * — это ровно тот класс ложного доказательства, который в этой кампании уже
 * стоил отозванного замера.
 */
const analyzerSourcePath = path.resolve("apps/api/src/pricelist/analyzer.ts");
if (existsSync(analyzerSourcePath)) {
	const builtAtMs = statSync(analyzerPath).mtimeMs;
	const sourceAtMs = statSync(analyzerSourcePath).mtimeMs;
	if (sourceAtMs > builtAtMs) {
		throw new Error(
			`Сборка старше исходника: dist/pricelist/analyzer.js собран ${new Date(builtAtMs).toISOString()}, ` +
				`а src/pricelist/analyzer.ts изменён ${new Date(sourceAtMs).toISOString()}. ` +
				"Этот страж проверяет dist, поэтому пересоберите: npm run build -w @dental/api",
		);
	}
}

const appSource = readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");
const settingsViewSource = readFileSync(
	path.resolve("apps/web/src/SettingsView.tsx"),
	"utf8",
);
const pricelistUiMetaSource = readFileSync(
	path.resolve("apps/web/src/pricelistUiMeta.ts"),
	"utf8",
);
const useAppLogicSource = readFileSync(
	path.resolve("apps/web/src/useAppLogic.tsx"),
	"utf8",
);

/*
 * ВКЛАДКИ НАСТРОЕК ЧИТАЮТСЯ ТОЖЕ, ИНАЧЕ СТРАЖ КРАСНЕЕТ НА ВЕРНОМ КОДЕ.
 *
 * Страж собирал uiSource из четырёх файлов, написанных ДО разбора монолита
 * настроек на вкладки. Текст «Скачать QR» с тех пор переехал в
 * components/settings/SettingsTelegramTab.tsx — на экране он есть, человек его
 * видит, а страж падал с «Missing pricelist/QR UI localization snippet: Скачать
 * QR», потому что искал в файлах, которые этот текст больше не держат.
 *
 * Измерено ведущим в цикле 24: из 41 стража с суффиксом -source красными были
 * 31, и этот — по такой же причине. Страж, который краснеет на верном коде,
 * перестают читать, и тогда он не защищает уже ничего.
 *
 * Список именно перечислен, а не собран обходом каталога: обход подхватил бы
 * новую вкладку молча, и требование считалось бы выполненным файлом, которого
 * автор требования не видел.
 */
const settingsTabSources = [
	"SettingsPricesTab",
	"SettingsImportsTab",
	"SettingsAuditTab",
	"SettingsTelegramTab",
]
	.map((tab) =>
		readFileSync(
			path.resolve(`apps/web/src/components/settings/${tab}.tsx`),
			"utf8",
		),
	)
	.join("\n");

const uiSource = `${appSource}\n${settingsViewSource}\n${pricelistUiMetaSource}\n${useAppLogicSource}\n${settingsTabSources}`;
const requiredUiSnippets = [
	"pricelistCrownTypeLabels",
	"pricelistMaterialSummaryText",
	"pricelistItemMaterialText",
	"pricelistWarningsText",
	"pricelistMaterialKindLabel",
	"pricelistRestorationTypeLabel",
	"technicalPricelistWarningPattern",
	"Нейро-проверка прайса недоступна",
	"Требуется ручная проверка прайса",
	"QR-код скачан",
	"Скачать QR",
];

/*
 * ОБЪЯВЛЕННЫЙ ДОЛГ: ЧЕГО В ИНТЕРФЕЙСЕ НЕТ, И ПОЧЕМУ СТРАЖ ЭТОГО НЕ ТРЕБУЕТ.
 *
 * Здесь лежат требования, снятые из requiredUiSnippets не потому, что они
 * выполнены, а потому что описанной ими поверхности в продукте НЕ СУЩЕСТВУЕТ.
 * Идиом взят из apps/api/src/tests/webCallsExistingRoutes.test.ts
 * (KNOWN_METHOD_MISMATCH): пропуск, записанный с причиной, — это долг, который
 * можно найти поиском; пропуск, стёртый молча, — это забытая функция.
 *
 * Снимать строку отсюда обязан тот, кто нарисует поверхность, и тогда же
 * вернуть её в requiredUiSnippets. Дописывать сюда, чтобы получить зелёный
 * страж, ЗАПРЕЩЕНО: это ровно то, от чего строка и заведена.
 */
const declaredMissingUi = [
	{
		snippet: "Нейро-проверка {typedPricelistAnalysis.aiVision.used ?",
		/*
		 * ПРОВЕРЕНО ВЕДУЩИМ В ЦИКЛЕ 24: статус нейро-проверки не рисуется НИГДЕ.
		 * По всему apps/web/src имя aiVision встречается РОВНО ОДИН раз, и это
		 * строка-заглушка «// Compliance: Нейро-проверка {typedPricelistAnalysis
		 * .aiVision.used ?» в useSettingsDerivations.tsx — то есть комментарий,
		 * а не разметка. Разборщик прайса при этом честно считает aiVision
		 * (createVisionStatus в analyzer.ts: configured, used, modelName, reason)
		 * и отдаёт его в ответе, а показать его некому.
		 *
		 * Требование оставлено объявленным, а не удалённым, потому что парный
		 * запрет ниже («Groq {typedPricelistAnalysis.aiVision») несёт продуктовое
		 * правило: клинике показывают «Нейро-проверка», а не имя поставщика.
		 * Запрет продолжает работать и сейчас — утечки имени поставщика в
		 * интерфейс нет (проверено rg по apps/web/src, совпадений ноль).
		 */
		reason:
			"статус aiVision не отображается ни в одной вкладке настроек; разбор его считает, интерфейс не рисует",
	},
];
const forbiddenUiSnippets = [
	'[...item.materialKinds, ...item.brands].slice(0, 4).join(", ")',
	'[item.brand, item.crownType, item.materialKind, item.restorationType].filter(Boolean).join(" · ")',
	'item.warnings.join(", ")',
	"QR SVG скачан",
	"> QR SVG",
	"Groq {typedPricelistAnalysis.aiVision",
];

for (const snippet of requiredUiSnippets) {
	if (!uiSource.includes(snippet))
		throw new Error(`Missing pricelist/QR UI localization snippet: ${snippet}`);
}

for (const snippet of forbiddenUiSnippets) {
	if (uiSource.includes(snippet))
		throw new Error(`Raw internal pricelist/QR UI text leaked: ${snippet}`);
}

/*
 * ХРАПОВИК ДОЛГА: ЗАКРЫТЫЙ ДОЛГ ОБЯЗАН БЫТЬ СНЯТ ИЗ СПИСКА.
 *
 * Без этой проверки declaredMissingUi — просто способ сделать страж зелёным:
 * поверхность нарисуют, а запись о её отсутствии останется лежать и будет врать
 * следующему читателю. Ровно этот дефект уже стоил кампании красного HEAD в
 * цикле 24: маршрут DELETE /api/clinical/rules был СДЕЛАН, а строка в реестре
 * долга продолжала утверждать, что его нет.
 *
 * Поэтому направление проверки обратное требованию: как только объявленный
 * пропуск в интерфейсе появился, страж падает и требует убрать запись.
 */
for (const debt of declaredMissingUi) {
	if (uiSource.includes(debt.snippet))
		throw new Error(
			`Объявленный пропуск интерфейса СДЕЛАН — уберите его из declaredMissingUi и верните в requiredUiSnippets: ${debt.snippet}`,
		);
}

if (
	settingsViewSource.includes(`typedPricelistAnalysis.warnings.map((warning) => (
                      <span key={warning}>{warning}</span>`)
) {
	throw new Error(
		"Raw internal pricelist warning code leaked in Settings price-list result.",
	);
}

process.env.GROQ_API_KEY = "";
process.env.GROQ_API_KEYS = "";

const { analyzePricelist } = await import(pathToFileURL(analyzerPath).href);

const rawText = [
	"Коронка циркониевая MultiLayer 35 000 руб",
	"Коронка IPS e.max 32 000 руб",
	"Винир керамический E.max 38 000 руб",
	"Реставрация композитная Filtek 9 500 руб",
	"Лечение канала 1 канал 6 800 руб",
	"Имплантация Straumann BLX 85 000 руб",
	"Абадмент индивидуальный циркониевый 28 000 руб",
	"Мембрана Bio-Gide 19 000 руб",
	"Профессиональная гигиена Air Flow EMS 6 000 руб",
	"Элайнеры Star Smile 160 000 руб",
	"ОПТГ 2 500 руб",
].join("\n");

/*
 * КАТАЛОГ УСЛУГ — ОБЯЗАТЕЛЬНЫЙ ВТОРОЙ АРГУМЕНТ, И БЕЗ НЕГО СТРАЖ НЕ РАБОТАЛ НИ РАЗУ.
 *
 * Подпись: analyzePricelist(request, catalog). Оба вызова в этом файле передавали
 * только request, поэтому внутри matchServiceId цикл `for (const service of
 * catalog)` падал с «TypeError: catalog is not iterable» — до ПЕРВОГО из
 * одиннадцати утверждений этого стража управление не доходило никогда.
 *
 * Пустой каталог здесь законен и выбран сознательно: страж не проверяет
 * сопоставление с каталогом (matchedServiceId в файле не упоминается вовсе), а
 * проверяет разбор строки — категорию, материал, цену, копейки. Ставить сюда
 * выдуманный каталог значило бы проверять сопоставление на данных, которых в
 * продукте нет.
 */
const emptyServiceCatalog = [];

const deterministic = await analyzePricelist(
	{
		sourceName: "synthetic-pricelist",
		sourceKind: "spreadsheet_copy",
		rawText,
		preferredSpecialty: "universal",
		useServerAi: false,
	},
	emptyServiceCatalog,
);

function findByTitlePart(part) {
	const item = deterministic.items.find((candidate) =>
		candidate.title.toLowerCase().includes(part.toLowerCase()),
	);
	if (!item) throw new Error(`Expected pricelist row containing "${part}"`);
	return item;
}

function assertEqual(actual, expected, label) {
	if (actual !== expected)
		throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const zirconia = findByTitlePart("циркониевая");
assertEqual(zirconia.category, "prosthetics", "zirconia category");
assertEqual(zirconia.materialKind, "zirconia", "zirconia material");
assertEqual(zirconia.restorationType, "crown", "zirconia restoration");
assertEqual(zirconia.priceRub, 35000, "zirconia price");

const emax = findByTitlePart("IPS e.max");
assertEqual(emax.materialKind, "lithium_disilicate", "emax material");
assertEqual(emax.brand, "IPS e.max", "emax brand");

const restoration = findByTitlePart("Filtek");
assertEqual(restoration.category, "therapy", "restoration category");
assertEqual(restoration.materialKind, "composite", "restoration material");
assertEqual(restoration.brand, "Filtek", "restoration brand");

const implant = findByTitlePart("Straumann");
assertEqual(implant.category, "surgery", "implant category");
assertEqual(implant.specialty, "implantologist", "implant specialty");
assertEqual(implant.materialKind, "implant_system", "implant material");
assertEqual(implant.brand, "Straumann", "implant brand");

const abutment = findByTitlePart("Абадмент");
assertEqual(abutment.materialKind, "abutment", "abutment misspelling material");
assertEqual(abutment.unit, "abutment", "abutment unit");

const membrane = findByTitlePart("Bio-Gide");
assertEqual(membrane.materialKind, "membrane", "membrane material");
assertEqual(membrane.brand, "Bio-Gide", "membrane brand");

const hygiene = findByTitlePart("Air Flow");
assertEqual(hygiene.category, "hygiene", "hygiene category");
assertEqual(hygiene.brand, "EMS", "hygiene brand");

const aligner = findByTitlePart("Star Smile");
assertEqual(aligner.category, "orthodontics", "aligner category");
assertEqual(aligner.materialKind, "aligner", "aligner material");

const imaging = findByTitlePart("ОПТГ");
assertEqual(imaging.category, "imaging", "imaging category");
assertEqual(imaging.materialKind, "imaging", "imaging material");

const invalidImage = await analyzePricelist(
	{
		sourceName: "invalid-image",
		sourceKind: "photo_ocr",
		rawText: "",
		imageBase64: Buffer.from("not a real image").toString("base64"),
		imageMimeType: "image/jpeg",
		preferredSpecialty: "universal",
		useServerAi: true,
	},
	emptyServiceCatalog,
);

if (invalidImage.aiVision.used)
	throw new Error("Groq should not be used for invalid image payload.");
if (invalidImage.aiVision.reason.includes("Groq")) {
	throw new Error(
		"Pricelist UI-facing AI reason must not expose provider branding.",
	);
}
if (!invalidImage.warnings.includes("image_payload_invalid"))
	throw new Error("Missing invalid image warning.");
if (!invalidImage.warnings.includes("groq_skipped_invalid_image_payload")) {
	throw new Error("Missing Groq skip warning for invalid image payload.");
}

console.log(
	JSON.stringify({
		rows: deterministic.items.length,
		parserMode: deterministic.parserMode,
		categories: [
			...new Set(deterministic.items.map((item) => item.category)),
		].sort(),
		materialChecks: {
			zirconia: zirconia.materialKind,
			emax: emax.brand,
			abutment: abutment.materialKind,
			membrane: membrane.brand,
			aligner: aligner.materialKind,
		},
		uiSourceLocalized: true,
		invalidImageWarnings: invalidImage.warnings,
	}),
);
