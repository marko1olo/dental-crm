import type React from "react";
import { Tooth46CrownDefects } from "./Tooth46CrownDefects";
import {
	CROWN_FILL_MAP,
	getCrownFissureStroke,
	getCrownStroke,
	getCuspSlopeColors,
	getGlazeStroke,
} from "./Tooth46CrownMaps";
import { TOOTH46_RESTORATION_GEOMETRY } from "./Tooth46RestorationGeometry";
import type { CrownMaterial, RestorationCondition } from "./tooth46Types";

export interface Tooth46CrownOverlayProps {
	material?: CrownMaterial;
	condition?: RestorationCondition;
	translucent?: boolean;
	isDark?: boolean;
	className?: string;
}

export const Tooth46CrownOverlay: React.FC<Tooth46CrownOverlayProps> = ({
	material = "zirconia",
	condition = "adequate",
	translucent = false,
	isDark = false,
	className,
}) => {
	const r = TOOTH46_RESTORATION_GEOMETRY;
	const stroke = getCrownStroke(material, isDark);
	const fissureColor = getCrownFissureStroke(material, isDark);
	const glazeStroke = getGlazeStroke(material);
	const slopes = getCuspSlopeColors(material);

	return (
		<g
			id="tooth46-zirconia-crown"
			data-crown-material={material}
			data-crown-condition={condition}
			className={className}
		>
			<path
				id="tooth46-crown-shell"
				d={r.zirconiaCrownShell}
				fill={CROWN_FILL_MAP[material]}
				fillOpacity={translucent ? "0.62" : undefined}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{material === "pfm" && (
				<path d={r.pfmMetalCollar} fill="url(#dente-pfm-metal-collar)" stroke="none" />
			)}
			{(material === "zirconia" || material === "emax") && (
				<path d={r.zirconiaCervicalShoulder} fill="url(#dente-zirconia-chamfer)" stroke="none" />
			)}
			{r.zirconiaCuspSlopes.map((s) => (
				<path
					key={`slope-${s.id}`}
					id={`tooth46-cusp-slope-${s.id}`}
					d={s.d}
					fill={s.type === "highlight" ? slopes.highlight : slopes.shadow}
					stroke="none"
				/>
			))}
			{r.zirconiaMilledFissures.map((f) => (
				<path
					key={`mf-${f.id}`}
					d={f.d}
					fill="none"
					stroke={fissureColor}
					strokeWidth="0.55"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}
			{material !== "pmma" &&
				r.zirconiaSpecularRidges.map((g) => (
					<path
						key={`glaze-${g.id}`}
						id={`tooth46-glaze-${g.id}`}
						d={g.d}
						fill="none"
						stroke={glazeStroke}
						strokeWidth="0.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
						opacity={material === "emax" ? "0.95" : "0.85"}
					/>
				))}
			<path
				d={r.crownEquatorHighlight}
				fill="none"
				stroke={glazeStroke}
				strokeWidth="0.6"
				opacity="0.35"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
			{condition === "defective" && (
				<Tooth46CrownDefects material={material} isDark={isDark} />
			)}
		</g>
	);
};
