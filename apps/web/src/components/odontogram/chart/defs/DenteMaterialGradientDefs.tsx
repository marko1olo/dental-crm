import React from "react";

export const DenteMaterialGradientDefs: React.FC = () => (
	<>
		{/* 1. Enamel Healthy Gradient */}
		<linearGradient id="dente-enamel-healthy" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
			<stop offset="20%" stopColor="#fefcf9" stopOpacity="1" />
			<stop offset="45%" stopColor="#f7f3eb" stopOpacity="1" />
			<stop offset="70%" stopColor="#ede6d8" stopOpacity="1" />
			<stop offset="88%" stopColor="#e0d7c7" stopOpacity="1" />
			<stop offset="100%" stopColor="#cfc4b2" stopOpacity="1" />
		</linearGradient>

		{/* 2. Root Dentin / Cementum Gradient */}
		<linearGradient id="dente-root-dentin" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#ded4c3" stopOpacity="0.95" />
			<stop offset="25%" stopColor="#efe7d8" stopOpacity="1" />
			<stop offset="50%" stopColor="#f9f4ea" stopOpacity="1" />
			<stop offset="75%" stopColor="#ece2d1" stopOpacity="0.95" />
			<stop offset="100%" stopColor="#d5c8b5" stopOpacity="1" />
		</linearGradient>

		{/* 3. Photopolymer Composite Filling Gradients & Margins */}
		<linearGradient id="composite-fill-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
			<stop offset="15%" stopColor="#f0fdfa" stopOpacity="0.96" />
			<stop offset="38%" stopColor="#ccfbf1" stopOpacity="0.92" />
			<stop offset="65%" stopColor="#99f6e4" stopOpacity="0.92" />
			<stop offset="85%" stopColor="#5eead4" stopOpacity="0.95" />
			<stop offset="100%" stopColor="#0d9488" stopOpacity="0.98" />
		</linearGradient>
		<linearGradient id="dente-shader-composite" href="#composite-fill-gradient" />
		<linearGradient id="dente-filled-grad" href="#composite-fill-gradient" />

		<radialGradient id="composite-specular-highlight" cx="35%" cy="30%" r="40%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
			<stop offset="45%" stopColor="#f0fdfa" stopOpacity="0.4" />
			<stop offset="100%" stopColor="#ccfbf1" stopOpacity="0" />
		</radialGradient>

		<linearGradient id="composite-margin-bevel" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#0f766e" stopOpacity="0.9" />
			<stop offset="50%" stopColor="#14b8a6" stopOpacity="0.75" />
			<stop offset="100%" stopColor="#0f766e" stopOpacity="0.9" />
		</linearGradient>

		{/* 4. Silver Amalgam Metal Gradient, Oxide Margin & Burnished Specular */}
		<linearGradient id="amalgam-metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#94a3b8" stopOpacity="1" />
			<stop offset="15%" stopColor="#e2e8f0" stopOpacity="1" />
			<stop offset="32%" stopColor="#64748b" stopOpacity="1" />
			<stop offset="52%" stopColor="#334155" stopOpacity="1" />
			<stop offset="72%" stopColor="#475569" stopOpacity="1" />
			<stop offset="88%" stopColor="#1e293b" stopOpacity="1" />
			<stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
		</linearGradient>
		<linearGradient id="dente-shader-amalgam" href="#amalgam-metal-gradient" />

		<radialGradient id="amalgam-burnished-specular" cx="40%" cy="35%" r="50%">
			<stop offset="0%" stopColor="#f8fafc" stopOpacity="0.75" />
			<stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.4" />
			<stop offset="70%" stopColor="#475569" stopOpacity="0.1" />
			<stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
		</radialGradient>

		<linearGradient id="amalgam-oxide-margin" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
			<stop offset="50%" stopColor="#1e293b" stopOpacity="0.8" />
			<stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
		</linearGradient>

		{/* 5. Ceramic IPS E.max Translucent Inlay / Onlay Gradient & Glaze */}
		<linearGradient id="ceramic-emax-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
			<stop offset="15%" stopColor="#f0f9ff" stopOpacity="0.96" />
			<stop offset="35%" stopColor="#e0f2fe" stopOpacity="0.92" />
			<stop offset="60%" stopColor="#bae6fd" stopOpacity="0.95" />
			<stop offset="80%" stopColor="#7dd3fc" stopOpacity="0.95" />
			<stop offset="92%" stopColor="#38bdf8" stopOpacity="0.95" />
			<stop offset="100%" stopColor="#0284c7" stopOpacity="0.92" />
		</linearGradient>
		<linearGradient id="dente-shader-ceramic-emax" href="#ceramic-emax-gradient" />

		<linearGradient id="ceramic-glaze-specular" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
			<stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.45" />
			<stop offset="70%" stopColor="#bae6fd" stopOpacity="0.1" />
			<stop offset="100%" stopColor="transparent" stopOpacity="0" />
		</linearGradient>

		{/* 6. Zirconia Crown Ivory Luster Gradient & Highlights */}
		<linearGradient id="zirconia-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
			<stop offset="18%" stopColor="#f8fafc" stopOpacity="1" />
			<stop offset="40%" stopColor="#e2e8f0" stopOpacity="1" />
			<stop offset="68%" stopColor="#bfdbfe" stopOpacity="1" />
			<stop offset="88%" stopColor="#60a5fa" stopOpacity="1" />
			<stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
		</linearGradient>
		<linearGradient id="dente-shader-zirconia" href="#zirconia-crown-gradient" />
		<linearGradient id="dente-crown-zirconia" href="#zirconia-crown-gradient" />

		<radialGradient id="zirconia-cusp-specular" cx="50%" cy="20%" r="45%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
			<stop offset="40%" stopColor="#eff6ff" stopOpacity="0.5" />
			<stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
		</radialGradient>
	</>
);
