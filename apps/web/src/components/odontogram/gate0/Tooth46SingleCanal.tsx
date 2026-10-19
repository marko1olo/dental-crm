import type React from "react";
import type { Tooth46CanalAnatomy } from "./Tooth46PulpGeometry";

export interface Tooth46SingleCanalProps {
	canal: Tooth46CanalAnatomy;
	showGuttaPercha: boolean;
	isNecrotic: boolean;
	isUnderfill: boolean;
	underfillData?: { lumen: string; emptyLumen: string } | undefined;
}

export const Tooth46SingleCanal: React.FC<Tooth46SingleCanalProps> = ({
	canal,
	showGuttaPercha,
	isNecrotic,
	isUnderfill,
	underfillData,
}) => {
	const lumenD =
		isUnderfill && underfillData ? underfillData.lumen : canal.taperedLumen;

	if (showGuttaPercha) {
		return (
			<g id={`canal-${canal.id}`}>
				<path
					d={lumenD}
					fill="url(#dente-guttapercha-cone)"
					stroke="url(#dente-guttapercha-sheath)"
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={canal.centerLine}
					fill="none"
					stroke="#ffffff"
					strokeWidth="0.7"
					strokeOpacity="0.9"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				{isUnderfill && underfillData ? (
					<path
						d={underfillData.emptyLumen}
						fill="#1e1b18"
						stroke="#09090b"
						strokeWidth="0.4"
					/>
				) : (
					<circle cx={canal.apex.x} cy={canal.apex.y} r="1.1" fill="#be123c" />
				)}
			</g>
		);
	}

	return (
		<g id={`canal-${canal.id}`}>
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
			<path
				d={canal.centerLine}
				fill="none"
				stroke={
					isNecrotic ? "rgba(120, 113, 108, 0.50)" : "rgba(254, 202, 202, 0.70)"
				}
				strokeWidth="0.4"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
