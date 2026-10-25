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

			{/* Cylindrical Root Proximal Volume Contour — Light Mode (Soft Ambient Flank Shading) */}
			<linearGradient id="dente-root-contour" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#785530" stopOpacity="0.08" />
				<stop offset="16%" stopColor="#785530" stopOpacity="0.0" />
				<stop offset="82%" stopColor="#785530" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#785530" stopOpacity="0.12" />
			</linearGradient>

			{/* Cylindrical Root Proximal Volume Contour — Dark Mode */}
			<linearGradient id="dente-root-contour-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.22" />
				<stop offset="18%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="82%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.30" />
			</linearGradient>
		</>
	);
};
