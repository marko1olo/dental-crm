import type React from "react";
import { DenteShaderAliasesCrown } from "./DenteShaderAliasesCrown";
import { DenteShaderAliasesSurgical } from "./DenteShaderAliasesSurgical";

/**
 * Backward-Compatibility SVG Gradient Aliases Facade.
 * Combines crown, anatomy, pulp, restoration and surgical aliases.
 * Mandate 8b <= 120 lines.
 */
export const DenteShaderAliases: React.FC = () => (
	<>
		<DenteShaderAliasesCrown />
		<DenteShaderAliasesSurgical />
	</>
);
