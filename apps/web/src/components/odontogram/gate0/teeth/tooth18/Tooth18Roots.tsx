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

			{/* Fused Conical Root Block Silhouette */}
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

			{/* Developmental grooves indicating fused root lines */}
			{showGrooves && (
				<g id="tooth18-root-grooves">
					<path d="M 44,24 C 41,38 34,54 30,68" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="2,1.5" fill="none" />
					<path d="M 52,24 C 55,38 62,54 66,68" stroke={grooveStroke} strokeWidth="0.7" strokeDasharray="2,1.5" fill="none" />
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
