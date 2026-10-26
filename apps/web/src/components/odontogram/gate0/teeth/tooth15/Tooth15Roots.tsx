import type React from "react";
import { TOOTH15_GEOMETRY } from "./tooth15Geometry";

export interface Tooth15RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Single Conical Root for Maxillary Second Premolar 15
 * Wheeler Ch. 10 — 1 tapered root with developmental depression
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth15Roots: React.FC<Tooth15RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id="tooth15-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth15-root-clip">
				<path d={TOOTH15_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Single Conical Root */}
			<path
				id="tooth15-root-monolith"
				d={TOOTH15_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Cylindrical Volume Shading & Highlights */}
			<g clipPath="url(#tooth15-root-clip)">
				<path
					d={TOOTH15_GEOMETRY.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				{/* Longitudinal Depression Groove */}
				{showGrooves && (
					<>
						<path
							d={TOOTH15_GEOMETRY.rootSulcus}
							fill="none"
							stroke={strokeColor}
							strokeWidth="0.75"
							strokeLinecap="round"
							opacity="0.6"
							vectorEffect="non-scaling-stroke"
						/>
						<path
							d={TOOTH15_GEOMETRY.rootSulcusHighlight}
							fill="none"
							stroke={isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.55)"}
							strokeWidth="0.5"
							strokeLinecap="round"
						/>
					</>
				)}
			</g>

			{/* Cemento-Enamel Junction (CEJ) */}
			{showCej && (
				<path
					d={TOOTH15_GEOMETRY.cejCurve}
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
