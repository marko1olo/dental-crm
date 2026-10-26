import React from "react";

export interface PlanBeforeAfterWiperSeparatorProps {
	readonly sliderPercent: number;
}

export const PlanBeforeAfterWiperSeparator: React.FC<PlanBeforeAfterWiperSeparatorProps> = ({
	sliderPercent,
}) => {
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				bottom: 0,
				left: `${sliderPercent}%`,
				width: "2px",
				backgroundColor: "#ffffff",
				boxShadow: "0 0 8px rgba(0, 0, 0, 0.8)",
				zIndex: 6,
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "32px",
					height: "32px",
					borderRadius: "50%",
					backgroundColor: "#ffffff",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#0f172a",
					fontSize: "12px",
					fontWeight: 800,
				}}
			>
				↔
			</div>
		</div>
	);
};
