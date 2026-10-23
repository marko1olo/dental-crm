import type React from "react";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";

export interface Tooth44RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Single Conical Root for Mandibular First Premolar 44
 * Wheeler Ch. 11 — 1 tapered conical root with longitudinal depression groove
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth44Roots: React.FC<Tooth44RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id="tooth44-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth44-root-clip">
				<path d={TOOTH44_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Single Conical Root Mass */}
			<path
				d={TOOTH44_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Longitudinal Developmental Depression */}
			{showGrooves && (
				<g id="tooth44-root-grooves" clipPath="url(#tooth44-root-clip)">
					<path
						d={TOOTH44_GEOMETRY.rootSulcus}
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
						d={TOOTH44_GEOMETRY.rootSulcusHighlight}
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
					d={TOOTH44_GEOMETRY.cejCurve}
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
