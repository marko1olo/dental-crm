import type React from "react";

/**
 * DENTE Dental CRM — Endodontic, Caries & Periapical Shaders for Tooth 46
 * Cavitas pulparis ruby gel, necrotic gangrene, gutta-percha, NiTi metal, sealer puff.
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

			{/* Acute Pulpitis Arterial Hyperemia (Vivid Scarlet with Capillary Engorgement) */}
			<linearGradient id="dente-pulp-hyperemia" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fca5a5" stopOpacity="0.98" />
				<stop offset="25%" stopColor="#ef4444" stopOpacity="0.98" />
				<stop offset="65%" stopColor="#dc2626" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
			</linearGradient>

			{/* Devitalized Gangrenous Necrotic Pulp Chamber & Canals */}
			<linearGradient id="dente-pulp-necrotic" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#44403c" stopOpacity="0.95" />
				<stop offset="35%" stopColor="#292524" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#1c1917" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#0c0a09" stopOpacity="1" />
			</linearGradient>

			{/* Devitalized / Sealed Coronal Pulp Cavity Post-Endo (Clean Dentin Chamber) */}
			<linearGradient id="dente-pulp-chamber-obturated" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#faf8f5" stopOpacity="0.88" />
				<stop offset="45%" stopColor="#f3ede2" stopOpacity="0.82" />
				<stop offset="80%" stopColor="#e8decb" stopOpacity="0.80" />
				<stop offset="100%" stopColor="#d5c8b2" stopOpacity="0.75" />
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

			{/* Overfilled Extruded Sealer Puff Gradient */}
			<radialGradient id="dente-sealer-puff" cx="45%" cy="40%" r="60%">
				<stop offset="0%" stopColor="#fb7185" stopOpacity="1" />
				<stop offset="50%" stopColor="#f43f5e" stopOpacity="1" />
				<stop offset="80%" stopColor="#be123c" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#881337" stopOpacity="0.90" />
			</radialGradient>

			{/* Fractured NiTi Rotary Instrument (Polished Surgical Alloy) */}
			<linearGradient id="dente-niti-metal" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#475569" stopOpacity="1" />
				<stop offset="30%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="55%" stopColor="#f8fafc" stopOpacity="1" />
				<stop offset="80%" stopColor="#64748b" stopOpacity="1" />
				<stop offset="100%" stopColor="#334155" stopOpacity="1" />
			</linearGradient>

			{/* Biological Caries Pathology Zones (Linear organic depth, no circular bullseyes) */}
			<linearGradient id="dente-caries-demin" x1="0" y1="0" x2="0.3" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
				<stop offset="45%" stopColor="#fef3c7" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#fde68a" stopOpacity="0.60" />
			</linearGradient>
			<linearGradient id="dente-caries-lesion" x1="0" y1="0" x2="0.4" y2="1">
				<stop offset="0%" stopColor="#92400e" stopOpacity="0.95" />
				<stop offset="65%" stopColor="#78350f" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#451a03" stopOpacity="0.88" />
			</linearGradient>
			<linearGradient id="dente-caries-necrotic" x1="0" y1="0" x2="0.5" y2="1">
				<stop offset="0%" stopColor="#1c1917" stopOpacity="1" />
				<stop offset="50%" stopColor="#291307" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#0c0a09" stopOpacity="1" />
			</linearGradient>

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
