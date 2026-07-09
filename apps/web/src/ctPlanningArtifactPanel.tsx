import type { CtPlanningArtifactCommand, CtPlanningArtifactCommandState } from "./ctPlanningArtifactCommands";

type CtPlanningArtifactPanelProps = {
  commands: CtPlanningArtifactCommandState[];
  onCreateArtifact?: (command: CtPlanningArtifactCommand) => void;
};

export function CtPlanningArtifactPanel({ commands, onCreateArtifact }: CtPlanningArtifactPanelProps) {
  const readyCount = commands.filter((item) => item.status === "ready").length;
  const draftCount = commands.reduce((sum, item) => sum + item.draftCount, 0);
  const blockedCount = commands.filter((item) => item.status === "blocked").length;

  return (
    <div className="ct-planning-artifact-board" data-testid="ct-planning-artifact-board" aria-label="Создание разметок КТ-плана">
      <article className="ct-planning-artifact-summary">
        <span>Разметки плана</span>
        <strong>
          {readyCount}/{commands.length} типов
        </strong>
        <p>{blockedCount > 0 ? "Часть разметок ждет готовую серию или выбранный имплант." : draftCount > 0 ? "Есть незавершенные разметки; добавьте точки в режиме КТ-срезов." : "Можно фиксировать клинические разметки как структурные данные."}</p>
      </article>
      <div className="ct-planning-artifact-grid">
        {commands.map((item) => (
          <article className={`ct-planning-artifact-card ${item.status}`} key={item.command.id}>
            <span>{item.statusLabel}</span>
            <strong>{item.command.title}</strong>
            <p>{item.command.detail}</p>
            <small>{item.blocker ?? item.command.result}</small>
            <button
              type="button"
              disabled={item.status === "blocked" || !onCreateArtifact}
              onClick={() => onCreateArtifact?.(item.command)}
              aria-label={`${item.actionLabel}: ${item.command.title}`}
            >
              {item.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
