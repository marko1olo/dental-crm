import React from "react";
import { Tooth18SingleCusp } from "./Tooth18SingleCusp";
import { TOOTH18_GEOMETRY } from "./tooth18GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth18OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Occlusal Cusps & Fissures for Upper Third Molar Tooth 18.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18OcclusalCusps: React.FC<Tooth18OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 18;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(100, 116, 139, 0.28)";
	const fCore = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.55)";
	const crFill = `url(#${sid(isDark ? `dente-cervical-ridge-${tNum}-dark` : `dente-cervical-ridge-${tNum}`)})`;
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH18_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id={sid(`tooth${tNum}-crown`)} className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH18_GEOMETRY.crownMonolithPath}
					fill={`url(#${sid(`dente-enamel-porcelain-${tNum}`)})`}
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id={sid(`tooth${tNum}-cusp-ridges`)} clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}>
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH18_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH18_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{TOOTH18_GEOMETRY.cusps.map((c) => (
						<Tooth18SingleCusp key={c.id} cusp={c} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id={sid(`tooth${tNum}-fissures`)} clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}>
					<path
						d={fissures}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={fissures}
						fill="none"
						stroke={fCore}
						strokeWidth="0.45"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<circle
						cx={TOOTH18_GEOMETRY.fissures.buccalPit.cx}
						cy={TOOTH18_GEOMETRY.fissures.buccalPit.cy}
						r={TOOTH18_GEOMETRY.fissures.buccalPit.r}
						fill={fCore}
						opacity="0.25"
					/>
				</g>
			)}
		</g>
	);
};
