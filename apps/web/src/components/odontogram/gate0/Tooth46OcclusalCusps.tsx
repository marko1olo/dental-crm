import type React from "react";
import { Tooth46SingleCusp } from "./Tooth46SingleCusp";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";

export interface Tooth46OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

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
	const fShadow = isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(71, 85, 105, 0.30)";
	const fCore = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.55)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-dark)"
		: "url(#dente-cervical-ridge)";
	const crStroke = isDark
		? "rgba(255, 255, 255, 0.20)"
		: "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const pitCore = isDark
		? "rgba(255, 255, 255, 0.35)"
		: "rgba(255, 255, 255, 0.65)";
	const fissures = TOOTH46_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");
	const pit = TOOTH46_GEOMETRY.fissures.buccalPit;

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
			{showCusps && (
				<g id="tooth46-cusp-ridges" clipPath="url(#tooth46-crown-clip)">
					{/* Wheeler Ch. 11 Cervical Ridge (Convexity in cervical third above CEJ) */}
					<path
						d={TOOTH46_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH46_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{TOOTH46_GEOMETRY.cusps.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth46-fissures" clipPath="url(#tooth46-crown-clip)">
					<path
						d={fissures}
						fill="none"
						stroke={fShadow}
						strokeWidth="1.0"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={fissures}
						fill="none"
						stroke={fCore}
						strokeWidth="0.5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Anatomical Buccal Pit (Foramen Caecum) at mesiobuccal groove terminus */}
					<circle
						cx={pit.cx}
						cy={pit.cy}
						r={pit.r}
						fill={fShadow}
						stroke={fCore}
						strokeWidth="0.35"
					/>
					<circle cx={pit.cx} cy={pit.cy} r={pit.r * 0.4} fill={pitCore} />
				</g>
			)}
		</g>
	);
};
