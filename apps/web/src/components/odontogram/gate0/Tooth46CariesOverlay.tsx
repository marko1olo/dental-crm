import type React from "react";
import { TOOTH46_CARIES_GEOMETRY } from "./Tooth46CariesGeometry";

export interface Tooth46CariesOverlayProps {
	isDark?: boolean;
	showBuccalPit?: boolean;
	className?: string;
}

/**
 * Organic Biological Caries Pathology for Tooth 46
 * Authentic Class I dendritic fissure caries with 3 pathology zones:
 * 1. Chalky demineralized enamel halo
 * 2. Infiltrating dendritic softened dentin (Y-5 Dryopithecus groove)
 * 3. Deep necrotic cavitated crater with micro-pits & isolated buccal caecum pit
 */
export const Tooth46CariesOverlay: React.FC<Tooth46CariesOverlayProps> = ({
	isDark = false,
	showBuccalPit = true,
	className,
}) => {
	const c = TOOTH46_CARIES_GEOMETRY;
	const haloStroke = isDark
		? "rgba(254, 243, 199, 0.35)"
		: "rgba(254, 243, 199, 0.55)";
	const grooveStroke = isDark
		? "rgba(120, 53, 15, 0.50)"
		: "rgba(146, 64, 14, 0.60)";

	return (
		<g
			id="tooth46-biological-caries"
			className={className}
			clipPath="url(#tooth46-crown-clip)"
		>
			{/* Zone 1: Chalky Demineralized Enamel Halo */}
			<path
				d={c.demineralizedHalo}
				fill="url(#dente-caries-demin)"
				stroke={haloStroke}
				strokeWidth="0.6"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Zone 2: Infiltrating Dendritic Softened Dentin in Y-5 Fissure */}
			<path
				d={c.dendriticCariesPath}
				fill="url(#dente-caries-lesion)"
				stroke="rgba(120, 53, 15, 0.85)"
				strokeWidth="0.6"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Zone 3: Deep Cavitated Necrotic Core */}
			<path
				d={c.necroticCore}
				fill="url(#dente-caries-necrotic)"
				stroke="rgba(28, 25, 23, 0.95)"
				strokeWidth="0.6"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Micro-pits in fissure bottoms */}
			{c.microPits.map((pit) => (
				<circle
					key={`pit-${pit.cx}-${pit.cy}`}
					cx={pit.cx}
					cy={pit.cy}
					r={pit.r}
					fill="#1c1917"
					opacity="0.9"
				/>
			))}

			{/* Hairline Developmental Buccal Groove Trace */}
			<path
				d={c.buccalGrooveTrace}
				fill="none"
				stroke={grooveStroke}
				strokeWidth="0.7"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Class V Buccal Pit (Foramen Caecum) Cavitation */}
			{showBuccalPit && (
				<g id="tooth46-buccal-caecum">
					<path
						d={c.buccalPitCavity.halo}
						fill="url(#dente-caries-demin)"
						stroke={haloStroke}
						strokeWidth="0.5"
					/>
					<path
						d={c.buccalPitCavity.crater}
						fill="url(#dente-caries-lesion)"
						stroke="rgba(120, 53, 15, 0.8)"
						strokeWidth="0.5"
					/>
					<path
						d={c.buccalPitCavity.necroticCenter}
						fill="url(#dente-caries-necrotic)"
						stroke="#1c1917"
						strokeWidth="0.4"
						strokeLinejoin="round"
					/>
				</g>
			)}
		</g>
	);
};
