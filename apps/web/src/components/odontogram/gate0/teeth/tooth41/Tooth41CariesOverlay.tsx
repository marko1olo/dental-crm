import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH41_CARIES_GEOMETRY } from "./tooth41CariesGeometry";

export interface Tooth41CariesOverlayProps {
	cariesType?: CariesType; cariesDepth?: CariesDepth;
	chronicity?: CariesChronicity; cariesSurface?: "mesial" | "distal" | "M" | "D";
	isDark?: boolean; className?: string;
}

export const Tooth41CariesOverlay: React.FC<Tooth41CariesOverlayProps> = ({
	cariesType = "class3", cariesDepth = "media", chronicity = "acute",
	cariesSurface, isDark = false, className,
}) => {
	const g = TOOTH41_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const stepStroke = isDark ? "#f1f5f9" : "#ffffff";
	const isDistal = cariesSurface === "distal" || cariesSurface === "D";
	const isClass4 = cariesType === "class4";
	const isClass5 = cariesType === "class5";
	const isClass3 = cariesType === "class3" || (!isClass4 && !isClass5);
	const c3 = isDistal ? g.class3.distal : g.class3.mesial;
	const c4 = isDistal ? g.class4.distal : g.class4.mesial;
	const isSuper = cariesDepth === "superficial";
	const isDestruct = cariesDepth === "destructive";

	return (
		<g
			id="tooth41-caries-overlay"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth41-crown-clip)"
		>
			{isClass4 && (
				<g id="tooth41-caries-class4" data-class="class4">
					{isSuper && (
						<g id="tooth41-c4-superficial">
							<path d={c4.superficial.spot} fill="#291307" stroke="#1c1917" strokeWidth="0.8" />
							<path d={c4.superficial.step} fill="none" stroke={stepStroke} strokeWidth="0.85" strokeLinecap="round" />
						</g>
					)}
					{cariesDepth === "media" && (
						<g id="tooth41-c4-media">
							<path d={c4.media.crater} fill={lesionFill} stroke="#1c1917" strokeWidth="0.75" />
							{(c4.media.steps || []).map((s, i) => <path key={i} d={s} fill="none" stroke={stepStroke} strokeWidth="0.8" strokeLinecap="round" />)}
						</g>
					)}
					{cariesDepth === "profunda" && (
						<g id="tooth41-c4-profunda">
							<path d={c4.profunda.crater} fill={lesionFill} stroke="#78350f" strokeWidth="0.6" />
							<path d={c4.profunda.core} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.7" />
							{(c4.profunda.steps || []).map((s, i) => <path key={i} d={s} fill="none" stroke={stepStroke} strokeWidth="0.85" strokeLinecap="round" />)}
						</g>
					)}
					{isDestruct && (
						<g id="tooth41-c4-destructive">
							<path d={c4.destructive.dentin} fill={lesionFill} stroke="#92400e" strokeWidth="0.6" />
							<path d={c4.destructive.border} fill="none" stroke="#0c0a09" strokeWidth="1.5" strokeLinecap="round" />
							{(c4.destructive.fractureSteps || []).map((s, i) => <path key={i} d={s} fill="none" stroke={stepStroke} strokeWidth="0.85" strokeLinecap="round" />)}
						</g>
					)}
				</g>
			)}
			{isClass3 && (
				<g id={isDistal ? "tooth41-caries-distal-contact" : "tooth41-caries-mesial-contact"} data-class="class3">
					{isSuper && <g id="tooth41-c3-superficial"><path d={c3.superficial.spot} fill="#1c1917" stroke="#291307" strokeWidth="0.75" /></g>}
					{cariesDepth === "media" && (
						<g id="tooth41-c3-media">
							<path d={c3.media.halo} fill="#92400e" fillOpacity="0.35" stroke="#78350f" strokeWidth="0.5" />
							<path d={c3.media.crater} fill={lesionFill} stroke="#1c1917" strokeWidth="0.75" />
						</g>
					)}
					{cariesDepth === "profunda" && (
						<g id="tooth41-c3-profunda">
							<path d={c3.profunda.halo} fill={lesionFill} stroke="#78350f" strokeWidth="0.6" />
							<path d={c3.profunda.crater} fill={lesionFill} stroke="#92400e" strokeWidth="0.5" />
							<path d={c3.profunda.core} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.8" />
						</g>
					)}
					{isDestruct && (
						<g id="tooth41-c3-destructive">
							<path d={c3.destructive.dentin} fill={lesionFill} stroke="#92400e" strokeWidth="0.6" />
							<path d={c3.destructive.border} fill="none" stroke="#0c0a09" strokeWidth="1.5" strokeLinecap="round" />
							{(c3.destructive.steps || []).map((s, i) => <path key={i} d={s} fill="none" stroke={stepStroke} strokeWidth="0.8" strokeLinecap="round" />)}
						</g>
					)}
				</g>
			)}
			{isClass5 && (
				<g id="tooth41-caries-cervical" data-class="class5">
					<g id={`tooth41-c5-${cariesDepth}`}>
						{isSuper && <path d={g.class5.superficial.spot} fill="none" stroke="#291307" strokeWidth="1.4" strokeLinecap="round" />}
						{cariesDepth === "media" && <path d={g.class5.media.crater} fill={lesionFill} stroke="#1c1917" strokeWidth="0.75" />}
						{cariesDepth === "profunda" && (
							<>
								<path d={g.class5.profunda.halo} fill={lesionFill} stroke="#78350f" strokeWidth="0.6" />
								<path d={g.class5.profunda.core} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.8" />
							</>
						)}
						{isDestruct && (
							<>
								<path d={g.class5.destructive.dentin} fill={lesionFill} stroke="#92400e" strokeWidth="0.6" />
								<path d={g.class5.destructive.border} fill="none" stroke="#0c0a09" strokeWidth="1.5" strokeLinecap="round" />
								{(g.class5.destructive.steps || []).map((s, i) => <path key={i} d={s} fill="none" stroke={stepStroke} strokeWidth="0.8" strokeLinecap="round" />)}
							</>
						)}
					</g>
				</g>
			)}
		</g>
	);
};
