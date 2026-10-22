import type React from "react";

/**
 * DENTE Dental CRM — Authentic Clinical Pathology Shaders for Tooth 46
 * Shaders for Abfraction, Post & Core, Calculus, Implant, Missing (Mandate 8b <= 120 lines).
 */
export const Tooth46PathologyShaders: React.FC = () => {
	return (
		<>
			{/* Cervical Abfraction (Sclerotic Dentin Notch) */}
			<linearGradient id="dente-abfraction-dentin" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#f5ebe0" stopOpacity="0.95" />
				<stop offset="50%" stopColor="#d5bdaf" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#b08968" stopOpacity="0.90" />
			</linearGradient>

			{/* Quartz Glass Fiber Post & Core Stump */}
			<linearGradient id="dente-fiber-post" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.90" />
				<stop offset="70%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.85" />
			</linearGradient>
			<linearGradient id="dente-composite-core" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
			</linearGradient>

			{/* Dental Calculus (Supragingival Mineralized Limestone & Subgingival Serumal) */}
			<linearGradient id="dente-calculus-supra" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#dfcca8" stopOpacity="0.98" />
				<stop offset="40%" stopColor="#c8b185" stopOpacity="0.98" />
				<stop offset="80%" stopColor="#b59a6d" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#9e8254" stopOpacity="0.95" />
			</linearGradient>
			<linearGradient id="dente-calculus-sub" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#8c6f44" stopOpacity="0.98" />
				<stop offset="45%" stopColor="#6b4c27" stopOpacity="0.98" />
				<stop offset="80%" stopColor="#4a3319" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#2e1f10" stopOpacity="0.95" />
			</linearGradient>

			{/* Grade-5 Medical Titanium Dental Implant Fixture */}
			<linearGradient id="dente-titanium-body" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#64748b" stopOpacity="1" />
				<stop offset="25%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="50%" stopColor="#f1f5f9" stopOpacity="1" />
				<stop offset="75%" stopColor="#64748b" stopOpacity="1" />
				<stop offset="100%" stopColor="#334155" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-titanium-collar" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2e8f0" stopOpacity="1" />
				<stop offset="50%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-titanium-abutment" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="35%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="70%" stopColor="#cbd5e1" stopOpacity="1" />
				<stop offset="100%" stopColor="#475569" stopOpacity="1" />
			</linearGradient>

			{/* Peri-implant Gingival Cuff / Keratinized Mucosa */}
			<linearGradient id="dente-gingival-cuff" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
				<stop offset="50%" stopColor="#fb7185" stopOpacity="0.14" />
				<stop offset="100%" stopColor="#fda4af" stopOpacity="0.05" />
			</linearGradient>
		</>
	);
};
