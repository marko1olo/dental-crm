import React from "react";
import { TOOTH42_GEOMETRY } from "./tooth42Geometry";

export interface Tooth42RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isEndo?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Slender single root for Tooth 42 (Mandibular Lateral Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth42Roots: React.FC<Tooth42RootsProps> = ({
	isEndo = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH42_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(100, 116, 139, 0.40)";
	const sulcusStroke = isDark
		? "rgba(15, 23, 42, 0.50)"
		: "rgba(120, 95, 65, 0.25)";

	return (
		<g id="tooth42-root-complex" className={className}>
			<defs>
				<clipPath id="tooth42-root-clip">
					<path d={g.rootMonolithPath} />
				</clipPath>
			</defs>
			<path
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				opacity={isEndo ? "0.90" : "1.0"}
				vectorEffect="non-scaling-stroke"
			/>
			{/* Lateral Root Depression Soft Ambient Shadow */}
			<g clipPath="url(#tooth42-root-clip)">
				<path
					d={g.rootSulcus}
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
			{/* Cervical Margin (CEJ) */}
			<path
				d={g.cejPath}
				fill="none"
				stroke={stroke}
				strokeWidth="0.75"
				strokeLinecap="round"
				opacity="0.85"
			/>
		</g>
	);
};
