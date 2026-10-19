import type React from "react";

/**
 * DENTE Dental CRM — Pathology Shaders for Upper Molars 16 / 26
 * Post & Core fiberglass gradient, calculus mineral gradient.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16PathologyShaders: React.FC = () => (
	<defs>
		{/* Fiberglass translucent post pin */}
		<linearGradient id="dente16-fiber-post" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0%" stopColor="#bae6fd" stopOpacity="0.85" />
			<stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
			<stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.85" />
		</linearGradient>

		{/* Composite Core Stump build-up */}
		<linearGradient id="dente16-core-stump" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
			<stop offset="50%" stopColor="#fde68a" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85" />
		</linearGradient>

		{/* Mineralized Dental Calculus */}
		<linearGradient id="dente16-calculus-mineral" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stopColor="#78350f" stopOpacity="0.90" />
			<stop offset="40%" stopColor="#b45309" stopOpacity="0.95" />
			<stop offset="80%" stopColor="#d97706" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#fef08a" stopOpacity="0.85" />
		</linearGradient>
	</defs>
);
