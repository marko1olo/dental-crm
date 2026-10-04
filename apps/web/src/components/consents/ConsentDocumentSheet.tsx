import { AlertTriangle } from "lucide-react";
import React, { useMemo } from "react";
import type { ConsentSubstitutionContext, RenderedConsentTemplate } from "./consentTemplates.js";
import {
	cleanPrintableConsentText,
	sanitizeConsentContext,
} from "./consentSummaryHelper.js";

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
	// Полная очистка контекста от системного мусора (null, undefined, 804n-undefined)
	const cleanContext = useMemo(() => sanitizeConsentContext(effectiveContext), [effectiveContext]);

	// Защищенный рендеринг секций без утечек служебных английских ключей и кодов
	const cleanTitle = useMemo(() => cleanPrintableConsentText(rendered.title), [rendered.title]);
	const cleanSubtitle = useMemo(() => cleanPrintableConsentText(rendered.subtitle), [rendered.subtitle]);

	return (
		<div
			className="consent-document-sheet"
			style={{
				position: "relative",
				wordWrap: "break-word",
				overflowWrap: "break-word",
				wordBreak: "break-word",
				overflow: "visible",
				boxSizing: "border-box",
			}}
		>
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
					flexWrap: "wrap",
					gap: "6px",
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
			<h3 className="consent-document-title">{cleanTitle}</h3>
			<p className="consent-document-subtitle">{cleanSubtitle}</p>

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

			{/* Блок подписей сторон с защитой от обрезания и разрыва страницы (break-inside: avoid) */}
			<div
				className="consent-print-signatures-block"
				style={{
					marginTop: "1.5rem",
					paddingTop: "1rem",
					borderTop: "1px solid var(--line)",
					display: "flex",
					flexDirection: "column",
					gap: "0.85rem",
					pageBreakInside: "avoid",
					breakInside: "avoid",
					pageBreakBefore: "auto",
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
						<div style={{ fontSize: "12px", color: "var(--ink)", wordBreak: "break-word" }}>
							Подпись: __________________ / {cleanContext.patientName} /
						</div>
						{!isClosedOrSigned ? (
							<div
								style={{
									fontSize: "11px",
									color: "var(--amber-dark, #b45309)",
									fontStyle: "italic",
									marginTop: "3px",
								}}
								data-testid="sheet-status-unsigned"
							>
								Статус: Не подписан (требуется роспись пациента на бланке или планшете)
							</div>
						) : (
							<div
								style={{
									fontSize: "11px",
									color: "var(--ok-fg, #059669)",
									fontWeight: 600,
									marginTop: "3px",
								}}
								data-testid="sheet-status-signed"
							>
								Статус: Подписан и заверен (подшит в архив карты № 043/у)
							</div>
						)}
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
							Лечащий врач-стоматолог:
						</div>
						<div style={{ fontSize: "12px", color: "var(--ink)", wordBreak: "break-word" }}>
							Подпись: __________________ / {cleanContext.doctorName} /
						</div>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: "11px",
						color: "var(--muted)",
						flexWrap: "wrap",
						gap: "6px",
					}}
				>
					<span>Дата: {cleanContext.date}</span>
					<span>Клиника: {cleanContext.clinicName}</span>
				</div>
			</div>
		</div>
	);
};
