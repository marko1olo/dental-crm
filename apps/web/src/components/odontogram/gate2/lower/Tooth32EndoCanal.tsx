import type React from "react";
import { DENTE_SHADER_IDS } from "../../shared/defs/shaderConstants";
import { TOOTH32_GEOMETRY } from "./tooth32GeometryConstants";
import type { VertucciCanalType } from "./toothLowerTypes";

export interface Tooth32EndoCanalProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	vertucciType?: VertucciCanalType | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Tooth 32 / 42 Endodontic Canals Component
 * Lateral incisor pulp chamber with Vertucci Type II/III uniting canal system.
 * Mandate 8b <= 120 lines.
 */
export const Tooth32EndoCanal: React.FC<Tooth32EndoCanalProps> = ({
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
		<g id="tooth32-endo-group" className={className}>
			{/* Lateral Incisor Pulp Chamber */}
			{showPulp && (
				<g id="tooth32-pulp-chamber-group">
					<path
						id="tooth32-pulp-chamber"
						d={TOOTH32_GEOMETRY.pulpChamberPath}
						fill={`url(#${s.pulpVital})`}
						opacity="0.85"
					/>
					<circle cx={TOOTH32_GEOMETRY.pulpHornMesial.x} cy={TOOTH32_GEOMETRY.pulpHornMesial.y} r="0.9" fill="#ef4444" />
					<circle cx={TOOTH32_GEOMETRY.pulpHornDistal.x} cy={TOOTH32_GEOMETRY.pulpHornDistal.y} r="0.9" fill="#ef4444" />
				</g>
			)}

			{/* Root Canals: Vertucci Type I Ribbon vs Vertucci Type II/III Dual Branch */}
			{showCanals && (
				<g id="tooth32-root-canals">
					{isVertucciType1 ? (
						<path
							id="tooth32-canal-ribbon"
							d={TOOTH32_GEOMETRY.canalRibbonPath}
							stroke={canalStroke}
							strokeWidth="1.8"
							strokeLinecap="round"
							fill="none"
						/>
					) : (
						<>
							{/* Buccal Canal Branch */}
							<path
								id="tooth32-canal-buccal"
								d={TOOTH32_GEOMETRY.canalBuccalPath}
								stroke={sheathStroke}
								strokeWidth="1.2"
								strokeLinecap="round"
								fill="none"
							/>
							{/* Lingual Canal Branch */}
							<path
								id="tooth32-canal-lingual"
								d={TOOTH32_GEOMETRY.canalLingualPath}
								stroke={canalStroke}
								strokeWidth="1.2"
								strokeLinecap="round"
								fill="none"
							/>
							{/* Common United Apical Segment */}
							<path
								id="tooth32-canal-common-apex"
								d={TOOTH32_GEOMETRY.canalCommonApexPath}
								stroke={canalStroke}
								strokeWidth="1.5"
								strokeLinecap="round"
								fill="none"
							/>
						</>
					)}

					{/* Apical Foramen Dot with distal tilt */}
					<circle
						id="tooth32-apical-foramen"
						cx={TOOTH32_GEOMETRY.apicalForamen.x}
						cy={TOOTH32_GEOMETRY.apicalForamen.y}
						r="0.8"
						fill={showGuttaPercha ? "#ea580c" : "#dc2626"}
					/>
				</g>
			)}
		</g>
	);
};
