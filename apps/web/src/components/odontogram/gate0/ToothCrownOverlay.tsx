import type React from "react";
import {
	CROWN_FILL_MAP,
	getCrownFissureStroke,
	getCrownStroke,
	getGlazeStroke,
} from "./Tooth46CrownMaps";
import type { CrownMaterial, RestorationCondition } from "./tooth46Types";

export interface ToothCrownOverlayProps {
	toothId: string;
	crownPath: string;
	cervicalShoulderPath?: string | undefined;
	fissures?: readonly { id: string; d: string }[] | undefined;
	material?: CrownMaterial | undefined;
	condition?: RestorationCondition | undefined;
	translucent?: boolean | undefined;
	isDark?: boolean | undefined;
	isImplant?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Universal anatomical orthopedic crown overlay.
 * Renders crown strictly in the tooth's own anatomical outline
 * with realistic materials, cervical chamfer, and milled fissures.
 * Mandate 8b <= 120 lines.
 */
export const ToothCrownOverlay: React.FC<ToothCrownOverlayProps> = ({
	toothId,
	crownPath,
	cervicalShoulderPath,
	fissures,
	material = "zirconia",
	condition = "adequate",
	translucent = false,
	isDark = false,
	isImplant = false,
	className,
}) => {
	const stroke = getCrownStroke(material, isDark);
	const fissureColor = getCrownFissureStroke(material, isDark);
	const glazeStroke = getGlazeStroke(material);

	return (
		<g
			id={`tooth${toothId}-crown-overlay`}
			data-testid={`tooth${toothId}-crown`}
			data-crown-material={material}
			data-crown-condition={condition}
			data-implant-crown={isImplant ? "true" : undefined}
			className={className}
		>
			{/* Monolithic anatomical shell of the specific tooth */}
			<path
				id={`tooth${toothId}-crown-shell`}
				d={crownPath}
				fill={CROWN_FILL_MAP[material]}
				fillOpacity={translucent ? "0.62" : undefined}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Subgingival PFM metal collar */}
			{material === "pfm" && cervicalShoulderPath && (
				<path
					d={cervicalShoulderPath}
					fill="url(#dente-pfm-metal-collar)"
					stroke="none"
				/>
			)}

			{/* Circumferential cervical chamfer prep shoulder */}
			{(material === "zirconia" || material === "emax") && cervicalShoulderPath && (
				<path
					d={cervicalShoulderPath}
					fill="url(#dente-zirconia-chamfer)"
					stroke="none"
				/>
			)}

			{/* Milled secondary fissures of the specific tooth */}
			{fissures?.map((f) => (
				<path
					key={`fissure-${f.id}`}
					d={f.d}
					fill="none"
					stroke={fissureColor}
					strokeWidth="0.55"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}

			{/* Equator & glaze reflection highlight */}
			{cervicalShoulderPath && (
				<path
					d={cervicalShoulderPath}
					fill="none"
					stroke={glazeStroke}
					strokeWidth="0.5"
					opacity="0.4"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
