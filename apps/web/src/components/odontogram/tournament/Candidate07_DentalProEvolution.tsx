/**
 * Candidate07_DentalProEvolution.tsx — Style #7: DentalPRO Evolution V3
 * Master Tournament Competitor: Semi-3D vector precision, golden ratio, fiery halo.
 * Mandate 8b: strictly <= 120 lines.
 */

import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { Candidate07Defs } from "./Candidate07_Defs";
import {
	DP_THEMES,
	DP_INCISOR_PATHS,
	DP_PREMOLAR_PATHS,
	DP_MOLAR_PATHS,
	DP_IMPLANT_PATHS,
} from "./Candidate07_Paths";

const SvgWrap: React.FC<{ theme?: "light" | "dark"; scale?: number; className?: string; children: React.ReactNode }> = ({
	scale = 1, className = "", children,
}) => (
	<svg viewBox="0 0 100 150" width={110 * scale} height={165 * scale} className={`select-none transition-transform duration-200 hover:scale-105 ${className}`} role="img">
		<Candidate07Defs />{children}
	</svg>
);

export const Candidate07_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale, className }) => {
	const c = DP_THEMES[theme];
	return (
		<SvgWrap theme={theme} scale={scale} className={className}>
			<path d={DP_INCISOR_PATHS.root} fill={c.rootFill} stroke={c.rootStroke} strokeWidth="1.2" />
			<path d={DP_INCISOR_PATHS.rootGroove} stroke={c.accentStroke} strokeWidth="0.8" strokeDasharray="2 1" fill="none" opacity={theme === "dark" ? 0.4 : 0.6} />
			<path d={DP_INCISOR_PATHS.cej} stroke={c.cejLine} strokeWidth="1.4" fill="none" />
			<path d={DP_INCISOR_PATHS.crown} fill={c.enamelFill} stroke={c.enamelStroke} strokeWidth="1.3" />
			<path d={DP_INCISOR_PATHS.mamelons} stroke={c.accentStroke} strokeWidth="0.75" opacity={0.5} />
			<path d={DP_INCISOR_PATHS.incisalHalo} fill={theme === "dark" ? "#38BDF8" : "#BAE6FD"} opacity={theme === "dark" ? 0.35 : 0.45} />
			<path d={DP_INCISOR_PATHS.shine1} stroke={c.highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity={theme === "dark" ? 0.4 : 0.75} />
			<path d={DP_INCISOR_PATHS.shine2} stroke={c.highlight} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={theme === "dark" ? 0.25 : 0.55} />
		</SvgWrap>
	);
};

export const Candidate07_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale, className }) => {
	const c = DP_THEMES[theme];
	return (
		<SvgWrap theme={theme} scale={scale} className={className}>
			<path d={DP_PREMOLAR_PATHS.roots} fill={c.rootFill} stroke={c.rootStroke} strokeWidth="1.2" />
			<path d={DP_PREMOLAR_PATHS.furcation} stroke={c.accentStroke} strokeWidth="1.2" fill="none" opacity={0.7} />
			<path d={DP_PREMOLAR_PATHS.cej} stroke={c.cejLine} strokeWidth="1.4" fill="none" />
			<path d={DP_PREMOLAR_PATHS.canalBuccal} stroke={c.pulpGlow} strokeWidth="3.2" strokeLinecap="round" opacity={0.35} fill="none" />
			<path d={DP_PREMOLAR_PATHS.canalBuccal} stroke={c.pulpCore} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d={DP_PREMOLAR_PATHS.canalPalatal} stroke={c.pulpGlow} strokeWidth="3.2" strokeLinecap="round" opacity={0.35} fill="none" />
			<path d={DP_PREMOLAR_PATHS.canalPalatal} stroke={c.pulpCore} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d={DP_PREMOLAR_PATHS.pulpChamber} fill={c.pulpGlow} opacity={0.85} />
			<path d={DP_PREMOLAR_PATHS.crown} fill={c.enamelFill} stroke={c.enamelStroke} strokeWidth="1.3" />
			<path d={DP_PREMOLAR_PATHS.sulcus} stroke={c.accentStroke} strokeWidth="1.1" strokeLinecap="round" fill="none" />
			<path d={DP_PREMOLAR_PATHS.shine} stroke={c.highlight} strokeWidth="2" strokeLinecap="round" opacity={theme === "dark" ? 0.35 : 0.7} fill="none" />
		</SvgWrap>
	);
};

