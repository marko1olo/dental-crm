import React from "react";
import { Tooth46CrownOverlay } from "../../Tooth46CrownOverlay";
import { TOOTH46_DEFECT_GEOMETRY } from "../../Tooth46DefectGeometry";
import { TOOTH46_RESTORATION_GEOMETRY } from "../../Tooth46RestorationGeometry";
import { TOOTH46_CARIES_SPECTRUM_GEOMETRY } from "../../Tooth46CariesSpectrumGeometry";
import type { CrownMaterial, RestorationCondition } from "../../tooth46Types";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth46RestorationOverlayProps {
	showComposite?: boolean | undefined;
	compositeSurface?: "O" | "M" | "D" | "MO" | "DO" | "MOD" | string | undefined;
	compositeSurfaces?: readonly ("O" | "M" | "D" | "B" | "L" | "V")[] | undefined;
	showZirconiaCrown?: boolean | undefined;
	crownMaterial?: CrownMaterial | undefined;
	compositeCondition?: RestorationCondition | undefined;
	crownCondition?: RestorationCondition | undefined;
	translucent?: boolean | undefined;
	isDark?: boolean | undefined;
	isImplant?: boolean | undefined;
	className?: string | undefined;
	toothNumber?: number | undefined;
}

export const Tooth46RestorationOverlay: React.FC<
	Tooth46RestorationOverlayProps
> = ({
	showComposite = false,
	compositeSurface,
	compositeSurfaces,
	showZirconiaCrown = false,
	crownMaterial = "zirconia",
	compositeCondition = "adequate",
	crownCondition = "adequate",
	translucent = false,
	isDark = false,
	isImplant = false,
	className,
	toothNumber,
}) => {
	const tNum = useToothNumber(toothNumber) ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const compositeBodyFill = `url(#${sid("dente-composite-body")})`;
	const r = TOOTH46_RESTORATION_GEOMETRY;
	const d = TOOTH46_DEFECT_GEOMETRY.defectiveComposite;
	const sp = TOOTH46_CARIES_SPECTRUM_GEOMETRY;

	// Submicron polymerized enamel margin & anatomical fissure stain
	const compositeBorder = isDark
		? "rgba(226, 232, 240, 0.75)"
		: "rgba(130, 95, 55, 0.65)";
	const fissureColor = isDark
		? "rgba(217, 119, 6, 0.70)"
		: "rgba(120, 53, 15, 0.75)";

	// Wheeler 2.5D & MODBL Isolation: определение поверхностей пломбирования
	const hasExplicitM = compositeSurface === "M" || compositeSurfaces?.includes("M");
	const hasExplicitD = compositeSurface === "D" || compositeSurfaces?.includes("D");
	const isMO = compositeSurface === "MO" || (hasExplicitM && compositeSurface?.includes("O"));
	const isDO = compositeSurface === "DO" || (hasExplicitD && compositeSurface?.includes("O"));
	const isMOD = compositeSurface === "MOD" || (hasExplicitM && hasExplicitD && compositeSurface?.includes("O"));
	const isPureM = (hasExplicitM && !hasExplicitD && !compositeSurface?.includes("O")) && !isMO && !isMOD;
	const isPureD = (hasExplicitD && !hasExplicitM && !compositeSurface?.includes("O")) && !isDO && !isMOD;
	const renderOcclusal = !isPureM && !isPureD;

	return (
		<g id={sid(`tooth${tNum}-restorations`)} className={className}>
			{/* Orthopedic Crown (6 Clinical Materials with Milled Anatomy) */}
			{showZirconiaCrown && (
				<Tooth46CrownOverlay
					material={crownMaterial}
					condition={crownCondition}
					translucent={translucent}
					isDark={isDark}
					isImplant={isImplant}
				/>
			)}

			{/* Light-Cured Nanohybrid Composite (A2/A3 Enamel-Dentin) */}
			{showComposite && (
				<g id={sid(`tooth${tNum}-composite-filling`)} clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}>
					{/* Окклюзионное тело пломбы (Class I / O / MO / DO / MOD) */}
					{renderOcclusal && (
						<>
							<path
								d={r.compositeFilling}
								fill={compositeBodyFill}
								stroke={compositeBorder}
								strokeWidth="0.75"
								strokeLinejoin="round"
								vectorEffect="non-scaling-stroke"
							/>
							{/* Specular Glaze Reflection */}
							{r.compositeGlazeHighlight && (
								<path
									d={r.compositeGlazeHighlight}
									fill="none"
									stroke="#ffffff"
									strokeWidth="0.55"
									strokeOpacity="0.75"
									strokeLinecap="round"
								/>
							)}
							{/* Sculpted Secondary Anatomy Fissures */}
							{r.compositeSculptedFissures.map((fissure) => (
								<path
									key={`comp-fissure-${fissure.id}`}
									d={fissure.d}
									fill="none"
									stroke={fissureColor}
									strokeWidth="0.6"
									strokeLinecap="round"
									vectorEffect="non-scaling-stroke"
								/>
							))}
						</>
					)}

					{/* Медиальная анатомическая реставрация M (MODBL-изоляция: кариес на O не затирается) */}
					{(isPureM || isMO || isMOD) && (
						<path
							d={sp.class2M.crater}
							fill={compositeBodyFill}
							stroke={compositeBorder}
							strokeWidth="0.75"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}

					{/* Дистальная анатомическая реставрация D (MODBL-изоляция) */}
					{(isPureD || isDO || isMOD) && (
						<path
							d={sp.class2D.crater}
							fill={compositeBodyFill}
							stroke={compositeBorder}
							strokeWidth="0.75"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}

					{/* Defective Composite: Marginal Breakdown & Recurrent Caries */}
					{compositeCondition === "defective" && (
						<g id={sid(`tooth${tNum}-defective-composite-manifestations`)}>
							<path
								d={d.marginalLeakageBorder}
								fill="#78350f"
								opacity="0.80"
								stroke="#451a03"
								strokeWidth="0.5"
							/>
							<path
								d={d.subFillingCariesInfiltration}
								fill={`url(#${sid("dente-caries-lesion")})`}
								stroke="#78350f"
								strokeWidth="0.5"
							/>
							<path
								d={d.fracturedCompositeChip}
								fill="#b08968"
								stroke="#78350f"
								strokeWidth="0.6"
							/>
						</g>
					)}
				</g>
			)}
		</g>
	);
};
