import type React from "react";
import { Tooth16CompositeRestoration } from "./Tooth16CompositeRestoration";
import { Tooth16CrownRestoration } from "./Tooth16CrownRestoration";
import { Tooth16CrownShaders } from "./Tooth16CrownShaders";
import { Tooth16RestorationShaders } from "./Tooth16RestorationShaders";
import type {
	Tooth16CrownMaterial,
	Tooth16RestorationCondition,
} from "./tooth16Types";

export interface Tooth16RestorationOverlayProps {
	showComposite?: boolean;
	showZirconiaCrown?: boolean;
	crownMaterial?: Tooth16CrownMaterial;
	compositeCondition?: Tooth16RestorationCondition;
	crownCondition?: Tooth16RestorationCondition;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Restoration & Crown Overlay for Upper Molars 16 / 26
 * Supports 6 crown materials, nanohybrid composite A2/A3, and adequate vs defective states.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16RestorationOverlay: React.FC<
	Tooth16RestorationOverlayProps
> = ({
	showComposite = false,
	showZirconiaCrown = false,
	crownMaterial = "zirconia",
	compositeCondition = "adequate",
	crownCondition = "adequate",
	isDark = false,
}) => {
	return (
		<g id="tooth16-restoration-overlay">
			<Tooth16RestorationShaders />
			<Tooth16CrownShaders />

			{/* 1. Nanohybrid Light-Cure Composite (A2/A3) */}
			{showComposite && !showZirconiaCrown && (
				<Tooth16CompositeRestoration
					compositeCondition={compositeCondition}
					isDark={isDark}
				/>
			)}

			{/* 2. Full Crown (6 Materials: Zirconia, PFM, E-Max, Gold, Metal, PMMA) */}
			{showZirconiaCrown && (
				<Tooth16CrownRestoration
					crownMaterial={crownMaterial}
					crownCondition={crownCondition}
					isDark={isDark}
				/>
			)}
		</g>
	);
};
