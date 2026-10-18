import React from "react";

export const DentePathologyGradientDefs: React.FC = () => (
	<>
		{/* 11. Gutta-Percha Canal Filling */}
		<linearGradient id="gutta-percha-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#fda4af" />
			<stop offset="20%" stopColor="#fb7185" />
			<stop offset="50%" stopColor="#f43f5e" />
			<stop offset="78%" stopColor="#e11d48" />
			<stop offset="94%" stopColor="#be123c" />
			<stop offset="100%" stopColor="#881337" />
		</linearGradient>
		<linearGradient id="dente-shader-gutta-percha" href="#gutta-percha-gradient" />

		{/* 12. Bioceramic Canal Sealer Gradient */}
		<linearGradient id="bioceramic-canal-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#ccfbf1" />
			<stop offset="30%" stopColor="#5eead4" />
			<stop offset="70%" stopColor="#0d9488" />
			<stop offset="100%" stopColor="#115e59" />
		</linearGradient>
		<linearGradient id="dente-shader-bioceramic" href="#bioceramic-canal-gradient" />

		{/* 13. Periapical Granuloma / Cyst Radiolucency Halo */}
		<radialGradient id="periapical-lesion-gradient" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.95" />
			<stop offset="25%" stopColor="#991b1b" stopOpacity="0.85" />
			<stop offset="55%" stopColor="#ea580c" stopOpacity="0.55" />
			<stop offset="80%" stopColor="#f97316" stopOpacity="0.25" />
			<stop offset="100%" stopColor="#f97316" stopOpacity="0" />
		</radialGradient>
		<radialGradient id="dente-periapical-halo" href="#periapical-lesion-gradient" />

		{/* 14. Pathology Diagnostics Gradients */}
		<radialGradient id="dente-caries-grad" cx="50%" cy="50%" r="65%">
			<stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
			<stop offset="35%" stopColor="#d97706" stopOpacity="1" />
			<stop offset="70%" stopColor="#b45309" stopOpacity="1" />
			<stop offset="100%" stopColor="#78350f" stopOpacity="1" />
		</radialGradient>

		{/* Natural Living Pulp Gradient */}
		<linearGradient id="dente-pulp-vital-grad" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#fca5a5" stopOpacity="0.95" />
			<stop offset="30%" stopColor="#ef4444" stopOpacity="0.95" />
			<stop offset="70%" stopColor="#dc2626" stopOpacity="0.92" />
			<stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
		</linearGradient>

		{/* Natural Living Root Canal Lumen Gradient */}
		<linearGradient id="dente-pulp-canal-vital" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#fee2e2" />
			<stop offset="35%" stopColor="#fca5a5" />
			<stop offset="70%" stopColor="#ef4444" />
			<stop offset="100%" stopColor="#dc2626" />
		</linearGradient>
		<linearGradient id="dente-pulp-canal-neon" href="#dente-pulp-canal-vital" />

		{/* Pulpitis Inflammation Gradient */}
		<linearGradient id="dente-pulpitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#f87171" stopOpacity="1" />
			<stop offset="30%" stopColor="#ef4444" stopOpacity="1" />
			<stop offset="70%" stopColor="#dc2626" stopOpacity="1" />
			<stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
		</linearGradient>

		{/* Periodontitis Inflammation Gradient */}
		<linearGradient id="dente-periodontitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
			<stop offset="40%" stopColor="#fb923c" stopOpacity="1" />
			<stop offset="80%" stopColor="#ea580c" stopOpacity="1" />
			<stop offset="100%" stopColor="#c2410c" stopOpacity="1" />
		</linearGradient>
	</>
);
