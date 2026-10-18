import React from "react";

export const UpperImplantGraphic: React.FC = () => (
	<g className="implant-upper-fixture">
		{/* Tapered Fixture Body */}
		<path
			d="M 28 85 L 34 25 Q 50 12 66 25 L 72 85 Z"
			fill="url(#titanium-implant-gradient)"
			stroke="#334155"
			strokeWidth="1.8"
			strokeLinejoin="round"
		/>
		{/* Crestal Micro-grooves */}
		<rect x="29" y="80" width="42" height="4" fill="url(#implant-microgrooves-pattern)" />
		<line x1="28.5" y1="82" x2="71.5" y2="82" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />

		{/* Self-Tapping Helical Thread Ridges */}
		<line x1="36" y1="31" x2="64" y2="33" stroke="#f1f5f9" strokeWidth="1.5" />
		<line x1="36" y1="32.5" x2="64" y2="34.5" stroke="#1e293b" strokeWidth="1.2" />
		<line x1="34" y1="43" x2="66" y2="45" stroke="#f1f5f9" strokeWidth="1.5" />
		<line x1="34" y1="44.5" x2="66" y2="46.5" stroke="#1e293b" strokeWidth="1.2" />
		<line x1="32" y1="55" x2="68" y2="57" stroke="#f1f5f9" strokeWidth="1.5" />
		<line x1="32" y1="56.5" x2="68" y2="58.5" stroke="#1e293b" strokeWidth="1.2" />
		<line x1="30" y1="67" x2="70" y2="69" stroke="#f1f5f9" strokeWidth="1.5" />
		<line x1="30" y1="68.5" x2="70" y2="70.5" stroke="#1e293b" strokeWidth="1.2" />
		<line x1="29" y1="77" x2="71" y2="79" stroke="#f1f5f9" strokeWidth="1.5" />
		<line x1="29" y1="78.5" x2="71" y2="80.5" stroke="#1e293b" strokeWidth="1.2" />

		{/* Apical Vent Cutting Flute Slot */}
		<path d="M 46 14 L 50 28 L 54 14" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />

		{/* Hex Abutment Connector Collar */}
		<polygon points="44,83 56,83 60,86 56,89 44,89 40,86" fill="url(#implant-hex-gradient)" stroke="#475569" strokeWidth="0.8" />
		{/* Golden Transgingival Abutment Collar */}
		<rect x="27" y="83" width="46" height="6" rx="2" fill="url(#gold-crown-gradient)" stroke="#b45309" strokeWidth="1.2" />
	</g>
);
