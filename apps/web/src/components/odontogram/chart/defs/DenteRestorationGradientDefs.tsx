import React from "react";

export const DenteRestorationGradientDefs: React.FC = () => (
	<>
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

		{/* 8. Cast Gold 24K Specular Metallic Shine & Marginal Burnish */}
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

		{/* 10. Fiber Glass & Cast Core Posts */}
		<linearGradient id="fiber-post-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.9" />
			<stop offset="25%" stopColor="#ffffff" stopOpacity="0.98" />
			<stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.95" />
			<stop offset="75%" stopColor="#ffffff" stopOpacity="0.98" />
			<stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
		</linearGradient>
		<linearGradient id="dente-shader-fiber-post" href="#fiber-post-gradient" />

		<linearGradient id="cast-core-post-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#1e293b" />
			<stop offset="20%" stopColor="#475569" />
			<stop offset="50%" stopColor="#f1f5f9" />
			<stop offset="80%" stopColor="#94a3b8" />
			<stop offset="100%" stopColor="#1e293b" />
		</linearGradient>
		<linearGradient id="dente-shader-cast-core" href="#cast-core-post-gradient" />
	</>
);
