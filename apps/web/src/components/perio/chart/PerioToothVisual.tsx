import React from "react";
import { isFurcationEligibleTooth } from "@dental/shared";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import { probingDepthHex, probingDepthTone } from "../perioHeatmap";

export interface PerioToothVisualProps {
	readonly toothNumber: number;
	readonly isUpper: boolean;
	readonly isMissing: boolean;
	readonly isImplant: boolean;
	readonly buccalPd: number;
	readonly lingualPd: number;
}

const PerioToothVisual: React.FC<PerioToothVisualProps> = React.memo(({
	toothNumber,
	isUpper,
	isMissing,
	isImplant,
	buccalPd,
	lingualPd,
}) => {
	const maxPd = Math.max(buccalPd, lingualPd);
	const isMolar =
		isFurcationEligibleTooth(toothNumber) &&
		(toothNumber % 10 === 6 ||
			toothNumber % 10 === 7 ||
			toothNumber % 10 === 8);

	if (isMissing) {
		return (
			<svg width="28" height="34" viewBox="0 0 28 34" className="text-[var(--muted)]">
				<line
					x1="4"
					y1="4"
					x2="24"
					y2="30"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<line
					x1="24"
					y1="4"
					x2="4"
					y2="30"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		);
	}

	if (isImplant) {
		return (
			<svg
				width="28"
				height="34"
				viewBox="0 0 28 34"
				className="text-amber-400"
			>
				<rect
					x="7"
					y="4"
					width="14"
					height="26"
					rx="2"
					fill="currentColor"
					fillOpacity="0.15"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="9"
					x2="21"
					y2="9"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="14"
					x2="21"
					y2="14"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="19"
					x2="21"
					y2="19"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="24"
					x2="21"
					y2="24"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
			</svg>
		);
	}

	// Dynamic pocket depth fill bar height
	const pocketFillRatio = Math.min(1, Math.max(0, (maxPd - 2) / 8));
	const pocketFillHeight = Math.round(pocketFillRatio * 18);

	const pocketColor = probingDepthHex(maxPd);

	return (
		<svg width="28" height="34" viewBox="0 0 28 34">
			{/* Crown */}
			<rect
				x="5"
				y={isUpper ? 20 : 2}
				width="18"
				height="12"
				rx="3"
				fill="var(--line-strong, #64748b)"
				fillOpacity="0.25"
				stroke="var(--line, #94a3b8)"
				strokeWidth="1.2"
			/>

			{/* Root(s) */}
			{isMolar ? (
				<>
					{/* Dual root appearance */}
					<path
						d={
							isUpper
								? "M7,20 L6,4 A2,2 0 0,1 11,4 L12,20 Z"
								: "M7,14 L6,30 A2,2 0 0,0 11,30 L12,14 Z"
						}
						fill="var(--line-strong, #64748b)"
						fillOpacity="0.2"
						stroke="var(--line, #64748b)"
						strokeWidth="1"
					/>
					<path
						d={
							isUpper
								? "M16,20 L17,4 A2,2 0 0,1 22,4 L21,20 Z"
								: "M16,14 L17,30 A2,2 0 0,0 22,30 L21,14 Z"
						}
						fill="var(--line-strong, #64748b)"
						fillOpacity="0.2"
						stroke="var(--line, #64748b)"
						strokeWidth="1"
					/>
				</>
			) : (
				/* Single conical root */
				<path
					d={
						isUpper
							? "M7,20 L12,3 A2,2 0 0,1 16,3 L21,20 Z"
							: "M7,14 L12,31 A2,2 0 0,0 16,31 L21,14 Z"
					}
					fill="var(--line-strong, #64748b)"
					fillOpacity="0.2"
					stroke="var(--line, #64748b)"
					strokeWidth="1"
				/>
			)}

			{/* Probing Depth Fill Indicator */}
			{pocketFillHeight > 0 && (
				<rect
					x="9"
					y={isUpper ? 20 - pocketFillHeight : 14}
					width="10"
					height={pocketFillHeight}
					rx="1"
					fill={pocketColor}
					fillOpacity="0.75"
				/>
			)}

			{/* Gingival Margin line */}
			<line
				x1="3"
				y1={isUpper ? 20 : 14}
				x2="25"
				y2={isUpper ? 20 : 14}
				stroke="var(--sky, #38bdf8)"
				strokeWidth="1.5"
				strokeDasharray="2 1"
			/>
		</svg>
	);
});
PerioToothVisual.displayName = "PerioToothVisual";


export { PerioToothVisual };
export type { PerioToothVisualProps };
