import React from "react";
import { TOOTH46_INLAY_ONLAY_GEOMETRY } from "./Tooth46InlayOnlayGeometry";
import type { InlayOnlayType } from "./tooth46PresetTypes";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";

export interface Tooth46InlayOnlayOverlayProps {
	type?: InlayOnlayType | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
	toothNumber?: number | undefined;
}

/**
 * Precision Bonded Ceramic Inlay / Onlay / Overlay for Tooth 46
 * Mandate 8b <= 120 lines.
 */
export const Tooth46InlayOnlayOverlay: React.FC<
	Tooth46InlayOnlayOverlayProps
> = ({ type = "inlay", isDark = false, className, toothNumber }) => {
	const tNum = useToothNumber(toothNumber) ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const onlayFill = `url(#${sid("dente-onlay-ceramic")})`;
	const g = TOOTH46_INLAY_ONLAY_GEOMETRY;
	const stroke = isDark
		? "rgba(226, 232, 240, 0.75)"
		: "rgba(100, 116, 139, 0.55)";
	const marginStroke = isDark
		? "rgba(251, 191, 36, 0.85)"
		: "rgba(180, 83, 9, 0.70)";

	return (
		<g
			id={sid(`tooth${tNum}-inlay-onlay-overlay`)}
			data-restoration-type={type}
			className={className}
			clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}
		>
			{type === "inlay" && (
				<g id={sid(`tooth${tNum}-ceramic-inlay`)}>
					<path
						d={g.inlay.shell}
						fill={`url(#${sid("dente-inlay-ceramic")})`}
						stroke={stroke}
						strokeWidth="0.6"
					/>
					<path
						d={g.inlay.glaze}
						fill="none"
						stroke="#ffffff"
						strokeWidth="0.5"
						strokeOpacity="0.80"
						strokeLinecap="round"
					/>
				</g>
			)}

			{type === "onlay" && (
				<g id={sid(`tooth${tNum}-ceramic-onlay`)}>
					<path
						d={g.onlay.shell}
						fill={onlayFill}
						stroke={stroke}
						strokeWidth="0.7"
					/>
					<path
						d={g.onlay.bevelMargin}
						fill="none"
						stroke={marginStroke}
						strokeWidth="0.6"
						strokeDasharray="1.5 1.0"
					/>
					<path
						d={g.onlay.glaze}
						fill="none"
						stroke="#ffffff"
						strokeWidth="0.6"
						strokeOpacity="0.85"
						strokeLinecap="round"
					/>
				</g>
			)}

			{type === "overlay" && (
				<g id={sid(`tooth${tNum}-ceramic-overlay`)}>
					<path
						d={g.overlay.shell}
						fill={onlayFill}
						stroke={stroke}
						strokeWidth="0.75"
					/>
					<path
						d={g.overlay.chamferMargin}
						fill="none"
						stroke={marginStroke}
						strokeWidth="0.7"
						strokeDasharray="2.0 1.0"
					/>
					<path
						d={g.overlay.glaze}
						fill="none"
						stroke="#ffffff"
						strokeWidth="0.6"
						strokeOpacity="0.85"
						strokeLinecap="round"
					/>
				</g>
			)}
		</g>
	);
};
