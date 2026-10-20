import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { CYBER_VIEWBOX, CYBER_PALETTES, INCISOR_PATHS, PREMOLAR_PATHS, MOLAR_PATHS, IMPLANT_PATHS } from "./Candidate05_Paths";
import { CyberDefs } from "./Candidate05_CyberDefs";

export const Candidate05_Incisor: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = isDark ? CYBER_PALETTES.dark : CYBER_PALETTES.light;
	return (
		<svg viewBox={CYBER_VIEWBOX} width={100 * scale} height={160 * scale} className={`transition-all duration-300 ${className}`}>
			<CyberDefs prefix="c05-inc" isDark={isDark} />
			<path d={INCISOR_PATHS.root} fill="url(#c05-inc-root)" stroke={p.enamelStroke} strokeWidth="1.4" opacity="0.9" />
			<path d={INCISOR_PATHS.rootCanal} stroke={p.neonGlow} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
			<path d={INCISOR_PATHS.rootHighlight} stroke="#ffffff" strokeWidth="1.2" opacity={isDark ? "0.2" : "0.5"} fill="none" />
			<path d={INCISOR_PATHS.crown} fill="url(#c05-inc-enamel)" stroke={p.enamelStroke} strokeWidth="2" filter="url(#c05-inc-neon-glow)" />
			<path d={INCISOR_PATHS.innerFacet} fill={p.dentinFill} opacity={isDark ? "0.35" : "0.15"} />
			<path d={INCISOR_PATHS.mamelonGroove1} stroke={p.enamelStroke} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
			<path d={INCISOR_PATHS.mamelonGroove2} stroke={p.enamelStroke} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
			<path d={INCISOR_PATHS.incisalFacet} fill="#38bdf8" opacity={isDark ? "0.35" : "0.2"} />
			<path d={INCISOR_PATHS.specularHighlight} stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity={isDark ? "0.8" : "0.9"} fill="none" />
			<path d={INCISOR_PATHS.cejLine} stroke={p.enamelStroke} strokeWidth="1.2" fill="none" opacity="0.8" />
			<text x="8" y="14" fill={p.hudText} fontSize="6" fontFamily="monospace" fontWeight="700" letterSpacing="0.5">11·INTACT</text>
		</svg>
	);
};

export const Candidate05_Premolar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = isDark ? CYBER_PALETTES.dark : CYBER_PALETTES.light;
	return (
		<svg viewBox={CYBER_VIEWBOX} width={100 * scale} height={160 * scale} className={`transition-all duration-300 ${className}`}>
			<CyberDefs prefix="c05-pre" isDark={isDark} />
			<path d={PREMOLAR_PATHS.roots} fill="url(#c05-pre-root)" stroke={p.enamelStroke} strokeWidth="1.4" opacity="0.9" />
			<path d={PREMOLAR_PATHS.bifurcationNotch} stroke={p.enamelStroke} strokeWidth="1.2" fill="none" opacity="0.7" />
			<g filter="url(#c05-pre-canal-glow)">
				<path d={PREMOLAR_PATHS.canalBuccal} stroke={p.canalPulse} strokeWidth="3" fill="none" strokeLinecap="round" />
				<path d={PREMOLAR_PATHS.canalPalatal} stroke={p.canalPulse} strokeWidth="3" fill="none" strokeLinecap="round" />
				<path d={PREMOLAR_PATHS.pulpChamber} fill={p.canalPulse} />
			</g>
			<path d={PREMOLAR_PATHS.canalBuccal} stroke={p.canalCore} strokeWidth="1.2" fill="none" strokeLinecap="round" />
			<path d={PREMOLAR_PATHS.canalPalatal} stroke={p.canalCore} strokeWidth="1.2" fill="none" strokeLinecap="round" />
			<path d={PREMOLAR_PATHS.crown} fill="url(#c05-pre-enamel)" stroke={p.enamelStroke} strokeWidth="2" filter="url(#c05-pre-neon-glow)" />
			<path d={PREMOLAR_PATHS.centralGroove} stroke={p.enamelStroke} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
			<path d={PREMOLAR_PATHS.cuspRidgeBuccal} stroke="#ffffff" strokeWidth="1.4" opacity={isDark ? "0.4" : "0.7"} fill="none" />
			<path d={PREMOLAR_PATHS.cuspRidgePalatal} stroke="#ffffff" strokeWidth="1.4" opacity={isDark ? "0.4" : "0.7"} fill="none" />
			<text x="8" y="14" fill={p.canalPulse} fontSize="6" fontFamily="monospace" fontWeight="700">14·ENDO</text>
		</svg>
	);
};

