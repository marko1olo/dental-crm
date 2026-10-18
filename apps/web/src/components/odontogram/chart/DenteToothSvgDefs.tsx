import React from "react";
import { DenteMaterialGradientDefs } from "./defs/DenteMaterialGradientDefs";
import { DenteRestorationGradientDefs } from "./defs/DenteRestorationGradientDefs";
import { DentePathologyGradientDefs } from "./defs/DentePathologyGradientDefs";
import { DentePatternAndFilterDefs } from "./defs/DentePatternAndFilterDefs";

export const DenteToothSvgDefs: React.FC = () => (
	<svg
		aria-hidden="true"
		className="absolute -top-[9999px] -left-[9999px] w-0 h-0 pointer-events-none opacity-0"
		style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
	>
		<defs>
			<DenteMaterialGradientDefs />
			<DenteRestorationGradientDefs />
			<DentePathologyGradientDefs />
			<DentePatternAndFilterDefs />
		</defs>
	</svg>
);
