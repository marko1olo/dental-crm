import { AlertTriangle } from "lucide-react";
import type { Dashboard, StaffRole } from "@dental/shared";

type ClinicalRuleEvaluation = Dashboard["clinicalRuleEvaluations"][number];
type ClinicalRuleSeverity = ClinicalRuleEvaluation["severity"];
type ClinicalRuleAction = ClinicalRuleEvaluation["action"];

type ClinicalRulePanelProps = {
  actionLabels: Record<ClinicalRuleAction, string>;
  context: "visit" | "finance";
  evaluations: ClinicalRuleEvaluation[];
  serviceTitle: (serviceId: string) => string;
  severityLabels: Record<ClinicalRuleSeverity, string>;
  staffRoleLabels: Record<StaffRole, string>;
  summary: Dashboard["clinicalRuleSummary"];
};

export function ClinicalRulePanel({
  actionLabels,
  context,
  evaluations,
  serviceTitle,
  severityLabels,
  staffRoleLabels,
  summary
}: ClinicalRulePanelProps) {
  const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
  const sourceEvaluations = unresolved.length ? unresolved : evaluations;
  const visibleEvaluations = sourceEvaluations.slice(0, context === "visit" ? 1 : 4);
  const emptyMessage =
    context === "visit"
      ? "Активных клинических предупреждений нет. Можно продолжать прием."
      : "Все клинические правила закрыты. Риски для оплаты и плана лечения не найдены.";
  const primaryRuleAction = (evaluation: ClinicalRuleEvaluation) => {
    if (evaluation.missingCompletedServiceIds.length) {
      return `Сначала завершить: ${evaluation.missingCompletedServiceIds.map(serviceTitle).join(", ")}`;
    }
    if (evaluation.missingRequiredServiceIds.length) {
      return `Добавить: ${evaluation.missingRequiredServiceIds.map(serviceTitle).join(", ")}`;
    }
    if (evaluation.blockedServiceIds.length) {
      return `Проверьте перед планированием: ${evaluation.blockedServiceIds.map(serviceTitle).join(", ")}`;
    }
    return evaluation.message;
  };

  if (context === "visit") {
    return (
      <details className="clinical-rule-panel clinical-rule-panel-compact" aria-label="Клинические предупреждения">
        <summary className="clinical-rule-summary">
          <AlertTriangle aria-hidden="true" />
          <div>
            <h3>Клинические предупреждения</h3>
            <p>
              {summary.unresolved} требуют внимания · {summary.coveredRules} закрыты
            </p>
          </div>
          <span className={summary.unresolved ? "status-pill status-planned" : "status-pill status-confirmed"}>
            {summary.unresolved} предупр.
          </span>
        </summary>
        {visibleEvaluations.length ? (
          <div className="clinical-rule-grid">
            {visibleEvaluations.map((evaluation) => (
              <details
                className={`clinical-rule-card clinical-rule-quick severity-${evaluation.severity} ${evaluation.resolved ? "resolved" : ""}`}
                key={evaluation.id}
              >
                <summary>
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <span>
                      {severityLabels[evaluation.severity]} · {staffRoleLabels[evaluation.ownerRole]}
                    </span>
                    <h3>{evaluation.title}</h3>
                    <p>{primaryRuleAction(evaluation)}</p>
                  </div>
                </summary>
                <div className="clinical-rule-detail">
                  <p>{evaluation.message}</p>
                  {evaluation.missingRequiredServiceIds.length ? (
                    <small>Добавить: {evaluation.missingRequiredServiceIds.map(serviceTitle).join(", ")}</small>
                  ) : null}
                  {evaluation.missingCompletedServiceIds.length ? (
                    <small>Сначала завершить: {evaluation.missingCompletedServiceIds.map(serviceTitle).join(", ")}</small>
                  ) : null}
                  {evaluation.blockedServiceIds.length ? (
                    <small>Проверьте перед планированием: {evaluation.blockedServiceIds.map(serviceTitle).join(", ")}</small>
                  ) : null}
                  <em>{evaluation.patientMessage}</em>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="clinical-rule-empty">{emptyMessage}</p>
        )}
        {sourceEvaluations.length > visibleEvaluations.length ? (
          <p className="clinical-rule-more">Еще {sourceEvaluations.length - visibleEvaluations.length} пунктов доступны в полном списке оплаты и настроек.</p>
        ) : null}
      </details>
    );
  }

  return (
    <section className="clinical-rule-panel" aria-label="Клинические правила">
      <div className="panel-heading">
        <div>
          <h3>Клинические правила</h3>
          <p>
            {summary.unresolved} требуют внимания · {summary.coveredRules} закрыты
          </p>
        </div>
        <span className={summary.unresolved ? "status-pill status-planned" : "status-pill status-confirmed"}>
          {summary.unresolved} предупр.
        </span>
      </div>
      {visibleEvaluations.length ? (
        <div className="clinical-rule-grid">
          {visibleEvaluations.map((evaluation) => (
            <article className={`clinical-rule-card severity-${evaluation.severity} ${evaluation.resolved ? "resolved" : ""}`} key={evaluation.id}>
              <AlertTriangle aria-hidden="true" />
              <div>
                <span>
                  {severityLabels[evaluation.severity]} · {actionLabels[evaluation.action]} · {staffRoleLabels[evaluation.ownerRole]}
                </span>
                <h3>{evaluation.title}</h3>
                <p>{evaluation.message}</p>
                {evaluation.missingRequiredServiceIds.length ? (
                  <small>Добавить: {evaluation.missingRequiredServiceIds.map(serviceTitle).join(", ")}</small>
                ) : null}
                {evaluation.missingCompletedServiceIds.length ? (
                  <small>Сначала завершить: {evaluation.missingCompletedServiceIds.map(serviceTitle).join(", ")}</small>
                ) : null}
                {evaluation.blockedServiceIds.length ? (
                  <small>Проверьте перед планированием: {evaluation.blockedServiceIds.map(serviceTitle).join(", ")}</small>
                ) : null}
                <em>{evaluation.patientMessage}</em>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="clinical-rule-empty">{emptyMessage}</p>
      )}
    </section>
  );
}
