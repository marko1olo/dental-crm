/**
 * Candidate03_NeoIsometric.tsx — Style #3: Neo-Isometric 2.5D.
 * Conforms strictly to Mandate 8b (<= 120 lines).
 */
import * as React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { INCISOR_PATHS, PREMOLAR_PATHS, MOLAR_PATHS, IMPLANT_PATHS, NEO_ISO_GRADIENTS } from "./Candidate03_Paths";

const IsoDefs: React.FC<{ theme: "light" | "dark" }> = ({ theme }) => {
	const g = NEO_ISO_GRADIENTS[theme];
	return (
		<defs>
			{[g.enamelMain, g.enamelFacet, g.rootMain, g.titaniumBright, g.titaniumDark].map((gr) => (
				<linearGradient key={gr.id} id={gr.id} x1={gr.x1} y1={gr.y1} x2={gr.x2} y2={gr.y2}>
					{gr.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
				</linearGradient>
			))}
			<radialGradient id="iso-granuloma-glow" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" /><stop offset="45%" stopColor="#f97316" stopOpacity="0.75" />
				<stop offset="80%" stopColor="#b91c1c" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
			</radialGradient>
		</defs>
	);
};

export const Candidate03_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", className = "" }) => {
	const g = NEO_ISO_GRADIENTS[theme];
	return (
		<svg viewBox={INCISOR_PATHS.viewBox} className={`w-[120px] h-[170px] ${className}`} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.08))" }}>
			<IsoDefs theme={theme} /><path d={INCISOR_PATHS.shadow} fill="rgba(0,0,0,0.12)" />
			<path d={INCISOR_PATHS.rootLeft} fill={`url(#${g.rootMain.id})`} stroke={g.strokeSubtle} strokeWidth="0.8" />
			<path d={INCISOR_PATHS.rootRight} fill={`url(#${g.rootMain.id})`} stroke={g.strokeSubtle} strokeWidth="0.8" opacity="0.85" />
			<path d={INCISOR_PATHS.cejCollar} fill="none" stroke={g.stroke} strokeWidth="1.2" />
			<path d={INCISOR_PATHS.crownBody} fill={`url(#${g.enamelMain.id})`} stroke={g.stroke} strokeWidth="1.1" />
			<path d={INCISOR_PATHS.mesialGroove} stroke={g.strokeSubtle} strokeWidth="0.9" fill="none" opacity="0.6" strokeDasharray="2 1" />
			<path d={INCISOR_PATHS.distalGroove} stroke={g.strokeSubtle} strokeWidth="0.9" fill="none" opacity="0.6" strokeDasharray="2 1" />
			<path d={INCISOR_PATHS.incisalFacet} fill={`url(#${g.enamelFacet.id})`} stroke={g.stroke} strokeWidth="1" />
			<path d={INCISOR_PATHS.mamelon1} stroke={g.strokeSubtle} strokeWidth="0.7" fill="none" />
			<path d={INCISOR_PATHS.mamelon2} stroke={g.strokeSubtle} strokeWidth="0.7" fill="none" />
			<path d={INCISOR_PATHS.mamelon3} stroke={g.strokeSubtle} strokeWidth="0.7" fill="none" />
			<path d={INCISOR_PATHS.specularHighlight} stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" fill="none" />
		</svg>
	);
};

export const Candidate03_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", className = "" }) => {
	const g = NEO_ISO_GRADIENTS[theme];
	return (
		<svg viewBox={PREMOLAR_PATHS.viewBox} className={`w-[120px] h-[170px] ${className}`} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.08))" }}>
			<IsoDefs theme={theme} /><path d={PREMOLAR_PATHS.shadow} fill="rgba(0,0,0,0.12)" />
			<path d={PREMOLAR_PATHS.palatalRoot} fill={`url(#${g.rootMain.id})`} stroke={g.strokeSubtle} strokeWidth="0.8" opacity="0.8" />
			<path d={PREMOLAR_PATHS.buccalRoot} fill={`url(#${g.rootMain.id})`} stroke={g.stroke} strokeWidth="1" />
			<path d={PREMOLAR_PATHS.furcationShadow} fill="rgba(0,0,0,0.25)" />
			<path d={PREMOLAR_PATHS.palatalCanal} stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.75" />
			<path d={PREMOLAR_PATHS.buccalCanal} stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
			<circle cx="48" cy="25" r="1.5" fill="#ef4444" /><circle cx="76" cy="29" r="1.5" fill="#ef4444" />
			<path d={PREMOLAR_PATHS.pulpChamber} fill="#d97706" opacity="0.85" stroke="#b45309" strokeWidth="0.8" />
			<path d={PREMOLAR_PATHS.crownBody} fill={`url(#${g.enamelMain.id})`} stroke={g.stroke} strokeWidth="1.1" />
			<path d={PREMOLAR_PATHS.occlusalFacet} fill={`url(#${g.enamelFacet.id})`} stroke={g.stroke} strokeWidth="0.9" />
			<path d={PREMOLAR_PATHS.centralGroove} stroke={g.stroke} strokeWidth="1.1" fill="none" />
			<path d={PREMOLAR_PATHS.buccalTriangularRidge} stroke={g.strokeSubtle} strokeWidth="0.9" fill="none" />
			<path d={PREMOLAR_PATHS.specularHighlight} stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" fill="none" />
		</svg>
	);
};

