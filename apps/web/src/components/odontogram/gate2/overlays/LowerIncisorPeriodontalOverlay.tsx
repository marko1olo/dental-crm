import type React from "react";
import type { LowerIncisorPeriodontalOverlayProps } from "./overlayTypes";

/**
 * Periodontal Bone Recession & Mobility Indicator Overlay
 * Alveolar bone resorption, exposed root cementum trunk, and Miller mobility grade badge.
 * Mandate 8b <= 120 lines.
 */
export const LowerIncisorPeriodontalOverlay: React.FC<
	LowerIncisorPeriodontalOverlayProps
> = ({
	recessionLevel = "moderate",
	mobilityGrade = 0,
	toothNumber = 31,
	isDark = false,
	className,
}) => {
	const yLevels: Record<string, number> = {
		mild: 88,
		moderate: 104,
		severe: 120,
	};
	const yBone = yLevels[recessionLevel] ?? 104;

	return (
		<g
			id={`tooth-${toothNumber}-periodontal-overlay`}
			data-recession-level={recessionLevel}
			data-mobility-grade={mobilityGrade}
			className={className}
		>
			{/* Exposed Root Cementum Trunk Band */}
			<rect
				id="exposed-root-cementum"
				x="38"
				y="70"
				width="24"
				height={yBone - 70}
				fill="rgba(197, 169, 135, 0.40)"
				stroke="none"
			/>

			{/* Alveolar Bone Crest Margin Line */}
			<path
				id="alveolar-bone-crest"
				d={`M 15,${yBone} Q 50,${yBone + 3} 85,${yBone}`}
				stroke={isDark ? "#94a3b8" : "#64748b"}
				strokeWidth="1.2"
				strokeDasharray="3,1.5"
				fill="none"
			/>

			{/* Subgingival Bone Trabeculae Stippling */}
			<path
				id="bone-trabeculae"
				d={`M 20,${yBone + 6} L 80,${yBone + 6} M 25,${yBone + 12} L 75,${yBone + 12}`}
				stroke={isDark ? "rgba(100, 116, 139, 0.40)" : "rgba(148, 163, 184, 0.45)"}
				strokeWidth="0.8"
				strokeDasharray="2,3"
				fill="none"
			/>

			{/* Miller Tooth Mobility Grade Badge */}
			{mobilityGrade > 0 && (
				<g id="mobility-grade-badge" transform="translate(14, 126)">
					<rect
						width="30"
						height="16"
						rx="5"
						fill={mobilityGrade >= 3 ? "#ef4444" : mobilityGrade === 2 ? "#f59e0b" : "#3b82f6"}
						opacity="0.92"
					/>
					<text
						x="15"
						y="11.5"
						textAnchor="middle"
						fill="#ffffff"
						fontSize="8.5"
						fontWeight="bold"
						fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
					>
						{mobilityGrade === 1 ? "M:I ↔" : mobilityGrade === 2 ? "M:II ↔" : "M:III ⤮"}
					</text>
				</g>
			)}
		</g>
	);
};
