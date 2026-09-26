import type React from "react";

export const DenteToothSvgDefs: React.FC = () => (
	<svg
		aria-hidden="true"
		className="absolute -top-[9999px] -left-[9999px] w-0 h-0 pointer-events-none opacity-0"
		style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
	>
		<defs>
			{/* 1. Enamel Healthy Gradient (Natural Ivory & Specular Highlight Sheen) */}
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

			{/* 3. Photopolymer Composite Filling Multi-Layer Resin Gradients & Margins */}
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

			{/* 6. Zirconia Full Contour Crown Ivory Luster Gradient & Cusp Highlights */}
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

			{/* 7. Porcelain-Fused-To-Metal (PFM) Crown & Cervical Collar */}
			<linearGradient id="pfm-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="20%" stopColor="#f1f5f9" stopOpacity="0.98" />
				<stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.95" />
				<stop offset="80%" stopColor="#94a3b8" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#475569" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-shader-pfm" href="#pfm-crown-gradient" />

			<linearGradient id="pfm-metal-collar" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#1e293b" />
				<stop offset="20%" stopColor="#475569" />
				<stop offset="45%" stopColor="#cbd5e1" />
				<stop offset="55%" stopColor="#f8fafc" />
				<stop offset="75%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>
			<linearGradient id="dente-cervical-collar" href="#pfm-metal-collar" />

			{/* 8. Cast Gold 24K Specular Metallic Shine Gradient & Marginal Burnish */}
			<linearGradient id="gold-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
				<stop offset="15%" stopColor="#fef08a" stopOpacity="1" />
				<stop offset="35%" stopColor="#facc15" stopOpacity="1" />
				<stop offset="58%" stopColor="#eab308" stopOpacity="1" />
				<stop offset="78%" stopColor="#ca8a04" stopOpacity="1" />
				<stop offset="92%" stopColor="#a16207" stopOpacity="1" />
				<stop offset="100%" stopColor="#78350f" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-shader-gold" href="#gold-crown-gradient" />
			<linearGradient id="dente-implant-gold" href="#gold-crown-gradient" />

			<linearGradient id="gold-ridge-burnish" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#b45309" />
				<stop offset="25%" stopColor="#facc15" />
				<stop offset="50%" stopColor="#fffbeb" />
				<stop offset="75%" stopColor="#f59e0b" />
				<stop offset="100%" stopColor="#92400e" />
			</linearGradient>

			{/* 9. Titanium SLA Threaded Implant Fixture & Abutment Connector */}
			<linearGradient id="titanium-implant-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#1e293b" />
				<stop offset="12%" stopColor="#475569" />
				<stop offset="28%" stopColor="#94a3b8" />
				<stop offset="45%" stopColor="#e2e8f0" />
				<stop offset="55%" stopColor="#ffffff" />
				<stop offset="70%" stopColor="#cbd5e1" />
				<stop offset="88%" stopColor="#475569" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>
			<linearGradient id="dente-shader-titanium-implant" href="#titanium-implant-gradient" />
			<linearGradient id="dente-implant-titanium" href="#titanium-implant-gradient" />

			<linearGradient id="implant-hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#475569" />
				<stop offset="30%" stopColor="#94a3b8" />
				<stop offset="50%" stopColor="#f1f5f9" />
				<stop offset="70%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#334155" />
			</linearGradient>

			<linearGradient id="titanium-abutment-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#334155" />
				<stop offset="20%" stopColor="#64748b" />
				<stop offset="50%" stopColor="#f8fafc" />
				<stop offset="80%" stopColor="#94a3b8" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>

			<linearGradient id="implant-healing-cap-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#cbd5e1" />
				<stop offset="40%" stopColor="#f8fafc" />
				<stop offset="70%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#334155" />
			</linearGradient>

			{/* 10. Gutta-Percha Root Canal Filling with Apical Delta Seal */}
			<linearGradient id="gutta-percha-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#fda4af" />
				<stop offset="20%" stopColor="#fb7185" />
				<stop offset="50%" stopColor="#f43f5e" />
				<stop offset="78%" stopColor="#e11d48" />
				<stop offset="94%" stopColor="#be123c" />
				<stop offset="100%" stopColor="#881337" />
			</linearGradient>
			<linearGradient id="dente-shader-gutta-percha" href="#gutta-percha-gradient" />

			{/* 11. Bioceramic Canal Sealer Gradient */}
			<linearGradient id="bioceramic-canal-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#ccfbf1" />
				<stop offset="30%" stopColor="#5eead4" />
				<stop offset="70%" stopColor="#0d9488" />
				<stop offset="100%" stopColor="#115e59" />
			</linearGradient>
			<linearGradient id="dente-shader-bioceramic" href="#bioceramic-canal-gradient" />

			{/* 12. Fiber Glass Post (Translucent White-Blue Canal Post) */}
			<linearGradient id="fiber-post-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.9" />
				<stop offset="25%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.95" />
				<stop offset="75%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
			</linearGradient>
			<linearGradient id="dente-shader-fiber-post" href="#fiber-post-gradient" />

			{/* 13. Cast Core Post (Металлический литой штифт) */}
			<linearGradient id="cast-core-post-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#1e293b" />
				<stop offset="20%" stopColor="#475569" />
				<stop offset="50%" stopColor="#f1f5f9" />
				<stop offset="80%" stopColor="#94a3b8" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>
			<linearGradient id="dente-shader-cast-core" href="#cast-core-post-gradient" />

			{/* 14. Periapical Granuloma / Cyst Radiolucency Halo */}
			<radialGradient id="periapical-lesion-gradient" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.95" />
				<stop offset="25%" stopColor="#991b1b" stopOpacity="0.85" />
				<stop offset="55%" stopColor="#ea580c" stopOpacity="0.55" />
				<stop offset="80%" stopColor="#f97316" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f97316" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="dente-periapical-halo" href="#periapical-lesion-gradient" />

			{/* 15. Pathology Diagnostics Gradients */}
			<radialGradient id="dente-caries-grad" cx="50%" cy="50%" r="65%">
				<stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
				<stop offset="35%" stopColor="#d97706" stopOpacity="1" />
				<stop offset="70%" stopColor="#b45309" stopOpacity="1" />
				<stop offset="100%" stopColor="#78350f" stopOpacity="1" />
			</radialGradient>

			{/* Natural Living Pulp Gradient (Vital Vascular Soft Tissue - Anatomical Red #ef4444) */}
			<linearGradient id="dente-pulp-vital-grad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#fca5a5" stopOpacity="0.95" />
				<stop offset="30%" stopColor="#ef4444" stopOpacity="0.95" />
				<stop offset="70%" stopColor="#dc2626" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
			</linearGradient>

			{/* Natural Living Root Canal Lumen Gradient (Strict Anatomical Red #ef4444) */}
			<linearGradient id="dente-pulp-canal-vital" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#fee2e2" />
				<stop offset="35%" stopColor="#fca5a5" />
				<stop offset="70%" stopColor="#ef4444" />
				<stop offset="100%" stopColor="#dc2626" />
			</linearGradient>

			{/* Pulpitis Inflammation Gradient (Hyperemic Deep Crimson / Ruby) */}
			<linearGradient id="dente-pulpitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#f87171" stopOpacity="1" />
				<stop offset="30%" stopColor="#ef4444" stopOpacity="1" />
				<stop offset="70%" stopColor="#dc2626" stopOpacity="1" />
				<stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
			</linearGradient>

			<linearGradient id="dente-pulp-canal-neon" href="#dente-pulp-canal-vital" />

			<linearGradient id="dente-periodontitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
				<stop offset="40%" stopColor="#fb923c" stopOpacity="1" />
				<stop offset="80%" stopColor="#ea580c" stopOpacity="1" />
				<stop offset="100%" stopColor="#c2410c" stopOpacity="1" />
			</linearGradient>

			{/* PATTERNS */}
			{/* Composite Micro-hybrid Resin Texture Pattern */}
			<pattern id="composite-resin-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
				<circle cx="2" cy="2" r="0.65" fill="rgba(255, 255, 255, 0.55)" />
				<circle cx="6" cy="6" r="0.75" fill="rgba(13, 148, 136, 0.35)" />
				<circle cx="6" cy="2" r="0.45" fill="rgba(255, 255, 255, 0.4)" />
				<circle cx="2" cy="6" r="0.5" fill="rgba(45, 212, 191, 0.3)" />
				<circle cx="4" cy="4" r="0.35" fill="rgba(255, 255, 255, 0.6)" />
			</pattern>

			{/* Amalgam Burnished Metal Texture Pattern */}
			<pattern id="amalgam-burnish-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
				<circle cx="1.5" cy="1.5" r="0.5" fill="rgba(203, 213, 225, 0.4)" />
				<circle cx="4.5" cy="4.5" r="0.6" fill="rgba(15, 23, 42, 0.45)" />
				<circle cx="4.5" cy="1.5" r="0.35" fill="rgba(148, 163, 184, 0.35)" />
				<circle cx="1.5" cy="4.5" r="0.4" fill="rgba(30, 41, 59, 0.4)" />
			</pattern>

			{/* Implant Crestal Microgrooves Pattern */}
			<pattern id="implant-microgrooves-pattern" width="10" height="2" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0.5" x2="10" y2="0.5" stroke="#94a3b8" strokeWidth="0.5" />
				<line x1="0" y1="1.5" x2="10" y2="1.5" stroke="#334155" strokeWidth="0.5" />
			</pattern>

			{/* Periodontal Bone Loss Resorption Hatch Pattern */}
			<pattern id="bone-loss-hatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0" y2="4" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
			</pattern>

			{/* Primary Tooth Physiological Root Resorption Hatch Pattern (100% Theme Safe) */}
			<pattern id="resorption-hatch-pattern" width="5" height="5" patternTransform="rotate(35 0 0)" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0" y2="5" stroke="var(--odontogram-border-strong, #94a3b8)" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.6" />
			</pattern>
			<pattern id="dente-resorption-hatch" href="#resorption-hatch-pattern" />

			{/* Primary Tooth Root Resorption Soft Transition Gradient */}
			<linearGradient id="resorption-fade-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="1" />
				<stop offset="60%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="0.8" />
				<stop offset="85%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="0.3" />
				<stop offset="100%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="0" />
			</linearGradient>
			<linearGradient id="dente-resorption-fade" href="#resorption-fade-gradient" />

			{/* FILTERS */}
			{/* Periapical Lesion Soft Feathered Blur Filter */}
			<filter id="periapical-feather-blur" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="3.5" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
			<filter id="dente-periapical-blur" href="#periapical-feather-blur" />

			{/* Metallic Specular Reflection Filter */}
			<filter id="dente-metallic-specular" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
				<feSpecularLighting in="blur" surfaceScale="2" specularConstant="1.2" specularExponent="20" lightingColor="#ffffff" result="specular">
					<fePointLight x="50" y="30" z="100" />
				</feSpecularLighting>
				<feComposite in="SourceGraphic" in2="specular" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
			</filter>

			{/* Glow Filters */}
			<filter id="dente-glow-crimson" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.5" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-teal" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-coral" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-gold" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-indigo" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
		</defs>
	</svg>
);


