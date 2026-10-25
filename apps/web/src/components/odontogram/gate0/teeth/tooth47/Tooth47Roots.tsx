import React from "react";
import { TOOTH47_GEOMETRY } from "./tooth47Geometry";

export interface Tooth47RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Parallel Multi-Root Body for Mandibular Second Molar 47
 * Wheeler Ch. 11 — 2 closely spaced, nearly parallel roots with tighter furcation
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth47Roots: React.FC<Tooth47RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id="tooth47-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth47-root-clip">
				<path d={TOOTH47_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Parallel Root Mass */}
			<path
				d={TOOTH47_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Smooth Anatomical Bifurcation Ambient Shadow at Y=104 */}
			<path
				d={TOOTH47_GEOMETRY.bifurcationShadowPath}
				fill="url(#dente-furcation-shadow)"
				clipPath="url(#tooth47-root-clip)"
				pointerEvents="none"
			/>

			{/* Cylindrical Volume Highlights on both Parallel Roots (Zero harsh lines!) */}
			<g clipPath="url(#tooth47-root-clip)">
				<path
					d="M 24.0,76.0 C 22.0,96.0 20.5,118.0 23.5,142.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(255, 255, 255, 0.25)"}
					strokeWidth="2.6"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 24.0,76.0 C 22.0,96.0 20.5,118.0 23.5,142.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)"}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 69.0,76.0 C 66.0,96.0 61.5,118.0 58.0,142.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(255, 255, 255, 0.25)"}
					strokeWidth="2.6"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 69.0,76.0 C 66.0,96.0 61.5,118.0 58.0,142.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)"}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* Monolithic dentin volume without harsh longitudinal split lines */}
			{showCej && (
				<path
					d={TOOTH47_GEOMETRY.cejCurve}
					fill="none"
					stroke={strokeColor}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
