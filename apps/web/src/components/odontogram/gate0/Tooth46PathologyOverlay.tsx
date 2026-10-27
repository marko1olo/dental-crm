import React from "react";
import { Tooth46AdvancedPathologyOverlay } from "./Tooth46AdvancedPathologyOverlay";
import { Tooth46CalculusOverlay } from "./Tooth46CalculusOverlay";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";
import { Tooth46PostCoreOverlay } from "./Tooth46PostCoreOverlay";
import type { PostCoreType } from "./tooth46Types";

export interface Tooth46PathologyOverlayProps {
	showAbfraction?: boolean | undefined;
	showPostCore?: boolean | undefined;
	postCoreType?: PostCoreType | undefined;
	showCalculus?: boolean | undefined;
	showCrack?: boolean | undefined;
	resorcinolFormalin?: boolean | undefined;
	calciumHydroxide?: boolean | undefined;
	attrition?: boolean | undefined;
	rootPerforation?: boolean | undefined;
	canalLedge?: boolean | undefined;
	rootFracture?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth46PathologyOverlay: React.FC<Tooth46PathologyOverlayProps> = ({
	showAbfraction,
	showPostCore,
	postCoreType = "fiber",
	showCalculus,
	showCrack,
	resorcinolFormalin,
	calciumHydroxide,
	attrition,
	rootPerforation,
	canalLedge,
	rootFracture,
	isDark = false,
	className,
}) => {
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
				<g id="tooth46-post-core">
					<Tooth46PostCoreOverlay type={postCoreType} isDark={isDark} />
				</g>
			)}
			{showCalculus && <Tooth46CalculusOverlay />}
			{showCrack && (
				<g id="tooth46-enamel-crack" data-testid="tooth46-crack">
					<path d={g.crack.shimmerLine} fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path d={g.crack.mainLine} fill="none" stroke={crackColor} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<path d={g.crack.branchLine} fill="none" stroke={crackColor} strokeWidth="0.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}
			<Tooth46AdvancedPathologyOverlay
				resorcinolFormalin={resorcinolFormalin}
				calciumHydroxide={calciumHydroxide}
				attrition={attrition}
				rootPerforation={rootPerforation}
				canalLedge={canalLedge}
				rootFracture={rootFracture}
				isDark={isDark}
			/>
		</g>
	);
};
