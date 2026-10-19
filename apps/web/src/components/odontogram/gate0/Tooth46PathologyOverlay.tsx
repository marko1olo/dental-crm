import type React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";
import { Tooth46PostCoreOverlay } from "./Tooth46PostCoreOverlay";
import type { PostCoreType } from "./tooth46Types";

export interface Tooth46PathologyOverlayProps {
	showAbfraction?: boolean;
	showPostCore?: boolean;
	postCoreType?: PostCoreType;
	showCalculus?: boolean;
	showCrack?: boolean;
	isDark?: boolean;
	className?: string;
}

export const Tooth46PathologyOverlay: React.FC<Tooth46PathologyOverlayProps> = (props) => {
	const { showAbfraction, showPostCore, postCoreType = "fiber", showCalculus, showCrack, isDark = false, className } = props;
	const g = TOOTH46_PATHOLOGY_GEOMETRY;
	const crackColor = isDark ? "rgba(248, 113, 113, 0.95)" : "rgba(220, 38, 38, 0.90)";

	return (
		<g id="tooth46-clinical-pathologies" className={className}>
			{showAbfraction && (
				<g id="tooth46-abfraction-notch" data-testid="tooth46-abfraction">
					<path d={g.abfraction.notch} fill="url(#dente-abfraction-dentin)" stroke="rgba(180, 83, 9, 0.65)" strokeWidth="0.6" strokeLinejoin="round" />
					<path d={g.abfraction.dentinFloor} fill="#b08968" opacity="0.45" />
					<path d={g.abfraction.stressApexLine} fill="none" stroke="rgba(120, 53, 15, 0.90)" strokeWidth="0.55" strokeLinecap="round" />
					<path d={g.abfraction.enamelBevelHighlight} fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.8" />
				</g>
			)}
			{showPostCore && (
				<g id="tooth46-post-core"><Tooth46PostCoreOverlay type={postCoreType} isDark={isDark} /></g>
			)}
			{showCalculus && (
				<g id="tooth46-calculus-deposits" data-testid="tooth46-calculus">
					<path d={g.calculus.supragingival} fill="url(#dente-calculus-supra)" stroke="rgba(180, 83, 9, 0.60)" strokeWidth="0.55" strokeLinejoin="round" />
					{g.calculus.nodularTexture.map((n) => (
						<path key={`nodule-${n.slice(0, 10)}`} d={n} data-component="calculus-nodule" fill="none" stroke="#92400e" strokeWidth="0.45" strokeOpacity="0.7" />
					))}
					<path d={g.calculus.subgingival} fill="url(#dente-calculus-sub)" stroke="#1c1917" strokeWidth="0.6" />
				</g>
			)}
			{showCrack && (
				<g id="tooth46-enamel-crack" data-testid="tooth46-crack">
					<path d={g.crack.shimmerLine} fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path d={g.crack.mainLine} fill="none" stroke={crackColor} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<path d={g.crack.branchLine} fill="none" stroke={crackColor} strokeWidth="0.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}
		</g>
	);
};
