import React from "react";

/**
 * DENTE Dental CRM — Authentic Caries Spectrum Shaders for Tooth 46
 * White spot, Acute moist ochre, and Chronic sclerotic ebony shaders (Mandate 8b <= 120 lines).
 */
export const Tooth46CariesShaders: React.FC = () => {
	return (
		<>
			{/* White Spot / Caries in situ Enamel Opalescence */}
			<radialGradient id="dente-caries-white-spot" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="55%" stopColor="#fef3c7" stopOpacity="0.75" />
				<stop offset="85%" stopColor="#fef9c3" stopOpacity="0.30" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</radialGradient>

			{/* Acute Caries (Active / Moist Light Ochre Softened Dentin) */}
			<linearGradient id="dente-caries-acute" x1="0" y1="0" x2="0.3" y2="1">
				<stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
				<stop offset="45%" stopColor="#d97706" stopOpacity="0.95" />
				<stop offset="80%" stopColor="#b45309" stopOpacity="0.90" />
				<stop offset="100%" stopColor="#78350f" stopOpacity="0.90" />
			</linearGradient>

			{/* Chronic Caries (Arrested / Sclerotic Hardened Dark Brown Dentin) */}
			<linearGradient id="dente-caries-chronic" x1="0" y1="0" x2="0.3" y2="1">
				<stop offset="0%" stopColor="#451a03" stopOpacity="1" />
				<stop offset="50%" stopColor="#291307" stopOpacity="1" />
				<stop offset="85%" stopColor="#1c1917" stopOpacity="1" />
				<stop offset="100%" stopColor="#0c0a09" stopOpacity="1" />
			</linearGradient>

			{/* Ceramic Inlay / Onlay Aesthetic Shaders */}
			<linearGradient id="dente-inlay-ceramic" x1="0" y1="0" x2="0.8" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="40%" stopColor="#f8fafc" stopOpacity="0.95" />
				<stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.90" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.88" />
			</linearGradient>

			<linearGradient id="dente-onlay-ceramic" x1="0" y1="0" x2="0.5" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="35%" stopColor="#f1f5f9" stopOpacity="0.98" />
				<stop offset="75%" stopColor="#e2e8f0" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.90" />
			</linearGradient>
		</>
	);
};
