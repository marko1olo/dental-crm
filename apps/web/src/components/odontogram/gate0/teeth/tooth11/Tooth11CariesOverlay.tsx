import React from "react";
import { TOOTH11_CARIES_GEOMETRY } from "./tooth11CariesGeometry";

export interface Tooth11CariesOverlayProps {
	cariesType?: "class1" | "class2" | "class4" | "class5" | undefined;
	cariesDepth?: "superficialis" | "media" | "profunda" | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Caries Pathology Overlay for Upper Central Incisor 11.
 * Class I (incisal/cingulum), Class II/III (contact), Class IV (angle defect), Class V (cervical).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11CariesOverlay: React.FC<Tooth11CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	isDark = false,
	className,
}) => {
	const g = TOOTH11_CARIES_GEOMETRY;
	const isProfunda = cariesDepth === "profunda";
	const haloStroke = isDark ? "rgba(253, 224, 71, 0.40)" : "rgba(202, 138, 4, 0.35)";
	const coreStroke = isDark ? "rgba(120, 53, 15, 0.85)" : "rgba(69, 26, 3, 0.90)";

	return (
		<g id="tooth11-caries-overlay" {...(className ? { className } : {})}>
			{cariesType === "class1" && (
				<g id="tooth11-caries-class1">
					<path
						d={isProfunda ? g.class1.profunda.halo : g.class1.media.halo}
						fill="url(#dente-caries-halo-11)"
						stroke={haloStroke}
						strokeWidth="0.5"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={isProfunda ? g.class1.profunda.core : g.class1.media.core}
						fill="url(#dente-caries-crater-11)"
						stroke={coreStroke}
						strokeWidth="0.75"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{cariesType === "class2" && (
				<g id="tooth11-caries-class2">
					<path d={g.class2.mesial.halo} fill="url(#dente-caries-halo-11)" stroke={haloStroke} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
					<path d={g.class2.mesial.core} fill="url(#dente-caries-crater-11)" stroke={coreStroke} strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
					<path d={g.class2.distal.halo} fill="url(#dente-caries-halo-11)" stroke={haloStroke} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
					<path d={g.class2.distal.core} fill="url(#dente-caries-crater-11)" stroke={coreStroke} strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
				</g>
			)}

			{cariesType === "class4" && (
				<g id="tooth11-caries-class4">
					<path d={g.class4.angleDefect.halo} fill="url(#dente-caries-halo-11)" stroke={haloStroke} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
					<path d={g.class4.angleDefect.core} fill="url(#dente-caries-crater-11)" stroke={coreStroke} strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
				</g>
			)}

			{cariesType === "class5" && (
				<g id="tooth11-caries-class5">
					<path
						d={isProfunda ? g.class5.profunda.halo : g.class5.media.halo}
						fill="url(#dente-caries-halo-11)"
						stroke={haloStroke}
						strokeWidth="0.5"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={isProfunda ? g.class5.profunda.core : g.class5.media.core}
						fill="url(#dente-caries-crater-11)"
						stroke={coreStroke}
						strokeWidth="0.75"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
