import React from "react";

/**
 * DENTE Dental CRM — 3D Porcelain & Volume Shaders for Anterior Teeth (43, 42, 41)
 * Authentic proximal curvature contours for lateral/mesial volume.
 * Mandate 8b <= 120 lines.
 */
export const ToothAnteriorShaders: React.FC = () => {
	return (
		<>
			{/* Proximal Curvature Contour 3D Volume — Light Mode (Clean Silky Edge Vignette, 0 Zebra) */}
			<linearGradient id="dente-proximal-contour" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.07" />
				<stop offset="12%" stopColor="#475569" stopOpacity="0.0" />
				<stop offset="88%" stopColor="#475569" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#475569" stopOpacity="0.08" />
			</linearGradient>

			{/* Proximal Curvature Contour 3D Volume — Dark Mode (Clean Ambient Edge Vignette, 0 Zebra) */}
			<linearGradient id="dente-proximal-contour-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#0f172a" stopOpacity="0.15" />
				<stop offset="12%" stopColor="#0f172a" stopOpacity="0.0" />
				<stop offset="88%" stopColor="#0f172a" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.18" />
			</linearGradient>

			{/* Cylindrical Root Proximal Volume Contour — Light Mode (Smooth Organic Dentin, 0 White Line) */}
			<linearGradient id="dente-root-contour" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#785530" stopOpacity="0.18" />
				<stop offset="20%" stopColor="#785530" stopOpacity="0.0" />
				<stop offset="80%" stopColor="#785530" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#785530" stopOpacity="0.20" />
			</linearGradient>

			{/* Cylindrical Root Proximal Volume Contour — Dark Mode (Smooth Ambient Depth, 0 White Line) */}
			<linearGradient id="dente-root-contour-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.24" />
				<stop offset="20%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="80%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.26" />
			</linearGradient>

			{/* Palatal Root In-Depth Contour — Light Mode */}
			<linearGradient id="dente-palatal-contour" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#452a12" stopOpacity="0.18" />
				<stop offset="25%" stopColor="#452a12" stopOpacity="0.0" />
				<stop offset="75%" stopColor="#452a12" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#452a12" stopOpacity="0.20" />
			</linearGradient>

			{/* Palatal Root In-Depth Contour — Dark Mode */}
			<linearGradient id="dente-palatal-contour-dark" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.25" />
				<stop offset="25%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="75%" stopColor="#020617" stopOpacity="0.0" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.30" />
			</linearGradient>

			{/* Saddle Contact Ambient Occlusion Shadow — Light Mode */}
			<linearGradient id="dente-saddle-shadow" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.16" />
				<stop offset="50%" stopColor="#334155" stopOpacity="0.06" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.0" />
			</linearGradient>

			{/* Saddle Contact Ambient Occlusion Shadow — Dark Mode */}
			<linearGradient id="dente-saddle-shadow-dark" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.24" />
				<stop offset="50%" stopColor="#020617" stopOpacity="0.08" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>

			{/* Upper Maxilla Cusp Slopes — Parity with Q4 (Soft Silk Enamel, Monotonic Smooth Fade) */}
			<linearGradient id="dente-cusp-slope-light-upper" x1="0" y1="1" x2="1" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" /><stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-cusp-slope-light-dark-upper" x1="0" y1="1" x2="1" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" /><stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-cusp-slope-shadow-upper" x1="0" y1="1" x2="1" y2="0">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.0" /><stop offset="45%" stopColor="#475569" stopOpacity="0.08" /><stop offset="80%" stopColor="#475569" stopOpacity="0.16" /><stop offset="100%" stopColor="#475569" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-cusp-slope-shadow-dark-upper" x1="0" y1="1" x2="1" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.0" /><stop offset="45%" stopColor="#020617" stopOpacity="0.12" /><stop offset="80%" stopColor="#020617" stopOpacity="0.24" /><stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-buccal-lobe-light-upper" x1="0.5" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" /><stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-buccal-lobe-light-dark-upper" x1="0.5" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" /><stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-buccal-lobe-shadow-upper" x1="0.5" y1="1" x2="0.9" y2="0">
				<stop offset="0%" stopColor="#64748b" stopOpacity="0.0" /><stop offset="50%" stopColor="#64748b" stopOpacity="0.08" /><stop offset="85%" stopColor="#64748b" stopOpacity="0.16" /><stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-buccal-lobe-shadow-dark-upper" x1="0.5" y1="1" x2="0.9" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.0" /><stop offset="50%" stopColor="#020617" stopOpacity="0.12" /><stop offset="85%" stopColor="#020617" stopOpacity="0.22" /><stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>
			{/* Seamless Radial Ambient Shadow for Furcation Crotches */}
			<radialGradient id="dente-crotch-shadow-soft" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.18" /><stop offset="60%" stopColor="#020617" stopOpacity="0.06" /><stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</radialGradient>
			{/* Organic Upper Cusp Radial Falloff Shaders (0 Seams, 0 Polygons) */}
			<radialGradient id="dente-cusp-slope-distal-radial" cx="62%" cy="86%" r="28%" fx="60%" fy="88%">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.08" /><stop offset="50%" stopColor="#475569" stopOpacity="0.04" /><stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id="dente-cusp-slope-distal-radial-dark" cx="62%" cy="86%" r="28%" fx="60%" fy="88%">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.12" /><stop offset="50%" stopColor="#020617" stopOpacity="0.06" /><stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id="dente-cusp-slope-mesial-radial" cx="38%" cy="86%" r="28%" fx="40%" fy="88%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" /><stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id="dente-cusp-slope-mesial-radial-dark" cx="38%" cy="86%" r="28%" fx="40%" fy="88%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" /><stop offset="50%" stopColor="#ffffff" stopOpacity="0.03" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</radialGradient>
		</>
	);
};
