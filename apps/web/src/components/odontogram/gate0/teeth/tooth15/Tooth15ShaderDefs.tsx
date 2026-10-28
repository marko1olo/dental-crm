import React from "react";
import { ToothAnteriorShaders } from "../../ToothAnteriorShaders";
import { Tooth46CuspShaders } from "../../Tooth46CuspShaders";
import { Tooth46EndoShaders } from "../../Tooth46EndoShaders";
import { Tooth46CariesShaders } from "../../Tooth46CariesShaders";
import { Tooth46CrownShaders } from "../../Tooth46CrownShaders";
import { Tooth46PeriapicalShaders } from "../../Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "../../Tooth46RestorationShaders";
import { Tooth46PathologyShaders } from "../../Tooth46PathologyShaders";
import { TOOTH15_GEOMETRY } from "./tooth15GeometryConstants";

export const Tooth15ShaderDefs: React.FC = () => {
	return (
		<defs>
			<clipPath id="tooth15-crown-clip"><path d={TOOTH15_GEOMETRY.crownMonolithPath} /></clipPath>
			<clipPath id="tooth15-root-clip"><path d={TOOTH15_GEOMETRY.combinedRootsSilhouette} /></clipPath>
			<clipPath id="tooth15-palatal-clip"><path d={TOOTH15_GEOMETRY.palatalRootPath} /></clipPath>

			{/* Root Dentin */}
			<linearGradient id="dente-root-dentin-15" x1="0" y1="0" x2="1" y2="0.3">
				<stop offset="0%" stopColor="#faf6ef" stopOpacity="1" />
				<stop offset="25%" stopColor="#f2e6d6" stopOpacity="1" />
				<stop offset="55%" stopColor="#e5d0b9" stopOpacity="1" />
				<stop offset="85%" stopColor="#d2b390" stopOpacity="1" />
				<stop offset="100%" stopColor="#b6946e" stopOpacity="1" />
			</linearGradient>

			{/* Porcelain Enamel */}
			<linearGradient id="dente-enamel-porcelain-15" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="30%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f1f5f9" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dbeafe" stopOpacity="0.92" />
			</linearGradient>

			{/* Zirconia Crown for Upper Premolar 15 */}
			<linearGradient id="dente-zirconia-ceramic-15" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#e2d6c3" stopOpacity="0.96" />
				<stop offset="20%" stopColor="#f5ebdd" stopOpacity="0.98" />
				<stop offset="60%" stopColor="#f8fafc" stopOpacity="0.99" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
			</linearGradient>

			{/* Composite Core Build-up */}
			<linearGradient id="dente-core-composite-15" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fef3c7" stopOpacity="0.98" />
				<stop offset="35%" stopColor="#fde68a" stopOpacity="0.98" />
				<stop offset="70%" stopColor="#f59e0b" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#d97706" stopOpacity="0.88" />
			</linearGradient>

			{/* Cervical Ridge Highlights */}
			<linearGradient id="dente-cervical-ridge-15" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
				<stop offset="60%" stopColor="#fef3c7" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-cervical-ridge-15-dark" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
			</linearGradient>
			<linearGradient id="dente-ridge-highlight-15" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
			</linearGradient>

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
