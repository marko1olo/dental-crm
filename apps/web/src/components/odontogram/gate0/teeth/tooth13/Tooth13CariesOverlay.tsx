import React from "react";
import { TOOTH13_CARIES_GEOMETRY } from "./tooth13CariesGeometry";

export interface Tooth13CariesOverlayProps {
	cariesType?: "class1" | "class2" | "class3" | "class5" | undefined;
	cariesDepth?: "superficialis" | "media" | "profunda" | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Caries Pathology Overlay for Upper Canine 13.
 * Class I (incisal/cingulum), Class II (contact), Class V (cervical).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13CariesOverlay: React.FC<Tooth13CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	isDark = false,
	className,
}) => {
	const g = TOOTH13_CARIES_GEOMETRY;
	const isProfunda = cariesDepth === "profunda";
	const haloStroke = isDark ? "rgba(253, 224, 71, 0.40)" : "rgba(202, 138, 4, 0.35)";
	const coreStroke = isDark ? "rgba(120, 53, 15, 0.85)" : "rgba(69, 26, 3, 0.90)";

	return (
		<g id="tooth13-caries-overlay" {...(className ? { className } : {})}>
			{/* Class I: Cingulum & Incisal Caries */}
			{cariesType === "class1" && (
				<g id="tooth13-caries-class1">
					<path
						d={isProfunda ? g.class1.profunda.halo : g.class1.media.halo}
						fill="url(#dente-caries-halo-13)"
						stroke={haloStroke}
						strokeWidth="0.5"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={isProfunda ? g.class1.profunda.core : g.class1.media.core}
						fill="url(#dente-caries-crater-13)"
						stroke={coreStroke}
						strokeWidth="0.75"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* Class II/III: Proximal Contact Caries (Mesial & Distal) */}
			{(cariesType === "class2" || cariesType === "class3") && (
				<g id="tooth13-caries-class2">
					<path
						d={g.class2.mesial.halo}
						fill="url(#dente-caries-halo-13)"
						stroke={haloStroke}
						strokeWidth="0.5"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.class2.mesial.core}
						fill="url(#dente-caries-crater-13)"
						stroke={coreStroke}
						strokeWidth="0.75"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.class2.distal.halo}
						fill="url(#dente-caries-halo-13)"
						stroke={haloStroke}
						strokeWidth="0.5"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.class2.distal.core}
						fill="url(#dente-caries-crater-13)"
						stroke={coreStroke}
						strokeWidth="0.75"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* Class V: Cervical Crescent Caries */}
			{cariesType === "class5" && (
				<g id="tooth13-caries-class5">
					<path
						d={isProfunda ? g.class5.profunda.halo : g.class5.media.halo}
						fill="url(#dente-caries-halo-13)"
						stroke={haloStroke}
						strokeWidth="0.5"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={isProfunda ? g.class5.profunda.core : g.class5.media.core}
						fill="url(#dente-caries-crater-13)"
						stroke={coreStroke}
						strokeWidth="0.75"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
