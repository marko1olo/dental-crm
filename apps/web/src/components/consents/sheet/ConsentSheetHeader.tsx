import React from "react";

export interface ConsentSheetHeaderProps {
	cleanTitle: string;
	cleanSubtitle: string;
	effectiveWatermark: string;
	stampColor: string;
	isClosedOrSigned: boolean;
}

export const ConsentSheetHeader: React.FC<ConsentSheetHeaderProps> = ({
	cleanTitle,
	cleanSubtitle,
	effectiveWatermark,
	stampColor,
	isClosedOrSigned,
}) => {
	return (
		<>
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
						? "Документ подписан / подшит в медицинскую карту"
						: "Черновик — печать разрешена в любой момент"}
				</span>
			</div>
			<h3 className="consent-document-title">{cleanTitle}</h3>
			<p className="consent-document-subtitle">{cleanSubtitle}</p>
		</>
	);
};
