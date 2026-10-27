import React from "react";
import { TOOTH17_CARIES_GEOMETRY } from "./tooth17CariesGeometry";

export interface Tooth17CariesOverlayProps {
	cariesType?: "class1" | "class2_mo" | "class2_do" | "class2_mod" | "class5" | "destructive" | undefined;
	cariesDepth?: "superficial" | "media" | "profunda" | undefined;
	chronicity?: "acute" | "chronic" | undefined;
	showCervical?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth17CariesOverlay: React.FC<Tooth17CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	chronicity = "acute",
	showCervical = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH17_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const isProfunda = cariesDepth === "profunda";
	const isSuperficial = cariesDepth === "superficial";

	const deminFill = "url(#dente-caries-demin)";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const stroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";

	return (
		<g id="tooth17-caries" className={className} clipPath="url(#tooth17-crown-clip)">
			{cariesType === "class1" && (
				<g id="tooth17-caries-class1">
					<path d={g.class1.demineralizedHalo} fill={deminFill} stroke={deminStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={g.class1.dendriticCariesPath} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.7" />
					)}
					{isProfunda && (
						<path d={g.class1.necroticCore} fill={necroticFill} stroke="rgba(12, 10, 9, 0.98)" strokeWidth="0.7" />
					)}
					<path d={g.class1.buccalGrooveTrace} fill="none" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" />
					{g.class1.microPits.map((p, i) => (
						<circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={necroticFill} />
					))}
				</g>
			)}

			{cariesType === "class2_mo" && (
				<g id="tooth17-caries-class2-mo">
					<path d={g.class2.mesialBox.halo} fill={deminFill} stroke={deminStroke} strokeWidth="0.5" />
					{!isSuperficial && <path d={g.class2.mesialBox.crater} fill={lesionFill} stroke={stroke} strokeWidth="0.6" />}
					{isProfunda && <path d={g.class2.mesialBox.necrotic} fill={necroticFill} />}
				</g>
			)}

			{cariesType === "class2_do" && (
				<g id="tooth17-caries-class2-do">
					<path d={g.class2.distalBox.halo} fill={deminFill} stroke={deminStroke} strokeWidth="0.5" />
					{!isSuperficial && <path d={g.class2.distalBox.crater} fill={lesionFill} stroke={stroke} strokeWidth="0.6" />}
					{isProfunda && <path d={g.class2.distalBox.necrotic} fill={necroticFill} />}
				</g>
			)}

			{cariesType === "class2_mod" && (
				<g id="tooth17-caries-class2-mod">
					<path d={g.class2.mesialBox.halo} fill={deminFill} stroke={deminStroke} strokeWidth="0.5" />
					<path d={g.class2.distalBox.halo} fill={deminFill} stroke={deminStroke} strokeWidth="0.5" />
					<path d={g.class2.modTunnel} fill={deminFill} stroke={deminStroke} strokeWidth="0.4" />
					{!isSuperficial && (
						<>
							<path d={g.class2.mesialBox.crater} fill={lesionFill} stroke={stroke} strokeWidth="0.6" />
							<path d={g.class2.distalBox.crater} fill={lesionFill} stroke={stroke} strokeWidth="0.6" />
						</>
					)}
					{isProfunda && (
						<>
							<path d={g.class2.mesialBox.necrotic} fill={necroticFill} />
							<path d={g.class2.distalBox.necrotic} fill={necroticFill} />
						</>
					)}
				</g>
			)}

			{(cariesType === "class5" || showCervical) && (
				<g id="tooth17-caries-class5">
					<path d={g.class5.halo} fill={deminFill} stroke={deminStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d={g.class5.crater} fill={lesionFill} stroke={stroke} strokeWidth="0.7" />}
					{isProfunda && <path d={g.class5.necrotic} fill={necroticFill} />}
				</g>
			)}

			{cariesType === "destructive" && (
				<g id="tooth17-caries-destructive">
					<path d={g.destructive} fill={lesionFill} stroke={stroke} strokeWidth="0.8" />
					<circle cx={51.5} cy={138} r={7} fill={necroticFill} />
				</g>
			)}
		</g>
	);
};
