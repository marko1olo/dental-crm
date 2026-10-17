import React from "react";

export interface PrintViewWatermarkProps {
	readonly text: string;
	readonly rotation?: number;
}

export const PrintViewWatermark: React.FC<PrintViewWatermarkProps> = ({ text, rotation = -32 }) => (
	<div
		className="treatment-doc-watermark"
		style={{
			position: "absolute",
			top: "45%",
			left: "50%",
			transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
			fontSize: "52pt",
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
		{text}
	</div>
);

export const PrintViewStamp: React.FC<{ readonly text: string; readonly color?: string }> = ({
	text,
	color = "#0d9488",
}) => (
	<span
		className="treatment-watermark-stamp"
		style={{
			display: "inline-block",
			border: `1.5pt solid ${color}`,
			color,
			padding: "1pt 5pt",
			borderRadius: "3px",
			fontSize: "7.5pt",
			fontWeight: 800,
			textTransform: "uppercase",
			letterSpacing: "0.04em",
		}}
		data-testid="treatment-watermark-stamp"
	>
		{text}
	</span>
);
