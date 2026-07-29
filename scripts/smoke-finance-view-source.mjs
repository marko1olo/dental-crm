import { existsSync, readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

const appSource =
	readFileSync("apps/web/src/App.tsx", "utf8") +
	"\n" +
	readAppLogicSourceSync() +
	"\n" +
	(existsSync("apps/web/src/VisitView.tsx")
		? readFileSync("apps/web/src/VisitView.tsx", "utf8")
		: "");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const viteSource = readFileSync("apps/web/vite.config.ts", "utf8");

const missing = [];

/*
 * ТРЕБОВАНИЕ МОЖЕТ БЫТЬ ОБРАЗЦОМ, А НЕ ДОСЛОВНОЙ СТРОКОЙ.
 *
 * Идиом ведущего из smoke-finance-ledger-source.mjs (коммит bc0c1e7db):
 * закрепляем СВЯЗЬ (какой пропс из какого источника), а НЕ защитную обёртку
 * вокруг неё. Замерено 29.07.2026: оба непрошедших требования этого стража
 * оказались наказанием за улучшение кода, дефектом продукта — ни одно.
 * Дословную строку по-прежнему можно передать строкой, где важен именно текст.
 */
function requireIn(source, snippet, message) {
	const found =
		snippet instanceof RegExp ? snippet.test(source) : source.includes(snippet);
	if (!found) missing.push(message);
}

function forbidIn(source, snippet, message) {
	if (source.includes(snippet)) missing.push(message);
}

requireIn(
	appSource,
	'lazy(() => import("./FinanceView")',
	"App.tsx must lazy-load FinanceView",
);
requireIn(
	appSource,
	"<Suspense",
	"App.tsx must wrap lazy FinanceView in Suspense",
);
requireIn(
	appSource,
	'aria-busy="true"',
	"Finance fallback must expose busy state",
);
requireIn(
	appSource,
	"<FinanceView",
	"App.tsx must render the lazy finance boundary",
);
requireIn(
	appSource,
	'window.location.hash = "settings/prices"',
	"Finance empty catalog action must open the price-list settings",
);
requireIn(
	appSource,
	'window.location.hash = "visit"',
	"Finance empty plan action must open the visit workspace",
);
requireIn(
	appSource,
	/*
	 * ДОСЛОВНАЯ СТРОКА ЗАПРЕЩАЛА ЧЕСТНЫЙ ПРИЗНАК «НЕ ПОСЧИТАНО».
	 *
	 * Требовалось ровно `useMemo<Dashboard["billingSummary"]>`, то есть тип БЕЗ
	 * null. Под этим требованием у сводки не оставалось способа сказать «итога
	 * нет»: при отсутствии дашборда или невыбранном пациенте
	 * patientBillingSummary возвращал объект из восьми нулей, и экран финансов
	 * печатал «Остаток 0 ₽» там, где верное утверждение — «не определено».
	 * Дословное требование, как и в двух случаях ниже, наказывало за починку.
	 *
	 * Закреплена СВЯЗЬ: сводка по пациенту выводится через useMemo и типизирована
	 * формой Dashboard["billingSummary"]. Нулевой признак (` | null`) допускается,
	 * подмена типа на чужой — нет.
	 */
	/const patientBillingSummary = useMemo<Dashboard\["billingSummary"\](?:\s*\|\s*null)?>/,
	"App.tsx must derive a patient-scoped finance summary",
);
requireIn(
	appSource,
	"billingSummary={patientBillingSummary}",
	"App.tsx must pass patient-scoped finance summary to FinanceView",
);
requireIn(
	appSource,
	"const patientClinicalRuleEvaluations = useMemo",
	"App.tsx must derive patient-scoped clinical rule evaluations for finance",
);
requireIn(
	appSource,
	"const patientClinicalRuleSummary = useMemo",
	"App.tsx must derive patient-scoped clinical rule summary for finance",
);
requireIn(
	appSource,
	"evaluation.patientId === documentPatient.id",
	"Patient finance clinical rules must use the selected finance patient",
);
requireIn(
	appSource,
	"clinicalRuleEvaluations={patientClinicalRuleEvaluations}",
	"FinanceView must receive patient-scoped clinical rules",
);
requireIn(
	appSource,
	"clinicalRuleSummary={patientClinicalRuleSummary}",
	"FinanceView must receive patient-scoped clinical rule summary",
);
requireIn(
	appSource,
	"evaluations={activeVisitClinicalRuleEvaluations}",
	"Visit screen must keep active-visit clinical rules",
);
forbidIn(
	appSource,
	"dashboard?.billingSummary ??",
	"Patient finance summary fallback must not leak global billing totals",
);
forbidIn(
	appSource,
	'from "./FinancePlanning"',
	"App.tsx must not import finance planning subcomponents",
);
forbidIn(
	appSource,
	'from "./FinanceLedger"',
	"App.tsx must not import finance ledger directly",
);
forbidIn(
	appSource,
	'from "./PaymentCapture"',
	"App.tsx must not import payment capture directly",
);

requireIn(
	financeViewSource,
	"export function FinanceView",
	"FinanceView must export the route component",
);
requireIn(
	financeViewSource,
	'<div className="panel finance-panel" id="finance">',
	"FinanceView must own finance panel markup",
);
requireIn(
	financeViewSource,
	'billingSummary: Dashboard["billingSummary"]',
	"FinanceView must accept a patient-scoped billing summary",
);
requireIn(
	financeViewSource,
	"Сводка по пациенту",
	"FinanceView must label the finance scope for operators",
);
requireIn(
	financeViewSource,
	"<FinancePlanningOverview",
	"FinanceView must compose planning overview",
);
requireIn(
	financeViewSource,
	"billingSummary={billingSummary}",
	"FinanceView must use the patient-scoped billing summary",
);
forbidIn(
	financeViewSource,
	"billingSummary={dashboard.billingSummary}",
	"FinanceView must not show global billing summary as patient finance",
);
requireIn(
	financeViewSource,
	"<ClinicalRulePanel",
	"FinanceView must compose clinical rules",
);
requireIn(
	financeViewSource,
	/*
	 * ЗАКРЕПЛЕНА СВЯЗЬ, А НЕ ОБЁРТКА. В FinanceView.tsx:278 стоит
	 * `evaluations={clinicalRuleEvaluations ?? []}` — кто-то добавил запас на
	 * отсутствие списка правил. Поведение сохранилось и улучшилось, а дословное
	 * требование за этим не пошло. Требовать написание без `?? []` — значит
	 * требовать менее безопасный код. Источник пропса закреплён по-прежнему
	 * точно: подставят другую коллекцию — страж упадёт.
	 */
	/evaluations=\{clinicalRuleEvaluations\b/,
	"FinanceView must render patient-scoped clinical rules",
);
forbidIn(
	financeViewSource,
	"activeClinicalRuleEvaluations",
	"FinanceView must not call patient-scoped rules active",
);
requireIn(
	financeViewSource,
	"summary={clinicalRuleSummary}",
	"FinanceView must not display global clinical rule summary for patient finance",
);
forbidIn(
	financeViewSource,
	"summary={dashboard.clinicalRuleSummary}",
	"FinanceView must not pass global clinical rule summary",
);
requireIn(
	financeViewSource,
	"<PaymentCapture",
	"FinanceView must compose payment capture",
);
requireIn(
	financeViewSource,
	"<FinanceLedger",
	"FinanceView must compose ledger",
);
requireIn(
	financeViewSource,
	"<ServiceCatalogStrip",
	"FinanceView must compose service catalog",
);
requireIn(
	financeViewSource,
	'document.getElementById("payment-capture")',
	"FinanceView must support a direct jump back to payment capture",
);
requireIn(
	viteSource,
	'const apiProxyTarget = process.env.DENTAL_API_PROXY_TARGET ?? "http://127.0.0.1:4100"',
	"Vite dev proxy must be configurable for parallel smoke ports",
);
requireIn(
	viteSource,
	/*
	 * ТРЕБОВАЛСЯ УСТАРЕВШИЙ СОКРАЩЁННЫЙ ВИД ПРОКСИ, И ОН УЖЕ НЕ ГОДИТСЯ.
	 *
	 * Дословно требовалось `"/api": apiProxyTarget`. В vite.config.ts:158 стоит
	 * `"/api": { target: apiProxyTarget, changeOrigin: true, ws: true }`, и
	 * причина расширения записана рядом (:155-157): при сокращённой форме
	 * веб-сокет шёл обычным HTTP, рукопожатие с /api/ws/schedule висело до
	 * таймаута, и компоненты, собирающие адрес от window.location.host (например
	 * FamilyWalletPanel), не получали обновлений вовсе.
	 *
	 * То есть дословное требование велело откатить починку веб-сокетов.
	 * Закреплено то, что оно защищало на самом деле: адрес прокси /api берётся из
	 * настраиваемого apiProxyTarget, а не вписан числом. Обе формы записи
	 * допускаются, подстановка литерального адреса — нет.
	 */
	/"\/api":\s*(?:apiProxyTarget\b|\{[^}]*target:\s*apiProxyTarget\b)/,
	"Vite dev proxy must use the configurable API target",
);
forbidIn(
	viteSource,
	'normalizedId.endsWith("/apps/web/src/FinanceView.tsx") && return "workspace"',
	"FinanceView must not be forced into workspace chunk",
);

if (missing.length > 0) {
	console.error("Finance view source smoke failed:");
	for (const item of missing) console.error(`- ${item}`);
	process.exit(1);
}

console.log({
	ok: true,
	financeViewLazy: true,
	appFinanceSubcomponentsRemoved: true,
	financeRouteBoundary: true,
});
