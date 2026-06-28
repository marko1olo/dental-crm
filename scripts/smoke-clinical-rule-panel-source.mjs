import { readFileSync } from "node:fs";

import { existsSync } from "node:fs";
const appSource = [
  readFileSync("apps/web/src/App.tsx", "utf8"),
  readFileSync("apps/web/src/useAppLogic.tsx", "utf8"),
  existsSync("apps/web/src/VisitView.tsx") ? readFileSync("apps/web/src/VisitView.tsx", "utf8") : ""
].join("\n");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const panelSource = readFileSync("apps/web/src/ClinicalRulePanel.tsx", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'from "./ClinicalRulePanel"', "App.tsx must import the clinical rule panel boundary");
requireIn(appSource, "<ClinicalRulePanel", "App.tsx must delegate visit clinical rule panel rendering");
requireIn(appSource, 'context="visit"', "App.tsx must render the visit compact clinical rule panel");
requireIn(appSource, "evaluations={activeVisitClinicalRuleEvaluations}", "App.tsx must pass active-visit evaluations into the visit panel");
requireIn(appSource, "const patientClinicalRuleEvaluations = useMemo", "App.tsx must derive patient-scoped evaluations for the finance panel");
requireIn(appSource, "clinicalRuleEvaluations={patientClinicalRuleEvaluations}", "App.tsx must pass patient-scoped evaluations into FinanceView");
requireIn(appSource, "summary={activeVisitClinicalRuleSummary}", "App.tsx must pass active-visit summary into the visit panel");
requireIn(financeViewSource, "<ClinicalRulePanel", "FinanceView must delegate finance clinical rule panel rendering");
requireIn(financeViewSource, 'context="finance"', "FinanceView must render the finance clinical rule panel");
requireIn(appSource, "clinicalRuleSummary={patientClinicalRuleSummary}", "App.tsx must pass patient-scoped clinical rule summary into FinanceView");
requireIn(financeViewSource, "summary={clinicalRuleSummary}", "FinanceView must pass patient-scoped summary into the finance panel");
forbidIn(financeViewSource, "summary={dashboard.clinicalRuleSummary}", "FinanceView must not pass global clinical rule summary");
forbidIn(appSource, "const renderClinicalRulePanel", "App.tsx must not keep the old inline clinical rule renderer");
forbidIn(appSource, 'className="clinical-rule-panel clinical-rule-panel-compact"', "App.tsx must not inline clinical rule panel markup");

requireIn(panelSource, "export function ClinicalRulePanel", "ClinicalRulePanel must export the component");
requireIn(panelSource, 'context: "visit" | "finance"', "ClinicalRulePanel must own the two rendering contexts");
requireIn(panelSource, "sourceEvaluations.slice(0, context === \"visit\" ? 1 : 4)", "ClinicalRulePanel must keep visit compact and finance expanded limits");
requireIn(panelSource, 'className="clinical-rule-panel clinical-rule-panel-compact"', "ClinicalRulePanel must own compact visit panel markup");
requireIn(panelSource, '<section className="clinical-rule-panel"', "ClinicalRulePanel must own finance panel markup");
requireIn(panelSource, 'className="clinical-rule-empty"', "ClinicalRulePanel must show an explicit empty state");
requireIn(panelSource, "Активных клинических предупреждений нет", "ClinicalRulePanel must reassure users when visit rules are clear");
requireIn(panelSource, "severityLabels[evaluation.severity]", "ClinicalRulePanel must receive severity labels through props");
requireIn(panelSource, "actionLabels[evaluation.action]", "ClinicalRulePanel must receive action labels through props");
requireIn(panelSource, "staffRoleLabels[evaluation.ownerRole]", "ClinicalRulePanel must receive staff role labels through props");
requireIn(panelSource, "missingRequiredServiceIds.map(serviceTitle)", "ClinicalRulePanel must map service ids through the injected title resolver");

if (missing.length > 0) {
  console.error("Clinical rule panel source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  clinicalRulePanelDelegated: true,
  compactVisitPanelPreserved: true,
  financePanelPreserved: true
});
