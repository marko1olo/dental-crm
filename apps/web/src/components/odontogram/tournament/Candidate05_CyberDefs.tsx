import React from "react";
import { CYBER_PALETTES } from "./Candidate05_Paths";

export interface CyberDefsProps {
	readonly prefix: string;
	readonly isDark: boolean;
}

export const CyberDefs: React.FC<CyberDefsProps> = ({ prefix, isDark }) => {
	const p = isDark ? CYBER_PALETTES.dark : CYBER_PALETTES.light;
	return (
		<defs>
			<linearGradient id={`${prefix}-enamel`} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor={p.enamelGradStart} />
				<stop offset="45%" stopColor={isDark ? "#1e293b" : "#f0f9ff"} />
				<stop offset="100%" stopColor={p.enamelGradEnd} />
			</linearGradient>

			<linearGradient id={`${prefix}-root`} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor={isDark ? "#172554" : "#e0f2fe"} />
				<stop offset="100%" stopColor={isDark ? "#0f172a" : "#bae6fd"} />
			</linearGradient>

			<linearGradient id={`${prefix}-titanium`} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor={p.titaniumStart} />
				<stop offset="40%" stopColor={isDark ? "#334155" : "#475569"} />
				<stop offset="70%" stopColor={p.titaniumEnd} />
				<stop offset="100%" stopColor={isDark ? "#090d16" : "#1e293b"} />
			</linearGradient>

			<linearGradient id={`${prefix}-chrome`} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor={p.chromeStart} />
				<stop offset="25%" stopColor="#94a3b8" />
				<stop offset="45%" stopColor="#ffffff" />
				<stop offset="70%" stopColor="#64748b" />
				<stop offset="100%" stopColor={p.chromeEnd} />
			</linearGradient>

			<radialGradient id={`${prefix}-flame-halo`} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
				<stop offset="35%" stopColor="#f59e0b" stopOpacity="0.85" />
				<stop offset="70%" stopColor="#f43f5e" stopOpacity="0.4" />
				<stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
			</radialGradient>

			<filter id={`${prefix}-neon-glow`} x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={p.neonGlow} floodOpacity={isDark ? "0.8" : "0.5"} />
			</filter>

			<filter id={`${prefix}-canal-glow`} x="-30%" y="-30%" width="160%" height="160%">
				<feDropShadow dx="0" dy="0" stdDeviation="3.0" floodColor={p.canalPulse} floodOpacity="0.9" />
			</filter>

			<filter id={`${prefix}-pathology-glow`} x="-40%" y="-40%" width="180%" height="180%">
				<feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#ff2d55" floodOpacity="0.9" />
			</filter>
		</defs>
	);
};
