import fs from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

const appSource = [
	fs.readFileSync("apps/web/src/App.tsx", "utf8"),
	readAppLogicSourceSync(),
	fs.readFileSync("apps/web/src/AppHelpers.tsx", "utf8"),
].join("\n");
const styleSource = fs.readFileSync("apps/web/src/styles/main.css", "utf8");

const missing = [];

const requiredAppSnippets = [
	'type DenteTelegramPortalSection = "home" | "documents" | "tax" | "billing" | "care" | "schedule"',
	"denteTelegramHandoffTargets",
	'section: "home"',
	'view: "shift"',
	'section: "tax"',
	'view: "documents"',
	'documentKind: "tax_deduction_certificate"',
	'section: "billing"',
	'view: "finance"',
	'section: "care"',
	'view: "communications"',
	'url.searchParams.get("dente_source") !== "telegram"',
	'url.searchParams.get("dente_section")',
	"stripDenteTelegramHandoffQuery",
	'url.search = ""',
	"url.hash = `#${target.hash}`",
	"window.history.replaceState",
	"setTelegramHandoffNotice",
	"telegram-handoff-notice",
	"Ссылка не содержит",
	"пациента, документ, запись или оплату",
];

for (const snippet of requiredAppSnippets) {
	if (!appSource.includes(snippet)) missing.push(`App.tsx missing ${snippet}`);
}

/*
 * ТРЕБОВАНИЕ-СВЯЗЬ, А НЕ ТРЕБОВАНИЕ-НАПИСАНИЕ.
 *
 * Здесь в списке строк стояла игла
 *   `initialTelegramHandoffTargetRef.current ?? readDenteTelegramHandoffTarget()`
 * и страж краснел, хотя переход из Telegram работает: в useAppLogic.tsx (строки
 * 4392-4393 и 4402-4403) это же выражение форматтер разбил после `??` на две
 * строки, потому что одной строкой оно длиннее лимита. Игла требовала ОТСУТСТВИЯ
 * переноса, а не сохранённой цели перехода.
 *
 * Смысл требования другой, и закрепляется он связью: цель перехода читается из
 * ref, снятого при первом рендере, и ТОЛЬКО при пустом ref перечитывается из
 * адреса. Порядок здесь и есть защита — query к этому моменту уже вычищен
 * stripDenteTelegramHandoffQuery, так что чтение из адреса первым потеряло бы
 * цель. Поменяйте операнды местами, потеряйте `?? readDenteTelegramHandoffTarget()`,
 * замените ref на прямое чтение адреса — покраснеет. Перенос строки — нет.
 */
const requiredAppPatterns = [
	{
		pattern:
			/initialTelegramHandoffTargetRef\.current\s*\?\?\s*readDenteTelegramHandoffTarget\(\)/,
		as: "handoff target must read the first-render ref first and only then fall back to the URL",
	},
];

for (const { pattern, as } of requiredAppPatterns) {
	if (!pattern.test(appSource)) missing.push(`App.tsx missing ${as}`);
}

const forbiddenAppPatterns = [
	/searchParams\.get\(["']patient/i,
	/searchParams\.get\(["']document/i,
	/searchParams\.get\(["']appointment/i,
	/searchParams\.get\(["']payment/i,
	/localStorage\.[gs]etItem\([^)]*dente_section/i,
	/localStorage\.[gs]etItem\([^)]*dente_source/i,
];

for (const pattern of forbiddenAppPatterns) {
	if (pattern.test(appSource))
		missing.push(`App.tsx forbidden Telegram handoff pattern: ${pattern}`);
}

if (!styleSource.includes(".telegram-handoff-notice")) {
	missing.push("main.css missing Telegram handoff notice style");
}

if (missing.length) {
	console.error(JSON.stringify({ ok: false, missing }, null, 2));
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			checked:
				"Telegram dente_section web handoff opens safe sections and strips query identifiers",
		},
		null,
		2,
	),
);
