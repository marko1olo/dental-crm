import type React from "react";
import { TOOTH46_ADVANCED_PATHOLOGY_GEOMETRY } from "./Tooth46AdvancedPathologyGeometry";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";

export interface Tooth46AdvancedPathologyOverlayProps {
	resorcinolFormalin?: boolean | undefined;
	calciumHydroxide?: boolean | undefined;
	attrition?: boolean | undefined;
	rootPerforation?: boolean | undefined;
	canalLedge?: boolean | undefined;
	rootFracture?: boolean | undefined;
	isDark?: boolean | undefined;
}

export const Tooth46AdvancedPathologyOverlay: React.FC<Tooth46AdvancedPathologyOverlayProps> = ({
	resorcinolFormalin,
	calciumHydroxide,
	attrition,
	rootPerforation,
	canalLedge,
	rootFracture,
	isDark = false,
}) => {
	const g = TOOTH46_ADVANCED_PATHOLOGY_GEOMETRY;

	return (
		<g id="tooth46-advanced-pathologies">
			{/* 1. Resorcinol Formalin ("Pink Tooth") */}
			{resorcinolFormalin && (
				<g id="tooth46-resorcinol-formalin">
					<path
						d={TOOTH46_GEOMETRY.crownMonolithPath}
						fill="url(#dente-resorcinol-stain)"
						opacity="0.48"
						style={{ mixBlendMode: "multiply" }}
					/>
					<path
						d={TOOTH46_GEOMETRY.rootMonolithPath}
						fill="url(#dente-resorcinol-stain)"
						opacity="0.45"
						style={{ mixBlendMode: "multiply" }}
					/>
					<path d={g.resorcinol.mesialCanalTrace} fill="none" stroke="#881337" strokeWidth="0.75" />
					<path d={g.resorcinol.distalCanalTrace} fill="none" stroke="#881337" strokeWidth="0.75" />
				</g>
			)}

			{/* 2. Calcium Hydroxide Ca(OH)2 in Root Canals & Cavit Seal */}
			{calciumHydroxide && (
				<g id="tooth46-calcium-hydroxide">
					<path d={g.calcium.cavitSeal} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.6" />
					<path d={g.calcium.cavitLine} fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
					<path d={g.calcium.mbPaste} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.4" />
					<path d={g.calcium.mlPaste} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.4" />
					<path d={g.calcium.distalPaste} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.4" />
				</g>
			)}

			{/* 3. Pathological Attrition (Worn Cusps & Exposed Dentin Craters) */}
			{attrition && (
				<g id="tooth46-attrition">
					<path
						d="M 13.0,38 C 13.8,30 18.0,26 24,26 L 74,26 C 80.0,26 84.5,30 85.5,38 Z"
						fill={isDark ? "#334155" : "#e2e8f0"}
						opacity="0.9"
					/>
					{g.attrition.facets.map((f) => (
						<g key={f.id}>
							<ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="#b45309" stroke="#fef3c7" strokeWidth="0.6" />
							<ellipse cx={f.cx} cy={f.cy} rx={f.rx * 0.55} ry={f.ry * 0.55} fill="#78350f" />
						</g>
					))}
				</g>
			)}

			{/* 4. Root / Furcation Perforation */}
			{rootPerforation && (
				<g id="tooth46-root-perforation">
					<path d={g.perforation.furcationHalo} fill="rgba(239, 68, 68, 0.40)" stroke="rgba(185, 28, 28, 0.70)" strokeWidth="0.5" />
					<path d={g.perforation.pulpFloorDefect} fill="#450a0a" stroke="#7f1d1d" strokeWidth="0.5" />
					<path d={g.perforation.extrudedSealer} fill="#be123c" stroke="#881337" strokeWidth="0.5" />
				</g>
			)}

			{/* 5. Canal Ledge in Mesial Root */}
			{canalLedge && (
				<g id="tooth46-canal-ledge">
					<path d={g.ledge.canalUpper} fill="none" stroke="#f43f5e" strokeWidth="1.2" strokeLinecap="round" />
					<path d={g.ledge.ledgeShelf} fill="none" stroke="#be123c" strokeWidth="1.6" strokeLinecap="square" />
					<path d={g.ledge.trueLumenGhost} fill="none" stroke="#64748b" strokeWidth="0.5" strokeDasharray="1.2 1.2" />
					<path d={g.ledge.instrumentStop} fill="#475569" stroke="#334155" strokeWidth="0.4" />
				</g>
			)}

			{/* 6. Vertical Root Fracture (VRF) */}
			{rootFracture && (
				<g id="tooth46-root-fracture">
					<path d={g.rootFracture.haloShadow} fill="rgba(239, 68, 68, 0.22)" />
					<path d={g.rootFracture.shimmerLine} fill="none" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.8" />
					<path d={g.rootFracture.mainCrack} fill="none" stroke="#ef4444" strokeWidth="0.6" strokeLinecap="round" />
				</g>
			)}
		</g>
	);
};
