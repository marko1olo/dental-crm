import React from "react";

/**
 * DENTE Dental CRM — 3D Porcelain & Volume Shaders for Anterior Teeth (43, 42, 41)
 * Authentic proximal curvature contours for lateral/mesial volume.
 * Mandate 8b <= 120 lines.
 */
export const ToothAnteriorShaders: React.FC = () => {
	return (
		<>
			{/* Proximal Curvature Contour 3D Volume — Light Mode (Softened Unified Porcelain) */}
			<linearGradient id="dente-proximal-contour" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.10" />
				<stop offset="16%" stopColor="#475569" stopOpacity="0.0" />
				<stop offset="84%" stopColor="#475569" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#475569" stopOpacity="0.12" />
			</linearGradient>

			{/* Proximal Curvature Contour 3D Volume — Dark Mode (Softened Unified Porcelain) */}
			<linearGradient id="dente-proximal-contour-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.26" />
				<stop offset="18%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="82%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.30" />
			</linearGradient>

			{/* Cylindrical Root Proximal Volume Contour — Light Mode (Contrast Flank Shading & Curvature) */}
			<linearGradient id="dente-root-contour" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#63421f" stopOpacity="0.32" />
				<stop offset="14%" stopColor="#785530" stopOpacity="0.18" />
				<stop offset="28%" stopColor="#785530" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
				<stop offset="72%" stopColor="#63421f" stopOpacity="0.0" />
				<stop offset="88%" stopColor="#63421f" stopOpacity="0.22" />
				<stop offset="100%" stopColor="#4d3215" stopOpacity="0.38" />
			</linearGradient>

			{/* Cylindrical Root Proximal Volume Contour — Dark Mode */}
			<linearGradient id="dente-root-contour-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.46" />
				<stop offset="15%" stopColor="#020617" stopOpacity="0.25" />
				<stop offset="30%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="50%" stopColor="#ffffff" stopOpacity="0.06" />
				<stop offset="70%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="86%" stopColor="#020617" stopOpacity="0.30" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.52" />
			</linearGradient>
		</>
	);
};
