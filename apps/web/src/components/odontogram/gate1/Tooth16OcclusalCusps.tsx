import type React from "react";
import { Tooth16CarabelliCusp } from "./Tooth16CarabelliCusp";
import { Tooth16CristaObliqua } from "./Tooth16CristaObliqua";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16OcclusalCuspsProps {
	showCusps?: boolean;
	showFissures?: boolean;
	showCristaObliqua?: boolean;
	showCarabelli?: boolean;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Occlusal Table, Crista Obliqua & Carabelli Cusp for Tooth 16 / 26
 * Mandate 8b <= 120 lines.
 */
export const Tooth16OcclusalCusps: React.FC<Tooth16OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	showCristaObliqua = true,
	showCarabelli = true,
	isDark = false,
}) => {
	const fissureStroke = isDark
		? "rgba(148, 163, 184, 0.70)"
		: "rgba(51, 65, 85, 0.65)";
	const specularFill = isDark
		? "rgba(255, 255, 255, 0.45)"
		: "rgba(255, 255, 255, 0.85)";

	return (
		<g id="tooth16-occlusal-table-group">
			{/* Central and Distal Triangular Basins */}
			<path
				id="tooth16-central-basin"
				d={TOOTH16_GEOMETRY.centralBasinPath}
				fill={isDark ? "rgba(15, 23, 42, 0.40)" : "rgba(226, 232, 240, 0.50)"}
			/>
			<path
				id="tooth16-distal-basin"
				d={TOOTH16_GEOMETRY.distalBasinPath}
				fill={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(226, 232, 240, 0.45)"}
			/>

			{/* Crista Obliqua & Carabelli Subcomponents */}
			{showCristaObliqua && <Tooth16CristaObliqua isDark={isDark} />}
			{showCarabelli && <Tooth16CarabelliCusp isDark={isDark} />}

			{/* Occlusal Fissures & Pits */}
			{showFissures && (
				<g
					id="tooth16-fissures"
					fill="none"
					stroke={fissureStroke}
					strokeLinecap="round"
				>
					<path
						d={TOOTH16_GEOMETRY.fissures.sulcusCentralis}
						strokeWidth="1.1"
					/>
					<path
						d={TOOTH16_GEOMETRY.fissures.sulcusDistopalatalis}
						strokeWidth="1.0"
					/>
					<path
						d={TOOTH16_GEOMETRY.fissures.sulcusBuccalis}
						strokeWidth="0.8"
					/>
					<circle
						cx={TOOTH16_GEOMETRY.fissures.centralPit.x}
						cy={TOOTH16_GEOMETRY.fissures.centralPit.y}
						r="1.1"
						fill={fissureStroke}
					/>
					<circle
						cx={TOOTH16_GEOMETRY.fissures.distalPit.x}
						cy={TOOTH16_GEOMETRY.fissures.distalPit.y}
						r="0.9"
						fill={fissureStroke}
					/>
				</g>
			)}

			{/* 4 Main Cusps Triangular Ridges & Specular Apices */}
			{showCusps && (
				<g id="tooth16-cusps-group">
					{TOOTH16_GEOMETRY.cusps.map((c) => (
						<g key={c.id} id={`tooth16-cusp-${c.id}`}>
							<path
								d={c.ridgePath}
								stroke={fissureStroke}
								strokeWidth="0.6"
								fill="none"
							/>
							<ellipse
								cx={c.apex.x}
								cy={c.apex.y}
								rx="1.6"
								ry="1.1"
								fill={specularFill}
							/>
						</g>
					))}
				</g>
			)}
		</g>
	);
};
