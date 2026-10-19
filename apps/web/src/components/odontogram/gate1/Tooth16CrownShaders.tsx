import type React from "react";

/**
 * DENTE Dental CRM — 6 Clinical Crown Materials Shaders for Upper Molar 16 / 26
 * Zirconia, PFM (metal collar at CEJ), E-Max (opalescence), Gold (18K/24K), Metal (Co-Cr), PMMA.
 * Compliant with Mandate 8b <= 120 lines.
 */
export const Tooth16CrownShaders: React.FC = () => (
	<defs>
		{/* 1. Monolithic Zirconia Multi-Layer (ZrO2) */}
		<linearGradient id="dente16-crown-zirconia" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
			<stop offset="45%" stopColor="#f1f5f9" stopOpacity="0.95" />
			<stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.92" />
			<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.88" />
		</linearGradient>

		{/* 2. Porcelain Fused to Metal (PFM) with subgingival metal collar at CEJ */}
		<linearGradient id="dente16-crown-pfm" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
			<stop offset="7%" stopColor="#475569" stopOpacity="0.90" />
			<stop offset="14%" stopColor="#fef3c7" stopOpacity="0.95" />
			<stop offset="50%" stopColor="#fffbeb" stopOpacity="0.98" />
			<stop offset="85%" stopColor="#fef3c7" stopOpacity="0.95" />
			<stop offset="100%" stopColor="#fde68a" stopOpacity="0.90" />
		</linearGradient>

		{/* 3. Lithium Disilicate (IPS e.max) with bluish opalescent halo */}
		<linearGradient id="dente16-crown-emax" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.96" />
			<stop offset="35%" stopColor="#e0f2fe" stopOpacity="0.94" />
			<stop offset="70%" stopColor="#bae6fd" stopOpacity="0.92" />
			<stop offset="90%" stopColor="#7dd3fc" stopOpacity="0.88" />
			<stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
		</linearGradient>

		{/* 4. Full Cast Dental Gold (18K/24K High Noble Alloy) */}
		<linearGradient id="dente16-crown-gold" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#fef08a" stopOpacity="0.98" />
			<stop offset="25%" stopColor="#fbbf24" stopOpacity="0.98" />
			<stop offset="60%" stopColor="#f59e0b" stopOpacity="0.96" />
			<stop offset="85%" stopColor="#d97706" stopOpacity="0.95" />
			<stop offset="100%" stopColor="#b45309" stopOpacity="0.92" />
		</linearGradient>

		{/* 5. Full Cast Base Metal Alloy (Co-Cr / КХС) */}
		<linearGradient id="dente16-crown-metal" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.95" />
			<stop offset="30%" stopColor="#94a3b8" stopOpacity="0.95" />
			<stop offset="65%" stopColor="#64748b" stopOpacity="0.95" />
			<stop offset="85%" stopColor="#475569" stopOpacity="0.92" />
			<stop offset="100%" stopColor="#334155" stopOpacity="0.90" />
		</linearGradient>

		{/* 6. PMMA Temporary Milled Polymer */}
		<linearGradient id="dente16-crown-pmma" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#fefce8" stopOpacity="0.92" />
			<stop offset="45%" stopColor="#fef9c3" stopOpacity="0.90" />
			<stop offset="80%" stopColor="#fef08a" stopOpacity="0.88" />
			<stop offset="100%" stopColor="#fde047" stopOpacity="0.85" />
		</linearGradient>
	</defs>
);
