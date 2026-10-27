import React from "react";
import { Printer } from "lucide-react";
import type { ConsentItemRowProps } from "./types";

type ConsentItemRowPreviewProps = Pick<
	ConsentItemRowProps,
	"item" | "substitutionContext" | "onPrintSingleFilled" | "onToggleExpand"
>;

export function ConsentItemRowPreview({
	item,
	substitutionContext,
	onPrintSingleFilled,
	onToggleExpand,
}: ConsentItemRowPreviewProps) {
	const rendered = item.renderedTemplate;
	if (!rendered) return null;

	return (
		<div className="vct-inline-preview">
			<div className="vct-preview-header">
				<div className="vct-preview-title">
					Текст информированного добровольного согласия ({item.statutoryBasis})
				</div>
				<span style={{ fontSize: "11px", color: "var(--muted)" }}>
					Пациент: {substitutionContext.patientName} • Врач: {substitutionContext.doctorName}
				</span>
			</div>

			<div className="vct-preview-body">
				{rendered.renderedSections.map((sec) => (
					<div key={sec.id} className="vct-preview-section">
						<div className="vct-preview-section-title">{sec.title}</div>
						<div>{sec.content}</div>
						{sec.bullets && sec.bullets.length > 0 && (
							<ul className="vct-preview-bullets">
								{sec.bullets.map((b, bIdx) => (
									<li key={bIdx}>{b}</li>
								))}
							</ul>
						)}
					</div>
				))}

				{rendered.riskFactors.length > 0 && (
					<div className="vct-preview-risk-box">
						<strong>Разъясненные клинические риски и возможные осложнения:</strong>
						<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
							{rendered.riskFactors.map((rf, rfIdx) => (
								<li key={rfIdx}>{rf}</li>
							))}
						</ul>
					</div>
				)}

				{rendered.aftercareInstructions.length > 0 && (
					<div className="vct-preview-aftercare-box">
						<strong>Рекомендации и ограничения после вмешательства:</strong>
						<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
							{rendered.aftercareInstructions.map((ac, acIdx) => (
								<li key={acIdx}>{ac}</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
				<button type="button" onClick={onPrintSingleFilled} className="vct-btn vct-btn-primary">
					<Printer size={13} />
					<span>Распечатать этот текст</span>
				</button>
				<button type="button" onClick={onToggleExpand} className="vct-btn vct-btn-secondary">
					Закрыть превью
				</button>
			</div>
		</div>
	);
}
