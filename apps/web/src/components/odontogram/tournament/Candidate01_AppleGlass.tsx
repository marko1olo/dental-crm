/**
 * DENTE Odontogram Tournament — Competitor 01: Apple Glass & Ceramic (STUDIO MASTER V2)
 * Cupertino premium aesthetic benchmark teeth: Incisor 11, Premolar 14, Molar 46, Implant.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { INCISOR_PATHS, PREMOLAR_PATHS, MOLAR_PATHS, IMPLANT_PATHS } from "./Candidate01_Paths";
import { Candidate01_SvgDefs } from "./Candidate01_SvgDefs";

export const Candidate01_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = `incisor-${theme}`;
	const hairline = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.55)";
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 120 180" className={`transition-transform ${className}`} style={{ filter: isDark ? "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}>
			<Candidate01_SvgDefs theme={theme} idSuffix="incisor" />
			<path d={INCISOR_PATHS.root} fill={`url(#c1-root-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={INCISOR_PATHS.crown} fill={`url(#c1-crown-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={INCISOR_PATHS.translucentEdge} fill={`url(#c1-translucent-${p})`} />
			<path d={INCISOR_PATHS.mamelons} stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(100,116,139,0.4)"} strokeWidth="0.8" strokeLinecap="round" />
			<path d={INCISOR_PATHS.specularHighlight} fill={`url(#c1-glare-${p})`} opacity="0.95" />
			<path d={INCISOR_PATHS.secondaryHighlight} fill={`url(#c1-glare-${p})`} opacity="0.6" />
			<path d={INCISOR_PATHS.rimHighlight} stroke="#ffffff" strokeWidth="1" strokeLinecap="round" fill="none" opacity={isDark ? "0.4" : "0.75"} />
			<path d={INCISOR_PATHS.cejLine} stroke={hairline} strokeWidth="0.75" strokeDasharray="2,2" fill="none" opacity="0.6" />
		</svg>
	);
};

export const Candidate01_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = `premolar-${theme}`;
	const hairline = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.55)";
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 120 180" className={`transition-transform ${className}`} style={{ filter: isDark ? "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}>
			<Candidate01_SvgDefs theme={theme} idSuffix="premolar" />
			<path d={PREMOLAR_PATHS.roots} fill={`url(#c1-root-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={PREMOLAR_PATHS.canalBuccal} stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_PATHS.canalBuccal} stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={PREMOLAR_PATHS.canalPalatal} stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_PATHS.canalPalatal} stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={PREMOLAR_PATHS.crown} fill={`url(#c1-crown-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={PREMOLAR_PATHS.groove} stroke={isDark ? "rgba(255,255,255,0.25)" : "rgba(100,116,139,0.4)"} strokeWidth="0.8" fill="none" />
			<path d={PREMOLAR_PATHS.buccalCuspSheen} fill={`url(#c1-glare-${p})`} opacity="0.9" />
			<path d={PREMOLAR_PATHS.palatalCuspSheen} fill={`url(#c1-glare-${p})`} opacity="0.65" />
			<path d={PREMOLAR_PATHS.cejLine} stroke={hairline} strokeWidth="0.75" strokeDasharray="2,2" fill="none" opacity="0.6" />
		</svg>
	);
};

export const Candidate01_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = `molar-${theme}`;
	const hairline = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.55)";
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 120 180" className={`transition-transform ${className}`} style={{ filter: isDark ? "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}>
			<Candidate01_SvgDefs theme={theme} idSuffix="molar" />
			<circle cx="39" cy="151" r="18" fill={`url(#c1-granuloma-${p})`} filter={`url(#c1-blur-${p})`} />
			<circle cx="39" cy="151" r="12" stroke="#e11d48" strokeWidth="0.8" strokeDasharray="2,2" fill="none" opacity="0.6" />
			<path d={MOLAR_PATHS.roots} fill={`url(#c1-root-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={MOLAR_PATHS.canalMesial} stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
			<path d={MOLAR_PATHS.canalMesial} stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={MOLAR_PATHS.canalDistal} stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
			<path d={MOLAR_PATHS.canalDistal} stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={MOLAR_PATHS.crown} fill={`url(#c1-crown-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={MOLAR_PATHS.fissures} stroke={isDark ? "rgba(255,255,255,0.25)" : "rgba(100,116,139,0.45)"} strokeWidth="0.9" strokeLinecap="round" fill="none" />
			<path d={MOLAR_PATHS.mesialSheen} fill={`url(#c1-glare-${p})`} opacity="0.9" />
			<path d={MOLAR_PATHS.distalSheen} fill={`url(#c1-glare-${p})`} opacity="0.65" />
		</svg>
	);
};

export const Candidate01_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = `implant-${theme}`;
	const hairline = isDark ? "rgba(100, 116, 139, 0.6)" : "rgba(51, 65, 85, 0.7)";
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 120 180" className={`transition-transform ${className}`} style={{ filter: isDark ? "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}>
			<Candidate01_SvgDefs theme={theme} idSuffix="implant" />
			<path d={IMPLANT_PATHS.screwCore} fill={`url(#c1-titanium-${p})`} stroke={hairline} strokeWidth="0.75" />
			{IMPLANT_PATHS.microthreads.map((d, i) => (
				<path key={`micro-${i}`} d={d} stroke={isDark ? "#94a3b8" : "#94a3b8"} strokeWidth="0.8" fill="none" opacity="0.8" />
			))}
			{IMPLANT_PATHS.helicalThreads.map((t, i) => (
				<g key={`thread-${i}`}>
					<path d={t.path} fill={isDark ? "#334155" : "#475569"} stroke={hairline} strokeWidth="0.5" />
					<path d={t.highlight} stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" opacity={isDark ? "0.7" : "0.95"} fill="none" />
				</g>
			))}
			<path d={IMPLANT_PATHS.apicalReliefFlute} fill={isDark ? "#0f172a" : "#1e293b"} opacity="0.7" />
			<path d={IMPLANT_PATHS.abutmentCap} fill={`url(#c1-polished-${p})`} stroke={hairline} strokeWidth="0.8" />
			<path d={IMPLANT_PATHS.abutmentReflection} fill={`url(#c1-glare-${p})`} opacity="0.85" />
			{IMPLANT_PATHS.laserRings.map((d, i) => (
				<path key={`ring-${i}`} d={d} stroke={isDark ? "#64748b" : "#64748b"} strokeWidth="0.5" fill="none" opacity="0.7" />
			))}
			<circle cx="60" cy="29" r="5" fill={isDark ? "#0f172a" : "#1e293b"} />
			<polygon points={IMPLANT_PATHS.hexSocket} fill={isDark ? "#334155" : "#64748b"} stroke="#ffffff" strokeWidth="0.5" opacity="0.9" />
		</svg>
	);
};
