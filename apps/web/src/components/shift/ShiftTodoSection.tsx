import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { countLabel } from "../../lib/russianPlural";

interface ShiftTodoSectionProps {
  visibleRecommendedActions: any[];
  recommendedActionPriorityLabels: Record<string, string>;
  patientsById: Map<string, any>;
  runRecommendedAction: (action: any) => void;
}

export function ShiftTodoSection({
  visibleRecommendedActions,
  recommendedActionPriorityLabels,
  patientsById,
  runRecommendedAction,
}: ShiftTodoSectionProps) {
  return (
    <section className="shift-todo" aria-label="Что сделать сейчас">
      <div className="shift-todo-head">
        <h2>Что сделать сейчас</h2>
        <span className="shift-todo-count">
          {(visibleRecommendedActions ?? []).length > 0
            ? countLabel(
                (visibleRecommendedActions ?? []).length,
                "дело",
                "дела",
                "дел",
              )
            : "всё закрыто"}
        </span>
      </div>
      {(visibleRecommendedActions ?? []).length > 0 ? (
        <ul className="shift-todo-list">
          {(visibleRecommendedActions ?? []).map((action: any) => {
            const patient = action.patientId
              ? patientsById.get(action.patientId)
              : null;
            return (
              <li
                key={action.id}
                className={`shift-todo-item priority-${action.priority}`}
              >
                <span
                  className={`shift-todo-priority priority-${action.priority}`}
                >
                  {recommendedActionPriorityLabels?.[action.priority] ??
                    "без пометки"}
                </span>
                <div className="shift-todo-text">
                  <strong>{action.title}</strong>
                  <p>{action.detail}</p>
                  {patient ? (
                    <span className="shift-todo-patient">
                      {patient.fullName}
                    </span>
                  ) : null}
                </div>
                <button
                  className="secondary-button shift-todo-go"
                  type="button"
                  onClick={() => runRecommendedAction(action)}
                >
                  {action.actionLabel || "Открыть"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<CheckCircle2 size={24} />}
          title="Срочных дел нет"
          description="Все приемы подписаны, снимки проверены, документы и оплаты закрыты. Новое дело появится здесь само."
          glass={false}
          style={{ padding: "18px 16px" }}
        />
      )}
    </section>
  );
}
