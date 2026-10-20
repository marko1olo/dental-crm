import type React from "react";

/**
 * DENTE Dental CRM — Endodontic Shaders for Upper Molar 16 / 26
 * Compliant with Mandate 8b <= 120 lines.
 */
export const Tooth16EndoShaders: React.FC = () => (
	<defs>
		<linearGradient id="dente16-pulp-glow" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
			<stop offset="50%" stopColor="#e11d48" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#be123c" stopOpacity="0.85" />
		</linearGradient>

		<linearGradient id="dente16-canal-vascular" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="#fb7185" stopOpacity="0.85" />
			<stop offset="50%" stopColor="#e11d48" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#9f1239" stopOpacity="0.95" />
		</linearGradient>

		{/* Coral pink Gutta-percha with central core light highlight */}
		<linearGradient id="dente16-guttapercha" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="#fda4af" stopOpacity="1.0" />
			<stop offset="35%" stopColor="#fb7185" stopOpacity="1.0" />
			<stop offset="70%" stopColor="#f43f5e" stopOpacity="1.0" />
			<stop offset="100%" stopColor="#be123c" stopOpacity="0.95" />
		</linearGradient>

		{/* Apical bio-ceramic sealer plug */}
		<radialGradient id="dente16-apical-sealer" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
			<stop offset="60%" stopColor="#cbd5e1" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#64748b" stopOpacity="0.85" />
		</radialGradient>
	</defs>
);
