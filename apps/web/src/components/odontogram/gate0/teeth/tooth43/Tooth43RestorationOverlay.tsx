import type React from "react";
import { ToothCrownOverlay } from "../../ToothCrownOverlay";
import type { CrownMaterial, RestorationCondition } from "../../tooth46Types";
import { TOOTH43_GEOMETRY } from "./tooth43Geometry";

export interface Tooth43RestorationOverlayProps {
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

export const Tooth43RestorationOverlay: React.FC<
	Tooth43RestorationOverlayProps
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
	const geo = TOOTH43_GEOMETRY;
	const compositeBorder = isDark
		? "rgba(226, 232, 240, 0.75)"
		: "rgba(130, 95, 55, 0.65)";

	return (
		<g id="tooth43-restorations" className={className}>
			{/* Specific Mandibular Canine Orthopedic Crown */}
			{showZirconiaCrown && (
				<ToothCrownOverlay
					toothId="43"
					crownPath={geo.crownMonolithPath}
					cervicalShoulderPath={geo.cervicalShoulderPath}
					fissures={[{ id: "labialRidge", d: geo.labialRidge }]}
					material={crownMaterial}
					condition={crownCondition}
					translucent={translucent}
					isDark={isDark}
					isImplant={isImplant}
				/>
			)}

			{/* Light-Cured Composite Filling (Cervical Class V) */}
			{showComposite && (
				<g id="tooth43-composite-filling">
					<path
						d={geo.compositeFillingPath}
						fill="url(#dente-composite-body)"
						stroke={compositeBorder}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d="M 40.0,64.0 C 46.0,63.0 54.0,63.0 60.0,64.0"
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
