import { ctPlanningTools } from "./ctPlanningCatalog";

export type CtPlanningToolGridPanelProps = {
	canPlan: boolean;
};

export function CtPlanningToolGridPanel({
	canPlan,
}: CtPlanningToolGridPanelProps) {
	return (
		<div
			className="ct-planning-tool-grid"
			data-testid="ct-planning-tool-grid"
			aria-label="Инструменты КТ-планирования"
		>
			{ctPlanningTools.map((tool) => {
				const locked = tool.requiresVolume && !canPlan;
				return (
					<article
						className={`ct-planning-tool ${locked ? "locked" : "ready"}`}
						data-tool-key={tool.key}
						data-state={locked ? "locked" : "ready"}
						key={tool.key}
					>
						<span>{tool.category}</span>
						<strong>{tool.title}</strong>
						<p>{tool.detail}</p>
						<small>
							{locked
								? "Откроется после выбора готовой КЛКТ/КТ-серии."
								: tool.output}
						</small>
					</article>
				);
			})}
		</div>
	);
}
