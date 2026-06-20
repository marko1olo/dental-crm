import { readFileSync } from "node:fs";

import { existsSync } from "node:fs";
const appSource = readFileSync("apps/web/src/App.tsx", "utf8") + "\n" + (existsSync("apps/web/src/VisitView.tsx") ? readFileSync("apps/web/src/VisitView.tsx", "utf8") : "");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const viteSource = readFileSync("apps/web/vite.config.ts", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'lazy(() => import("./FinanceView")', "App.tsx must lazy-load FinanceView");
requireIn(appSource, "<Suspense", "App.tsx must wrap lazy FinanceView in Suspense");
requireIn(appSource, 'aria-busy="true"', "Finance fallback must expose busy state");
requireIn(appSource, "<FinanceView", "App.tsx must render the lazy finance boundary");
requireIn(appSource, 'window.location.hash = "settings/prices"', "Finance empty catalog action must open the price-list settings");
requireIn(appSource, 'window.location.hash = "visit"', "Finance empty plan action must open the visit workspace");
requireIn(appSource, "const patientBillingSummary = useMemo<Dashboard[\"billingSummary\"]>", "App.tsx must derive a patient-scoped finance summary");
requireIn(appSource, "billingSummary={patientBillingSummary}", "App.tsx must pass patient-scoped finance summary to FinanceView");
requireIn(appSource, "const patientClinicalRuleEvaluations = useMemo", "App.tsx must derive patient-scoped clinical rule evaluations for finance");
requireIn(appSource, "const patientClinicalRuleSummary = useMemo", "App.tsx must derive patient-scoped clinical rule summary for finance");
requireIn(appSource, "evaluation.patientId === documentPatient.id", "Patient finance clinical rules must use the selected finance patient");
requireIn(appSource, "clinicalRuleEvaluations={patientClinicalRuleEvaluations}", "FinanceView must receive patient-scoped clinical rules");
requireIn(appSource, "clinicalRuleSummary={patientClinicalRuleSummary}", "FinanceView must receive patient-scoped clinical rule summary");
requireIn(appSource, "evaluations={activeVisitClinicalRuleEvaluations}", "Visit screen must keep active-visit clinical rules");
forbidIn(appSource, "dashboard?.billingSummary ??", "Patient finance summary fallback must not leak global billing totals");
forbidIn(appSource, 'from "./FinancePlanning"', "App.tsx must not import finance planning subcomponents");
forbidIn(appSource, 'from "./FinanceLedger"', "App.tsx must not import finance ledger directly");
forbidIn(appSource, 'from "./PaymentCapture"', "App.tsx must not import payment capture directly");

requireIn(financeViewSource, "export function FinanceView", "FinanceView must export the route component");
requireIn(financeViewSource, '<div className="panel finance-panel" id="finance">', "FinanceView must own finance panel markup");
requireIn(financeViewSource, "billingSummary: Dashboard[\"billingSummary\"]", "FinanceView must accept a patient-scoped billing summary");
requireIn(financeViewSource, "Сводка по пациенту", "FinanceView must label the finance scope for operators");
requireIn(financeViewSource, "<FinancePlanningOverview", "FinanceView must compose planning overview");
requireIn(financeViewSource, "billingSummary={billingSummary}", "FinanceView must use the patient-scoped billing summary");
forbidIn(financeViewSource, "billingSummary={dashboard.billingSummary}", "FinanceView must not show global billing summary as patient finance");
requireIn(financeViewSource, "<ClinicalRulePanel", "FinanceView must compose clinical rules");
requireIn(financeViewSource, "evaluations={clinicalRuleEvaluations}", "FinanceView must render patient-scoped clinical rules");
forbidIn(financeViewSource, "activeClinicalRuleEvaluations", "FinanceView must not call patient-scoped rules active");
requireIn(financeViewSource, "summary={clinicalRuleSummary}", "FinanceView must not display global clinical rule summary for patient finance");
forbidIn(financeViewSource, "summary={dashboard.clinicalRuleSummary}", "FinanceView must not pass global clinical rule summary");
requireIn(financeViewSource, "<PaymentCapture", "FinanceView must compose payment capture");
requireIn(financeViewSource, "<FinanceLedger", "FinanceView must compose ledger");
requireIn(financeViewSource, "<ServiceCatalogStrip", "FinanceView must compose service catalog");
requireIn(financeViewSource, 'document.getElementById("payment-capture")', "FinanceView must support a direct jump back to payment capture");
requireIn(viteSource, 'const apiProxyTarget = process.env.DENTAL_API_PROXY_TARGET ?? "http://127.0.0.1:4100"', "Vite dev proxy must be configurable for parallel smoke ports");
requireIn(viteSource, '"/api": apiProxyTarget', "Vite dev proxy must use the configurable API target");
forbidIn(viteSource, 'normalizedId.endsWith("/apps/web/src/FinanceView.tsx") && return "workspace"', "FinanceView must not be forced into workspace chunk");

if (missing.length > 0) {
  console.error("Finance view source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  financeViewLazy: true,
  appFinanceSubcomponentsRemoved: true,
  financeRouteBoundary: true
});
