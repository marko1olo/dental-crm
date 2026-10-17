/**
 * DENTE Dental CRM — Mandibular Implant Fixture SVG
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";

export const LowerImplantFixture: React.FC = () => {
	return (
		<g className="implant-lower-fixture">
			{/* Tapered Titanium SLA Fixture */}
			<path
				d="M 28 75 L 34 135 Q 50 148 66 135 L 72 75 Z"
				fill="url(#titanium-implant-gradient)"
				stroke="#334155"
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			{/* Crestal Micro-grooves */}
			<rect x="29" y="76" width="42" height="4" fill="url(#implant-microgrooves-pattern)" />
			<line x1="28.5" y1="78" x2="71.5" y2="78" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />

			{/* Self-Tapping Helical Thread Ridges */}
			<line x1="29" y1="81" x2="71" y2="83" stroke="#f1f5f9" strokeWidth="1.5" />
			<line x1="29" y1="82.5" x2="71" y2="84.5" stroke="#1e293b" strokeWidth="1.2" />
			<line x1="30" y1="93" x2="70" y2="95" stroke="#f1f5f9" strokeWidth="1.5" />
			<line x1="30" y1="94.5" x2="70" y2="96.5" stroke="#1e293b" strokeWidth="1.2" />
			<line x1="32" y1="105" x2="68" y2="107" stroke="#f1f5f9" strokeWidth="1.5" />
			<line x1="32" y1="106.5" x2="68" y2="108.5" stroke="#1e293b" strokeWidth="1.2" />
			<line x1="34" y1="117" x2="66" y2="119" stroke="#f1f5f9" strokeWidth="1.5" />
			<line x1="34" y1="118.5" x2="66" y2="120.5" stroke="#1e293b" strokeWidth="1.2" />
			<line x1="36" y1="129" x2="64" y2="131" stroke="#f1f5f9" strokeWidth="1.5" />
			<line x1="36" y1="130.5" x2="64" y2="132.5" stroke="#1e293b" strokeWidth="1.2" />

			{/* Apical Vent Cutting Flute Slot */}
			<path d="M 46 146 L 50 132 L 54 146" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />

			{/* Internal Hex Connector */}
			<polygon points="44,71 56,71 60,68 56,65 44,65 40,68" fill="url(#implant-hex-gradient)" stroke="#475569" strokeWidth="0.8" />
			{/* Gold/TiN Transgingival Abutment Collar */}
			<rect x="27" y="71" width="46" height="6" rx="2" fill="url(#gold-crown-gradient)" stroke="#b45309" strokeWidth="1.2" />
		</g>
	);
};
