import type React from "react";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";

export interface Tooth12CrownProps {
	isDark?: boolean | undefined;
	showLobes?: boolean | undefined;
	showCingulum?: boolean | undefined;
	showMarginalRidges?: boolean | undefined;
	showFossa?: boolean | undefined;
	showGroove?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Lateral Incisor (FDI 12) Crown Component
 * Slender shovel crown, rounded distoincisal angle, deep fossa,
 * distinct cingulum and palatoradicular groove.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth12Crown: React.FC<Tooth12CrownProps> = ({
	isDark = false,
	showLobes = true,
	showCingulum = true,
	showMarginalRidges = true,
	showFossa = true,
	showGroove = true,
}) => {
	const g = TOOTH12_GEOMETRY;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const ridgeStroke = isDark ? "rgba(241, 245, 249, 0.55)" : "rgba(100, 116, 139, 0.40)";

	return (
		<g id="tooth12-crown-group">
			<path
				id="tooth12-crown-monolith"
				d={g.crownMonolithPath}
				fill="url(#dente-porcelain-enamel)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
			/>
			{showCingulum && (
				<g id="tooth12-cingulum-group">
					<path id="tooth12-cingulum" d={g.cingulumPath} fill="url(#dente-cingulum-gradient)" stroke={ridgeStroke} strokeWidth="0.6" />
					<circle id="tooth12-foramen-caecum" cx={g.foramenCaecum.x} cy={g.foramenCaecum.y} r="1.2" fill={isDark ? "#334155" : "#64748b"} opacity="0.8" />
				</g>
			)}
			{showGroove && (
				<path id="tooth12-palatoradicular-groove" d={g.palatoradicularGroove} fill="none" stroke={isDark ? "rgba(148, 163, 184, 0.50)" : "rgba(100, 116, 139, 0.45)"} strokeWidth="0.6" strokeLinecap="round" />
			)}
			{showFossa && (
				<path id="tooth12-lingual-fossa" d={g.lingualFossaPath} fill="url(#dente-fossa-ambient)" stroke="none" />
			)}
			{showMarginalRidges && (
				<g id="tooth12-marginal-ridges">
					<path id="tooth12-mesial-marginal-ridge" d={g.mesialMarginalRidge} fill="none" stroke={ridgeStroke} strokeWidth="0.75" strokeLinecap="round" />
					<path id="tooth12-distal-marginal-ridge" d={g.distalMarginalRidge} fill="none" stroke={ridgeStroke} strokeWidth="0.75" strokeLinecap="round" />
				</g>
			)}
			{showLobes && (
				<g id="tooth12-developmental-lobes">
					{g.lobes.map((l) => (
						<path key={`lobe-${l.id}`} d={l.highlightPath} fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.75" strokeLinecap="round" />
					))}
				</g>
			)}
			<path id="tooth12-incisal-edge" d={g.incisalEdgeCurve} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.95)"} strokeWidth="0.65" />
		</g>
	);
};
