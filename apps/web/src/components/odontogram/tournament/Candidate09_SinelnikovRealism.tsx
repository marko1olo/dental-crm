/**
 * DENTE Odontogram Tournament — Competitor #9: Sinelnikov Academic Realism
 * Mandate 8b compliant: <= 120 lines.
 * Osteological vector rendering based on R.D. Sinelnikov Human Anatomy Atlas.
 */
import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { INCISOR_11_PATHS, PREMOLAR_14_PATHS, MOLAR_46_PATHS, IMPLANT_PATHS, SINELNIKOV_PALETTES } from "./Candidate09_Paths";

export const Candidate09_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const p = SINELNIKOV_PALETTES[theme];
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 110 165" className={`select-none ${className}`}>
			<defs>
				<linearGradient id={`s9-ie-${theme}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={p.enamelStart} />
					<stop offset="50%" stopColor={p.enamelMid} />
					<stop offset="100%" stopColor={p.enamelEnd} />
				</linearGradient>
				<linearGradient id={`s9-ic-${theme}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={p.cementumStart} />
					<stop offset="100%" stopColor={p.cementumEnd} />
				</linearGradient>
			</defs>
			<path d={INCISOR_11_PATHS.root} fill={`url(#s9-ic-${theme})`} stroke={p.rootStroke} strokeWidth="1.2" strokeLinejoin="round" />
			<path d={INCISOR_11_PATHS.rootGroove} stroke={p.grooveStroke} strokeWidth="1" strokeDasharray="2 1" fill="none" opacity="0.6" />
			<path d={INCISOR_11_PATHS.crown} fill={`url(#s9-ie-${theme})`} stroke={p.enamelStroke} strokeWidth="1.3" strokeLinejoin="round" />
			<path d={INCISOR_11_PATHS.mesialLobeGroove} stroke={p.enamelStroke} strokeWidth="0.8" opacity="0.4" fill="none" />
			<path d={INCISOR_11_PATHS.distalLobeGroove} stroke={p.enamelStroke} strokeWidth="0.8" opacity="0.4" fill="none" />
			<path d={INCISOR_11_PATHS.perikymata1} stroke={p.enamelStroke} strokeWidth="0.5" opacity="0.3" fill="none" />
			<path d={INCISOR_11_PATHS.perikymata2} stroke={p.enamelStroke} strokeWidth="0.5" opacity="0.3" fill="none" />
			<path d={INCISOR_11_PATHS.mamelonIncisalBand} fill={p.mamelonFill} />
			<path d={INCISOR_11_PATHS.mesialAngleMarker} stroke={p.enamelStroke} strokeWidth="1" opacity="0.7" />
		</svg>
	);
};

export const Candidate09_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const p = SINELNIKOV_PALETTES[theme];
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 110 165" className={`select-none ${className}`}>
			<defs>
				<linearGradient id={`s9-pe-${theme}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={p.enamelStart} /><stop offset="100%" stopColor={p.enamelEnd} />
				</linearGradient>
				<linearGradient id={`s9-pc-${theme}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={p.cementumStart} /><stop offset="100%" stopColor={p.cementumEnd} />
				</linearGradient>
			</defs>
			<path d={PREMOLAR_14_PATHS.roots} fill={`url(#s9-pc-${theme})`} stroke={p.rootStroke} strokeWidth="1.2" strokeLinejoin="round" />
			<path d={PREMOLAR_14_PATHS.bifurcationShadow} stroke={p.grooveStroke} strokeWidth="1.1" fill="none" opacity="0.7" />
			<path d={PREMOLAR_14_PATHS.crown} fill={`url(#s9-pe-${theme})`} stroke={p.enamelStroke} strokeWidth="1.3" strokeLinejoin="round" />
			<path d={PREMOLAR_14_PATHS.centralFissure} stroke={p.enamelStroke} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.mesialMarginalGroove} stroke={p.enamelStroke} strokeWidth="1.1" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.pulpChamber} fill={p.pulpFill} opacity="0.85" />
			<path d={PREMOLAR_14_PATHS.buccalCanal} stroke={p.canalStroke} strokeWidth="1.6" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.palatalCanal} stroke={p.canalStroke} strokeWidth="1.6" strokeLinecap="round" fill="none" />
		</svg>
	);
};

