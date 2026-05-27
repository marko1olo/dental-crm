import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const ledgerSource = readFileSync("apps/web/src/FinanceLedger.tsx", "utf8");
const planningSource = readFileSync("apps/web/src/FinancePlanning.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'lazy(() => import("./FinanceView")', "App.tsx must lazy-load the finance view boundary");
forbidIn(appSource, 'from "./FinanceLedger"', "App.tsx must not import the finance ledger subcomponent directly");
forbidIn(appSource, "<FinanceLedger", "App.tsx must not render plan/payment ledgers directly");
requireIn(financeViewSource, "<FinanceLedger", "FinanceView must delegate plan/payment ledgers");
requireIn(financeViewSource, "Сводка по пациенту", "FinanceView must make the patient finance scope explicit");
requireIn(financeViewSource, "treatmentItems={activeTreatmentPlanItems}", "FinanceView must pass patient-specific treatment items");
requireIn(financeViewSource, "payments={activePayments}", "FinanceView must pass patient-specific payments");
forbidIn(appSource, 'className="finance-row plan-${item.status}', "App.tsx must not inline treatment plan rows");
forbidIn(appSource, "activePayments.map((payment)", "App.tsx must not inline payment rows");

requireIn(ledgerSource, "export function FinanceLedger", "FinanceLedger must export the component");
requireIn(ledgerSource, 'className="finance-split"', "FinanceLedger must own the split layout");
requireIn(ledgerSource, 'aria-label="План лечения"', "FinanceLedger must keep treatment plan landmark");
requireIn(ledgerSource, 'aria-label="История оплат"', "FinanceLedger must keep payment history landmark");
requireIn(ledgerSource, 'className="finance-empty-state"', "FinanceLedger must show explicit empty states");
requireIn(ledgerSource, "План лечения для текущего пациента пуст", "FinanceLedger must explain empty treatment plan");
requireIn(ledgerSource, "Платежей по текущему пациенту пока нет", "FinanceLedger must explain empty payments");
requireIn(ledgerSource, "paymentFiscalReceiptLabel(payment)", "FinanceLedger must preserve receipt labeling");

requireIn(planningSource, "function ruCount", "FinancePlanning must own Russian count formatting");
requireIn(planningSource, '["платеж", "платежа", "платежей"]', "FinancePlanning must avoid broken payment plural text");
requireIn(cssSource, ".finance-empty-state", "CSS must style shared finance empty state");

if (missing.length > 0) {
  console.error("Finance ledger source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  financeLedgerDelegated: true,
  treatmentPlanEmptyState: true,
  paymentEmptyState: true,
  russianCounts: true
});
