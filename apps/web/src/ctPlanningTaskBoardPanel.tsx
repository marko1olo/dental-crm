import type { CtPlanningTaskSnapshot } from "./ctPlanningState";

export type CtPlanningTaskBoardPanelProps = {
	planningSnapshot: CtPlanningTaskSnapshot;
};

export function CtPlanningTaskBoardPanel({
	planningSnapshot,
}: CtPlanningTaskBoardPanelProps) {
	return (
		<>
			<section
				className="ct-planning-task-board"
				data-testid="ct-planning-task-board"
				aria-label="Задачи КТ-планирования для просмотрщика"
			>
				<article className="ct-planning-task-summary">
					<span>Готовность плана</span>
					<strong>{planningSnapshot?.readinessScore ?? 0}%</strong>
					<p>{planningSnapshot?.taskSummaryLabel}</p>
					<small>{planningSnapshot?.implantSummaryLabel}</small>
				</article>
				{(planningSnapshot?.routeCards ?? []).map((route, idx) => (
					<article
						className={route?.state ?? ""}
						key={route?.id ?? `route-${idx}`}
					>
						<span>{route?.label}</span>
						<strong>{route?.title}</strong>
						<p>{route?.detail}</p>
					</article>
				))}
			</section>
			{(planningSnapshot?.cards ?? []).length > 0 ? (
				<section
					className="ct-planning-task-list"
					data-testid="ct-planning-task-list"
					aria-label="Переносимые задачи КТ-планирования"
				>
					{(planningSnapshot?.cards ?? []).map((task, idx) => (
						<article
							className={`ct-planning-task ${task?.status ?? ""}`}
							key={task?.id ?? `task-${idx}`}
							data-task-kind={task?.kind}
						>
							<span>{task?.statusLabel}</span>
							<strong>{task?.title}</strong>
							<p>{task?.detail}</p>
							<small>{task?.toolLabel}</small>
							{(task?.warnings ?? []).length > 0 ? (
								<em>{(task?.warnings ?? []).join(" · ")}</em>
							) : null}
						</article>
					))}
				</section>
			) : null}
		</>
	);
}
