import type React from "react";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11CrownProps {
	isDark?: boolean | undefined;
	showLobes?: boolean | undefined;
	showCingulum?: boolean | undefined;
	showMarginalRidges?: boolean | undefined;
	showFossa?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Central Incisor (FDI 11) Crown Component
 * Wide shovel-shaped crown, 3 labial lobes, tuberculum dentale, fossa lingualis.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth11Crown: React.FC<Tooth11CrownProps> = ({
	isDark = false,
	showLobes = true,
	showCingulum = true,
	showMarginalRidges = true,
	showFossa = true,
}) => {
	const g = TOOTH11_GEOMETRY;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const ridgeStroke = isDark ? "rgba(241, 245, 249, 0.55)" : "rgba(100, 116, 139, 0.40)";
	const grooveStroke = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.30)";

	return (
		<g id="tooth11-crown-group">
			<path
				id="tooth11-crown-monolith"
				d={g.crownMonolithPath}
				fill="url(#dente-porcelain-enamel)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
			/>
			{showCingulum && (
				<g id="tooth11-cingulum-group">
					<path id="tooth11-cingulum" d={g.cingulumPath} fill="url(#dente-cingulum-gradient)" stroke={ridgeStroke} strokeWidth="0.6" />
					<circle id="tooth11-foramen-caecum" cx={g.foramenCaecum.x} cy={g.foramenCaecum.y} r="1.2" fill={isDark ? "#334155" : "#64748b"} opacity="0.8" />
				</g>
			)}
			{showFossa && (
				<path id="tooth11-lingual-fossa" d={g.lingualFossaPath} fill="url(#dente-fossa-ambient)" stroke="none" />
			)}
			{showMarginalRidges && (
				<g id="tooth11-marginal-ridges">
					<path id="tooth11-mesial-marginal-ridge" d={g.mesialMarginalRidge} fill="none" stroke={ridgeStroke} strokeWidth="0.75" strokeLinecap="round" />
					<path id="tooth11-distal-marginal-ridge" d={g.distalMarginalRidge} fill="none" stroke={ridgeStroke} strokeWidth="0.75" strokeLinecap="round" />
				</g>
			)}
			{showLobes && (
				<g id="tooth11-developmental-lobes">
					{g.developmentalGrooves.map((dg, i) => (
						<path key={`groove-${i}`} d={dg} fill="none" stroke={grooveStroke} strokeWidth="0.55" strokeLinecap="round" />
					))}
					{g.lobes.map((l) => (
						<path key={`lobe-${l.id}`} d={l.highlightPath} fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.8" strokeLinecap="round" />
					))}
				</g>
			)}
			<path id="tooth11-incisal-edge" d={g.incisalEdgeCurve} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.95)"} strokeWidth="0.65" />
		</g>
	);
};
