import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import { ToothCrownOverlay } from "../../ToothCrownOverlay";
import type { CrownMaterial, RestorationCondition } from "../../tooth46Types";
import { TOOTH42_GEOMETRY } from "./tooth42Geometry";

export interface Tooth42RestorationOverlayProps {
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

export const Tooth42RestorationOverlay: React.FC<
	Tooth42RestorationOverlayProps
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
	const tNum = useToothNumber() ?? 42;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const geo = TOOTH42_GEOMETRY;
	const compositeBorder = isDark
		? "rgba(226, 232, 240, 0.75)"
		: "rgba(130, 95, 55, 0.65)";

	return (
		<g id={sid(`tooth${tNum}-restorations`)} className={className}>
			{/* Specific Post & Core Assembly */}
			{(showPost || showCore) && (
				<g id={sid(`tooth${tNum}-post-core`)}>
					<path
						d={geo.cervicalShoulderPath}
						fill={`url(#${sid("dente-root-dentin")})`}
						stroke={isDark ? "rgba(203, 213, 225, 0.60)" : "rgba(71, 85, 105, 0.45)"}
						strokeWidth="0.7"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					{showPost && (
						<path
							d={geo.postShaft}
							fill={`url(#${sid("dente-fiber-post")})`}
							stroke="rgba(148, 163, 184, 0.85)"
							strokeWidth="0.6"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}
					{showCore && (
						<path
							d={geo.coreStump}
							fill={`url(#${sid("dente-composite-core")})`}
							stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(180, 83, 9, 0.85)"}
							strokeWidth="0.75"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}
				</g>
			)}

			{/* Specific Mandibular Lateral Incisor Orthopedic Crown */}
			{showZirconiaCrown && (
				<ToothCrownOverlay
					toothId={String(tNum)}
					crownPath={geo.zirconiaCrownShell || geo.crownMonolithPath}
					cervicalShoulderPath={geo.cervicalShoulderPath}
					fissures={undefined}
					cuspSlopes={undefined}
					specularRidges={geo.crownSpecularRidges}
					equatorHighlight={geo.crownEquatorHighlight}
					material={crownMaterial}
					condition={crownCondition}
					translucent={translucent}
					isDark={isDark}
					isImplant={isImplant}
				/>
			)}

			{/* Light-Cured Composite Filling (Cervical Class V) */}
			{showComposite && (
				<g id={sid(`tooth${tNum}-composite-filling`)}>
					<path
						d={geo.compositeFillingPath}
						fill={`url(#${sid("dente-composite-body")})`}
						stroke={compositeBorder}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d="M 40.0,67.5 C 45.0,66.0 55.0,66.0 60.0,67.5"
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
