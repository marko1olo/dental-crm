import React from "react";
import type { Tooth11CanalAnatomy } from "./tooth11PulpGeometry";

export interface Tooth11SingleCanalProps {
	canal: Tooth11CanalAnatomy;
	showGuttaPercha?: boolean | undefined;
	isNecrotic?: boolean | undefined;
	isPulpitis?: boolean | undefined;
	isDark?: boolean | undefined;
	isUnifiedLumen?: boolean | undefined;
}

/**
 * Single Straight Root Canal for Tooth 11 (Upper Central Incisor).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11SingleCanal: React.FC<Tooth11SingleCanalProps> = ({
	canal,
	showGuttaPercha = false,
	isNecrotic = false,
	isPulpitis = false,
	isDark = false,
	isUnifiedLumen = false,
}) => {
	const ax = canal.apex.x;
	const ay = canal.apex.y;

	if (showGuttaPercha) {
		const apicalPlugD = `M ${ax - 1.2},${ay + 0.8} C ${ax - 1.2},${ay - 0.5} ${ax + 1.2},${ay - 0.5} ${ax + 1.2},${ay + 0.8} Z`;

		return (
			<g id={`tooth11-canal-${canal.id}`} data-testid={`tooth11-canal-${canal.id}`}>
				<path
					d={canal.taperedLumen}
					fill="url(#dente-guttapercha-cone)"
					stroke="url(#dente-guttapercha-sheath)"
					strokeWidth="0.75"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={canal.centerLine}
					fill="none"
					stroke="#ffffff"
					strokeWidth="0.60"
					strokeOpacity="0.90"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={apicalPlugD}
					fill="#be123c"
					stroke="#881337"
					strokeWidth="0.5"
					vectorEffect="non-scaling-stroke"
				/>
			</g>
		);
	}

	if (isUnifiedLumen) {
		return (
			<g id={`tooth11-canal-${canal.id}`} data-testid={`tooth11-canal-${canal.id}`}>
				<path
					d={canal.centerLine}
					fill="none"
					stroke={isNecrotic ? "#78716c" : "#fecdd3"}
					strokeWidth="0.50"
					strokeOpacity="0.80"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			</g>
		);
	}

	const cFill = isNecrotic
		? "url(#dente-pulp-necrotic)"
		: isPulpitis
			? "url(#dente-pulp-hyperemia)"
			: "url(#dente-pulp-vital)";

	const cStroke = isNecrotic
		? "rgba(68, 64, 60, 0.85)"
		: isPulpitis
			? "#ef4444"
			: "rgba(159, 18, 57, 0.70)";

	return (
		<g id={`tooth11-canal-${canal.id}`} data-testid={`tooth11-canal-${canal.id}`}>
			<path
				d={canal.taperedLumen}
				fill={cFill}
				stroke={cStroke}
				strokeWidth="0.75"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={canal.centerLine}
				fill="none"
				stroke={isNecrotic ? "#78716c" : isDark ? "#fda4af" : "#f43f5e"}
				strokeWidth="0.55"
				strokeOpacity="0.85"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
