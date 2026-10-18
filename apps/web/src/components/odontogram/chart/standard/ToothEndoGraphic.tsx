import type React from "react";
import type { CanalObturationMaterial, PostCoreType } from "../../anatomicalToothGeometries";
import type { ToothState } from "../toothChartTypes";
import { ToothCanalPostGraphic } from "./ToothCanalPostGraphic";

export interface ToothEndoGraphicProps {
	geom: any;
	state: ToothState;
	showPulpAndCanals?: boolean | undefined;
	isEndoTreated: boolean;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
	isTop: boolean;
}

export const ToothEndoGraphic: React.FC<ToothEndoGraphicProps> = ({
	geom,
	state,
	showPulpAndCanals,
	isEndoTreated,
	hasPost,
	postType,
	canalObturation,
	isTop,
}) => {
	const isPulpitis = state === "Pulpitis";
	const isPulpVisible = geom.canals && (isPulpitis || showPulpAndCanals);

	return (
		<>
			{/* Pulp Chamber & Root Canals */}
			{isPulpVisible && (
				<g className="anatomical-canals-layer">
					<path
						d={geom.canals}
						fill="none"
						stroke={isPulpitis ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-canal-vital)"}
						strokeWidth="3.0"
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity="0.95"
					/>
					<path
						d={geom.canals}
						fill="none"
						stroke={isPulpitis ? "#fecaca" : "#fff1f2"}
						strokeWidth="1.0"
						strokeLinecap="round"
						opacity="0.9"
					/>
				</g>
			)}

			{/* Pulp Chamber Core */}
			{geom.core && (isPulpitis || showPulpAndCanals) && (
				<path
					d={geom.core}
					fill={isPulpitis ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-vital-grad)"}
					stroke={isPulpitis ? "#991b1b" : "#ef4444"}
					strokeWidth="1.2"
					opacity={isPulpitis ? "0.95" : "0.85"}
				/>
			)}

			{/* Root Canal Obturation / Post-and-Core */}
			{geom.canals && isEndoTreated && (
				<g className="root-canal-obturation-layer">
					<ToothCanalPostGraphic geom={geom} hasPost={hasPost} postType={postType} isTop={isTop} />
					{!hasPost && (
						<g>
							<path
								d={geom.canals}
								fill="none"
								stroke={
									canalObturation === "bioceramic"
										? "#0d9488"
										: canalObturation === "calcium_hydroxide"
											? "#eab308"
											: "url(#gutta-percha-gradient)"
								}
								strokeWidth="3.2"
								strokeLinecap="round"
								strokeLinejoin="round"
								opacity="0.95"
							/>
							<path
								d={geom.canals}
								fill="none"
								stroke={
									canalObturation === "bioceramic"
										? "#ccfbf1"
										: canalObturation === "calcium_hydroxide"
											? "#fef9c3"
											: "#fecdd3"
								}
								strokeWidth="1.2"
								strokeLinecap="round"
								opacity="0.9"
							/>
						</g>
					)}
				</g>
			)}
		</>
	);
};
