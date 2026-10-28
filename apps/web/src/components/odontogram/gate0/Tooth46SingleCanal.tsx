import React from "react";
import type { Tooth46CanalAnatomy } from "./Tooth46PulpGeometry";

export interface Tooth46SingleCanalProps {
	canal: Tooth46CanalAnatomy;
	showGuttaPercha: boolean;
	isNecrotic: boolean;
	isUnderfill: boolean;
	underfillData?: { lumen: string; emptyLumen: string } | undefined;
	isUnifiedLumen?: boolean | undefined;
}

export const Tooth46SingleCanal: React.FC<Tooth46SingleCanalProps> = ({
	canal,
	showGuttaPercha,
	isNecrotic,
	isUnderfill,
	underfillData,
	isUnifiedLumen = false,
}) => {
	const lumenD =
		isUnderfill && underfillData ? underfillData.lumen : canal.taperedLumen;

	if (showGuttaPercha) {
		const ax = canal.apex.x;
		const ay = canal.apex.y;
		// Apical seal dome stops strictly 0.2-0.5mm inside the physiological apical constriction
		const apicalPlugD = `M ${ax - 0.8},${ay - 1.2} C ${ax - 0.8},${ay - 0.2} ${ax + 0.8},${ay - 0.2} ${ax + 0.8},${ay - 1.2} Z`;

		return (
			<g id={`canal-${canal.id}`}>
				<path
					d={lumenD}
					fill="url(#dente-guttapercha-cone)"
					stroke="url(#dente-guttapercha-sheath)"
					strokeWidth="0.75"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				{/* Soft internal thermoplastic specular reflection (never piercing apex) */}
				<path
					d={canal.centerLine}
					fill="none"
					stroke="rgba(254, 205, 211, 0.35)"
					strokeWidth="0.40"
					strokeLinecap="butt"
					vectorEffect="non-scaling-stroke"
				/>
				{isUnderfill && underfillData ? (
					<path
						d={underfillData.emptyLumen}
						fill="#1c1917"
						stroke="#0c0a09"
						strokeWidth="0.5"
						strokeLinejoin="round"
					/>
				) : (
					<path
						d={apicalPlugD}
						fill="#be123c"
						stroke="#881337"
						strokeWidth="0.3"
					/>
				)}
			</g>
		);
	}

	return (
		<g id={`canal-${canal.id}`}>
			{!isUnifiedLumen && (
				<path
					d={canal.taperedLumen}
					fill={
						isNecrotic ? "url(#dente-pulp-necrotic)" : "url(#dente-pulp-vital)"
					}
					stroke={
						isNecrotic ? "rgba(87, 83, 78, 0.70)" : "rgba(153, 27, 27, 0.60)"
					}
					strokeWidth="0.6"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			<path
				d={canal.centerLine}
				fill="none"
				stroke={
					isNecrotic ? "rgba(120, 113, 108, 0.50)" : "rgba(254, 202, 202, 0.70)"
				}
				strokeWidth="0.45"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
