import type React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

export interface Tooth46PathologyOverlayProps {
	showAbfraction?: boolean;
	showPostCore?: boolean;
	showCalculus?: boolean;
	showCrack?: boolean;
	isDark?: boolean;
	className?: string;
}

export const Tooth46PathologyOverlay: React.FC<
	Tooth46PathologyOverlayProps
> = ({
	showAbfraction = false,
	showPostCore = false,
	showCalculus = false,
	showCrack = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH46_PATHOLOGY_GEOMETRY;
	const crackColor = isDark
		? "rgba(248, 113, 113, 0.95)"
		: "rgba(220, 38, 38, 0.90)";

	return (
		<g id="tooth46-clinical-pathologies" className={className}>
			{/* Cervical Abfraction Notch at CEJ */}
			{showAbfraction && (
				<g id="tooth46-abfraction-notch">
					<path
						d={g.abfraction.notch}
						fill="url(#dente-abfraction-dentin)"
						stroke="rgba(180, 83, 9, 0.60)"
						strokeWidth="0.6"
						strokeLinejoin="round"
					/>
					<path d={g.abfraction.dentinFloor} fill="#b08968" opacity="0.35" />
					<path
						d={g.abfraction.stressApexLine}
						fill="none"
						stroke="rgba(120, 53, 15, 0.85)"
						strokeWidth="0.5"
						strokeLinecap="round"
					/>
				</g>
			)}

			{/* Endodontic Fiber Post & Core Stump */}
			{showPostCore && (
				<g id="tooth46-post-core">
					<path
						d={g.postAndCore.postShaft}
						fill="url(#dente-fiber-post)"
						stroke="rgba(148, 163, 184, 0.80)"
						strokeWidth="0.6"
					/>
					<path
						d={g.postAndCore.coreStump}
						fill="url(#dente-composite-core)"
						stroke="rgba(2, 132, 199, 0.90)"
						strokeWidth="0.7"
						strokeDasharray="2.5 1.5"
					/>
				</g>
			)}

			{/* Dental Calculus (Supragingival & Subgingival) */}
			{showCalculus && (
				<g id="tooth46-calculus-deposits">
					<path
						d={g.calculus.supragingival}
						fill="url(#dente-calculus-supra)"
						stroke="rgba(180, 83, 9, 0.55)"
						strokeWidth="0.5"
					/>
					<path
						d={g.calculus.subgingival}
						fill="url(#dente-calculus-sub)"
						stroke="#1c1917"
						strokeWidth="0.5"
					/>
				</g>
			)}

			{/* Infraction / Craze Line (0.5px hairline) */}
			{showCrack && (
				<g id="tooth46-enamel-crack">
					<path
						d={g.crack.mainLine}
						fill="none"
						stroke={crackColor}
						strokeWidth="0.5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.crack.branchLine}
						fill="none"
						stroke={crackColor}
						strokeWidth="0.4"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
