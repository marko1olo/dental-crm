import React from "react";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";
import {
	OdontogramBaseToothShaders,
	useOdontogramSharedDefs,
} from "./OdontogramSharedDefsContext";
import { ToothAnteriorShaders } from "./ToothAnteriorShaders";
import { Tooth46CariesShaders } from "./Tooth46CariesShaders";
import { Tooth46CrownShaders } from "./Tooth46CrownShaders";
import { Tooth46CuspShaders } from "./Tooth46CuspShaders";
import { Tooth46EndoShaders } from "./Tooth46EndoShaders";
import { Tooth46PathologyShaders } from "./Tooth46PathologyShaders";
import { Tooth46PeriapicalShaders } from "./Tooth46PeriapicalShaders";
import { Tooth46RestorationShaders } from "./Tooth46RestorationShaders";

export interface Tooth46ShaderDefsProps {
	readonly toothNumber?: number | undefined;
}

export const Tooth46ShaderDefs: React.FC<Tooth46ShaderDefsProps> = ({ toothNumber }) => {
	const hasGlobalSharedDefs = useOdontogramSharedDefs();
	if (hasGlobalSharedDefs) {
		if (toothNumber !== undefined && toothNumber !== 46 && toothNumber !== 36) {
			return null;
		}
		const prefix = toothNumber === 36 ? "tooth36" : "tooth46";
		return (
			<defs>
				<clipPath id={`${prefix}-crown-clip`}>
					<path d={TOOTH46_GEOMETRY.crownMonolithPath} />
				</clipPath>
				<clipPath id={`${prefix}-root-clip`}>
					<path d={TOOTH46_GEOMETRY.rootMonolithPath} />
				</clipPath>
			</defs>
		);
	}
	return (
		<defs>
			<clipPath id="tooth46-crown-clip">
				<path d={TOOTH46_GEOMETRY.crownMonolithPath} />
			</clipPath>
			<clipPath id="tooth46-root-clip">
				<path d={TOOTH46_GEOMETRY.rootMonolithPath} />
			</clipPath>

			<OdontogramBaseToothShaders />

			{/* Modular Domain Shaders */}
			<ToothAnteriorShaders />
			<Tooth46CuspShaders />
			<Tooth46CariesShaders />
			<Tooth46EndoShaders />
			<Tooth46CrownShaders />
			<Tooth46RestorationShaders />
			<Tooth46PathologyShaders />
			<Tooth46PeriapicalShaders />
		</defs>
	);
};
