import React from "react";
import { Tooth15SingleCusp } from "./Tooth15SingleCusp";
import { TOOTH15_GEOMETRY } from "./tooth15GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth15OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Occlusal Cusps & Ridge for Upper Second Premolar Tooth 15.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth15OcclusalCusps: React.FC<Tooth15OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 15;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fissureStroke = isDark
		? "rgba(203, 213, 225, 0.28)"
		: "rgba(148, 163, 184, 0.22)";
	const crFill = `url(#${sid(isDark ? `dente-cervical-ridge-${tNum}-dark` : `dente-cervical-ridge-${tNum}`)})`;
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH15_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id={sid(`tooth${tNum}-crown`)} className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH15_GEOMETRY.crownMonolithPath}
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
						d={TOOTH15_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH15_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{TOOTH15_GEOMETRY.cusps.map((c) => (
						<Tooth15SingleCusp key={c.id} cusp={c} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && fissures.trim() !== "" && (
				<g id={sid(`tooth${tNum}-fissures`)} pointerEvents="none">
					{/* Soft Anatomical Developmental Grooves & Sulci */}
					<path
						d={fissures}
						fill="none"
						stroke={fissureStroke}
						strokeWidth="0.45"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
