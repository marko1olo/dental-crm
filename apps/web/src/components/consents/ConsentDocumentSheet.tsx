import { AlertTriangle } from "lucide-react";
import type React from "react";
import type { ConsentSubstitutionContext, RenderedConsentTemplate } from "./consentTemplates.js";

export interface ConsentDocumentSheetProps {
	rendered: RenderedConsentTemplate;
	effectiveContext: ConsentSubstitutionContext;
	effectiveWatermark: string;
	stampColor: string;
	isClosedOrSigned: boolean;
}

export const ConsentDocumentSheet: React.FC<ConsentDocumentSheetProps> = ({
	rendered,
	effectiveContext,
	effectiveWatermark,
	stampColor,
	isClosedOrSigned,
}) => {
	return (
		<div className="consent-document-sheet" style={{ position: "relative" }}>
			<div
				className="consent-doc-watermark"
				style={{
					position: "absolute",
					top: "45%",
					left: "50%",
					transform: "translate(-50%, -50%) rotate(-30deg)",
					fontSize: "48pt",
					fontWeight: 900,
					color: "rgba(0, 0, 0, 0.04)",
					textTransform: "uppercase",
					letterSpacing: "4pt",
					pointerEvents: "none",
					zIndex: 0,
					userSelect: "none",
				}}
				aria-hidden="true"
			>
				{effectiveWatermark}
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "8px",
				}}
			>
				<span
					className="consent-watermark-stamp"
					style={{
						display: "inline-block",
						border: `1.5pt solid ${stampColor}`,
						color: stampColor,
						padding: "1.5pt 6pt",
						borderRadius: "3px",
						fontSize: "7.5pt",
						fontWeight: 800,
						textTransform: "uppercase",
						letterSpacing: "0.04em",
					}}
					data-testid="consent-watermark-stamp"
				>
					{effectiveWatermark}
				</span>
				<span className="text-xs text-muted">
					{isClosedOrSigned
						? "Документ подписан / подшит в карту 043/у"
						: "Черновик — печать разрешена в любой момент"}
				</span>
			</div>
			<h3 className="consent-document-title">{rendered.title}</h3>
			<p className="consent-document-subtitle">{rendered.subtitle}</p>

			{rendered.renderedSections.map((sec) => (
				<section key={sec.id} className="consent-section-block">
					<h4 className="consent-section-title">{sec.title}</h4>
					<p className="consent-section-text">{sec.content}</p>
					{sec.bullets && sec.bullets.length > 0 && (
						<ul className="consent-bullet-list">
							{sec.bullets.map((bullet, bIdx) => (
								<li key={bIdx}>{bullet}</li>
							))}
						</ul>
					)}
				</section>
			))}

			{rendered.riskFactors.length > 0 && (
				<div className="consent-risk-box">
					<div className="consent-risk-box-header">
						<AlertTriangle size={16} />
						<span>Факторы риска и анатомические особенности</span>
					</div>
					<ul className="consent-bullet-list">
						{rendered.riskFactors.map((rf, idx) => (
							<li key={idx}>{rf}</li>
						))}
					</ul>
				</div>
			)}

			{rendered.aftercareInstructions.length > 0 && (
				<section className="consent-section-block">
					<h4 className="consent-section-title">Рекомендации и ограничения после лечения</h4>
					<ul className="consent-bullet-list">
						{rendered.aftercareInstructions.map((ac, idx) => (
							<li key={idx}>{ac}</li>
						))}
					</ul>
				</section>
			)}

			{/* Блок подписей сторон (для печати бумажного бланка и подшивки в форму 043/у) */}
			<div
				className="consent-print-signatures-block"
				style={{
					marginTop: "1.5rem",
					paddingTop: "1rem",
					borderTop: "1px solid var(--line)",
					display: "flex",
					flexDirection: "column",
					gap: "0.85rem",
				}}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "1.5rem",
					}}
				>
					<div>
						<div
							style={{
								fontSize: "11px",
								fontWeight: "bold",
								textTransform: "uppercase",
								color: "var(--muted)",
								marginBottom: "4px",
							}}
						>
							Пациент (законный представитель):
						</div>
						<div style={{ fontSize: "12px", color: "var(--ink)" }}>
							Подпись: __________________ / {effectiveContext.patientName || "____________________"} /
						</div>
					</div>
					<div>
						<div
							style={{
								fontSize: "11px",
								fontWeight: "bold",
								textTransform: "uppercase",
								color: "var(--muted)",
								marginBottom: "4px",
							}}
						>
							Лечащий врач:
						</div>
						<div style={{ fontSize: "12px", color: "var(--ink)" }}>
							Подпись: __________________ / {effectiveContext.doctorName || "____________________"} /
						</div>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: "11px",
						color: "var(--muted)",
					}}
				>
					<span>Дата: {effectiveContext.date || new Date().toLocaleDateString("ru-RU")}</span>
					<span>Клиника: {effectiveContext.clinicName}</span>
				</div>
			</div>
		</div>
	);
};