export const Candidate03_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", className = "" }) => {
	const g = NEO_ISO_GRADIENTS[theme];
	return (
		<svg viewBox={MOLAR_PATHS.viewBox} className={`w-[120px] h-[170px] ${className}`} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.08))" }}>
			<IsoDefs theme={theme} /><path d={MOLAR_PATHS.shadow} fill="rgba(0,0,0,0.12)" />
			<path d={MOLAR_PATHS.granulomaHalo} fill="url(#iso-granuloma-glow)" /><circle cx="35" cy="144" r="9" fill="#ef4444" opacity="0.45" />
			<path d={MOLAR_PATHS.granulomaOuter} stroke="#dc2626" strokeWidth="1.2" fill="#b91c1c" opacity="0.3" strokeDasharray="3 1.5" />
			<circle cx="35" cy="144" r="4" fill="#991b1b" opacity="0.8" />
			<path d={MOLAR_PATHS.mesialRoot} fill={`url(#${g.rootMain.id})`} stroke={g.stroke} strokeWidth="1" />
			<path d={MOLAR_PATHS.distalRoot} fill={`url(#${g.rootMain.id})`} stroke={g.stroke} strokeWidth="1" />
			<path d={MOLAR_PATHS.furcationArch} stroke={g.stroke} strokeWidth="1" fill="rgba(0,0,0,0.2)" />
			<path d={MOLAR_PATHS.mesialCanal} stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={MOLAR_PATHS.distalCanal} stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={MOLAR_PATHS.crownTrunk} fill={`url(#${g.enamelMain.id})`} stroke={g.stroke} strokeWidth="1.1" />
			<path d={MOLAR_PATHS.buccalGroove} stroke={g.strokeSubtle} strokeWidth="1" fill="none" />
			<path d={MOLAR_PATHS.occlusalRim} fill={`url(#${g.enamelFacet.id})`} stroke={g.stroke} strokeWidth="1.2" />
			<path d={MOLAR_PATHS.cuspMB} fill="rgba(255,255,255,0.25)" stroke={g.strokeSubtle} strokeWidth="0.8" />
			<path d={MOLAR_PATHS.cuspDB} fill="rgba(255,255,255,0.2)" stroke={g.strokeSubtle} strokeWidth="0.8" />
			<path d={MOLAR_PATHS.cuspD} fill="rgba(0,0,0,0.06)" stroke={g.strokeSubtle} strokeWidth="0.8" />
			<path d={MOLAR_PATHS.centralFissures} stroke={g.stroke} strokeWidth="1.2" fill="none" strokeLinecap="round" />
		</svg>
	);
};

export const Candidate03_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", className = "" }) => {
	const g = NEO_ISO_GRADIENTS[theme];
	return (
		<svg viewBox={IMPLANT_PATHS.viewBox} className={`w-[120px] h-[170px] ${className}`} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}>
			<IsoDefs theme={theme} /><path d={IMPLANT_PATHS.shadow} fill="rgba(0,0,0,0.12)" />
			<path d={IMPLANT_PATHS.fixtureBody} fill={`url(#${g.titaniumDark.id})`} stroke={g.stroke} strokeWidth="0.9" />
			{IMPLANT_PATHS.threads.map((t, i) => (
				<g key={i}>
					<path d={t.path} fill={`url(#${g.titaniumBright.id})`} stroke={g.stroke} strokeWidth="0.8" />
					<path d={t.crest} stroke="#ffffff" strokeWidth="0.7" fill="none" opacity="0.8" />
				</g>
			))}
			<path d={IMPLANT_PATHS.fluteLeft} fill="rgba(0,0,0,0.4)" /><path d={IMPLANT_PATHS.fluteRight} fill="rgba(0,0,0,0.4)" />
			<path d={IMPLANT_PATHS.platformNeck} fill={`url(#${g.titaniumDark.id})`} stroke={g.stroke} strokeWidth="0.8" />
			<path d={IMPLANT_PATHS.microThread1} stroke={g.strokeSubtle} strokeWidth="0.8" fill="none" />
			<path d={IMPLANT_PATHS.microThread2} stroke={g.strokeSubtle} strokeWidth="0.8" fill="none" />
			<path d={IMPLANT_PATHS.abutmentCollar} fill={`url(#${g.titaniumBright.id})`} stroke={g.stroke} strokeWidth="1" />
			<path d={IMPLANT_PATHS.abutmentTop} fill={`url(#${g.titaniumDark.id})`} stroke={g.stroke} strokeWidth="1.1" />
			<path d={IMPLANT_PATHS.abutmentBevel} fill={`url(#${g.titaniumBright.id})`} stroke={g.strokeSubtle} strokeWidth="0.8" />
			<path d={IMPLANT_PATHS.hexSocketRim} fill="#0f172a" stroke={g.stroke} strokeWidth="1" />
			<path d={IMPLANT_PATHS.hexSocketDepth} fill="rgba(255,255,255,0.15)" stroke={g.strokeSubtle} strokeWidth="0.6" />
			<path d={IMPLANT_PATHS.hexCentralScrew} fill="#020617" />
		</svg>
	);
};
