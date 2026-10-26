import React from "react";
import { TOOTH18_GEOMETRY } from "./tooth18Geometry";

export interface Tooth18RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth18Roots: React.FC<Tooth18RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const geo = TOOTH18_GEOMETRY;
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const grooveStroke = isDark ? "rgba(100, 116, 139, 0.40)" : "rgba(100, 116, 139, 0.25)";

	return (
		<g id="tooth18-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth18-root-clip">
				<path d={geo.rootMonolithPath} />
			</clipPath>

			{/* Fused Conical Root Silhouette with Distal Curve */}
			<path
				id="tooth18-root-monolith"
				d={geo.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Cylindrical Volume Shading */}
			<g clipPath="url(#tooth18-root-clip)">
				<path
					d={geo.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* Developmental grooves demarcating fused root segments */}
			{showGrooves && (
				<g id="tooth18-root-grooves">
					<path d="M 28,94 C 27,76 30,52 36,32" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="2,1.5" fill="none" />
					<path d="M 68,94 C 64,76 56,54 44,32" stroke={grooveStroke} strokeWidth="0.7" strokeDasharray="2,1.5" fill="none" />
					<path d="M 48,94 C 47,74 44,52 40,30" stroke={grooveStroke} strokeWidth="0.6" strokeDasharray="2,1.5" fill="none" />
				</g>
			)}

			{/* Cervical line (CEJ) */}
			{showCej && (
				<path
					id="tooth18-cej-line"
					d={geo.cejCurve}
					stroke={strokeColor}
					strokeWidth="0.9"
					strokeLinecap="round"
					fill="none"
				/>
			)}
		</g>
	);
};
