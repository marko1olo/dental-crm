import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import { TOOTH17_GEOMETRY } from "./tooth17GeometryConstants";

export const Tooth17ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth17-crown-clip"><path d={TOOTH17_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id="tooth17-root-clip"><path d={TOOTH17_GEOMETRY.combinedRootsSilhouette} /></clipPath>
			<clipPath id="tooth17-palatal-clip"><path d={TOOTH17_GEOMETRY.palatalRootPath} /></clipPath>

			{/* Saddle Contact Shadow for Higher V-Crotch */}
			<linearGradient id="dente-saddle-shadow-17" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.18" />
				<stop offset="50%" stopColor="#334155" stopOpacity="0.06" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-saddle-shadow-17-dark" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.25" />
				<stop offset="50%" stopColor="#020617" stopOpacity="0.08" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>

			{/* Cast Shadow on Palatal Root from MB Inner Flank */}
			<linearGradient id="dente-mb-cast-shadow-17" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-mb-cast-shadow-17-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.22" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Roots Dentin */}
			<linearGradient id="dente-root-dentin-17" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d2b390" stopOpacity="1" />
				<stop offset="100%" stopColor="#b6946e" stopOpacity="1" />
			</linearGradient>

			{/* Palatal Root Dentin (Deep Lingual Plane) */}
			<linearGradient id="dente-root-palatal-dentin-17" x1="0" y1="0" x2="1" y2="0.35">
				<stop offset="0%" stopColor="#e4d4bf" stopOpacity="1" />
				<stop offset="25%" stopColor="#d5bf9f" stopOpacity="1" />
				<stop offset="60%" stopColor="#c2a580" stopOpacity="1" />
				<stop offset="85%" stopColor="#ac8c63" stopOpacity="1" />
				<stop offset="100%" stopColor="#927147" stopOpacity="1" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id="dente-enamel-porcelain-17" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Zirconia Crown for Upper Second Molar 17 */}
			<linearGradient id="dente-zirconia-ceramic-17" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="20%" stopColor="#f5ebdd" stopOpacity="0.98" />
				<stop offset="60%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>

			{/* Composite Core Build-up */}
			<linearGradient id="dente-core-composite-17" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.98" />
				<stop offset="35%" stopColor="#fde68a" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f59e0b" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#d97706" stopOpacity="0.88" />
			</linearGradient>

			{/* Cervical Ridge Highlights */}
			<linearGradient id="dente-cervical-ridge-17" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-cervical-ridge-17-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-ridge-highlight-17" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
			</linearGradient>

			<ToothAnteriorShaders />
			<Tooth46CuspShaders />
			<Tooth46EndoShaders />
			<Tooth46CariesShaders />
			<Tooth46CrownShaders />
			<Tooth46PeriapicalShaders />
			<Tooth46RestorationShaders />
			<Tooth46PathologyShaders />
		</defs>
	);
};
