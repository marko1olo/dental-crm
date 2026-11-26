import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";
import { TOOTH46_PERIAPICAL_GEOMETRY } from "./Tooth46PeriapicalGeometry";

export interface Tooth46ResorptionOverlayProps {
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Bi-radicular apical root resorption overlay for Tooth 46.
 * Renders blunted, shortened root apices (mesial & distal) with scalloped Howship's lacunae.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46ResorptionOverlay: React.FC<
	Tooth46ResorptionOverlayProps
> = ({ isDark = false, className }) => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const haloFill = `url(#${sid("dente-resorption-halo")})`;
	const { mesial, distal } = TOOTH46_PERIAPICAL_GEOMETRY.resorption;
	const lacunaeStroke = isDark
		? "rgba(248, 113, 113, 0.95)"
		: "rgba(220, 38, 38, 0.90)";
	const craterFill = isDark ? "#0f172a" : "#1e1b18";

	return (
		<g
			id={sid(`tooth${tNum}-apical-resorption`)}
			data-testid="tooth46-resorption"
			className={className}
		>
			{/* Mesial Root Apical Resorption Complex */}
			<g id={sid(`tooth${tNum}-resorption-mesial`)}>
				<path
					d={mesial.resorptionHalo}
					fill={haloFill}
					stroke="none"
				/>
				<path
					d={mesial.bluntedApexCrater}
					fill={craterFill}
					stroke={lacunaeStroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				{mesial.howshipLacunae.map((lacuna) => (
					<path
						key={`m-lacuna-${lacuna.slice(0, 12)}`}
						d={lacuna}
						data-component="resorption-lacuna"
						fill="none"
						stroke={lacunaeStroke}
						strokeWidth="0.65"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				))}
			</g>

			{/* Distal Root Apical Resorption Complex */}
			<g id={sid(`tooth${tNum}-resorption-distal`)}>
				<path
					d={distal.resorptionHalo}
					fill={haloFill}
					stroke="none"
				/>
				<path
					d={distal.bluntedApexCrater}
					fill={craterFill}
					stroke={lacunaeStroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				{distal.howshipLacunae.map((lacuna) => (
					<path
						key={`d-lacuna-${lacuna.slice(0, 12)}`}
						d={lacuna}
						data-component="resorption-lacuna"
						fill="none"
						stroke={lacunaeStroke}
						strokeWidth="0.65"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				))}
			</g>
		</g>
	);
};
