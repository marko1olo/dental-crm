import {
	type CtPlanningQuickAction,
	ctPlanningQuickActions,
} from "./ctPlanningCatalog";

export type CtPlanningQuickActionsPanelProps = {
	canPlan: boolean;
	activeQuickActionId: string | null;
	onActivateTool?: ((action: CtPlanningQuickAction) => void) | undefined;
};

export function CtPlanningQuickActionsPanel({
	canPlan,
	activeQuickActionId,
	onActivateTool,
}: CtPlanningQuickActionsPanelProps) {
	return (
		<div
			className="ct-planning-quick-actions"
			data-testid="ct-planning-quick-actions"
			aria-label="Быстрые сценарии КТ-планирования"
		>
			{ctPlanningQuickActions.map((action) => {
				const locked = action.requiresVolume && !canPlan;
				// const selected = activeQuickAction?.id === action.id
				const selected = activeQuickActionId === action.id;
				return (
					<button
						className={`ct-planning-quick-action ${selected ? "selected" : ""} ${locked ? "locked" : "ready"}`}
						key={action.id}
						type="button"
						disabled={locked || !onActivateTool}
						onClick={() => onActivateTool?.(action)}
						aria-pressed={selected}
						title={
							locked ? "Сначала выберите готовую КЛКТ/КТ-серию" : action.detail
						}
					>
						<span>{action.title}</span>
						<strong>{action.toolLabel}</strong>
						<small>
							{locked
								? "нужна КТ-серия"
								: `${action.viewLabel} · ${action.slabMm} мм`}
						</small>
					</button>
				);
			})}
		</div>
	);
}
