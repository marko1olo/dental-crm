/**
 * Candidate 08: Multi-Layer SVG Shader (Физический Спекулярный Рельеф)
 * Benchmark competitor with native feSpecularLighting / feDiffuseLighting surgical shading.
 * Mandate 8b compliant: <= 120 lines.
 */

import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import {
	C08_INCISOR_PATHS,
	C08_PREMOLAR_PATHS,
	C08_MOLAR_PATHS,
	C08_IMPLANT_PATHS,
	Candidate08ShaderDefs,
	getC08Colors,
} from "./Candidate08_Paths";

export const Candidate08_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = getC08Colors(theme);
	return (
		<svg width={100 * scale} height={160 * scale} viewBox="0 0 100 160" className={`candidate08-tooth ${className}`}>
			<Candidate08ShaderDefs />
			<path d={C08_INCISOR_PATHS.root} fill={c.rootFill} stroke={c.stroke} strokeWidth="1.6" />
			<path d={C08_INCISOR_PATHS.rootCanal} stroke={c.pulpStroke} strokeWidth="1.2" strokeDasharray="2 2" fill="none" opacity="0.6" />
			<path d={C08_INCISOR_PATHS.crown} fill={c.crownFill} stroke={c.stroke} strokeWidth="1.8" filter="url(#c08-incisor-specular)" />
			<path d={C08_INCISOR_PATHS.middlePlate} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
			<path d={C08_INCISOR_PATHS.mamelonLeft} stroke={c.strokeSubtle} strokeWidth="1" fill="none" opacity="0.5" />
			<path d={C08_INCISOR_PATHS.mamelonRight} stroke={c.strokeSubtle} strokeWidth="1" fill="none" opacity="0.5" />
			<path d={C08_INCISOR_PATHS.incisalHalo} fill="rgba(255,255,255,0.45)" />
			<path d={C08_INCISOR_PATHS.cervicalLine} stroke={c.stroke} strokeWidth="1.2" fill="none" />
		</svg>
	);
};

export const Candidate08_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = getC08Colors(theme);
	return (
		<svg width={100 * scale} height={160 * scale} viewBox="0 0 100 160" className={`candidate08-tooth ${className}`}>
			<Candidate08ShaderDefs />
			<path d={C08_PREMOLAR_PATHS.buccalRoot} fill={c.rootFill} stroke={c.stroke} strokeWidth="1.5" />
			<path d={C08_PREMOLAR_PATHS.palatalRoot} fill={c.rootFill} stroke={c.stroke} strokeWidth="1.5" />
			<path d={C08_PREMOLAR_PATHS.furcationGap} fill="none" stroke={c.strokeSubtle} strokeWidth="1" />
			<path d={C08_PREMOLAR_PATHS.buccalCanal} stroke={c.pulpStroke} strokeWidth="1.6" fill="none" opacity="0.85" />
			<path d={C08_PREMOLAR_PATHS.palatalCanal} stroke={c.pulpStroke} strokeWidth="1.6" fill="none" opacity="0.85" />
			<path d={C08_PREMOLAR_PATHS.pulpChamber} fill={c.pulpFill} stroke={c.pulpStroke} strokeWidth="1.2" opacity="0.9" />
			<path d={C08_PREMOLAR_PATHS.crown} fill={c.crownFill} stroke={c.stroke} strokeWidth="1.8" filter="url(#c08-premolar-relief)" />
			<path d={C08_PREMOLAR_PATHS.buccalCuspPlate} fill="rgba(255,255,255,0.2)" />
			<path d={C08_PREMOLAR_PATHS.palatalCuspPlate} fill="rgba(255,255,255,0.15)" />
			<path d={C08_PREMOLAR_PATHS.fissureGroove} stroke={c.fissure} strokeWidth="1.4" fill="none" strokeLinecap="round" />
			<path d={C08_PREMOLAR_PATHS.cervicalLine} stroke={c.stroke} strokeWidth="1.2" fill="none" />
		</svg>
	);
};

