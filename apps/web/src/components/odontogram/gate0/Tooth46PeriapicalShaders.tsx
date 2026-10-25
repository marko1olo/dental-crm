import React from "react";

/**
 * DENTE Dental CRM — Periapical Pathology Shaders for Tooth 46
 * Shaders for Granuloma, Radicular Cyst, and Apical Resorption.
 * Mandate 8b <= 120 lines.
 */
export const Tooth46PeriapicalShaders: React.FC = () => {
	return (
		<>
			{/* Circumscribed Granuloma Core & Fibrous Capsule */}
			<radialGradient id="dente-granuloma-core" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.85" />
				<stop offset="60%" stopColor="#991b1b" stopOpacity="0.65" />
				<stop offset="100%" stopColor="#b91c1c" stopOpacity="0.30" />
			</radialGradient>
			<radialGradient id="dente-granuloma-capsule" cx="50%" cy="50%" r="50%">
				<stop offset="80%" stopColor="#dc2626" stopOpacity="0.10" />
				<stop offset="92%" stopColor="#ef4444" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#b91c1c" stopOpacity="0.0" />
			</radialGradient>

			{/* Radicular Cyst Fluid & Hyperostotic Sclerotic Cortical Rim */}
			<radialGradient id="dente-cyst-fluid" cx="45%" cy="45%" r="55%">
				<stop offset="0%" stopColor="#78350f" stopOpacity="0.90" />
				<stop offset="50%" stopColor="#451a03" stopOpacity="0.85" />
				<stop offset="85%" stopColor="#1c1917" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#09090b" stopOpacity="0.98" />
			</radialGradient>
			<radialGradient id="dente-cyst-cortical" cx="50%" cy="50%" r="50%">
				<stop offset="85%" stopColor="#ffffff" stopOpacity="0.0" />
				<stop offset="92%" stopColor="#f8fafc" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.0" />
			</radialGradient>

			{/* Apical Root Resorption Osteolytic Zone */}
			<radialGradient id="dente-resorption-halo" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#0f172a" stopOpacity="0.75" />
				<stop offset="70%" stopColor="#1e293b" stopOpacity="0.45" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.0" />
			</radialGradient>
		</>
	);
};
