import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";

export const Tooth12ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth12-crown-clip"><path d={TOOTH12_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id="tooth12-root-clip"><path d={TOOTH12_GEOMETRY.combinedRootsSilhouette} /></clipPath>

			{/* Root Dentin */}
			<linearGradient id="dente-root-dentin-12" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d2b390" stopOpacity="1" />
				<stop offset="100%" stopColor="#b6946e" stopOpacity="1" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id="dente-enamel-porcelain-12" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Multilayer Zirconia Crown for Upper Lateral 12 */}
			<linearGradient id="dente-zirconia-crown-12" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ebd8bf" stopOpacity="0.96" />
				<stop offset="18%" stopColor="#f6ecdc" stopOpacity="0.97" />
				<stop offset="55%" stopColor="#fef9ee" stopOpacity="0.98" />
				<stop offset="85%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-crown-12-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.95" />
				<stop offset="35%" stopColor="#475569" stopOpacity="0.98" />
				<stop offset="80%" stopColor="#64748b" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-glaze-dark" x1="0" y1="0" x2="1" y2="0.5">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.40" />
				<stop offset="40%" stopColor="#94a3b8" stopOpacity="0.15" />
				<stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
			</linearGradient>

			{/* Fiber Post in Lateral Canal */}
			<linearGradient id="dente-fiber-post-12" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#cbd5e1" stopOpacity="1" />
				<stop offset="50%" stopColor="#f8fafc" stopOpacity="1" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="1" />
			</linearGradient>

			{/* Cervical Ridge Highlights */}
			<linearGradient id="dente-cervical-ridge-12" x1="0" y1="94" x2="0" y2="128" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="35%" stopColor="#fef3c7" stopOpacity="0.18" />
				<stop offset="75%" stopColor="#f8fafc" stopOpacity="0.04" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-cervical-ridge-12-dark" x1="0" y1="94" x2="0" y2="128" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
				<stop offset="35%" stopColor="#94a3b8" stopOpacity="0.08" />
				<stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
			</linearGradient>

			<linearGradient id="dente-ridge-highlight-12" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
			</linearGradient>

			{/* Caries Shaders */}
			<radialGradient id="dente-caries-crater-12" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#291205" stopOpacity="1" />
				<stop offset="65%" stopColor="#54260a" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#854d0e" stopOpacity="0.90" />
			</radialGradient>
			<radialGradient id="dente-caries-halo-12" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ca8a04" stopOpacity="0.80" />
				<stop offset="70%" stopColor="#eab308" stopOpacity="0.45" />
				<stop offset="100%" stopColor="#fef08a" stopOpacity="0.0" />
			</radialGradient>

			{/* Periapical Cyst Shaders */}
			<radialGradient id="dente-periapical-cyst-12" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.92" />
				<stop offset="60%" stopColor="#1e293b" stopOpacity="0.75" />
				<stop offset="85%" stopColor="#334155" stopOpacity="0.45" />
				<stop offset="100%" stopColor="#475569" stopOpacity="0.10" />
			</radialGradient>

			<ToothAnteriorShaders />
			<Tooth46CuspShaders />
			<Tooth46EndoShaders />
			<Tooth46CariesShaders />
			<Tooth46CrownShaders />
			<Tooth46PeriapicalShaders />
			<Tooth46RestorationShaders />
			<Tooth46PathologyShaders />
		</defs>
	);
};
