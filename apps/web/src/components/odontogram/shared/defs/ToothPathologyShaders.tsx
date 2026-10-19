import type React from "react";
import { DENTE_SHADER_IDS } from "./shaderConstants";

/**
 * Biological Pathology, Surgical & Periodontal Shaders (Mandate 8b <= 120 lines).
 * Caries zones, periapical lesions, abfraction, post, calculus, titanium implant.
 */
export const ToothPathologyShaders: React.FC = () => {
	const s = DENTE_SHADER_IDS;
	return (
		<>
			{/* Caries Demineralization, Softened Dentin & Deep Necrotic Zones */}
			<radialGradient id={s.cariesDemin} cx="50%" cy="40%" r="60%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.55" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id={s.cariesLesion} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#78350f" stopOpacity="0.95" />
				<stop offset="60%" stopColor="#92400e" stopOpacity="0.80" />
				<stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id={s.cariesNecrotic} cx="45%" cy="40%" r="55%">
				<stop offset="0%" stopColor="#1c1917" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#291307" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#451a03" stopOpacity="0.80" />
			</radialGradient>

			{/* Periapical Inflammatory Granuloma Halo & Periodontitis Flame */}
			<radialGradient id={s.periapicalHalo} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
				<stop offset="45%" stopColor="#dc2626" stopOpacity="0.40" />
				<stop offset="80%" stopColor="#b91c1c" stopOpacity="0.10" />
				<stop offset="100%" stopColor="#b91c1c" stopOpacity="0.0" />
			</radialGradient>
			<radialGradient id={s.periapicalFlame} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity="0.90" />
				<stop offset="35%" stopColor="#f97316" stopOpacity="0.65" />
				<stop offset="70%" stopColor="#facc15" stopOpacity="0.30" />
				<stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
			</radialGradient>

			{/* Cervical Abfraction Sclerotic Dentin Notch */}
			<linearGradient id={s.abfractionDentin} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#f5ebe0" stopOpacity="0.95" />
				<stop offset="50%" stopColor="#d5bdaf" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#b08968" stopOpacity="0.90" />
			</linearGradient>

			{/* Quartz Glass Fiber Post & Core Stump */}
			<linearGradient id={s.fiberPost} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.90" />
				<stop offset="70%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.85" />
			</linearGradient>
			<linearGradient id={s.compositeCore} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
			</linearGradient>

			{/* Supragingival & Subgingival Calculus */}
			<linearGradient id={s.calculusSupra} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.98" />
				<stop offset="40%" stopColor="#e2dac6" stopOpacity="0.95" />
				<stop offset="80%" stopColor="#cfc3a7" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#b8a885" stopOpacity="0.92" />
			</linearGradient>
			<linearGradient id={s.calculusSub} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#78350f" stopOpacity="0.95" />
				<stop offset="50%" stopColor="#451a03" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#1c1917" stopOpacity="0.95" />
			</linearGradient>

			{/* Grade-5 SLA Titanium Implant Fixture, Collar & Abutment */}
			<linearGradient id={s.titaniumBody} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#64748b" stopOpacity="1" />
				<stop offset="25%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="50%" stopColor="#f1f5f9" stopOpacity="1" />
				<stop offset="75%" stopColor="#64748b" stopOpacity="1" />
				<stop offset="100%" stopColor="#334155" stopOpacity="1" />
			</linearGradient>
			<linearGradient id={s.titaniumCollar} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2e8f0" stopOpacity="1" />
				<stop offset="50%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="100%" stopColor="#64748b" stopOpacity="1" />
			</linearGradient>
			<linearGradient id={s.titaniumAbutment} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="35%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="70%" stopColor="#cbd5e1" stopOpacity="1" />
				<stop offset="100%" stopColor="#475569" stopOpacity="1" />
			</linearGradient>
		</>
	);
};
