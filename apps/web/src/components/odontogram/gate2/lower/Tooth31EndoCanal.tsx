import type React from "react";
import { DENTE_SHADER_IDS } from "../../shared/defs/shaderConstants";
import { TOOTH31_GEOMETRY } from "./tooth31GeometryConstants";
import type { VertucciCanalType } from "./toothLowerTypes";

export interface Tooth31EndoCanalProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	vertucciType?: VertucciCanalType | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Tooth 31 / 41 Endodontic Canals Component
 * Wheeler's Ch. 9 ribbon canal or 2 canals uniting at apex (Vertucci Type II/III).
 * Mandate 8b <= 120 lines.
 */
export const Tooth31EndoCanal: React.FC<Tooth31EndoCanalProps> = ({
	showPulp = false,
	showCanals = false,
	showGuttaPercha = false,
	vertucciType = "II",
	className,
}) => {
	const s = DENTE_SHADER_IDS;
	const isVertucciType1 = vertucciType === "I";
	const canalStroke = showGuttaPercha
		? `url(#${s.guttaperchaCone})`
		: `url(#${s.pulpVital})`;
	const sheathStroke = showGuttaPercha
		? `url(#${s.guttaperchaSheath})`
		: "rgba(220, 38, 38, 0.35)";

	return (
		<g id="tooth31-endo-group" className={className}>
			{/* Chisel Pulp Chamber in Crown */}
			{showPulp && (
				<g id="tooth31-pulp-chamber-group">
					<path
						id="tooth31-pulp-chamber"
						d={TOOTH31_GEOMETRY.pulpChamberPath}
						fill={`url(#${s.pulpVital})`}
						opacity="0.85"
					/>
					<circle cx={TOOTH31_GEOMETRY.pulpHornMesial.x} cy={TOOTH31_GEOMETRY.pulpHornMesial.y} r="0.9" fill="#ef4444" />
					<circle cx={TOOTH31_GEOMETRY.pulpHornDistal.x} cy={TOOTH31_GEOMETRY.pulpHornDistal.y} r="0.9" fill="#ef4444" />
				</g>
			)}

			{/* Root Canals: Vertucci Type I Ribbon vs Vertucci Type II/III Dual Branch */}
			{showCanals && (
				<g id="tooth31-root-canals">
					{isVertucciType1 ? (
						<path
							id="tooth31-canal-ribbon"
							d={TOOTH31_GEOMETRY.canalRibbonPath}
							stroke={canalStroke}
							strokeWidth="1.8"
							strokeLinecap="round"
							fill="none"
						/>
					) : (
						<>
							{/* Buccal Canal Branch */}
							<path
								id="tooth31-canal-buccal"
								d={TOOTH31_GEOMETRY.canalBuccalPath}
								stroke={sheathStroke}
								strokeWidth="1.2"
								strokeLinecap="round"
								fill="none"
							/>
							{/* Lingual Canal Branch */}
							<path
								id="tooth31-canal-lingual"
								d={TOOTH31_GEOMETRY.canalLingualPath}
								stroke={canalStroke}
								strokeWidth="1.2"
								strokeLinecap="round"
								fill="none"
							/>
							{/* Common United Apical Segment (Type II/III union) */}
							<path
								id="tooth31-canal-common-apex"
								d={TOOTH31_GEOMETRY.canalCommonApexPath}
								stroke={canalStroke}
								strokeWidth="1.5"
								strokeLinecap="round"
								fill="none"
							/>
						</>
					)}

					{/* Apical Foramen Dot */}
					<circle
						id="tooth31-apical-foramen"
						cx={TOOTH31_GEOMETRY.apicalForamen.x}
						cy={TOOTH31_GEOMETRY.apicalForamen.y}
						r="0.8"
						fill={showGuttaPercha ? "#ea580c" : "#dc2626"}
					/>
				</g>
			)}
		</g>
	);
};
