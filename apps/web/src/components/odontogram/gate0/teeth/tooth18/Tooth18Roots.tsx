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
				<path d={geo.fusedConicalRootPath} />
			</clipPath>

			{/* Fused Conical Roots Monolith with Distal Sweep */}
			<path
				id="tooth18-root-monolith"
				d={geo.fusedConicalRootPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Internal anatomical root separation grooves */}
			<path
				id="tooth18-internal-root-contour"
				d={geo.rootMonolithPath}
				fill="none"
				stroke={strokeColor}
				strokeWidth="0.5"
				opacity="0.5"
				clipPath="url(#tooth18-root-clip)"
			/>

			{/* Cylindrical Volume Shading */}
			<g clipPath="url(#tooth18-root-clip)">
				<path
					d={geo.fusedConicalRootPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* Developmental fused sulci */}
			{showGrooves && (
				<g id="tooth18-root-grooves">
					<path d="M 36,20 C 37,42 39,66 40,82" stroke={grooveStroke} strokeWidth="0.6" strokeDasharray="2,1.5" fill="none" />
					<path d="M 64,22 C 63,44 61,66 60,82" stroke={grooveStroke} strokeWidth="0.6" strokeDasharray="2,1.5" fill="none" />
					<path d="M 48,16 C 48,36 49,60 50,78" stroke={grooveStroke} strokeWidth="0.5" strokeDasharray="2,1.5" fill="none" />
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
