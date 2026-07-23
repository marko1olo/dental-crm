import type { CtPlanningTaskSnapshot } from "./ctPlanningState";

export type CtPlanningTaskBoardPanelProps = {
  planningSnapshot: CtPlanningTaskSnapshot;
};

export function CtPlanningTaskBoardPanel({
  planningSnapshot,
}: CtPlanningTaskBoardPanelProps) {
  return (
    <>
      <div
        className="ct-planning-task-board"
        data-testid="ct-planning-task-board"
        aria-label="Задачи КТ-планирования для просмотрщика"
      >
        <article className="ct-planning-task-summary">
          <span>Готовность плана</span>
          <strong>{planningSnapshot.readinessScore}%</strong>
          <p>{planningSnapshot.taskSummaryLabel}</p>
          <small>{planningSnapshot.implantSummaryLabel}</small>
        </article>
        {planningSnapshot.routeCards.map((route) => (
          <article className={route.state} key={route.id}>
            <span>{route.label}</span>
            <strong>{route.title}</strong>
            <p>{route.detail}</p>
          </article>
        ))}
      </div>
      {planningSnapshot.cards.length > 0 ? (
        <div
          className="ct-planning-task-list"
          data-testid="ct-planning-task-list"
          aria-label="Переносимые задачи КТ-планирования"
        >
          {planningSnapshot.cards.map((task) => (
            <article
              className={`ct-planning-task ${task.status}`}
              key={task.id}
              data-task-kind={task.kind}
            >
              <span>{task.statusLabel}</span>
              <strong>{task.title}</strong>
              <p>{task.detail}</p>
              <small>{task.toolLabel}</small>
              {task.warnings.length > 0 ? (
                <em>{task.warnings.join(" · ")}</em>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
