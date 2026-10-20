/**
 * Candidate10_DenteSignature.tsx — DENTE SIGNATURE MASTER (КИНЕМАТОГРАФИЧЕСКИЙ СИНТЕЗ)
 * Style #10: Flagship clinical vector rendering, noble pearl enamel, coral endo, fiery halo & SLA titanium.
 */

import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { Candidate10Defs, C10_INCISOR, C10_PREMOLAR, C10_MOLAR, C10_IMPLANT } from "./Candidate10_Paths";

const baseSvg = (theme: "light" | "dark", scale: number, vb = "0 0 100 160", cls = "") => ({
	viewBox: vb,
	width: (vb.startsWith("0 0 110") ? 110 : 100) * scale,
	height: 160 * scale,
	className: `c10-svg select-none transition-transform duration-200 hover:scale-105 ${cls}`,
	stroke: theme === "dark" ? "#0f172a" : "#334155",
});

export const Candidate10_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const s = baseSvg(theme, scale, "0 0 100 160", className);
	const isDark = theme === "dark";
	return (
		<svg {...s}>
			<Candidate10Defs theme={theme} />
			<path d={C10_INCISOR.root} fill="url(#c10-cementum-grad)" stroke={s.stroke} strokeWidth="1.6" strokeLinejoin="round" />
			<path d={C10_INCISOR.rootRidge} stroke={isDark ? "#334155" : "#d7c3aa"} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
			<path d={C10_INCISOR.cejLine} stroke={s.stroke} strokeWidth="1.2" fill="none" opacity="0.4" />
			<path d={C10_INCISOR.crown} fill="url(#c10-enamel-grad)" stroke={s.stroke} strokeWidth="1.8" strokeLinejoin="round" />
			<path d={C10_INCISOR.incisalHalo} fill="url(#c10-incisal-halo)" />
			<path d={C10_INCISOR.mamelonGroove1} stroke={isDark ? "#64748b" : "#cbd5e1"} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7" />
			<path d={C10_INCISOR.mamelonGroove2} stroke={isDark ? "#64748b" : "#cbd5e1"} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7" />
			<path d={C10_INCISOR.specularHighlight} fill="#ffffff" opacity={isDark ? 0.35 : 0.65} />
		</svg>
	);
};

export const Candidate10_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const s = baseSvg(theme, scale, "0 0 100 160", className);
	const isDark = theme === "dark";
	return (
		<svg {...s}>
			<Candidate10Defs theme={theme} />
			<path d={C10_PREMOLAR.roots} fill="url(#c10-cementum-grad)" stroke={s.stroke} strokeWidth="1.6" strokeLinejoin="round" />
			<path d={C10_PREMOLAR.furcationShadow} stroke={isDark ? "#1e293b" : "#c4b5a0"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d={C10_PREMOLAR.canalBuccal} fill="url(#c10-guttapercha-grad)" stroke="url(#c10-sealer-grad)" strokeWidth="0.8" />
			<path d={C10_PREMOLAR.canalPalatal} fill="url(#c10-guttapercha-grad)" stroke="url(#c10-sealer-grad)" strokeWidth="0.8" />
			<path d={C10_PREMOLAR.crown} fill="url(#c10-enamel-grad)" stroke={s.stroke} strokeWidth="1.8" strokeLinejoin="round" />
			<path d={C10_PREMOLAR.pulpChamber} fill="url(#c10-guttapercha-grad)" opacity="0.85" />
			<path d={C10_PREMOLAR.occlusalFissure} stroke={s.stroke} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={C10_PREMOLAR.cuspRidgeLeft} stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={isDark ? 0.3 : 0.6} />
			<path d={C10_PREMOLAR.cuspRidgeRight} stroke="#ffffff" strokeWidth="1" strokeLinecap="round" fill="none" opacity={isDark ? 0.2 : 0.4} />
		</svg>
	);
};

