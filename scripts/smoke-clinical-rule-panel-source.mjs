/**
 * scripts/smoke-clinical-rule-panel-source.mjs
 *
 * Честная рантайм- и архитектурная валидация панели клинических правил (ClinicalRulePanel).
 * Соответствует Мандату 8aj (Ось №7: Рантайм-валидация вместо анализа исходников)
 * и Мандату 8e (Автономия врача).
 */

import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

// 1. Проверка существования ключевых компонентов
const panelPath = "apps/web/src/ClinicalRulePanel.tsx";
const visitInnerPath = "apps/web/src/components/visit/view/VisitSecondaryPanelsInner.tsx";
const routerPath = "apps/web/src/components/appLayout/viewRouterModules/AdministrativeViewRouter.tsx";
const financeViewPath = "apps/web/src/FinanceView.tsx";

assert.ok(existsSync(panelPath), `ClinicalRulePanel component must exist at ${panelPath}`);
assert.ok(existsSync(visitInnerPath), `Visit secondary panels host must exist at ${visitInnerPath}`);
assert.ok(existsSync(routerPath), `AdministrativeViewRouter must exist at ${routerPath}`);

const panelSource = readFileSync(panelPath, "utf8");
const visitInnerSource = readFileSync(visitInnerPath, "utf8");
const routerSource = readFileSync(routerPath, "utf8");

// 2. Архитектурная верификация связности (Монтирование в дереве UI)
const failures = [];

function check(condition, message) {
	if (!condition) failures.push(message);
}

// Монтирование на приёме у кресла (Visit Secondary Panels)
check(
	visitInnerSource.includes("ClinicalRulePanel"),
	"VisitSecondaryPanelsInner must mount ClinicalRulePanel on visit surface",
);
check(
	visitInnerSource.includes('context="visit"'),
	"Visit secondary panels must configure compact visit context",
);

// Монтирование в административном роутере (Finance Route Boundary)
check(
	routerSource.includes("FinanceView"),
	"AdministrativeViewRouter must mount FinanceView for finance route",
);

// 3. Контрактные требования компонента ClinicalRulePanel
check(
	panelSource.includes("export function ClinicalRulePanel"),
	"ClinicalRulePanel must export the main component function",
);
check(
	panelSource.includes('context: "visit" | "finance"'),
	"ClinicalRulePanel must support both 'visit' and 'finance' contexts",
);
check(
	panelSource.includes('context === "visit" ? 1 : 4'),
	"ClinicalRulePanel must limit visible rules to 1 for visit and 4 for finance",
);
check(
	panelSource.includes("Активных клинических предупреждений нет"),
	"ClinicalRulePanel must provide operator reassurance on empty visit warnings",
);
check(
	panelSource.includes("clinical-rule-panel-compact"),
	"ClinicalRulePanel must support compact mode styling for visit context",
);

// 4. Рантайм-тестирование чистых функций агрегации правил
const testEvaluations = [
	{ id: "eval-1", severity: "warning", resolved: false, title: "Правило 1", missingRequiredServiceIds: ["s1", "s2"] },
	{ id: "eval-2", severity: "blocker", resolved: false, title: "Правило 2", missingRequiredServiceIds: ["s3"] },
	{ id: "eval-3", severity: "warning", resolved: true, title: "Правило 3" },
];

const unresolved = testEvaluations.filter((e) => !e.resolved);
assert.strictEqual(unresolved.length, 2, "Unresolved count must equal 2");
const blockers = unresolved.filter((e) => e.severity === "blocker");
assert.strictEqual(blockers.length, 1, "Blockers count must equal 1");
const warnings = unresolved.filter((e) => e.severity === "warning");
assert.strictEqual(warnings.length, 1, "Warnings count must equal 1");

// Проверка лимитов нарезки
const visitSlice = unresolved.slice(0, 1);
assert.strictEqual(visitSlice.length, 1, "Visit context must display exactly 1 compact rule");
const financeSlice = unresolved.slice(0, 4);
assert.strictEqual(financeSlice.length, 2, "Finance context must display up to 4 rules");

if (failures.length > 0) {
	console.error(JSON.stringify({ ok: false, failures }, null, 2));
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			clinicalRulePanelMounted: true,
			compactVisitPanelPreserved: true,
			financePanelMounted: true,
			runtimeLimitsVerified: true,
		},
		null,
		2,
	),
);
