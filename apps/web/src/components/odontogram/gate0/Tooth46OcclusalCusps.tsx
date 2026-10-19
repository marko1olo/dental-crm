import type React from "react";
import {
	TOOTH46_GEOMETRY,
	type Tooth46CuspDef,
} from "./tooth46GeometryConstants";

export interface Tooth46OcclusalCuspsProps {
	showCusps?: boolean;
	showFissures?: boolean;
	renderBaseCrown?: boolean;
	isDark?: boolean;
	className?: string;
}

const renderCusp = (c: Tooth46CuspDef, isDark: boolean) => {
	const lf = isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.30)";
	const sf = isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(51, 65, 85, 0.10)";
	const rs = isDark ? "rgba(241, 245, 249, 0.75)" : "rgba(255, 255, 255, 0.85)";

	return (
		<g key={c.id} id={`cusp-${c.id}`}>
			{c.buccalMesialSlope && <path d={c.buccalMesialSlope} fill={lf} />}
			{c.buccalDistalSlope && <path d={c.buccalDistalSlope} fill={sf} />}
			{c.buccalRidgePath && (
				<path
					d={c.buccalRidgePath}
					fill="none"
					stroke={rs}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			<path d={c.mesialSlope} fill={lf} />
			<path d={c.distalSlope} fill={sf} />
			<path
				d={c.ridgePath}
				fill="none"
				stroke={rs}
				strokeWidth="0.9"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};

export const Tooth46OcclusalCusps: React.FC<Tooth46OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(51, 65, 85, 0.60)";
	const fCore = isDark
		? "rgba(203, 213, 225, 0.85)"
		: "rgba(71, 85, 105, 0.80)";
	const f = TOOTH46_GEOMETRY.fissures;
	const fissures = [
		f.sulcusCentralis,
		f.sulcusMesiobuccalis,
		f.sulcusDistobuccalis,
		f.sulcusLingualis,
	];

	return (
		<g id="tooth46-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH46_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			<path
				d={TOOTH46_GEOMETRY.buccalCervicalRidge}
				fill="url(#dente-cervical-ridge)"
				opacity="0.35"
				clipPath="url(#tooth46-crown-clip)"
				pointerEvents="none"
			/>
			{showCusps && (
				<g id="tooth46-cusp-ridges" clipPath="url(#tooth46-crown-clip)">
					{TOOTH46_GEOMETRY.cusps.map((c) => renderCusp(c, isDark))}
				</g>
			)}
			{showFissures && (
				<g id="tooth46-fissures" clipPath="url(#tooth46-crown-clip)">
					<path
						d={fissures.join(" ")}
						fill="none"
						stroke={fShadow}
						strokeWidth="1.3"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={fissures.join(" ")}
						fill="none"
						stroke={fCore}
						strokeWidth="0.6"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
