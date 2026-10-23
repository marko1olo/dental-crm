import React from "react";
import { TOOTH41_GEOMETRY } from "./tooth41Geometry";

export interface Tooth41EnamelCrownProps {
	stroke?: string | undefined;
	crownOpacity?: string | undefined;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Bilaterally symmetrical chisel enamel crown for Tooth 41 (Mandibular Central Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth41EnamelCrown: React.FC<Tooth41EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	className,
}) => {
	const g = TOOTH41_GEOMETRY;

	return (
		<g id="tooth41-crown" className={className} opacity={crownOpacity}>
			<defs>
				<clipPath id="tooth41-crown-clip">
					<path d={g.crownMonolithPath} />
				</clipPath>
			</defs>
			<path
				d={g.crownMonolithPath}
				fill="url(#dente-enamel-porcelain)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Symmetrical labial grooves and crisp horizontal incisal edge highlight */}
			<g clipPath="url(#tooth41-crown-clip)">
				<path
					d={g.labialGrooveMesial}
					fill="none"
					stroke="rgba(148, 163, 184, 0.30)"
					strokeWidth="0.8"
					strokeLinecap="round"
				/>
				<path
					d={g.labialGrooveDistal}
					fill="none"
					stroke="rgba(148, 163, 184, 0.30)"
					strokeWidth="0.8"
					strokeLinecap="round"
				/>
				<path
					d={g.incisalHighlight}
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)"}
					strokeWidth="0.75"
					strokeLinecap="round"
				/>
			</g>
		</g>
	);
};