export const Candidate05_Molar: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = isDark ? CYBER_PALETTES.dark : CYBER_PALETTES.light;
	return (
		<svg viewBox={CYBER_VIEWBOX} width={100 * scale} height={160 * scale} className={`transition-all duration-300 ${className}`}>
			<CyberDefs prefix="c05-mol" isDark={isDark} />
			<g filter="url(#c05-mol-pathology-glow)">
				<path d={MOLAR_PATHS.pathologyHaloMesial} fill="url(#c05-mol-flame-halo)" />
				<path d={MOLAR_PATHS.pathologyFlameCore} fill={p.flameCore} />
			</g>
			<path d={MOLAR_PATHS.pathologyRays} stroke={p.flameHalo} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
			<circle cx="28" cy="147" r="11" fill="none" stroke={p.flameHalo} strokeWidth="0.8" strokeDasharray="2 2" />
			<path d={MOLAR_PATHS.roots} fill="url(#c05-mol-root)" stroke={p.enamelStroke} strokeWidth="1.5" />
			<path d={MOLAR_PATHS.furcationGutter} stroke={p.enamelStroke} strokeWidth="1.2" />
			<g filter="url(#c05-mol-canal-glow)">
				{[MOLAR_PATHS.canalMesiobuccal, MOLAR_PATHS.canalMesiolingual, MOLAR_PATHS.canalDistal].map((d, i) => (
					<path key={i} d={d} stroke={p.canalPulse} strokeWidth="2.8" fill="none" />
				))}
				<path d={MOLAR_PATHS.pulpChamber} fill={p.canalPulse} />
			</g>
			{[MOLAR_PATHS.canalMesiobuccal, MOLAR_PATHS.canalMesiolingual, MOLAR_PATHS.canalDistal].map((d, i) => (
				<path key={i} d={d} stroke={p.canalCore} strokeWidth="1" fill="none" />
			))}
			<path d={MOLAR_PATHS.crown} fill="url(#c05-mol-enamel)" stroke={p.enamelStroke} strokeWidth="2" filter="url(#c05-mol-neon-glow)" />
			<path d={MOLAR_PATHS.crownGrooves} stroke={p.enamelStroke} strokeWidth="1.2" opacity="0.6" fill="none" />
			<path d={MOLAR_PATHS.cuspHighlights} stroke="#ffffff" strokeWidth="1.4" opacity={isDark ? "0.5" : "0.8"} fill="none" />
			<text x="8" y="14" fill={p.flameHalo} fontSize="6" fontFamily="monospace" fontWeight="700">46·GRANULOMA</text>
		</svg>
	);
};

export const Candidate05_Implant: React.FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const isDark = theme === "dark";
	const p = isDark ? CYBER_PALETTES.dark : CYBER_PALETTES.light;
	return (
		<svg viewBox={CYBER_VIEWBOX} width={100 * scale} height={160 * scale} className={`transition-all duration-300 ${className}`}>
			<CyberDefs prefix="c05-imp" isDark={isDark} />
			<path d={IMPLANT_PATHS.fixtureBody} fill="url(#c05-imp-titanium)" stroke="#334155" strokeWidth="1.5" />
			<path d={IMPLANT_PATHS.apicalDome} fill="url(#c05-imp-titanium)" stroke="#334155" strokeWidth="1.5" />
			<path d={IMPLANT_PATHS.apicalFlute} fill="#090d16" stroke={p.titaniumHighlight} strokeWidth="1" />
			{IMPLANT_PATHS.collarGrooves.map((g, i) => (
				<line key={i} x1={g.x1} y1={g.y} x2={g.x2} y2={g.y} stroke={p.titaniumHighlight} strokeWidth="1" opacity="0.6" strokeDasharray="2 1" />
			))}
			{IMPLANT_PATHS.threads.map((t, i) => (
				<g key={i}>
					<line x1={t.x1} y1={t.y} x2={t.x2} y2={t.y + 1} stroke={p.titaniumHighlight} strokeWidth="1.8" filter="url(#c05-imp-neon-glow)" />
					<line x1={t.x1} y1={t.y + 1} x2={t.x2} y2={t.y + 2} stroke="#ffffff" strokeWidth="0.8" opacity="0.9" />
				</g>
			))}
			{IMPLANT_PATHS.depthMarks.map((d, i) => (
				<g key={i}>
					<line x1={65} y1={d.y} x2={70} y2={d.y} stroke={p.titaniumHighlight} strokeWidth="1" />
					<text x={d.x} y={d.y + 2.5} fill={p.hudText} fontSize="5" fontFamily="monospace" fontWeight="600">{d.label}</text>
				</g>
			))}
			<path d={IMPLANT_PATHS.formerBevel} fill="#475569" stroke="#94a3b8" strokeWidth="1" />
			<path d={IMPLANT_PATHS.formerCap} fill="url(#c05-imp-chrome)" stroke="#cbd5e1" strokeWidth="1.6" />
			<path d={IMPLANT_PATHS.formerHighlight} stroke="#ffffff" strokeWidth="1.8" opacity="0.85" strokeLinecap="round" />
			<polygon points="46,27 54,27 57,30 54,33 46,33 43,30" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
			<text x="8" y="14" fill={p.hudText} fontSize="6" fontFamily="monospace" fontWeight="700">Ti·SLA 4.5</text>
		</svg>
	);
};
