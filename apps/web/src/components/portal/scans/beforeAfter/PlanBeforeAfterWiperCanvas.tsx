import React from "react";
import type { PatientBeforeAfterCase } from "../../patientCabinet/patientCabinetAppointments.js";
import { calculateSplitClipPath } from "../../patientWebappEngine.js";
import { PlanBeforeAfterWiperSeparator } from "./PlanBeforeAfterWiperSeparator";

export interface PlanBeforeAfterWiperCanvasProps {
	readonly activeCase: PatientBeforeAfterCase;
	readonly sliderPercent: number;
}

export const PlanBeforeAfterWiperCanvas: React.FC<PlanBeforeAfterWiperCanvasProps> = ({
	activeCase,
	sliderPercent,
}) => {
	return (
		<div
			data-testid="before-after-wiper-container"
			style={{
				position: "relative",
				height: "280px",
				backgroundColor: "#020617",
				overflow: "hidden",
				userSelect: "none",
			}}
		>
			<img
				src={activeCase.afterImageUrl}
				alt={activeCase.afterLabelRu}
				loading="lazy"
				decoding="async"
				style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					clipPath: calculateSplitClipPath(sliderPercent, "vertical"),
					overflow: "hidden",
				}}
			>
				<img
					src={activeCase.beforeImageUrl}
					alt={activeCase.beforeLabelRu}
					loading="lazy"
					decoding="async"
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
			</div>
			<span
				style={{
					position: "absolute",
					top: "10px",
					left: "10px",
					backgroundColor: "rgba(15, 23, 42, 0.85)",
					color: "#ffffff",
					fontSize: "11px",
					fontWeight: 700,
					padding: "3px 8px",
					borderRadius: "4px",
					border: "1px solid rgba(255, 255, 255, 0.2)",
					backdropFilter: "blur(4px)",
					zIndex: 5,
				}}
			>
				{activeCase.beforeLabelRu}
			</span>
			<span
				style={{
					position: "absolute",
					top: "10px",
					right: "10px",
					backgroundColor: "rgba(13, 148, 136, 0.9)",
					color: "#ffffff",
					fontSize: "11px",
					fontWeight: 800,
					padding: "3px 8px",
					borderRadius: "4px",
					border: "1px solid rgba(255, 255, 255, 0.3)",
					backdropFilter: "blur(4px)",
					zIndex: 5,
				}}
			>
				{activeCase.afterLabelRu}
			</span>
			<PlanBeforeAfterWiperSeparator sliderPercent={sliderPercent} />
		</div>
	);
};
