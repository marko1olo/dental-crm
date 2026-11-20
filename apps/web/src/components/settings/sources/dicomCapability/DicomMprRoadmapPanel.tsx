export interface MprClinicalChecklistItem {
	id: string;
	title: string;
	detail: string;
	status: string;
}

export interface MprOperatorSummaryCardItem {
	id: string;
	title: string;
	value: string | number;
	detail: string;
	tone: string;
}

export interface DicomMprRoadmapPanelProps {
	mprClinicalNextStep?: string | undefined;
	mprClinicalChecklist?: readonly MprClinicalChecklistItem[] | MprClinicalChecklistItem[] | undefined;
	mprOperatorSummaryCards?: readonly MprOperatorSummaryCardItem[] | MprOperatorSummaryCardItem[] | undefined;
}

export function DicomMprRoadmapPanel({
	mprClinicalNextStep,
	mprClinicalChecklist,
	mprOperatorSummaryCards,
}: DicomMprRoadmapPanelProps) {
	return (
		<>
			<section
				className="mpr-clinical-roadmap"
				data-testid="ct-mpr-clinical-roadmap"
				aria-label="Клиническая готовность КТ-срезов"
			>
				<div className="mpr-clinical-roadmap-head">
					<strong>Карта КТ-срезов</strong>
					<span>{mprClinicalNextStep}</span>
				</div>
				<div className="mpr-clinical-roadmap-steps">
					{(Array.isArray(mprClinicalChecklist) ? mprClinicalChecklist : []).map((item) => (
						<article
							className={`mpr-clinical-step status-${item.status}`}
							key={item.id}
						>
							<strong>{item.title}</strong>
							<span>{item.detail}</span>
						</article>
					))}
				</div>
			</section>
			<section
				className="mpr-operator-summary"
				data-testid="ct-mpr-operator-summary"
				aria-label="Быстрая сводка настройки КТ-срезов"
			>
				{(Array.isArray(mprOperatorSummaryCards) ? mprOperatorSummaryCards : []).map((card) => (
					<article className={`tone-${card.tone}`} key={card.id}>
						<span>{card.title}</span>
						<strong>{card.value}</strong>
						<p>{card.detail}</p>
					</article>
				))}
			</section>
		</>
	);
}