export const Candidate10_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const s = baseSvg(theme, scale, "0 0 110 160", className);
	const isDark = theme === "dark";
	return (
		<svg {...s}>
			<Candidate10Defs theme={theme} />
			<g filter="url(#c10-glow-filter)">
				<circle cx={C10_MOLAR.granulomaMesialCenter.cx} cy={C10_MOLAR.granulomaMesialCenter.cy} r={C10_MOLAR.granulomaMesialCenter.r} fill="url(#c10-granuloma-radial)" />
				<circle cx={C10_MOLAR.granulomaDistalCenter.cx} cy={C10_MOLAR.granulomaDistalCenter.cy} r={C10_MOLAR.granulomaDistalCenter.r} fill="url(#c10-granuloma-radial)" />
				<path d={C10_MOLAR.granulomaCoronaMesial} fill="url(#c10-granuloma-flare)" />
				<path d={C10_MOLAR.granulomaCoronaDistal} fill="url(#c10-granuloma-flare)" />
			</g>
			<path d={C10_MOLAR.roots} fill="url(#c10-cementum-grad)" stroke={s.stroke} strokeWidth="1.6" strokeLinejoin="round" />
			<path d={C10_MOLAR.furcationArch} stroke={isDark ? "#1e293b" : "#c4b5a0"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d={C10_MOLAR.canalMesial} fill="#ef4444" opacity={isDark ? 0.5 : 0.35} />
			<path d={C10_MOLAR.canalDistal} fill="#ef4444" opacity={isDark ? 0.5 : 0.35} />
			<path d={C10_MOLAR.pulpChamber} fill="#ef4444" opacity={isDark ? 0.45 : 0.3} />
			<path d={C10_MOLAR.crown} fill="url(#c10-enamel-grad)" stroke={s.stroke} strokeWidth="1.8" strokeLinejoin="round" />
			<path d={C10_MOLAR.fissureMain} stroke={s.stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
			<path d={C10_MOLAR.fissureBranch1} stroke={s.stroke} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
			<path d={C10_MOLAR.fissureBranch2} stroke={s.stroke} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
		</svg>
	);
};

export const Candidate10_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const s = baseSvg(theme, scale, "0 0 100 160", className);
	const isDark = theme === "dark";
	return (
		<svg {...s}>
			<Candidate10Defs theme={theme} />
			<path d={C10_IMPLANT.fixtureBody} fill="url(#c10-titanium-sla)" stroke={s.stroke} strokeWidth="1.6" strokeLinejoin="round" />
			{C10_IMPLANT.threads.map((t, i) => (
				<g key={i}>
					<line x1={t.xLeft} y1={t.yLeft} x2={t.xRight} y2={t.yRight} stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="1.4" opacity="0.9" />
					<line x1={t.xLeft} y1={t.yLeft + 1.2} x2={t.xRight} y2={t.yRight + 1.2} stroke={isDark ? "#0f172a" : "#1e293b"} strokeWidth="1.2" opacity="0.8" />
				</g>
			))}
			<path d={C10_IMPLANT.apicalFlute} stroke={isDark ? "#0f172a" : "#1e293b"} strokeWidth="1.6" strokeLinecap="round" fill="none" />
			{C10_IMPLANT.microthreads.map((y, i) => (
				<line key={i} x1="30" y1={y} x2="70" y2={y} stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeWidth="0.8" strokeDasharray="2 1.5" />
			))}
			<path d={C10_IMPLANT.collar} fill="url(#c10-titanium-sla)" stroke={s.stroke} strokeWidth="1.2" />
			<path d={C10_IMPLANT.goldRing} fill="url(#c10-gold-collar)" stroke="#b45309" strokeWidth="0.8" />
			<path d={C10_IMPLANT.healingDome} fill="url(#c10-mirror-abutment)" stroke={s.stroke} strokeWidth="1.8" strokeLinejoin="round" />
			<path d={C10_IMPLANT.mirrorReflection} fill="#ffffff" opacity={isDark ? 0.35 : 0.65} />
			<path d={C10_IMPLANT.driverSlotHex} fill={isDark ? "#0f172a" : "#1e293b"} stroke="#475569" strokeWidth="0.8" />
			<path d={C10_IMPLANT.driverSlotLine} stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
		</svg>
	);
};
