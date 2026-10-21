import type React from "react";
import { Tooth46CrownOverlay } from "./Tooth46CrownOverlay";
import { TOOTH46_DEFECT_GEOMETRY } from "./Tooth46DefectGeometry";
import { TOOTH46_RESTORATION_GEOMETRY } from "./Tooth46RestorationGeometry";
import type { CrownMaterial, RestorationCondition } from "./tooth46Types";

export interface Tooth46RestorationOverlayProps {
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

export const Tooth46RestorationOverlay: React.FC<
	Tooth46RestorationOverlayProps
> = ({
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
	const r = TOOTH46_RESTORATION_GEOMETRY;
	const d = TOOTH46_DEFECT_GEOMETRY.defectiveComposite;

	// Submicron enamel margin & anatomical fissure stain
	const compositeBorder = isDark
		? "rgba(203, 213, 225, 0.50)"
		: "rgba(100, 116, 139, 0.40)";
	const fissureColor = isDark
		? "rgba(148, 163, 184, 0.65)"
		: "rgba(71, 85, 105, 0.60)";

	return (
		<g id="tooth46-restorations" className={className}>
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
				<g id="tooth46-composite-filling" clipPath="url(#tooth46-crown-clip)">
					<path
						d={r.compositeFilling}
						fill="url(#dente-composite-body)"
						stroke={compositeBorder}
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
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
					{/* Defective Composite: Marginal Breakdown & Recurrent Caries */}
					{compositeCondition === "defective" && (
						<g id="tooth46-defective-composite-manifestations">
							<path
								d={d.marginalLeakageBorder}
								fill="#78350f"
								opacity="0.80"
								stroke="#451a03"
								strokeWidth="0.5"
							/>
							<path
								d={d.subFillingCariesInfiltration}
								fill="url(#dente-caries-lesion)"
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
