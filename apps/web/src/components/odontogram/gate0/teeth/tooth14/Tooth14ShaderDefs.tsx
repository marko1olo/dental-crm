import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import { TOOTH14_GEOMETRY } from "./tooth14GeometryConstants";

export const Tooth14ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth14-crown-clip"><path d={TOOTH14_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id="tooth14-root-clip"><path d={TOOTH14_GEOMETRY.combinedRootsSilhouette} /></clipPath>
			<clipPath id="tooth14-palatal-clip"><path d={TOOTH14_GEOMETRY.palatalRootPath} /></clipPath>

			{/* Saddle Contact Ambient Occlusion Shadow (crotch Y=53) */}
			<linearGradient id="dente-saddle-shadow-14" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#334155" stopOpacity="0.18" />
				<stop offset="50%" stopColor="#334155" stopOpacity="0.06" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.0" />
			</linearGradient>
			<linearGradient id="dente-saddle-shadow-14-dark" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.25" />
				<stop offset="50%" stopColor="#020617" stopOpacity="0.08" />
				<stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
			</linearGradient>

			{/* Buccal Root Dentin */}
			<linearGradient id="dente-root-dentin-14" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" /><stop offset="25%" stopColor="#f2e6d6" />
				<stop offset="55%" stopColor="#e5d0b9" /><stop offset="85%" stopColor="#d2b390" /><stop offset="100%" stopColor="#b6946e" />
			</linearGradient>

			{/* Palatal Root Dentin (in Lingual Depth) */}
			<linearGradient id="dente-root-palatal-dentin-14" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#f0e4d0" /><stop offset="35%" stopColor="#dfcbaf" />
				<stop offset="70%" stopColor="#c5a682" /><stop offset="100%" stopColor="#9a7b57" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id="dente-enamel-porcelain-14" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Zirconia Crown for Upper Premolar 14 */}
			<linearGradient id="dente-zirconia-crown-14" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="20%" stopColor="#f5ebdd" stopOpacity="0.98" />
				<stop offset="60%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-crown-14-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="25%" stopColor="#f1e5d4" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id="dente-zirconia-glaze-dark" href="#dente-zirconia-glaze" />

			{/* Fiber Post in Palatal Canal */}
			<linearGradient id="dente-fiber-post-14" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#cbd5e1" /><stop offset="50%" stopColor="#f8fafc" /><stop offset="100%" stopColor="#94a3b8" />
			</linearGradient>

			{/* Cervical Ridge Highlights */}
			<linearGradient id="dente-cervical-ridge-14" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" /><stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" /><stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-cervical-ridge-14-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" /><stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-ridge-highlight-14" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.80" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
			</linearGradient>

			{/* Caries Shaders */}
			<radialGradient id="dente-caries-crater-14" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#291205" /><stop offset="65%" stopColor="#54260a" stopOpacity="0.95" /><stop offset="100%" stopColor="#854d0e" stopOpacity="0.90" />
			</radialGradient>
			<radialGradient id="dente-caries-halo-14" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ca8a04" stopOpacity="0.80" /><stop offset="70%" stopColor="#eab308" stopOpacity="0.45" /><stop offset="100%" stopColor="#fef08a" stopOpacity="0.0" />
			</radialGradient>

			{/* Periapical Cyst Shaders */}
			<radialGradient id="dente-periapical-cyst-14" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.92" /><stop offset="60%" stopColor="#1e293b" stopOpacity="0.75" /><stop offset="85%" stopColor="#334155" stopOpacity="0.45" /><stop offset="100%" stopColor="#475569" stopOpacity="0.10" />
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
