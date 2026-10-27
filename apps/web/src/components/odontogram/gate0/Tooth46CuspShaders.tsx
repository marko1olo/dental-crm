import React from "react";

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
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
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
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Enamel Cusp Slope Shadow (Soft Natural Depth - Light Mode) */}
			<linearGradient id="dente-cusp-slope-shadow" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#475569" stopOpacity="0.03" />
				<stop offset="100%" stopColor="#475569" stopOpacity="0.07" />
			</linearGradient>

			{/* Enamel Cusp Slope Shadow (Soft Natural Depth - Dark Mode) */}
			<linearGradient
				id="dente-cusp-slope-shadow-dark"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
			>
				<stop offset="0%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#020617" stopOpacity="0.04" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.10" />
			</linearGradient>

			{/* Buccal Developmental Lobe Silky Light - Light Mode */}
			<linearGradient
				id="dente-buccal-lobe-light"
				x1="0"
				y1="0"
				x2="0.6"
				y2="1"
			>
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
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
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Developmental Depression Shadow - Light Mode */}
			<linearGradient
				id="dente-buccal-lobe-shadow"
				x1="0"
				y1="0"
				x2="0.9"
				y2="1"
			>
				<stop offset="0%" stopColor="#64748b" stopOpacity="0.0" />
				<stop offset="60%" stopColor="#64748b" stopOpacity="0.02" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="0.05" />
			</linearGradient>

			{/* Buccal Developmental Depression Shadow - Dark Mode */}
			<linearGradient
				id="dente-buccal-lobe-shadow-dark"
				x1="0"
				y1="0"
				x2="0.9"
				y2="1"
			>
				<stop offset="0%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="60%" stopColor="#020617" stopOpacity="0.03" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.08" />
			</linearGradient>
		</>
	);
};
