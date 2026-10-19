import type React from "react";

/**
 * DENTE Dental CRM — SVG Shader Definitions for Upper Molars 16 / 26
 * 120 FPS hardware acceleration, zero feGaussianBlur. Mandate 8b <= 120 lines.
 */
export const Tooth16ShaderDefs: React.FC = () => (
	<defs>
		<linearGradient id="dente16-enamel-porcelain" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
			<stop offset="35%" stopColor="#f8fafc" stopOpacity="0.95" />
			<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.85" />
		</linearGradient>

		<linearGradient id="dente16-root-body" x1="0" y1="1" x2="0" y2="0">
			<stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.92" />
			<stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.90" />
			<stop offset="90%" stopColor="#94a3b8" stopOpacity="0.85" />
			<stop offset="100%" stopColor="#64748b" stopOpacity="0.80" />
		</linearGradient>

		<radialGradient id="dente16-palatal-root" cx="50%" cy="30%" r="50%">
			<stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.95" />
			<stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.85" />
		</radialGradient>

		<linearGradient id="dente16-crista-ridge" x1="0" y1="1" x2="1" y2="0">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
			<stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.85" />
			<stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.75" />
		</linearGradient>

		<radialGradient id="dente16-carabelli-gradient" cx="30%" cy="40%" r="60%">
			<stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
			<stop offset="60%" stopColor="#f8fafc" stopOpacity="0.85" />
			<stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.80" />
		</radialGradient>

		<radialGradient id="dente16-periapical-halo" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
			<stop offset="40%" stopColor="#dc2626" stopOpacity="0.55" />
			<stop offset="80%" stopColor="#b91c1c" stopOpacity="0.25" />
			<stop offset="100%" stopColor="#991b1b" stopOpacity="0.0" />
		</radialGradient>

		<linearGradient id="dente16-dentin-core" x1="0" y1="0.6" x2="0" y2="1">
			<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
			<stop offset="50%" stopColor="#fde68a" stopOpacity="0.90" />
			<stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85" />
		</linearGradient>
	</defs>
);
