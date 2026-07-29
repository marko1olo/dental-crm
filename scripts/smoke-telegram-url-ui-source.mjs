/*
 * ПОЧЕМУ ЭТОТ СТРАЖ КРАСНЕЛ: ФУНКЦИЯ ПЕРЕЕХАЛА, ПОВЕДЕНИЕ ОСТАЛОСЬ.
 *
 * Страж падал сообщением «saveTelegramSettings body not found». Проверка
 * нормализации Telegram-ссылок при этом не выполнялась ни одной строкой: падение
 * случалось на семнадцатой строке, до первого требования.
 *
 * `saveTelegramSettings` больше не живёт в useAppLogic.tsx — она в
 * apps/web/src/hooks/useTelegramSettings.ts (:248), вне набора «useAppLogic +
 * hooks/domains», который отдаёт readAppLogicSourceSync(). Поведение никуда не
 * делось: нормализация всех шести адресов и имён ботов идёт там же, до PUT.
 *
 * И ВТОРАЯ, ХУЖЕ. Тело функции вырезалось текстом: от `async function
 * saveTelegramSettings` до `async function sendTelegramOutboxItem`. Замыкающий
 * маркер теперь в ДРУГОМ ФАЙЛЕ (useAppLogic.tsx:13390), то есть даже после
 * добавления файла в набор `indexOf` вырезал бы кусок от начала одной функции до
 * произвольного места в другом файле склейки — либо вернул бы -1. Требования
 * проверялись бы по чужому коду.
 *
 * Поэтому границы функции берутся у компилятора TypeScript, а не у indexOf: где
 * нужен разбор TypeScript, там зовётся TypeScript. Тот же ход уже применён в
 * scripts/check-css-tokens.mjs и scripts/lib/route-topology.mjs; `typescript`
 * лежит в зависимостях.
 *
 * Каталог hooks читается ЦЕЛИКОМ, а не поимённо, чтобы следующий вынесенный файл
 * не ронял проверку заново.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { appLogicSourceFiles } from "./lib/app-logic-source.mjs";

function typeScriptFilesIn(directory) {
	let entries = [];
	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch {
		return [];
	}
	const collected = [];
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			collected.push(...typeScriptFilesIn(full));
			continue;
		}
		if (full.endsWith(".ts") || full.endsWith(".tsx")) collected.push(full);
	}
	return collected;
}

const webSourceFiles = [
	"apps/web/src/App.tsx",
	...appLogicSourceFiles(),
	"apps/web/src/AppHelpers.tsx",
	...typeScriptFilesIn("apps/web/src/hooks"),
].filter((file, index, all) => all.indexOf(file) === index);

const appSource = webSourceFiles
	.map((file) => fs.readFileSync(file, "utf8"))
	.join("\n");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

/** Тело функции по ИМЕНИ, границами от компилятора, а не от текста соседей. */
function functionSource(name) {
	for (const file of webSourceFiles) {
		const text = fs.readFileSync(file, "utf8");
		const sourceFile = ts.createSourceFile(
			file,
			text,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);
		let found = null;
		const visit = (node) => {
			if (found) return;
			const declaresName =
				(ts.isFunctionDeclaration(node) && node.name?.text === name) ||
				(ts.isVariableDeclaration(node) &&
					ts.isIdentifier(node.name) &&
					node.name.text === name &&
					node.initializer &&
					(ts.isArrowFunction(node.initializer) ||
						ts.isFunctionExpression(node.initializer)));
			if (declaresName) {
				found = text.slice(node.getStart(sourceFile), node.getEnd());
				return;
			}
			ts.forEachChild(node, visit);
		};
		ts.forEachChild(sourceFile, visit);
		if (found) return found;
	}
	assert(false, `Function declaration not found in web sources: ${name}`);
}

const saveBody = functionSource("saveTelegramSettings");

const helperSnippets = [
	"function normalizeTelegramPublicHttpsUrlDraft",
	"telegramPublicUrlSensitiveQueryKeys",
	"telegramPublicUrlSensitivePathSegments",
	'parsed.protocol !== "https:"',
	"parsed.username || parsed.password",
	"patient/visit/document/token",
	"compactDigits.length >= 10",
	'parsed.hash = ""',
	"function normalizeTelegramVisualCardUrlDraftsForSave",
	"function normalizeTelegramBotUsernameDraft",
	"Telegram-бота без ссылки",
	"/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/",
];