export const Candidate07_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale, className }) => {
	const c = DP_THEMES[theme];
	return (
		<SvgWrap theme={theme} scale={scale} className={className}>
			<circle cx="24" cy="20" r="22" fill={c.haloShockwave} />
			<circle cx="24" cy="20" r="16" fill="url(#dp7-granuloma-halo)" filter="url(#dp7-glow-filter)" />
			<circle cx="24" cy="20" r="5" fill={c.haloCore} opacity="0.9" />
			<path d={DP_MOLAR_PATHS.roots} fill={c.rootFill} stroke={c.rootStroke} strokeWidth="1.2" />
			<path d={DP_MOLAR_PATHS.furcationMesial} stroke={c.accentStroke} strokeWidth="1.1" fill="none" opacity={0.75} />
			<path d={DP_MOLAR_PATHS.furcationDistal} stroke={c.accentStroke} strokeWidth="1.1" fill="none" opacity={0.75} />
			<path d={DP_MOLAR_PATHS.cej} stroke={c.cejLine} strokeWidth="1.4" fill="none" />
			<path d={DP_MOLAR_PATHS.canalMesial} stroke={c.pulpGlow} strokeWidth="3" opacity={0.4} fill="none" />
			<path d={DP_MOLAR_PATHS.canalMesial} stroke={c.pulpCore} strokeWidth="1.4" fill="none" />
			<path d={DP_MOLAR_PATHS.canalCentral} stroke={c.pulpGlow} strokeWidth="3" opacity={0.4} fill="none" />
			<path d={DP_MOLAR_PATHS.canalCentral} stroke={c.pulpCore} strokeWidth="1.4" fill="none" />
			<path d={DP_MOLAR_PATHS.canalDistal} stroke={c.pulpGlow} strokeWidth="3" opacity={0.4} fill="none" />
			<path d={DP_MOLAR_PATHS.canalDistal} stroke={c.pulpCore} strokeWidth="1.4" fill="none" />
			<path d={DP_MOLAR_PATHS.crown} fill={c.enamelFill} stroke={c.enamelStroke} strokeWidth="1.3" />
			<path d={DP_MOLAR_PATHS.fissures} stroke={c.accentStroke} strokeWidth="1.2" strokeLinecap="round" fill="none" />
			<path d={DP_MOLAR_PATHS.shine} stroke={c.highlight} strokeWidth="2.2" strokeLinecap="round" opacity={theme === "dark" ? 0.35 : 0.75} fill="none" />
		</SvgWrap>
	);
};

export const Candidate07_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale, className }) => {
	const c = DP_THEMES[theme];
	return (
		<SvgWrap theme={theme} scale={scale} className={className}>
			<path d={DP_IMPLANT_PATHS.body} fill={c.implantBody} stroke={c.accentStroke} strokeWidth="1.2" />
			<path d={DP_IMPLANT_PATHS.flutes} stroke={c.accentStroke} strokeWidth="1.2" strokeLinecap="round" />
			{DP_IMPLANT_PATHS.macroThreads.map((t) => (
				<g key={t.y}>
					<path d={`M ${50 - t.halfWidth},${t.y} L ${50 + t.halfWidth},${t.y} L ${50 + t.halfWidth - 2},${t.y + 4} L ${50 - t.halfWidth + 2},${t.y + 4} Z`} fill={theme === "dark" ? "#475569" : "#CBD5E1"} stroke={c.accentStroke} strokeWidth="0.8" />
					<line x1="46" y1={t.y + 1} x2="52" y2={t.y + 1} stroke={c.highlight} strokeWidth="1.4" strokeLinecap="round" opacity={0.8} />
				</g>
			))}
			{DP_IMPLANT_PATHS.microThreads.map((y) => (
				<line key={y} x1="33" y1={y} x2="67" y2={y} stroke={c.accentStroke} strokeWidth="0.8" />
			))}
			<rect {...DP_IMPLANT_PATHS.collar} rx="1.5" fill={theme === "dark" ? "#64748B" : "#E2E8F0"} stroke={c.accentStroke} strokeWidth="1.2" />
			<path d={DP_IMPLANT_PATHS.abutment} fill={c.abutmentFill} stroke="#B45309" strokeWidth="1.2" />
			<rect {...DP_IMPLANT_PATHS.shoulder} rx="1" fill={c.abutmentFill} stroke="#B45309" strokeWidth="1" />
			<path d={DP_IMPLANT_PATHS.healingCap} fill={theme === "dark" ? "#1E293B" : "#F1F5F9"} stroke={c.accentStroke} strokeWidth="1.2" />
			<polygon points={DP_IMPLANT_PATHS.hexSocket} fill={theme === "dark" ? "#0F172A" : "#CBD5E1"} stroke={c.accentStroke} strokeWidth="0.9" />
			<text x="50" y="92" textAnchor="middle" fontSize="4.2" fontFamily="monospace" fill={theme === "dark" ? "#94A3B8" : "#475569"} fontWeight="bold">Ø4.2 SLA</text>
		</SvgWrap>
	);
};

export default Candidate07_Incisor;
