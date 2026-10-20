/**
 * DENTE Odontogram Tournament — Competitor 01: Apple Glass & Ceramic (STUDIO MASTER V2)
 * Pure Cupertino medical aesthetics: rich porcelain volume, titanium luster, unique theme IDs.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";

export const Candidate01_SvgDefs: React.FC<{ theme?: "light" | "dark"; idSuffix: string }> = ({
	theme = "light",
	idSuffix,
}) => {
	const isDark = theme === "dark";
	const p = `${idSuffix}-${theme}`;
	return (
		<defs>
			{/* Porcelain Enamel Gradient — 3D Ceramic Volume */}
			<linearGradient id={`c1-crown-${p}`} x1="15%" y1="0%" x2="85%" y2="100%">
				<stop offset="0%" stopColor={isDark ? "#ffffff" : "#f1f5f9"} stopOpacity={isDark ? "0.95" : "1"} />
				<stop offset="25%" stopColor={isDark ? "#f8fafc" : "#ffffff"} stopOpacity="1" />
				<stop offset="65%" stopColor={isDark ? "#cbd5e1" : "#f8fafc"} stopOpacity="1" />
				<stop offset="88%" stopColor={isDark ? "#94a3b8" : "#e2e8f0"} stopOpacity="1" />
				<stop offset="100%" stopColor={isDark ? "#64748b" : "#cbd5e1"} stopOpacity="1" />
			</linearGradient>

			{/* Noble Root Cementum — Natural bone/dentin volume with lateral shadow */}
			<linearGradient id={`c1-root-${p}`} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={isDark ? "#0f172a" : "#cbd5e1"} />
				<stop offset="25%" stopColor={isDark ? "#1e293b" : "#e2e8f0"} />
				<stop offset="50%" stopColor={isDark ? "#334155" : "#f8fafc"} />
				<stop offset="75%" stopColor={isDark ? "#1e293b" : "#e2e8f0"} />
				<stop offset="100%" stopColor={isDark ? "#0f172a" : "#94a3b8"} />
			</linearGradient>

			{/* Translucent Crystalline Incisal Edge */}
			<linearGradient id={`c1-translucent-${p}`} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor={isDark ? "#38bdf8" : "#93c5fd"} stopOpacity={isDark ? "0.25" : "0.4"} />
				<stop offset="70%" stopColor={isDark ? "#93c5fd" : "#dbeafe"} stopOpacity={isDark ? "0.4" : "0.6"} />
				<stop offset="100%" stopColor="#ffffff" stopOpacity={isDark ? "0.7" : "0.5"} />
			</linearGradient>

			{/* Specular Apple Glare */}
			<linearGradient id={`c1-glare-${p}`} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
				<stop offset="45%" stopColor="#ffffff" stopOpacity={isDark ? "0.85" : "0.95"} />
				<stop offset="75%" stopColor="#ffffff" stopOpacity={isDark ? "0.4" : "0.5"} />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Grade-5 Machined Titanium Anisotropic Gradient (Straumann style) */}
			<linearGradient id={`c1-titanium-${p}`} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={isDark ? "#0f172a" : "#334155"} />
				<stop offset="18%" stopColor={isDark ? "#1e293b" : "#475569"} />
				<stop offset="38%" stopColor={isDark ? "#475569" : "#94a3b8"} />
				<stop offset="50%" stopColor="#ffffff" stopOpacity={isDark ? "0.9" : "0.98"} />
				<stop offset="65%" stopColor={isDark ? "#64748b" : "#cbd5e1"} />
				<stop offset="85%" stopColor={isDark ? "#334155" : "#64748b"} />
				<stop offset="100%" stopColor={isDark ? "#0f172a" : "#334155"} />
			</linearGradient>

			{/* Mirror Polished Healing Abutment Collar */}
			<linearGradient id={`c1-polished-${p}`} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={isDark ? "#1e293b" : "#475569"} />
				<stop offset="30%" stopColor={isDark ? "#64748b" : "#cbd5e1"} />
				<stop offset="50%" stopColor="#ffffff" />
				<stop offset="70%" stopColor={isDark ? "#64748b" : "#cbd5e1"} />
				<stop offset="100%" stopColor={isDark ? "#1e293b" : "#475569"} />
			</linearGradient>

			{/* Vivid Coral Gutta-Percha Canal */}
			<linearGradient id={`c1-canal-${p}`} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#e11d48" />
				<stop offset="50%" stopColor="#f43f5e" />
				<stop offset="100%" stopColor="#fb7185" />
			</linearGradient>

			{/* Ethereal Diffuse Periapical Granuloma */}
			<radialGradient id={`c1-granuloma-${p}`} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#e11d48" stopOpacity={isDark ? "0.7" : "0.6"} />
				<stop offset="35%" stopColor="#f97316" stopOpacity={isDark ? "0.5" : "0.45"} />
				<stop offset="70%" stopColor="#fbbf24" stopOpacity={isDark ? "0.2" : "0.2"} />
				<stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
			</radialGradient>

			{/* Subsurface Feathering */}
			<filter id={`c1-blur-${p}`} x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="3.5" />
			</filter>
		</defs>
	);
};