for (const snippet of helperSnippets) {
	assert(
		appSource.includes(snippet),
		`Telegram URL UI validation missing ${snippet}`,
	);
}

/*
 * ТРЕБОВАНИЯ-СВЯЗИ. Иглы записывали вызов нормализатора одной строкой
 * (`normalizeTelegramPublicHttpsUrlDraft("Портал пациента", telegram…Draft)`), а
 * форматтер разносит каждый такой вызов на три строки — он длиннее лимита. Игла
 * требовала бы отсутствия переноса, а не нормализации адреса.
 *
 * Закрепляется связь ЯРЛЫК ПОЛЯ → ЕГО ЧЕРНОВИК: каждый из шести адресов проходит
 * через нормализатор именно со своим черновиком. Перепутайте черновики местами —
 * покраснеет (а перепутать их можно: все шесть вызовов отличаются только парой
 * аргументов, и ошибка дала бы «проверили портал, сохранили картинку»).
 */
const normalizedUrlBindings = [
	["Адрес приема сообщений Telegram", "telegramWebhookBaseUrlDraft"],
	["Портал пациента", "telegramPatientPortalBaseUrlDraft"],
	["Картинка приветствия", "telegramWelcomeImageUrlDraft"],
	["Ссылка на отзыв", "telegramReviewUrlDraft"],
	["Ссылка на карту", "telegramMapsUrlDraft"],
];

for (const [label, draft] of normalizedUrlBindings) {
	const pattern = new RegExp(
		`normalizeTelegramPublicHttpsUrlDraft\\(\\s*"${label}"\\s*,\\s*${draft}\\s*,?\\s*\\)`,
	);
	assert(
		pattern.test(saveBody),
		`saveTelegramSettings must normalize ${label} from ${draft} before saving`,
	);
}

const saveBodyPatterns = [
	{
		pattern:
			/normalizeTelegramVisualCardUrlDraftsForSave\(\s*telegramVisualCardUrlDrafts\s*,?\s*\)/,
		as: "visual card URLs must be normalized from telegramVisualCardUrlDrafts",
	},
	{
		pattern:
			/botUsername\s*=\s*normalizeTelegramBotUsernameDraft\(/,
		as: "shared bot username must be normalized",
	},
	{
		pattern: /ownBotUsername\s*=\s*normalizeTelegramBotUsernameDraft\(/,
		as: "clinic bot username must be normalized",
	},
];

for (const { pattern, as } of saveBodyPatterns) {
	assert(pattern.test(saveBody), `saveTelegramSettings missing ${as}`);
}

const saveSnippets = [
	'setTelegramSettingsSaveState("error")',
	"setTelegramSettingsSaveError(message)",
	"return false;",
	"botUsername,",
	"ownBotUsername,",
	"webhookBaseUrl,",
	"patientPortalBaseUrl,",
	"welcomeImageUrl,",
	"visualCardUrls,",
	"clinicReviewUrl,",
	"clinicMapsUrl,",
];

for (const snippet of saveSnippets) {
	assert(
		saveBody.includes(snippet),
		`saveTelegramSettings missing normalized URL path ${snippet}`,
	);
}

for (const stalePayload of [
	"webhookBaseUrl: telegramWebhookBaseUrlDraft.trim() || null",
	'botUsername: telegramBotUsernameDraft.trim().replace(/^@/, "") || null',
	'ownBotUsername: telegramOwnBotUsernameDraft.trim().replace(/^@/, "") || null',
	"patientPortalBaseUrl: telegramPatientPortalBaseUrlDraft.trim() || null",
	"welcomeImageUrl: telegramWelcomeImageUrlDraft.trim() || null",
	"visualCardUrls: telegramVisualCardUrlDrafts",
	"clinicReviewUrl: telegramReviewUrlDraft.trim() || null",
	"clinicMapsUrl: telegramMapsUrlDraft.trim() || null",
]) {
	assert(
		!saveBody.includes(stalePayload),
		`saveTelegramSettings still sends raw URL draft: ${stalePayload}`,
	);
}

const fetchIndex = saveBody.indexOf('fetch("/api/settings/telegram"');
assert(fetchIndex >= 0, "saveTelegramSettings must PUT the Telegram settings");
assert(
	fetchIndex > saveBody.indexOf("normalizeTelegramPublicHttpsUrlDraft"),
	"URL validation must happen before settings PUT",
);

console.log("smoke:telegram-url-ui-source passed");
