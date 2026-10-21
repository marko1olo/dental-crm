/**
 * Candidate07_Defs.tsx — APEX EVOLUTION V3 Shared SVG Defs & Filters
 */

import React from "react";

export const Candidate07Defs: React.FC = () => (
	<defs>
		<linearGradient id="dp7-enamel-grad-light" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#E2E8F0" /><stop offset="50%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#CBD5E1" />
		</linearGradient>
		<linearGradient id="dp7-enamel-grad-dark" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#1E293B" /><stop offset="50%" stopColor="#475569" /><stop offset="100%" stopColor="#0F172A" />
		</linearGradient>
		<linearGradient id="dp7-root-grad-light" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#CBD5E1" /><stop offset="50%" stopColor="#F1F5F9" /><stop offset="100%" stopColor="#94A3B8" />
		</linearGradient>
		<linearGradient id="dp7-root-grad-dark" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#0F172A" /><stop offset="50%" stopColor="#334155" /><stop offset="100%" stopColor="#0B0F17" />
		</linearGradient>
		<radialGradient id="dp7-granuloma-halo" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stopColor="#FEF08A" stopOpacity="1" />
			<stop offset="30%" stopColor="#EF4444" stopOpacity="0.9" />
			<stop offset="65%" stopColor="#DC2626" stopOpacity="0.7" />
			<stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
		</radialGradient>
		<radialGradient id="dp7-granuloma-wave" cx="50%" cy="50%" r="50%">
			<stop offset="60%" stopColor="#F97316" stopOpacity="0" /><stop offset="85%" stopColor="#EF4444" stopOpacity="0.4" /><stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
		</radialGradient>
		<linearGradient id="dp7-implant-grad-light" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#475569" /><stop offset="45%" stopColor="#F1F5F9" /><stop offset="100%" stopColor="#334155" />
		</linearGradient>
		<linearGradient id="dp7-implant-grad-dark" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#0F172A" /><stop offset="45%" stopColor="#94A3B8" /><stop offset="100%" stopColor="#020617" />
		</linearGradient>
		<linearGradient id="dp7-abutment-gold-light" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#B45309" /><stop offset="50%" stopColor="#FEF08A" /><stop offset="100%" stopColor="#92400E" />
		</linearGradient>
		<linearGradient id="dp7-abutment-gold-dark" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#78350F" /><stop offset="50%" stopColor="#FDE047" /><stop offset="100%" stopColor="#451A03" />
		</linearGradient>
		<filter id="dp7-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur stdDeviation="1.5" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" />
		</filter>
	</defs>
);
