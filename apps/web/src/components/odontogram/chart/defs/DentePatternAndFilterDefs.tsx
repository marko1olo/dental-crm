import React from "react";

export const DentePatternAndFilterDefs: React.FC = () => (
	<>
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

		{/* Primary Tooth Physiological Root Resorption Hatch Pattern */}
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
	</>
);