export const Candidate09_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const p = SINELNIKOV_PALETTES[theme];
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 110 165" className={`select-none ${className}`}>
			<defs>
				<linearGradient id={`s9-me-${theme}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={p.enamelStart} /><stop offset="100%" stopColor={p.enamelEnd} />
				</linearGradient>
				<linearGradient id={`s9-mc-${theme}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={p.cementumStart} /><stop offset="100%" stopColor={p.cementumEnd} />
				</linearGradient>
			</defs>
			<path d={MOLAR_46_PATHS.periodontitisHalo} fill={p.periodontitisHalo} />
			<path d={MOLAR_46_PATHS.periodontitisScleroticRim} stroke={p.periodontitisSclerosis} strokeWidth="1" strokeDasharray="2 1.5" fill="none" opacity="0.8" />
			<path d={MOLAR_46_PATHS.periodontitisCore} fill={p.periodontitisCore} />
			<path d={MOLAR_46_PATHS.roots} fill={`url(#s9-mc-${theme})`} stroke={p.rootStroke} strokeWidth="1.2" strokeLinejoin="round" />
			<path d={MOLAR_46_PATHS.furcationDepression} stroke={p.grooveStroke} strokeWidth="1" opacity="0.6" fill="none" />
			<path d={MOLAR_46_PATHS.mesialRootGroove} stroke={p.grooveStroke} strokeWidth="1" strokeDasharray="3 1.5" opacity="0.6" fill="none" />
			<path d={MOLAR_46_PATHS.distalRootGroove} stroke={p.grooveStroke} strokeWidth="0.9" opacity="0.5" fill="none" />
			<path d={MOLAR_46_PATHS.lingualCuspsRelief} stroke={p.enamelStroke} strokeWidth="0.9" opacity="0.5" fill="none" />
			<path d={MOLAR_46_PATHS.crown} fill={`url(#s9-me-${theme})`} stroke={p.enamelStroke} strokeWidth="1.3" strokeLinejoin="round" />
			<path d={MOLAR_46_PATHS.fissureCentral} stroke={p.enamelStroke} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d={MOLAR_46_PATHS.buccalGrooveForamenCaecum} stroke={p.enamelStroke} strokeWidth="1.2" strokeLinecap="round" fill="none" />
			<circle cx="45" cy="50" r="1.5" fill={p.enamelStroke} />
			<path d={MOLAR_46_PATHS.distobuccalGroove} stroke={p.enamelStroke} strokeWidth="1" strokeLinecap="round" fill="none" />
		</svg>
	);
};

export const Candidate09_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const p = SINELNIKOV_PALETTES[theme];
	return (
		<svg width={110 * scale} height={165 * scale} viewBox="0 0 110 165" className={`select-none ${className}`}>
			<defs>
				<linearGradient id={`s9-tp-${theme}`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor={p.tiPolishedStart} /><stop offset="50%" stopColor={p.tiPolishedMid} /><stop offset="100%" stopColor={p.tiPolishedEnd} />
				</linearGradient>
				<linearGradient id={`s9-ts-${theme}`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor={p.tiSlaStart} /><stop offset="50%" stopColor={p.tiSlaMid} /><stop offset="100%" stopColor={p.tiSlaEnd} />
				</linearGradient>
			</defs>
			<path d={IMPLANT_PATHS.alveolarBoneL} stroke={p.boneOutline} strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
			<path d={IMPLANT_PATHS.alveolarBoneR} stroke={p.boneOutline} strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
			<path d={IMPLANT_PATHS.fixtureCore} fill={`url(#s9-ts-${theme})`} stroke={p.tiThreadStroke} strokeWidth="1.2" />
			{IMPLANT_PATHS.macrothreads.map((d, i) => (<path key={i} d={d} fill={`url(#s9-ts-${theme})`} stroke={p.tiThreadStroke} strokeWidth="0.8" />))}
			{IMPLANT_PATHS.microgrooves.map((g, i) => (<line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={p.tiThreadStroke} strokeWidth="0.8" />))}
			<path d={IMPLANT_PATHS.leftCuttingFlute} fill={p.tiSlaEnd} opacity="0.75" />
			<path d={IMPLANT_PATHS.rightCuttingFlute} fill={p.tiSlaEnd} opacity="0.75" />
			<path d={IMPLANT_PATHS.healingAbutment} fill={`url(#s9-tp-${theme})`} stroke={p.tiThreadStroke} strokeWidth="1.2" strokeLinejoin="round" />
			<polygon points={IMPLANT_PATHS.hexDrive} fill={p.tiHexFill} stroke={p.tiThreadStroke} strokeWidth="0.8" />
		</svg>
	);
};
