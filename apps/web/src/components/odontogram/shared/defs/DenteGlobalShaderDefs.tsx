import type React from "react";
import { CrownMaterialShaderDefs } from "./CrownMaterialShaderDefs";
import { DenteShaderAliases } from "./DenteShaderAliases";
import { ToothEndoShaders } from "./ToothEndoShaders";
import { ToothPathologyShaders } from "./ToothPathologyShaders";
import { ToothRestorationShaders } from "./ToothRestorationShaders";
import { ToothShaderDefs } from "./ToothShaderDefs";

/**
 * Root Global Odontogram Shader Palette.
 * Mounts strictly ONCE in the root SVG container to eliminate DOM bloat across 32 teeth.
 * Declares all canonical dente-shader-* definitions and backward-compatible aliases.
 * Mandate 8b <= 120 lines.
 */
export const DenteGlobalShaderDefs: React.FC = () => {
	return (
		<defs id="dente-global-odontogram-defs">
			<ToothShaderDefs />
			<CrownMaterialShaderDefs />
			<ToothEndoShaders />
			<ToothPathologyShaders />
			<ToothRestorationShaders />
			<DenteShaderAliases />
		</defs>
	);
};

/**
 * Architectural alias per explorer blueprint.
 */
export const DenteGlobalOdontogramDefs = DenteGlobalShaderDefs;
