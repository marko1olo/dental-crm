import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export const Tooth11ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth11-crown-clip"><path d={TOOTH11_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id="tooth11-root-clip"><path d={TOOTH11_GEOMETRY.combinedRootsSilhouette} /></clipPath>

			{/* Root Dentin */}
			<linearGradient id="dente-root-dentin-11" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d2b390" stopOpacity="1" />
				<stop offset="100%" stopColor="#b6946e" stopOpacity="1" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id="dente-enamel-porcelain-11" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Multilayer Zirconia Crown for Upper Central 11 */}
			<linearGradient id="dente-zirconia-crown-11" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ebd8bf" stopOpacity="0.96" />
				<stop offset="18%" stopColor="#f6ecdc" stopOpacity="0.97" />
				<stop offset="55%" stopColor="#fef9ee" stopOpacity="0.98" />
				<stop offset="85%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-crown-11-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="25%" stopColor="#f1e5d4" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-glaze-dark" x1="0" y1="0" x2="1" y2="0.5">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.60" />
				<stop offset="40%" stopColor="#ffffff" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
			</linearGradient>

			{/* Fiber Post in Central Canal */}
			<linearGradient id="dente-fiber-post-11" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#cbd5e1" stopOpacity="1" />
				<stop offset="50%" stopColor="#f8fafc" stopOpacity="1" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="1" />
			</linearGradient>

			{/* Cervical Ridge Highlights — Directional Upper Enamel Volume (y1=1 incisal -> y2=0 cervical) */}
			<linearGradient id="dente-cervical-ridge-11" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-cervical-ridge-11-dark" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
				<stop offset="60%" stopColor="#94a3b8" stopOpacity="0.12" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
			</linearGradient>

			<linearGradient id="dente-ridge-highlight-11" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
			</linearGradient>

			{/* Caries Shaders */}
			<radialGradient id="dente-caries-crater-11" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#291205" stopOpacity="1" />
				<stop offset="65%" stopColor="#54260a" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#854d0e" stopOpacity="0.90" />
			</radialGradient>
			<radialGradient id="dente-caries-halo-11" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ca8a04" stopOpacity="0.80" />
				<stop offset="70%" stopColor="#eab308" stopOpacity="0.45" />
				<stop offset="100%" stopColor="#fef08a" stopOpacity="0.0" />
			</radialGradient>

			{/* Periapical Cyst Shaders */}
			<radialGradient id="dente-periapical-cyst-11" cx="50%" cy="50%" r="50%">
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
