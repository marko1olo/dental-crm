import type { CtPlanningImplantFitPlan } from "./ctPlanningImplantFit";

type CtPlanningImplantFitPanelProps = {
	plan: CtPlanningImplantFitPlan;
};

function marginLabel(value: number | null) {
	return value === null ? "нет" : `${value} мм`;
}

function sourceLabel(value: CtPlanningImplantFitPlan["widthSource"]) {
	if (value === "typed") return "подписана";
	if (value === "fallback") return "черновик";
	return "нет";
}

function fitStatusLabel(value: CtPlanningImplantFitPlan["status"]) {
	if (value === "ready") return "готов";
	if (value === "blocked") return "блокер";
	return "черновик";
}

export function CtPlanningImplantFitPanel({
	plan,
}: CtPlanningImplantFitPanelProps) {
	return (
		<section
			className="ct-planning-implant-fit-board"
			data-testid="ct-planning-implant-fit-board"
			aria-label="Скрининг типоразмера импланта по КТ-измерениям"
		>
			<article
				className={`ct-planning-implant-fit-summary ${plan?.status ?? ""}`}
			>
				<span>Скрининг библиотеки</span>
				<strong>{plan?.score ?? 0}%</strong>
				<p>{plan?.summaryLabel}</p>
				<small>
					ширина {marginLabel(plan?.ridgeWidthMm ?? null)} (
					{sourceLabel(plan?.widthSource)}) · высота{" "}
					{marginLabel(plan?.boneHeightMm ?? null)} (
					{sourceLabel(plan?.heightSource)}) · роли{" "}
					{plan?.measurementRoleCount ?? 0}/{plan?.measurementSourceCount ?? 0}
				</small>
			</article>
			<div className="ct-planning-implant-fit-grid">
				{(plan?.candidates ?? []).map((candidate, idx) => (
					<article
						className={`ct-planning-implant-fit-card ${candidate?.status ?? ""} ${candidate?.selected ? "selected" : ""}`}
						key={candidate?.id ?? `candidate-${idx}`}
					>
						<span>
							{candidate?.selected
								? "выбран"
								: fitStatusLabel(candidate?.status)}
						</span>
						<strong>{candidate?.sizeLabel}</strong>
						<p>{candidate?.title}</p>
						<small>
							диам. {marginLabel(candidate?.diameterMarginMm ?? null)} · длина{" "}
							{marginLabel(candidate?.lengthMarginMm ?? null)} · канал{" "}
							{marginLabel(candidate?.canalMarginMm ?? null)}
						</small>
						<section
							className="ct-planning-implant-fit-reasons"
							aria-label="Причины решения по типоразмеру"
						>
							{(candidate?.decisionReasons ?? []).map((reason) => (
								<em key={reason}>{reason}</em>
							))}
						</section>
						<p>{candidate?.nextAction}</p>
					</article>
				))}
			</div>
			{(plan?.warnings ?? []).length > 0 ? (
				<section
					className="ct-planning-implant-fit-warnings"
					aria-label="Ограничения скрининга типоразмера импланта"
				>
					<span>Ограничения</span>
					<p>{(plan?.warnings ?? []).join(" · ")}</p>
				</section>
			) : null}
		</section>
	);
}
