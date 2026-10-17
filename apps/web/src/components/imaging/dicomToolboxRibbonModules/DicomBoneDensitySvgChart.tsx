import React from "react";
import type { BoneDensityProfileStats } from "../rvgViewerEngine.js";

export interface DicomBoneDensitySvgChartProps {
	readonly stats: BoneDensityProfileStats;
}

export const DicomBoneDensitySvgChart: React.FC<DicomBoneDensitySvgChartProps> = ({ stats }) => {
	if (stats.samples.length <= 1) return null;

	const polygonPoints = `0,145 ${stats.samples
		.map((s, idx) => {
			const x = (idx / (stats.samples.length - 1)) * 500;
			const clampedHu = Math.max(-500, Math.min(2500, s.hu));
			const y = 140 - ((clampedHu + 500) / 3000) * 130;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ")} 500,145`;

	const polylinePoints = stats.samples
		.map((s, idx) => {
			const x = (idx / (stats.samples.length - 1)) * 500;
			const clampedHu = Math.max(-500, Math.min(2500, s.hu));
			const y = 140 - ((clampedHu + 500) / 3000) * 130;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<div
			style={{
				height: "140px",
				backgroundColor: "#020617",
				borderRadius: "8px",
				border: "1px solid #1e293b",
				padding: "6px",
				position: "relative",
			}}
		>
			<svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
				<defs>
					<linearGradient id="huGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
						<stop offset="100%" stopColor="#0d9488" stopOpacity="0.05" />
					</linearGradient>
				</defs>
				<line x1="0" y1="35" x2="500" y2="35" stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity="0.4" />
				<text x="4" y="32" fill="#93c5fd" fontSize="9" fontWeight="bold">D1 (&gt;1250 HU)</text>
				<line x1="0" y1="65" x2="500" y2="65" stroke="#10b981" strokeDasharray="3 3" strokeOpacity="0.4" />
				<text x="4" y="62" fill="#6ee7b7" fontSize="9" fontWeight="bold">D2 (850-1250 HU)</text>
				<line x1="0" y1="95" x2="500" y2="95" stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity="0.4" />
				<text x="4" y="92" fill="#fde68a" fontSize="9" fontWeight="bold">D3 (350-850 HU)</text>
				<line x1="0" y1="125" x2="500" y2="125" stroke="#ef4444" strokeDasharray="3 3" strokeOpacity="0.4" />
				<text x="4" y="122" fill="#fca5a5" fontSize="9" fontWeight="bold">D4 (&lt;350 HU)</text>

				<polygon points={polygonPoints} fill="url(#huGradient)" />
				<polyline points={polylinePoints} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
			</svg>
		</div>
	);
};
