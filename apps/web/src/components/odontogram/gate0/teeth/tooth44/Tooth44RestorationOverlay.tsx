import React from "react";
import { ToothCrownOverlay } from "../../ToothCrownOverlay";
import type { CrownMaterial, RestorationCondition } from "../../tooth46Types";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";

export interface Tooth44RestorationOverlayProps {
	showComposite?: boolean | undefined;
	showZirconiaCrown?: boolean | undefined;
	showPost?: boolean | undefined;
	showCore?: boolean | undefined;
	crownMaterial?: CrownMaterial | undefined;
	compositeCondition?: RestorationCondition | undefined;
	crownCondition?: RestorationCondition | undefined;
	translucent?: boolean | undefined;
	isDark?: boolean | undefined;
	isImplant?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth44RestorationOverlay: React.FC<
	Tooth44RestorationOverlayProps
> = ({
	showComposite = false,
	showZirconiaCrown = false,
	showPost = false,
	showCore = false,
	crownMaterial = "zirconia",
	compositeCondition = "adequate",
	crownCondition = "adequate",
	translucent = false,
	isDark = false,
	isImplant = false,
	className,
}) => {
	const geo = TOOTH44_GEOMETRY;
	const compositeBorder = isDark
		? "rgba(226, 232, 240, 0.75)"
		: "rgba(130, 95, 55, 0.65)";

	return (
		<g id="tooth44-restorations" className={className}>
			{/* Specific Post & Core Assembly */}
			{(showPost || showCore) && (
				<g id="tooth44-post-core">
					<path
						d={geo.cervicalShoulderPath}
						fill="url(#dente-root-dentin)"
						stroke={isDark ? "rgba(203, 213, 225, 0.60)" : "rgba(71, 85, 105, 0.45)"}
						strokeWidth="0.7"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					{showPost && (
						<path
							d={geo.postShaft}
							fill="url(#dente-fiber-post)"
							stroke="rgba(148, 163, 184, 0.85)"
							strokeWidth="0.6"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}
					{showCore && (
						<path
							d={geo.coreStump}
							fill="url(#dente-composite-core)"
							stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(180, 83, 9, 0.85)"}
							strokeWidth="0.75"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}
				</g>
			)}

			{/* Specific First Premolar Orthopedic Crown */}
			{showZirconiaCrown && (
				<ToothCrownOverlay
					toothId="44"
					crownPath={geo.zirconiaCrownShell || geo.crownMonolithPath}
					cervicalShoulderPath={geo.cervicalShoulderPath}
					fissures={geo.fossaeAndGrooves}
					cuspSlopes={geo.crownCuspSlopes}
					specularRidges={geo.crownSpecularRidges}
					equatorHighlight={geo.crownEquatorHighlight}
					material={crownMaterial}
					condition={crownCondition}
					translucent={translucent}
					isDark={isDark}
					isImplant={isImplant}
				/>
			)}

			{/* Light-Cured Composite Filling in Occlusal Fossae */}
			{showComposite && (
				<g id="tooth44-composite-filling">
					<path
						d={geo.compositeFillingPath}
						fill="url(#dente-composite-body)"
						stroke={compositeBorder}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d="M 36,23.5 C 43,22.0 49,22.5 56,23.5"
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
