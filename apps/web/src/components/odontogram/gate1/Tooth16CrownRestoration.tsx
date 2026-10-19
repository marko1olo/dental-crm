import type React from "react";
import { Tooth16CrownDefects } from "./Tooth16CrownDefects";
import {
	getTooth16CrownStroke,
	TOOTH16_CROWN_FILL_MAP,
} from "./Tooth16CrownMaps";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";
import type {
	Tooth16CrownMaterial,
	Tooth16RestorationCondition,
} from "./tooth16Types";

export interface Tooth16CrownRestorationProps {
	crownMaterial?: Tooth16CrownMaterial;
	crownCondition?: Tooth16RestorationCondition;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Full Crown Restoration for Tooth 16 / 26
 * Supports 6 materials (Zirconia, PFM, E-Max, Gold, Metal, PMMA) and defects.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16CrownRestoration: React.FC<
	Tooth16CrownRestorationProps
> = ({
	crownMaterial = "zirconia",
	crownCondition = "adequate",
	isDark = false,
}) => {
	const crownStroke = getTooth16CrownStroke(crownMaterial, isDark);

	return (
		<g id="tooth16-crown-monolith-group">
			<path
				id="tooth16-prosthetic-crown"
				data-crown-material={crownMaterial}
				d={TOOTH16_GEOMETRY.crownMonolithPath}
				fill={TOOTH16_CROWN_FILL_MAP[crownMaterial]}
				stroke={crownStroke}
				strokeWidth="0.9"
				strokeLinejoin="round"
			/>
			{crownCondition === "defective" && (
				<Tooth16CrownDefects crownMaterial={crownMaterial} isDark={isDark} />
			)}
		</g>
	);
};
