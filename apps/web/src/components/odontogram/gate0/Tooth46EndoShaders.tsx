import type React from "react";

/**
 * DENTE Dental CRM — Endodontic, Caries & Periapical Shaders for Tooth 46
 * Cavitas pulparis ruby gel, gutta-percha, caries zones and periapical halo.
 * Mandate 8b <= 120 lines.
 */
export const Tooth46EndoShaders: React.FC = () => {
	return (
		<>
			{/* Vital Coronal Pulp & Neurovascular Bundle (Ruby Gel) */}
			<linearGradient id="dente-pulp-vital" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fda4af" stopOpacity="0.95" />
				<stop offset="30%" stopColor="#f43f5e" stopOpacity="0.92" />
				<stop offset="70%" stopColor="#be123c" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#881337" stopOpacity="0.98" />
			</linearGradient>

			{/* Tapered Gutta-Percha Cone & Outer Sheath */}
			<linearGradient id="dente-guttapercha-cone" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fda4af" stopOpacity="1" />
				<stop offset="35%" stopColor="#fb7185" stopOpacity="1" />
				<stop offset="75%" stopColor="#f43f5e" stopOpacity="1" />
				<stop offset="100%" stopColor="#be123c" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-guttapercha-sheath" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fb7185" stopOpacity="1" />
				<stop offset="50%" stopColor="#f43f5e" stopOpacity="1" />
				<stop offset="100%" stopColor="#be123c" stopOpacity="1" />
			</linearGradient>

			{/* Biological Caries Pathology Zones */}
			<radialGradient id="dente-caries-demin" cx="50%" cy="40%" r="60%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.55" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id="dente-caries-lesion" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#78350f" stopOpacity="0.95" />
				<stop offset="60%" stopColor="#92400e" stopOpacity="0.80" />
				<stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id="dente-caries-necrotic" cx="45%" cy="40%" r="55%">
				<stop offset="0%" stopColor="#1c1917" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#291307" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#451a03" stopOpacity="0.80" />
			</radialGradient>

			{/* Periapical Inflammatory Granuloma Halo */}
			<radialGradient id="dente-periapical-halo" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
				<stop offset="45%" stopColor="#dc2626" stopOpacity="0.40" />
				<stop offset="80%" stopColor="#b91c1c" stopOpacity="0.10" />
				<stop offset="100%" stopColor="#b91c1c" stopOpacity="0.0" />
			</radialGradient>
		</>
	);
};
