import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import {
	scopeOdontogramId,
	useOdontogramIdPrefix,
	useOdontogramSharedDefs,
	useToothNumber,
} from "../../OdontogramSharedDefsContext";
import { TOOTH13_GEOMETRY } from "./tooth13GeometryConstants";

export interface Tooth13ShaderDefsProps {
	readonly toothNumber?: number | undefined;
}

export const Tooth13ShaderDefs: React.FC<Tooth13ShaderDefsProps> = ({ toothNumber }) => {
	const hasGlobalSharedDefs = useOdontogramSharedDefs();
	const prefix = useOdontogramIdPrefix();
	const tNum = useToothNumber(toothNumber) ?? 13;
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	return (
		<defs>
			<clipPath id={sid(`tooth${tNum}-crown-clip`)}><path d={TOOTH13_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id={sid(`tooth${tNum}-root-clip`)}><path d={TOOTH13_GEOMETRY.combinedRootsSilhouette} /></clipPath>

			{/* Root Dentin */}
			<linearGradient id={sid(`dente-root-dentin-${tNum}`)} x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d2b390" stopOpacity="1" />
				<stop offset="100%" stopColor="#b6946e" stopOpacity="1" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id={sid(`dente-enamel-porcelain-${tNum}`)} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Multilayer Zirconia Crown for Upper Canine 13 */}
			<linearGradient id={sid(`dente-zirconia-crown-${tNum}`)} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ebd8bf" stopOpacity="0.96" />
				<stop offset="18%" stopColor="#f6ecdc" stopOpacity="0.97" />
				<stop offset="55%" stopColor="#fef9ee" stopOpacity="0.98" />
				<stop offset="85%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>
			<linearGradient id={sid(`dente-zirconia-crown-${tNum}-dark`)} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="25%" stopColor="#f1e5d4" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>

			{/* Fiber Post in Canine Canal */}
			<linearGradient id={sid(`dente-fiber-post-${tNum}`)} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stopColor="#cbd5e1" stopOpacity="1" />
				<stop offset="50%" stopColor="#f8fafc" stopOpacity="1" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="1" />
			</linearGradient>

			{/* Cervical Ridge Highlights — Directional Upper Enamel Volume (y1=1 incisal -> y2=0 cervical) */}
			<linearGradient id={sid(`dente-cervical-ridge-${tNum}`)} x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id={sid(`dente-cervical-ridge-${tNum}-dark`)} x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
				<stop offset="60%" stopColor="#94a3b8" stopOpacity="0.12" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
			</linearGradient>

			<linearGradient id={sid(`dente-ridge-highlight-${tNum}`)} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
			</linearGradient>

			{/* Caries Shaders */}
			<radialGradient id={sid(`dente-caries-crater-${tNum}`)} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#291205" stopOpacity="1" />
				<stop offset="65%" stopColor="#54260a" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#854d0e" stopOpacity="0.90" />
			</radialGradient>
			<radialGradient id={sid(`dente-caries-halo-${tNum}`)} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ca8a04" stopOpacity="0.80" />
				<stop offset="70%" stopColor="#eab308" stopOpacity="0.45" />
				<stop offset="100%" stopColor="#fef08a" stopOpacity="0.0" />
			</radialGradient>

			{/* Periapical Cyst Shaders */}
			<radialGradient id={sid(`dente-periapical-cyst-${tNum}`)} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#020617" stopOpacity="0.92" />
				<stop offset="60%" stopColor="#1e293b" stopOpacity="0.75" />
				<stop offset="85%" stopColor="#334155" stopOpacity="0.45" />
				<stop offset="100%" stopColor="#475569" stopOpacity="0.10" />
			</radialGradient>

			{!hasGlobalSharedDefs && (
				<>
					<ToothAnteriorShaders />
					<Tooth46CuspShaders />
					<Tooth46EndoShaders />
					<Tooth46CariesShaders />
					<Tooth46CrownShaders />
					<Tooth46PeriapicalShaders />
					<Tooth46RestorationShaders />
					<Tooth46PathologyShaders />
				</>
			)}
		</defs>
	);
};
