import { ctPlanningMetrics } from "./ctPlanningCatalog";

export type CtPlanningMetricGridPanelProps = {
	canPlan: boolean;
};

export function CtPlanningMetricGridPanel({
	canPlan,
}: CtPlanningMetricGridPanelProps) {
	return (
		<div
			className="ct-planning-metric-grid"
			data-testid="ct-planning-metric-grid"
			aria-label="Измерения КТ-плана"
		>
			{ctPlanningMetrics.map((metric) => (
				<article className={canPlan ? "ready" : "locked"} key={metric.id}>
					<span>{metric.title}</span>
					<strong>{metric.value}</strong>
					<p>{metric.clinicalUse}</p>
					<small>{metric.source}</small>
				</article>
			))}
		</div>
	);
}
