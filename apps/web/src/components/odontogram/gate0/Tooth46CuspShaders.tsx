import type React from "react";

/**
 * DENTE Dental CRM — Authentic Enamel Cusp & Lobe Shaders for Tooth 46
 * Silk-finish enamel translucent gradients for occlusal cusps and buccal lobes.
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CuspShaders: React.FC = () => {
	return (
		<>
			{/* Enamel Cusp Slope Light (Silky Highlight - Light Mode) */}
			<linearGradient id="dente-cusp-slope-light" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
				<stop offset="45%" stopColor="#ffffff" stopOpacity="0.18" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Enamel Cusp Slope Light (Silky Highlight - Dark Mode) */}
			<linearGradient
				id="dente-cusp-slope-light-dark"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
			>
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.26" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.10" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Enamel Cusp Slope Shadow (Occlusal Depth - Light Mode) */}
			<linearGradient id="dente-cusp-slope-shadow" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.0" />
				<stop offset="45%" stopColor="#334155" stopOpacity="0.07" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.20" />
			</linearGradient>

			{/* Enamel Cusp Slope Shadow (Occlusal Depth - Dark Mode) */}
			<linearGradient
				id="dente-cusp-slope-shadow-dark"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
			>
				<stop offset="0%" stopColor="#0f172a" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#0f172a" stopOpacity="0.14" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.35" />
			</linearGradient>

			{/* Buccal Developmental Lobe Silky Light - Light Mode */}
			<linearGradient
				id="dente-buccal-lobe-light"
				x1="0"
				y1="0"
				x2="0.6"
				y2="1"
			>
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
				<stop offset="40%" stopColor="#ffffff" stopOpacity="0.28" />
				<stop offset="75%" stopColor="#ffffff" stopOpacity="0.08" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Developmental Lobe Silky Light - Dark Mode */}
			<linearGradient
				id="dente-buccal-lobe-light-dark"
				x1="0"
				y1="0"
				x2="0.6"
				y2="1"
			>
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
				<stop offset="40%" stopColor="#ffffff" stopOpacity="0.18" />
				<stop offset="75%" stopColor="#ffffff" stopOpacity="0.05" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Developmental Depression Shadow - Light Mode */}
			<linearGradient
				id="dente-buccal-lobe-shadow"
				x1="0"
				y1="0"
				x2="0.8"
				y2="1"
			>
				<stop offset="0%" stopColor="#334155" stopOpacity="0.0" />
				<stop offset="40%" stopColor="#334155" stopOpacity="0.14" />
				<stop offset="75%" stopColor="#334155" stopOpacity="0.06" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Developmental Depression Shadow - Dark Mode */}
			<linearGradient
				id="dente-buccal-lobe-shadow-dark"
				x1="0"
				y1="0"
				x2="0.8"
				y2="1"
			>
				<stop offset="0%" stopColor="#0f172a" stopOpacity="0.0" />
				<stop offset="40%" stopColor="#0f172a" stopOpacity="0.25" />
				<stop offset="75%" stopColor="#0f172a" stopOpacity="0.10" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
			</linearGradient>
		</>
	);
};
