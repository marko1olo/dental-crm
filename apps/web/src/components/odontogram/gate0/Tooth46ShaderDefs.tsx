import React from "react";
import { ToothAnteriorShaders } from "./ToothAnteriorShaders";
import { Tooth46CariesShaders } from "./Tooth46CariesShaders";
import { Tooth46CrownShaders } from "./Tooth46CrownShaders";
import { Tooth46CuspShaders } from "./Tooth46CuspShaders";
import { Tooth46EndoShaders } from "./Tooth46EndoShaders";
import { Tooth46PathologyShaders } from "./Tooth46PathologyShaders";
import { Tooth46PeriapicalShaders } from "./Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "./Tooth46RestorationShaders";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";

export const Tooth46ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth46-crown-clip">
				<path d={TOOTH46_GEOMETRY.crownMonolithPath} />
			</clipPath>
			<clipPath id="tooth46-root-clip">
				<path d={TOOTH46_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Smooth Anatomical Bifurcation Ambient Shadow */}
			<radialGradient id="dente-furcation-shadow" cx="50%" cy="30%" r="55%">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#475569" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="0" />
			</radialGradient>

			{/* Porcelain Enamel with Lateral Ceramic Volume */}
			<linearGradient id="dente-enamel-porcelain" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Cylindrical Root Dentin Volume (Lit from Left) */}
			<linearGradient id="dente-root-dentin" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d6bc9f" stopOpacity="1" />
				<stop offset="100%" stopColor="#c5a987" stopOpacity="1" />
			</linearGradient>

			{/* Mesial Root Sulcus Longitudinalis 3D Soft Ambient Shadow Trough */}
			<linearGradient id="dente-root-sulcus-shadow" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#8c6b46" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#735230" stopOpacity="0.22" />
				<stop offset="100%" stopColor="#8c6b46" stopOpacity="0.0" />
			</linearGradient>

			{/* Dark Mode Root Sulcus Trough */}
			<linearGradient
				id="dente-root-sulcus-shadow-dark"
				x1="0"
				y1="0"
				x2="1"
				y2="0"
			>
				<stop offset="0%" stopColor="#0f172a" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#020617" stopOpacity="0.38" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
			</linearGradient>

			{/* Central Fossa Ambient Depth (Linear Directed Depth) */}
			<linearGradient id="dente-fossa-shadow" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.30" />
				<stop offset="60%" stopColor="#475569" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Cervical Ridge Convexity Highlight */}
			<linearGradient id="dente-cervical-ridge" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>

			{/* Buccal Cervical Ridge Convexity Highlight - Dark Mode */}
			<linearGradient
				id="dente-cervical-ridge-dark"
				x1="0"
				y1="0"
				x2="0"
				y2="1"
			>
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
				<stop offset="60%" stopColor="#94a3b8" stopOpacity="0.12" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
			</linearGradient>

			{/* Triangular Ridge Directional Specular Sheen */}
			<linearGradient id="dente-ridge-highlight" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.90" />
				<stop offset="40%" stopColor="#f8fafc" stopOpacity="0.55" />
				<stop offset="75%" stopColor="#cbd5e1" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.0" />
			</linearGradient>

			{/* Modular Domain Shaders */}
			<ToothAnteriorShaders />
			<Tooth46CuspShaders />
			<Tooth46CariesShaders />
			<Tooth46EndoShaders />
			<Tooth46CrownShaders />
			<Tooth46RestorationShaders />
			<Tooth46PathologyShaders />
			<Tooth46PeriapicalShaders />
		</defs>
	);
};
