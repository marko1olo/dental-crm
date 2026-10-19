import type React from "react";

/**
 * DENTE Dental CRM — Nanohybrid Light-Cure Composite Shader A2/A3 for Tooth 16 / 26
 * Compliant with Mandate 8b <= 120 lines.
 */
export const Tooth16RestorationShaders: React.FC = () => (
	<defs>
		<linearGradient id="dente16-composite-a2" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
			<stop offset="35%" stopColor="#f8fafc" stopOpacity="0.95" />
			<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#ede8e1" stopOpacity="0.88" />
		</linearGradient>

		<radialGradient id="dente16-composite-highlight" cx="40%" cy="30%" r="50%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
			<stop offset="60%" stopColor="#f8fafc" stopOpacity="0.30" />
			<stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.0" />
		</radialGradient>
	</defs>
);
