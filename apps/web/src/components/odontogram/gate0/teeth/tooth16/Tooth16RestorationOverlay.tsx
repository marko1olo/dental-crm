import React from "react";
import type { CrownMaterial, RestorationCondition } from "../../tooth46Types";
import { ToothCrownOverlay } from "../../ToothCrownOverlay";
import { TOOTH16_GEOMETRY } from "./tooth16Geometry";

export interface Tooth16RestorationOverlayProps {
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

export const Tooth16RestorationOverlay: React.FC<Tooth16RestorationOverlayProps> = ({
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
	const geo = TOOTH16_GEOMETRY;
	const compositeBorder = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(130, 95, 55, 0.65)";

	return (
		<g id="tooth16-restorations" className={className}>
			{/* Orthopedic Crown Shell */}
			{showZirconiaCrown && (
				<ToothCrownOverlay
					toothId="16"
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
				<g id="tooth16-composite-filling">
					<path
						d={geo.compositeFillingPath}
						fill="url(#dente-composite-body)"
						stroke={compositeCondition === "defective" ? "#b45309" : compositeBorder}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d="M 32,109 C 42,107 54,108 68,112"
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
