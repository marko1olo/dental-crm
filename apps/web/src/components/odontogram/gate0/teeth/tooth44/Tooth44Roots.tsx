import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";

export interface Tooth44RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Single Conical Root for Mandibular First Premolar 44
 * Wheeler Ch. 11 — 1 tapered conical root with longitudinal depression groove
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth44Roots: React.FC<Tooth44RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 44;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			<clipPath id={sid(`tooth${tNum}-root-clip`)}>
				<path d={TOOTH44_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Single Conical Root Mass */}
			<path
				d={TOOTH44_GEOMETRY.rootMonolithPath}
				fill={`url(#${sid("dente-root-dentin")})`}
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Cylindrical Volume Shading & Highlights (Pure shader depth, zero artificial white strokes) */}
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={TOOTH44_GEOMETRY.rootMonolithPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{showCej && (
				<path
					d={TOOTH44_GEOMETRY.cejCurve}
					fill="none"
					stroke={strokeColor}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
