import React from "react";
import type { Tooth16CanalAnatomy } from "./tooth16PulpGeometry";

export interface Tooth16SingleCanalProps {
	canal: Tooth16CanalAnatomy;
	showGuttaPercha?: boolean | undefined;
	isNecrotic?: boolean | undefined;
	isPulpitis?: boolean | undefined;
	isDark?: boolean | undefined;
	isUnifiedLumen?: boolean | undefined;
}

/**
 * Single Anatomical Root Canal for Tooth 16 (Upper Molar, apices pointing UP).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth16SingleCanal: React.FC<Tooth16SingleCanalProps> = ({
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
		const apicalPlugD = `M ${ax - 1.0},${ay + 0.8} C ${ax - 1.0},${ay - 0.5} ${ax + 1.0},${ay - 0.5} ${ax + 1.0},${ay + 0.8} Z`;

		return (
			<g id={`tooth16-canal-${canal.id}`} data-testid={`tooth16-canal-${canal.id}`}>
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

	// In unified mode, the lumen is seamlessly drawn by Tooth16PulpChamber
	if (isUnifiedLumen) {
		return (
			<g id={`tooth16-canal-${canal.id}`} data-testid={`tooth16-canal-${canal.id}`}>
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

	const canalFill = isNecrotic
		? "url(#dente-pulp-necrotic)"
		: isPulpitis
			? "url(#dente-pulp-hyperemia)"
			: "url(#dente-pulp-vital)";

	const canalStroke = isNecrotic
		? "rgba(68, 64, 60, 0.85)"
		: isPulpitis
			? "#ef4444"
			: "rgba(159, 18, 57, 0.70)";

	return (
		<g id={`tooth16-canal-${canal.id}`} data-testid={`tooth16-canal-${canal.id}`}>
			<path
				d={canal.taperedLumen}
				fill={canalFill}
				stroke={canalStroke}
				strokeWidth="0.6"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
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
};
