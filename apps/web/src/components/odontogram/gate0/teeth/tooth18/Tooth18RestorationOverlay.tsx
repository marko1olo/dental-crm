import React from "react";
import type { CrownMaterial, RestorationCondition } from "../../tooth46Types";
import { ToothCrownOverlay } from "../../ToothCrownOverlay";
import { TOOTH18_GEOMETRY } from "./tooth18Geometry";

export interface Tooth18RestorationOverlayProps {
	showComposite?: boolean | undefined;
	showZirconiaCrown?: boolean | undefined;
	crownMaterial?: CrownMaterial | undefined;
	compositeCondition?: RestorationCondition | undefined;
	crownCondition?: RestorationCondition | undefined;
	translucent?: boolean | undefined;
	isDark?: boolean | undefined;
	isImplant?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth18RestorationOverlay: React.FC<Tooth18RestorationOverlayProps> = ({
	showComposite = false,
	showZirconiaCrown = false,
	crownMaterial = "zirconia",
	compositeCondition = "adequate",
	crownCondition = "adequate",
	translucent = false,
	isDark = false,
	isImplant = false,
	className,
}) => {
	const geo = TOOTH18_GEOMETRY;
	const compositeBorder = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(130, 95, 55, 0.65)";

	return (
		<g id="tooth18-restorations" className={className}>
			{/* Orthopedic Crown Shell */}
			{showZirconiaCrown && (
				<ToothCrownOverlay
					toothId="18"
					crownPath={geo.zirconiaCrownShell || geo.crownMonolithPath}
					material={crownMaterial}
					condition={crownCondition}
					translucent={translucent}
					isDark={isDark}
					isImplant={isImplant}
				/>
			)}

			{/* Light-Cured Composite Filling */}
			{showComposite && (
				<g id="tooth18-composite-filling">
					<path
						d={geo.compositeFillingPath}
						fill="url(#dente-composite-body)"
						stroke={compositeCondition === "defective" ? "#b45309" : compositeBorder}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d="M 36,107 C 44,105 52,106 62,110"
						fill="none"
						stroke={isDark ? "rgba(217, 119, 6, 0.7)" : "rgba(120, 53, 15, 0.75)"}
						strokeWidth="0.55"
						strokeLinecap="round"
					/>
				</g>
			)}
		</g>
	);
};
