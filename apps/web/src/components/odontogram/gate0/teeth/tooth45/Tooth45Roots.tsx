import type React from "react";
import { TOOTH45_GEOMETRY } from "./tooth45Geometry";

export interface Tooth45RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Single Conical Root for Mandibular Second Premolar 45
 * Wheeler Ch. 11 — 1 tapered conical root with longitudinal depression
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth45Roots: React.FC<Tooth45RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id="tooth45-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth45-root-clip">
				<path d={TOOTH45_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Single Conical Root Mass */}
			<path
				d={TOOTH45_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Longitudinal Developmental Depression */}
			{showGrooves && (
				<g id="tooth45-root-grooves" clipPath="url(#tooth45-root-clip)">
					<path
						d={TOOTH45_GEOMETRY.rootSulcus}
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
						d={TOOTH45_GEOMETRY.rootSulcusHighlight}
						fill="none"
						stroke={
							isDark
								? "rgba(255, 255, 255, 0.15)"
								: "rgba(255, 255, 255, 0.35)"
						}
						strokeWidth="1.0"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* Cementoenamel Junction (CEJ) Curvature */}
			{showCej && (
				<path
					d={TOOTH45_GEOMETRY.cejCurve}
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
