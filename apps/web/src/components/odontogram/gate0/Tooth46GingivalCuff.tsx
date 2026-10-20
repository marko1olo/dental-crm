import type React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";
import type { ImplantStage } from "./tooth46Types";

export interface Tooth46GingivalCuffProps {
	stage?: ImplantStage;
	isDark?: boolean;
	className?: string;
}

/**
 * DENTE Dental CRM — Authentic Peri-implant Gingival Cuff (Mandate 8b <= 120 lines).
 * Marginal gingiva zenith (Y=65..67) & interdental papillae (Y=60..62).
 */
export const Tooth46GingivalCuff: React.FC<Tooth46GingivalCuffProps> = ({
	stage = "pure",
	isDark = false,
	className,
}) => {
	const cuff = TOOTH46_PATHOLOGY_GEOMETRY.implant.gingivalCuff;
	if (!cuff) return null;

	const strokeColor = isDark
		? "rgba(251, 113, 133, 0.60)"
		: "rgba(225, 29, 72, 0.45)";
	const shadowStroke = isDark
		? "rgba(244, 63, 94, 0.40)"
		: "rgba(190, 18, 60, 0.30)";

	return (
		<g
			id="tooth46-gingival-cuff"
			data-component="implant-gingival-cuff"
			className={className}
		>
			<path d={cuff.band} fill="url(#dente-gingival-cuff)" stroke="none" />
			<path
				d={cuff.margin}
				fill="none"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={cuff.sulcusShadow}
				fill="none"
				stroke={shadowStroke}
				strokeWidth="0.6"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
			{stage === "pure" && cuff.suture && (
				<path
					d={cuff.suture}
					fill="none"
					stroke={isDark ? "#38bdf8" : "#0284c7"}
					strokeWidth="0.75"
					strokeDasharray="1.5 1.5"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
