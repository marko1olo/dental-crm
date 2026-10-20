import type React from "react";
import type { FrontalSplintingOverlayProps } from "./overlayTypes";

/**
 * Frontal Periodontal Splinting Ribbon Overlay for Mandibular Incisors
 * Fiber-reinforced ribbon or braided wire stabilizing mobile incisors in periodontitis.
 * Spans lingual crown with retention composite spots.
 * Mandate 8b <= 120 lines.
 */
export const FrontalSplintingOverlay: React.FC<
	FrontalSplintingOverlayProps
> = ({
	splintType = "fiberglass",
	toothNumber = 31,
	isDark = false,
	className,
}) => {
	const isWire = splintType === "metalWire";
	const isRibbon = splintType === "compositeRibbon";

	const ribbonFill = isWire
		? "rgba(148, 163, 184, 0.90)"
		: isRibbon
			? "rgba(254, 243, 199, 0.92)"
			: isDark
				? "rgba(224, 242, 254, 0.85)"
				: "rgba(240, 249, 255, 0.90)";

	const ribbonStroke = isWire
		? "#475569"
		: isRibbon
			? "#d97706"
			: "rgba(56, 189, 248, 0.80)";

	const compositeSpotFill = isDark
		? "rgba(241, 245, 249, 0.90)"
		: "rgba(255, 255, 255, 0.95)";

	return (
		<g
			id={`tooth-${toothNumber}-splinting-overlay`}
			data-splint-material={splintType}
			className={className}
		>
			{/* Interproximal Continuous Splinting Ribbon */}
			<rect
				id="splint-ribbon-body"
				x="10"
				y="46"
				width="80"
				height="7"
				rx="3"
				fill={ribbonFill}
				stroke={ribbonStroke}
				strokeWidth="0.8"
				filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.25))"
			/>

			{/* Internal Fiber Weave or Wire Strands */}
			{!isWire ? (
				<g id="splint-fiber-strands" opacity="0.65">
					<line
						x1="12"
						y1="48"
						x2="88"
						y2="48"
						stroke={ribbonStroke}
						strokeWidth="0.5"
						strokeDasharray="3,1"
					/>
					<line
						x1="12"
						y1="51"
						x2="88"
						y2="51"
						stroke={ribbonStroke}
						strokeWidth="0.5"
						strokeDasharray="3,1"
					/>
				</g>
			) : (
				<g id="splint-wire-braid" opacity="0.80">
					<path
						d="M 12,49.5 Q 25,47.5 38,49.5 T 64,49.5 T 88,49.5"
						stroke="#334155"
						strokeWidth="0.9"
						fill="none"
					/>
				</g>
			)}

			{/* Flowable Composite Anchoring Retention Buttons */}
			<ellipse id="splint-composite-spot-mesial" cx="36" cy="49.5" rx="4.5" ry="3" fill={compositeSpotFill} stroke="rgba(148, 163, 184, 0.50)" strokeWidth="0.5" />
			<ellipse id="splint-composite-spot-distal" cx="64" cy="49.5" rx="4.5" ry="3" fill={compositeSpotFill} stroke="rgba(148, 163, 184, 0.50)" strokeWidth="0.5" />
		</g>
	);
};
