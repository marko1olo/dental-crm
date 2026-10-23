import type React from "react";
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

			{/* Narrow Anatomical Bifurcation Ambient Shadow at Y=104 */}
			<path
				d={TOOTH47_GEOMETRY.bifurcationShadowPath}
				fill="url(#dente-furcation-shadow)"
				clipPath="url(#tooth47-root-clip)"
				pointerEvents="none"
			/>

			{/* Parallel Root Sulcus Longitudinalis */}
			{showGrooves && (
				<g id="tooth47-root-grooves" clipPath="url(#tooth47-root-clip)">
					<path
						d={TOOTH47_GEOMETRY.mesialLongitudinalGroove}
						fill="none"
						stroke={
							isDark
								? "url(#dente-root-sulcus-shadow-dark)"
								: "url(#dente-root-sulcus-shadow)"
						}
						strokeWidth="2.4"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH47_GEOMETRY.distalLongitudinalGroove}
						fill="none"
						stroke={
							isDark
								? "url(#dente-root-sulcus-shadow-dark)"
								: "url(#dente-root-sulcus-shadow)"
						}
						strokeWidth="2.0"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* Cementoenamel Junction (CEJ) Curvature */}
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
