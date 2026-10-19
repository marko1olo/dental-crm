import type React from "react";
import { DENTE_SHADER_IDS } from "./shaderConstants";

/**
 * Multi-stop porcelain enamel monolith, cylindrical root dentin,
 * longitudinal sulcus shadow, and anatomical furcation/fossa shadows.
 * Mandate 8b <= 120 lines.
 */
export const ToothShaderDefs: React.FC = () => {
	const s = DENTE_SHADER_IDS;
	return (
		<>
			{/* Porcelain Enamel with Lateral Ceramic Volume */}
			<linearGradient id={s.enamelPorcelain} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Cylindrical Root Dentin Volume (Lit from Left) */}
			<linearGradient id={s.rootDentin} x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d6bc9f" stopOpacity="1" />
				<stop offset="100%" stopColor="#c5a987" stopOpacity="1" />
			</linearGradient>

			{/* Mesial Root Sulcus Longitudinalis 3D Shadow Trough */}
			<linearGradient id={s.rootSulcusShadow} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#94a3b8" stopOpacity="0.10" />
				<stop offset="50%" stopColor="#475569" stopOpacity="0.35" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
			</linearGradient>

			{/* Smooth Anatomical Bifurcation Ambient Shadow */}
			<radialGradient id={s.furcationShadow} cx="50%" cy="30%" r="55%">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#475569" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="0" />
			</radialGradient>

			{/* Central Fossa Ambient Depth (3D Dished Occlusal Basin) */}
			<radialGradient id={s.fossaShadow} cx="50%" cy="30%" r="45%">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.35" />
				<stop offset="50%" stopColor="#64748b" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
			</radialGradient>

			{/* Buccal Cervical Ridge Convexity Highlight */}
			<linearGradient id={s.cervicalRidge} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>

			{/* Triangular Ridge Directional Specular Sheen */}
			<linearGradient id={s.ridgeHighlight} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="50%" stopColor="#f8fafc" stopOpacity="0.60" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.10" />
			</linearGradient>
		</>
	);
};
