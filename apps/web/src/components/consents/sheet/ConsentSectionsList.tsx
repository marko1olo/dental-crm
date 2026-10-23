import { AlertTriangle } from "lucide-react";
import React from "react";
import type { RenderedConsentTemplate } from "../consentTemplates.js";
import { cleanPrintableConsentText } from "../consentSummaryHelper.js";

export interface ConsentSectionsListProps {
	rendered: RenderedConsentTemplate;
}

export const ConsentSectionsList: React.FC<ConsentSectionsListProps> = ({ rendered }) => {
	return (
		<>
			{rendered.renderedSections.map((sec) => (
				<section
					key={sec.id}
					className="consent-section-block"
					style={{
						pageBreakInside: "avoid",
						breakInside: "avoid",
					}}
				>
					<h4 className="consent-section-title">{cleanPrintableConsentText(sec.title)}</h4>
					<p className="consent-section-text" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
						{cleanPrintableConsentText(sec.content)}
					</p>
					{sec.bullets && sec.bullets.length > 0 && (
						<ul className="consent-bullet-list">
							{sec.bullets.map((bullet, bIdx) => (
								<li key={bIdx} style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
									{cleanPrintableConsentText(bullet)}
								</li>
							))}
						</ul>
					)}
				</section>
			))}

			{rendered.riskFactors.length > 0 && (
				<div
					className="consent-risk-box"
					style={{
						pageBreakInside: "avoid",
						breakInside: "avoid",
					}}
				>
					<div className="consent-risk-box-header">
						<AlertTriangle size={16} />
						<span>Факторы риска и анатомические особенности</span>
					</div>
					<ul className="consent-bullet-list">
						{rendered.riskFactors.map((rf, idx) => (
							<li key={idx} style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
								{cleanPrintableConsentText(rf)}
							</li>
						))}
					</ul>
				</div>
			)}

			{rendered.aftercareInstructions.length > 0 && (
				<section
					className="consent-section-block"
					style={{
						pageBreakInside: "avoid",
						breakInside: "avoid",
					}}
				>
					<h4 className="consent-section-title">Рекомендации и ограничения после лечения</h4>
					<ul className="consent-bullet-list">
						{rendered.aftercareInstructions.map((ac, idx) => (
							<li key={idx} style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
								{cleanPrintableConsentText(ac)}
							</li>
						))}
					</ul>
				</section>
			)}
		</>
	);
};
