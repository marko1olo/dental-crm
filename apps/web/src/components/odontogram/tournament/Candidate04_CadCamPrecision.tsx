/**
 * DENTE Odontogram Tournament - Competitor #4: CAD/CAM Bio-Engineering
 * Straumann/Bicon precision vector render of 4 benchmark teeth.
 */

import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { CAD_COLORS, CAD_INCISOR, CAD_PREMOLAR, CAD_MOLAR, CAD_IMPLANT, CAD_THREADS } from "./Candidate04_Paths";

const Defs: React.FC<{ isDark: boolean; p: string }> = ({ isDark, p }) => {
	const c = isDark ? CAD_COLORS.dark : CAD_COLORS.light;
	return (
		<defs>
			<linearGradient id={`${p}-enamel`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" /><stop offset="60%" stopColor={c.enamelMid} /><stop offset="100%" stopColor={c.enamelEnd} /></linearGradient>
			<linearGradient id={`${p}-dentin`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c.dentinStart} /><stop offset="100%" stopColor={c.dentinEnd} /></linearGradient>
			<linearGradient id={`${p}-ti-sla`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c.tiStart} /><stop offset="45%" stopColor="#f1f5f9" /><stop offset="100%" stopColor={c.tiEnd} /></linearGradient>
			<linearGradient id={`${p}-ti-mir`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#64748b" /><stop offset="35%" stopColor="#fff" /><stop offset="100%" stopColor="#475569" /></linearGradient>
			<linearGradient id={`${p}-gp`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#e11d48" /><stop offset="50%" stopColor="#fb7185" /><stop offset="100%" stopColor="#be123c" /></linearGradient>
			<radialGradient id={`${p}-glow`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f43f5e" /><stop offset="60%" stopColor="#ea580c" stopOpacity="0.7" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
			<filter id={`${p}-blur`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" /></filter>
			<pattern id={`${p}-micro`} width="2" height="1.6" patternUnits="userSpaceOnUse"><line x1="0" y1="0.8" x2="2" y2="0.8" stroke="#64748b" strokeWidth="0.5" strokeOpacity="0.6" /></pattern>
		</defs>
	);
};

export const Candidate04_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = theme === "dark" ? CAD_COLORS.dark : CAD_COLORS.light;
	return (
		<svg width={105 * scale} height={160 * scale} viewBox="0 0 120 180" className={className} data-testid="cadcam-incisor">
			<Defs isDark={theme === "dark"} p="c04-i" />
			<line x1="60" y1="8" x2="60" y2="168" stroke={c.technical} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35" />
			<path d={CAD_INCISOR.root} fill="url(#c04-i-dentin)" stroke={c.strokePrimary} strokeWidth="1.6" />
			<path d={CAD_INCISOR.pulp} fill={c.pulp} opacity="0.85" />
			<path d={CAD_INCISOR.cej} fill="none" stroke={c.cej} strokeWidth="2.2" strokeLinecap="round" />
			<path d={CAD_INCISOR.crown} fill="url(#c04-i-enamel)" stroke={c.strokePrimary} strokeWidth="1.8" />
			<path d={CAD_INCISOR.grooveM} fill="none" stroke={c.strokeSecondary} strokeWidth="1.2" strokeDasharray="4 2" opacity="0.4" />
			<path d={CAD_INCISOR.grooveD} fill="none" stroke={c.strokeSecondary} strokeWidth="1.2" strokeDasharray="4 2" opacity="0.4" />
			<path d={CAD_INCISOR.halo} fill="#38bdf8" opacity="0.4" />
			<text x="60" y="174" textAnchor="middle" fill={c.cadText} fontSize="7.5" fontFamily="monospace" fontWeight="bold">CEJ: 2.8mm | e.max CAD</text>
		</svg>
	);
};

export const Candidate04_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = theme === "dark" ? CAD_COLORS.dark : CAD_COLORS.light;
	return (
		<svg width={105 * scale} height={160 * scale} viewBox="0 0 120 180" className={className} data-testid="cadcam-premolar">
			<Defs isDark={theme === "dark"} p="c04-p" />
			<line x1="60" y1="8" x2="60" y2="168" stroke={c.technical} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.3" />
			<path d={CAD_PREMOLAR.rootPalatal} fill="url(#c04-p-dentin)" stroke={c.strokePrimary} strokeWidth="1.6" />
			<path d={CAD_PREMOLAR.guttaPercha} fill="url(#c04-p-gp)" stroke="#e11d48" strokeWidth="0.6" />
			<circle cx="44" cy="21" r="2.2" fill="#fb7185" opacity="0.9" />
			<path d={CAD_PREMOLAR.rootBuccal} fill="url(#c04-p-dentin)" stroke={c.strokePrimary} strokeWidth="1.6" />
			<path d={CAD_PREMOLAR.nitiShaft} fill={c.technical} stroke="#0284c7" strokeWidth="0.7" />
			<rect x="74" y="14" width="4.5" height="6" rx="1" fill="#f59e0b" stroke="#b45309" strokeWidth="0.6" />
			<path d={CAD_PREMOLAR.accessCavity} fill={c.pulp} opacity="0.35" stroke={c.strokeSecondary} strokeWidth="0.8" strokeDasharray="2 2" />
			<path d={CAD_PREMOLAR.cej} fill="none" stroke={c.cej} strokeWidth="2.2" strokeLinecap="round" />
			<path d={CAD_PREMOLAR.crown} fill="url(#c04-p-enamel)" stroke={c.strokePrimary} strokeWidth="1.8" />
			<path d={CAD_PREMOLAR.ridgeBuccal} fill="none" stroke={c.strokeSecondary} strokeWidth="1.4" />
			<path d={CAD_PREMOLAR.ridgePalatal} fill="none" stroke={c.strokeSecondary} strokeWidth="1.4" />
			<text x="60" y="174" textAnchor="middle" fill={c.cadText} fontSize="7.5" fontFamily="monospace" fontWeight="bold">NiTi .06 | GP 3D OBT</text>
		</svg>
	);
};

export const Candidate04_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = theme === "dark" ? CAD_COLORS.dark : CAD_COLORS.light;
	return (
		<svg width={105 * scale} height={160 * scale} viewBox="0 0 120 180" className={className} data-testid="cadcam-molar">
			<Defs isDark={theme === "dark"} p="c04-m" />
			<line x1="60" y1="8" x2="60" y2="168" stroke={c.technical} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.3" />
			<path d={CAD_MOLAR.furcationTrunk} fill="url(#c04-m-dentin)" stroke={c.strokePrimary} strokeWidth="1.8" />
			<path d={CAD_MOLAR.canalMesial} fill={c.pulp} opacity="0.8" />
			<path d={CAD_MOLAR.canalDistal} fill={c.pulp} opacity="0.8" />
			<path d={CAD_MOLAR.pulpChamber} fill={c.pulp} opacity="0.8" />
			<circle cx="36" cy="146" r="18" fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.75" />
			<circle cx="36" cy="146" r="15" fill="url(#c04-m-glow)" filter="url(#c04-m-blur)" />
			<circle cx="36" cy="146" r="9" fill="#ef4444" opacity="0.9" />
			<circle cx="36" cy="146" r="4.5" fill="#fde047" opacity="0.95" />
			<path d={CAD_MOLAR.crown} fill="url(#c04-m-enamel)" stroke={c.strokePrimary} strokeWidth="1.8" />
			<path d={CAD_MOLAR.fissures} fill="none" stroke={c.strokeSecondary} strokeWidth="1.4" strokeLinecap="round" />
			<text x="60" y="174" textAnchor="middle" fill="#ef4444" fontSize="7.5" fontFamily="monospace" fontWeight="bold">Ø 4.8mm PA GRANULOMA</text>
		</svg>
	);
};

export const Candidate04_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const c = theme === "dark" ? CAD_COLORS.dark : CAD_COLORS.light;
	return (
		<svg width={105 * scale} height={160 * scale} viewBox="0 0 120 180" className={className} data-testid="cadcam-implant">
			<Defs isDark={theme === "dark"} p="c04-imp" />
			<line x1="60" y1="8" x2="60" y2="168" stroke={c.technical} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35" />
			<path d={CAD_IMPLANT.fixtureBody} fill="url(#c04-imp-ti-sla)" stroke={c.strokePrimary} strokeWidth="1.6" />
			{CAD_THREADS.map((t) => (
				<g key={t.y}>
					<line x1={t.xLeft} y1={t.y + 1} x2={t.xRight} y2={t.y + 2.5} stroke={c.threadShadow} strokeWidth="1.8" strokeLinecap="round" />
					<line x1={t.xLeft} y1={t.y} x2={t.xRight} y2={t.y + 1.5} stroke={c.threadCrest} strokeWidth="1.4" strokeLinecap="round" />
				</g>
			))}
			<path d={CAD_IMPLANT.apicalFluteLeft} fill={c.socketBg} stroke={c.strokeSecondary} strokeWidth="0.8" />
			<path d={CAD_IMPLANT.apicalFluteRight} fill={c.socketBg} stroke={c.strokeSecondary} strokeWidth="0.8" />
			<path d={CAD_IMPLANT.microCollar} fill="url(#c04-imp-micro)" stroke={c.strokePrimary} strokeWidth="1.2" />
			<path d={CAD_IMPLANT.platformCollar} fill="url(#c04-imp-ti-mir)" stroke={c.strokePrimary} strokeWidth="1.4" />
			<path d={CAD_IMPLANT.healingAbutment} fill="url(#c04-imp-ti-mir)" stroke={c.strokePrimary} strokeWidth="1.8" strokeLinejoin="round" />
			<line x1="51" y1="21" x2="49" y2="55" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.75" />
			<polygon points="56,22 64,22 68,26 64,30 56,30 52,26" fill={c.socketBg} stroke="#94a3b8" strokeWidth="0.8" />
			<text x="60" y="44" textAnchor="middle" fill={theme === "dark" ? "#e2e8f0" : "#334155"} fontSize="6.5" fontFamily="monospace" fontWeight="bold">Ø4.5 GH3</text>
			<text x="60" y="174" textAnchor="middle" fill={c.cadText} fontSize="7.5" fontFamily="monospace" fontWeight="bold">BLX Ø4.1x11.5 | MORSE</text>
		</svg>
	);
};