export const Candidate08_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = getC08Colors(theme);
	return (
		<svg width={100 * scale} height={160 * scale} viewBox="0 0 100 160" className={`candidate08-tooth ${className}`}>
			<Candidate08ShaderDefs />
			<circle cx="36" cy="140" r="14" fill={c.haloBg} filter="url(#c08-granuloma-glow)" />
			<circle cx="36" cy="140" r="8" fill={c.haloColor} opacity="0.85" />
			<circle cx="36" cy="140" r="3.5" fill="#7f1d1d" />
			<path d={C08_MOLAR_PATHS.mesialRoot} fill={c.rootFill} stroke={c.stroke} strokeWidth="1.6" />
			<path d={C08_MOLAR_PATHS.distalRoot} fill={c.rootFill} stroke={c.stroke} strokeWidth="1.6" />
			<path d={C08_MOLAR_PATHS.furcationArc} fill="none" stroke={c.stroke} strokeWidth="1.4" />
			<path d={C08_MOLAR_PATHS.mesialCanal} stroke={c.pulpStroke} strokeWidth="1.8" fill="none" strokeLinecap="round" />
			<path d={C08_MOLAR_PATHS.distalCanal} stroke={c.pulpStroke} strokeWidth="1.8" fill="none" strokeLinecap="round" />
			<path d={C08_MOLAR_PATHS.pulpChamber} fill={c.pulpFill} stroke={c.pulpStroke} strokeWidth="1.2" opacity="0.8" />
			<path d={C08_MOLAR_PATHS.crown} fill={c.crownFill} stroke={c.stroke} strokeWidth="1.8" filter="url(#c08-molar-specular)" />
			{Object.values(C08_MOLAR_PATHS.fissures).map((d, i) => (
				<path key={i} d={d} stroke={c.fissure} strokeWidth="1.5" strokeLinecap="round" fill="none" />
			))}
			<circle cx="36" cy="30" r="3" fill="#ffffff" opacity="0.75" />
			<circle cx="58" cy="28" r="2.8" fill="#ffffff" opacity="0.75" />
			<circle cx="67" cy="34" r="2.2" fill="#ffffff" opacity="0.7" />
			<path d={C08_MOLAR_PATHS.cervicalLine} stroke={c.stroke} strokeWidth="1.2" fill="none" />
		</svg>
	);
};

export const Candidate08_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = getC08Colors(theme);
	return (
		<svg width={100 * scale} height={160 * scale} viewBox="0 0 100 160" className={`candidate08-tooth ${className}`}>
			<Candidate08ShaderDefs />
			<path d={C08_IMPLANT_PATHS.healingCap} fill={c.chromeFill} stroke={c.titaniumStroke} strokeWidth="1.4" filter="url(#c08-mirror-chrome)" />
			<polygon points={C08_IMPLANT_PATHS.healingCapHex} fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
			<text x="50" y="38" fontSize="4.2" fontFamily="monospace" fontWeight="bold" textAnchor="middle" fill={c.isDark ? "#cbd5e1" : "#475569"}>Ø4.5 · H4</text>
			<path d={C08_IMPLANT_PATHS.collar} fill={c.titaniumFill} stroke={c.titaniumStroke} strokeWidth="1.2" />
			{[45, 48, 51].map((y) => (
				<line key={y} x1="33" y1={y} x2="67" y2={y} stroke={c.isDark ? "#64748b" : "#94a3b8"} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
			))}
			<path d={C08_IMPLANT_PATHS.fixtureBody} fill={c.titaniumFill} stroke={c.titaniumStroke} strokeWidth="1.8" filter="url(#c08-titanium-specular)" />
			{C08_IMPLANT_PATHS.threads.map((t, i) => (
				<g key={i}>
					<line x1={50 - t.w / 2} y1={t.y1} x2={50 + t.w / 2} y2={t.y1 + 1.8} stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
					<line x1={50 - t.w / 2} y1={t.y2} x2={50 + t.w / 2} y2={t.y2 + 1.8} stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
				</g>
			))}
			<path d={C08_IMPLANT_PATHS.fluteVent} stroke="#0f172a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
		</svg>
	);
};
