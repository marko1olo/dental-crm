export interface DicomMprRoadmapPanelProps {
	mprClinicalNextStep: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprClinicalChecklist: Array<any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprOperatorSummaryCards: Array<any>;
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
					{mprClinicalChecklist.map((item) => (
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
				{mprOperatorSummaryCards.map((card) => (
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
