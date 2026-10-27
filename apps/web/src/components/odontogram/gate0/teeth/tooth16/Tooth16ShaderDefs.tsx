import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export const Tooth16ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth16-crown-clip"><path d={TOOTH16_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id="tooth16-root-clip"><path d={TOOTH16_GEOMETRY.combinedRootsSilhouette} /></clipPath>
			<clipPath id="tooth16-palatal-clip"><path d={TOOTH16_GEOMETRY.palatalRootPath} /></clipPath>

			{/* Saddle Contact Shadow */}
			<linearGradient id="dente-saddle-shadow" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#1e293b" stopOpacity="0.40" />
				<stop offset="45%" stopColor="#334155" stopOpacity="0.16" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-saddle-shadow-dark" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.75" />
				<stop offset="50%" stopColor="#020617" stopOpacity="0.30" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-trifurcation-shadow-16" href="#dente-saddle-shadow" />
			<linearGradient id="dente-trifurcation-shadow-16-dark" href="#dente-saddle-shadow-dark" />

			{/* Cast Shadow on Palatal Root from MB Inner Flank */}
			<linearGradient id="dente-mb-cast-shadow" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#1e293b" stopOpacity="0.32" />
				<stop offset="100%" stopColor="#1e293b" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-mb-cast-shadow-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.55" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Roots Dentin (Lit from Top-Left) */}
			<linearGradient id="dente-root-dentin-16" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d2b390" stopOpacity="1" />
				<stop offset="100%" stopColor="#b6946e" stopOpacity="1" />
			</linearGradient>

			{/* Palatal Root Dentin (Deep Lingual Plane, Recessed Caramel Tone) */}
			<linearGradient id="dente-root-palatal-dentin-16" x1="0" y1="0" x2="1" y2="0.35">
				<stop offset="0%" stopColor="#e4d4bf" stopOpacity="1" />
				<stop offset="25%" stopColor="#d5bf9f" stopOpacity="1" />
				<stop offset="60%" stopColor="#c2a580" stopOpacity="1" />
				<stop offset="85%" stopColor="#ac8c63" stopOpacity="1" />
				<stop offset="100%" stopColor="#927147" stopOpacity="1" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id="dente-enamel-porcelain-16" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Zirconia Crown for Upper Molar 16 (Katana ML / e.max aesthetic porcelain) */}
			<linearGradient id="dente-zirconia-ceramic-16" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="20%" stopColor="#f5ebdd" stopOpacity="0.98" />
				<stop offset="60%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>

			{/* Composite Core Build-up (Natural dentin shade A2) */}
			<linearGradient id="dente-core-composite-16" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#fde68a" stopOpacity="0.90" />
			</linearGradient>

			{/* Cervical Ridge Highlights */}
			<linearGradient id="dente-cervical-ridge-16" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-cervical-ridge-16-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-ridge-highlight-16" x1="0" y1="0" x2="0" y2="1">
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
