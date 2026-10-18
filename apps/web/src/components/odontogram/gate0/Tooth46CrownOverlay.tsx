import type React from "react";
import { Tooth46CrownDefects } from "./Tooth46CrownDefects";
import {
	CROWN_FILL_MAP,
	getCrownFissureStroke,
	getCrownStroke,
} from "./Tooth46CrownMaps";
import { TOOTH46_RESTORATION_GEOMETRY } from "./Tooth46RestorationGeometry";
import type { CrownMaterial, RestorationCondition } from "./tooth46Types";

export interface Tooth46CrownOverlayProps {
	material?: CrownMaterial;
	condition?: RestorationCondition;
	isDark?: boolean;
	className?: string;
}

export const Tooth46CrownOverlay: React.FC<Tooth46CrownOverlayProps> = ({
	material = "zirconia",
	condition = "adequate",
	isDark = false,
	className,
}) => {
	const r = TOOTH46_RESTORATION_GEOMETRY;
	const stroke = getCrownStroke(material, isDark);
	const fissureColor = getCrownFissureStroke(material, isDark);

	const glazeFill =
		material === "gold"
			? "url(#dente-gold-specular)"
			: material === "metal"
				? "url(#dente-metal-sheen)"
				: "url(#dente-zirconia-glaze)";

	return (
		<g
			id="tooth46-zirconia-crown"
			data-crown-material={material}
			data-crown-condition={condition}
			className={className}
		>
			<path
				d={r.zirconiaCrownShell}
				fill={CROWN_FILL_MAP[material]}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{material === "pfm" && (
				<path
					d={r.pfmMetalCollar}
					fill="url(#dente-pfm-metal-collar)"
					stroke="none"
				/>
			)}
			{(material === "zirconia" || material === "emax") && (
				<path
					d={r.zirconiaCervicalShoulder}
					fill="url(#dente-zirconia-chamfer)"
					stroke="none"
				/>
			)}
			{r.zirconiaTriangularRidges.map((tr) => (
				<path
					key={`tr-${tr.id}`}
					d={tr.d}
					fill={
						material === "emax"
							? "url(#dente-emax-opalescent)"
							: "rgba(255, 255, 255, 0.15)"
					}
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
				r.zirconiaSpecularHigh.map((g) => (
					<ellipse
						key={`glaze-${g.id}`}
						cx={g.cx}
						cy={g.cy}
						rx={g.rx}
						ry={g.ry}
						transform={`rotate(${g.angle} ${g.cx} ${g.cy})`}
						fill={glazeFill}
						opacity={material === "emax" ? "0.95" : "0.85"}
					/>
				))}
			{condition === "defective" && (
				<Tooth46CrownDefects material={material} isDark={isDark} />
			)}
		</g>
	);
};
