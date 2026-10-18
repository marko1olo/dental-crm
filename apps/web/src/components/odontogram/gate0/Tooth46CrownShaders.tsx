import type React from "react";

/**
 * DENTE Dental CRM — Authentic Crown Material Shaders for Tooth 46
 * 6 Orthopedic Prosthetic Materials (Mandate 8b <= 120 lines):
 * 1. Monolithic Multilayer Zirconia (ZrO2)
 * 2. Porcelain Fused to Metal (PFM with subgingival metal collar)
 * 3. IPS e.max Lithium Disilicate (Opalescent glass-ceramic)
 * 4. Full Cast Gold 18K/24K (High-luster burnished gold)
 * 5. Full Cast Base Metal (Co-Cr / Ni-Cr clinical alloy)
 * 6. Temporary Acrylic / PMMA (Matte bis-acrylic)
 */
export const Tooth46CrownShaders: React.FC = () => {
	return (
		<>
			{/* 1. Monolithic Zirconia (ZrO2) */}
			<linearGradient id="dente-zirconia-ceramic" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.99" />
				<stop offset="25%" stopColor="#f8fafc" stopOpacity="0.97" />
				<stop offset="65%" stopColor="#f1f5f9" stopOpacity="0.96" />
				<stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.94" />
			</linearGradient>
			<linearGradient id="dente-zirconia-glaze" x1="0" y1="0" x2="1" y2="0.5">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="40%" stopColor="#f0f9ff" stopOpacity="0.60" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-chamfer" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.80" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.95" />
			</linearGradient>

			{/* 2. Porcelain Fused to Metal (PFM) */}
			<linearGradient id="dente-crown-pfm" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="30%" stopColor="#fbfaf8" stopOpacity="0.96" />
				<stop offset="70%" stopColor="#ede6db" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#ded4c3" stopOpacity="0.92" />
			</linearGradient>
			<linearGradient id="dente-pfm-metal-collar" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.85" />
				<stop offset="100%" stopColor="#1e293b" stopOpacity="0.98" />
			</linearGradient>

			{/* 3. IPS e.max Glass Ceramic (Lithium Disilicate) */}
			<linearGradient id="dente-crown-emax" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.99" />
				<stop offset="25%" stopColor="#f0f9ff" stopOpacity="0.95" />
				<stop offset="65%" stopColor="#e0f2fe" stopOpacity="0.93" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.90" />
			</linearGradient>
			<linearGradient id="dente-emax-opalescent" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#bae6fd" stopOpacity="0.75" />
				<stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.55" />
				<stop offset="100%" stopColor="#fbcfe8" stopOpacity="0.40" />
			</linearGradient>

			{/* 4. Full Cast Gold (18K/24K Aurum) */}
			<linearGradient id="dente-crown-gold" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fde047" stopOpacity="1" />
				<stop offset="25%" stopColor="#fbbf24" stopOpacity="0.98" />
				<stop offset="60%" stopColor="#f59e0b" stopOpacity="0.97" />
				<stop offset="100%" stopColor="#b45309" stopOpacity="0.95" />
			</linearGradient>
			<linearGradient id="dente-gold-specular" x1="0" y1="0" x2="1" y2="0.6">
				<stop offset="0%" stopColor="#fef9c3" stopOpacity="0.95" />
				<stop offset="45%" stopColor="#fde047" stopOpacity="0.65" />
				<stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
			</linearGradient>

			{/* 5. Full Cast Base Metal (Co-Cr Clinical Alloy) */}
			<linearGradient id="dente-crown-metal" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#f1f5f9" stopOpacity="1" />
				<stop offset="30%" stopColor="#cbd5e1" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#94a3b8" stopOpacity="0.97" />
				<stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
			</linearGradient>
			<linearGradient id="dente-metal-sheen" x1="0" y1="0" x2="1" y2="0.5">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="35%" stopColor="#e2e8f0" stopOpacity="0.50" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
			</linearGradient>

			{/* 6. Temporary Acrylic / PMMA */}
			<linearGradient id="dente-crown-pmma" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.98" />
				<stop offset="40%" stopColor="#fde68a" stopOpacity="0.95" />
				<stop offset="75%" stopColor="#f5e1ad" stopOpacity="0.94" />
				<stop offset="100%" stopColor="#ecd599" stopOpacity="0.90" />
			</linearGradient>
		</>
	);
};
