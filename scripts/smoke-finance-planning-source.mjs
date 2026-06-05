import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const financeSource = readFileSync("apps/web/src/FinancePlanning.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'lazy(() => import("./FinanceView")', "App.tsx must lazy-load the finance view boundary");
forbidIn(appSource, 'from "./FinancePlanning"', "App.tsx must not import finance planning subcomponents directly");
forbidIn(appSource, "<FinancePlanningOverview", "App.tsx must not render finance summary directly");
forbidIn(appSource, "<ServiceCatalogStrip", "App.tsx must not render service catalog strip directly");

requireIn(financeViewSource, "<FinancePlanningOverview", "FinanceView must delegate finance summary and scenarios");
requireIn(financeViewSource, "<ServiceCatalogStrip", "FinanceView must delegate service catalog strip");
requireIn(financeViewSource, "billingSummary={billingSummary}", "FinanceView must pass patient-scoped finance totals into planning overview");
requireIn(financeViewSource, "onGoToVisit={onGoToVisit}", "FinanceView must give empty plan states a direct route to the visit");
requireIn(financeViewSource, "onGoToPrices={onGoToPrices}", "FinanceView must give empty catalog states a direct route to prices");
forbidIn(financeViewSource, "billingSummary={dashboard.billingSummary}", "FinanceView must not pass global finance totals into patient planning overview");
requireIn(financeViewSource, "activePaymentsCount={activePayments.length}", "FinanceView must pass active payment count");
requireIn(financeViewSource, "scenarios={activeTreatmentPlanScenarios}", "FinanceView must pass patient-specific plan scenarios");
forbidIn(appSource, 'className="finance-summary-grid"', "App.tsx must not inline finance summary cards");
forbidIn(appSource, 'className="plan-scenario-grid"', "App.tsx must not inline scenario grid");
forbidIn(appSource, 'className="service-catalog-strip"', "App.tsx must not inline service catalog strip");

requireIn(financeSource, "export function FinancePlanningOverview", "FinancePlanning must export summary/scenario component");
requireIn(financeSource, "export function ServiceCatalogStrip", "FinancePlanning must export catalog strip component");
requireIn(financeSource, 'className="finance-summary-grid"', "FinancePlanning must own finance summary markup");
requireIn(financeSource, 'className="plan-scenarios"', "FinancePlanning must own plan scenario section");
requireIn(financeSource, 'className="service-catalog-strip"', "FinancePlanning must own catalog strip markup");
requireIn(financeSource, 'className="finance-empty-state"', "FinancePlanning must show explicit empty states");
requireIn(financeSource, "Вариантов плана пока нет", "FinancePlanning must explain missing plan scenarios");
requireIn(financeSource, "Каталог услуг пуст", "FinancePlanning must explain missing catalog data");
requireIn(financeSource, "onClick={onGoToVisit}", "Empty plan scenarios must have a direct visit action");
requireIn(financeSource, "onClick={onGoToPrices}", "Empty service catalog must have a direct price-list action");
requireIn(financeSource, "services.slice(0, 6)", "Service catalog strip must stay compact");

requireIn(cssSource, ".finance-empty-state", "CSS must style finance empty state");
requireIn(cssSource, ".finance-empty-state .text-button", "CSS must keep finance empty-state actions aligned");

if (missing.length > 0) {
  console.error("Finance planning source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  financePlanningDelegated: true,
  serviceCatalogDelegated: true,
  emptyStatesPreserved: true
});
