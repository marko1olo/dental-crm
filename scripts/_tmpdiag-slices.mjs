/* ВРЕМЕННАЯ ПРОВЕРКА: границы срезов онбординга и попадание в них. */
import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

const appTsx = readFileSync("apps/web/src/App.tsx", "utf8");
const appSource = [
	appTsx,
	readAppLogicSourceSync(),
	readFileSync("apps/web/src/AppHelpers.tsx", "utf8"),
].join("\n");

console.log("App.tsx chars      =", appTsx.length);
console.log("appSource chars    =", appSource.length);

const teamStart = appSource.indexOf('onboardingStep === "team"');
const teamEnd = appSource.indexOf('onboardingStep === "telegram"', teamStart);
const srcStart = appSource.indexOf('onboardingStep === "sources"');
const srcEnd = appSource.indexOf('onboardingStep === "telegram"', srcStart);
console.log({ teamStart, teamEnd, teamLen: teamEnd - teamStart });
console.log({ srcStart, srcEnd, srcLen: srcEnd - srcStart });
console.log(
	"срезы лежат внутри App.tsx?",
	teamEnd < appTsx.length && srcEnd < appTsx.length,
);

const team = appSource.slice(teamStart, teamEnd);
const sources = appSource.slice(srcStart, srcEnd);

for (const [label, blob, needle] of [
	["team", team, "toggleStaffWorkingDay(member.id"],
	["team", team, "toggleChairWorkingDay(chair.id"],
	["team", team, "toggleStaffWorkingDay"],
	["team", team, "onboarding-schedule-grid"],
	["sources", sources, "Автосохранено"],
	[
		"sources",
		sources,
		"Автосохранено: прайс, импорт, документы, снимки, архив и внешний просмотр",
	],
]) {
	console.log(
		`${label}.includes(${JSON.stringify(needle)}) = ${blob.includes(needle)}`,
	);
}

// точное написание в App.tsx рядом с Автосохранено
const at = appTsx.indexOf("Автосохранено");
console.log("\n--- App.tsx около Автосохранено ---");
console.log(JSON.stringify(appTsx.slice(at - 10, at + 110)));

// сколько раз слово встречается в разных срезах
console.log(
	"\nonboardingStep === \"team\" встречается в App.tsx:",
	appTsx.split('onboardingStep === "team"').length - 1,
);
console.log(
	'onboardingStep === "telegram" встречается в App.tsx:',
	appTsx.split('onboardingStep === "telegram"').length - 1,
);
