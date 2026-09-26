import type React from "react";
import type {
	CanalObturationMaterial,
	FurcationGrade,
	PeriodontalBoneLossPattern,
	PostCoreType,
	RestorativeMaterialKey,
	RootResorptionStage,
} from "../anatomicalToothGeometries";
import {
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
} from "../anatomicalToothGeometries";
import type { ToothState } from "./toothChartTypes";
import type { ToothVisualProps } from "./ToothColors";

export interface ToothStandardGraphicProps {
	number: number;
	state: ToothState;
	scaledWidth: string;
	scaledHeight: string;
	transform: string;
	cfg: { viewX: number; viewWidth: number; viewHeight: number };
	geom: any;
	colors: ToothVisualProps;
	isTop: boolean;
	showPeriapicalHalos?: boolean | undefined;
	isPeriodontitis: boolean;
	resorptionVisual?: any | undefined;
	isEndoTreated: boolean;
	canalObturation?: CanalObturationMaterial | undefined;
	showPulpAndCanals?: boolean | undefined;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	boneLossInfo?: { level: number; pattern: PeriodontalBoneLossPattern } | undefined;
	effectivePocketDepth?: number | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	handleSurfaceClick: (e: React.MouseEvent<SVGGElement>) => void;
	handleSurfaceKeyDown: (e: React.KeyboardEvent<SVGGElement>) => void;
}

export const ToothStandardGraphic: React.FC<ToothStandardGraphicProps> = ({
	number,
	state,
	scaledWidth,
	scaledHeight,
	transform,
	cfg,
	geom,
	colors,
	isTop,
	showPeriapicalHalos,
	isPeriodontitis,
	resorptionVisual,
	isEndoTreated,
	canalObturation,
	showPulpAndCanals,
	hasPost,
	postType,
	showPeriodontalBoneLoss,
	boneLossInfo,
	effectivePocketDepth,
	surfaces,
	useSurfaces,
	handleSurfaceClick,
	handleSurfaceKeyDown,
}) => (

		<svg
			width={scaledWidth}
			height={scaledHeight}
			style={{ transform }}
			viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			preserveAspectRatio="none"
			className={`tooth-svg-element ${
				colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""
			}`}
		>
			<title>{`Схема зуба ${number}`}</title>
			<g className="tooth-group-standard">
				{/* Periapical Inflammatory Granuloma / Cyst Halo at Root Apex (Periodontitis) */}
				{showPeriapicalHalos &&
					isPeriodontitis &&
					geom.apex?.map((pt, idx) => (
						<g key={`halo-${idx}`} className="periapical-halo-group" filter="url(#periapical-feather-blur)">
							<circle cx={pt.x} cy={pt.y} r="15" fill="url(#periapical-lesion-gradient)" />
							<circle cx={pt.x} cy={pt.y} r="7.5" fill="#ea580c" opacity="0.75" />
							<circle cx={pt.x} cy={pt.y} r="3" fill="#fef08a" opacity="0.9" />
						</g>
					))}

				{/* Anatomical Root */}
				<path
					d={geom.root}
					fill={colors.rootFill}
					stroke={colors.isMissing ? "var(--tooth-root-stroke, #94a3b8)" : "var(--tooth-root-stroke, #64748b)"}
					strokeWidth={colors.isMissing ? "1.4" : "1.8"}
					strokeDasharray={resorptionVisual?.rootStrokeDasharray ?? (colors.isMissing ? "4 3" : undefined)}
					strokeLinejoin="round"
					opacity={resorptionVisual ? resorptionVisual.rootOpacity : (colors.isMissing ? "0.12" : "1")}
					className="tooth-root-path"
				/>

				{/* Primary Tooth Root Resorption Hatch Pattern Area (Stage 50% / 75%) */}
				{resorptionVisual && resorptionVisual.stage >= 50 && resorptionVisual.stage < 100 && (
					<path
						d={geom.root}
						fill="url(#resorption-hatch-pattern)"
						opacity="0.65"
						pointerEvents="none"
					/>
				)}

				{/* Periodontal Bone Loss Resorption Area & Crest Line */}
				{boneLossInfo && (
					<g className="periodontal-bone-loss-layer">
						<path d={boneLossInfo.resorptionArea} fill="url(#bone-loss-hatch)" opacity="0.85" />
						<path
							d={boneLossInfo.boneLine}
							fill="none"
							stroke="#ef4444"
							strokeWidth="1.6"
							strokeDasharray="3 2"
							strokeLinecap="round"
						/>
					</g>
				)}

				{/* Crown Anatomical Contour */}
				{state !== "Root" && (
					<path
						d={geom.crown}
						fill={colors.crownFill}
						fillOpacity={colors.opacity}
						stroke={colors.stroke}
						strokeWidth={colors.isMissing ? "1.4" : "2.2"}
						strokeDasharray={state === "Retained" ? "3 2" : colors.isMissing ? "4 3" : undefined}
						strokeLinejoin="round"
						className="tooth-crown-path"
					/>
				)}
				{state === "Root" && (
					<g className="tooth-root-stump-layer">
						<path
							d={isTop ? "M 25 85 Q 50 82 75 85" : "M 25 75 Q 50 78 75 75"}
							fill="none"
							stroke="#dc2626"
							strokeWidth="2.2"
							strokeLinecap="round"
						/>
					</g>
				)}

				{/* Photopolymer composite resin surface stipple texture */}
				{state === "Filled" && material === "composite" && (
					<path
						d={geom.crown}
						fill="url(#composite-resin-pattern)"
						opacity="0.4"
						pointerEvents="none"
					/>
				)}

				{/* Cementoenamel Junction / Cervical Margin Accent */}
				{!colors.isMissing && (
					<path
						d={isTop ? "M 25 85 Q 50 82 75 85" : "M 25 75 Q 50 78 75 75"}
						fill="none"
						stroke="rgba(100, 116, 139, 0.4)"
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{/* Pulp Chamber & Root Canals for Pulpitis / Diagnostics */}
				{geom.canals && (state === "Pulpitis" || showPulpAndCanals) && (
					<g className="anatomical-canals-layer">
						<path
							d={geom.canals}
							fill="none"
							stroke={state === "Pulpitis" ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-canal-vital)"}
							strokeWidth="3.0"
							strokeLinecap="round"
							strokeLinejoin="round"
							opacity="0.95"
						/>
						<path
							d={geom.canals}
							fill="none"
							stroke={state === "Pulpitis" ? "#fecaca" : "#fff1f2"}
							strokeWidth="1.0"
							strokeLinecap="round"
							opacity="0.9"
						/>
					</g>
				)}

				{/* Pulp Chamber Core for Pulpitis */}
				{geom.core && (state === "Pulpitis" || showPulpAndCanals) && (
					<path
						d={geom.core}
						fill={state === "Pulpitis" ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-vital-grad)"}
						stroke={state === "Pulpitis" ? "#991b1b" : "#ef4444"}
						strokeWidth="1.2"
						opacity={state === "Pulpitis" ? "0.95" : "0.85"}
					/>
				)}

				{/* Root Canal Obturation / Post-and-Core */}
				{geom.canals && isEndoTreated && (
					<g className="root-canal-obturation-layer">
						{/* Fiber Glass Post */}
						{hasPost && postType === "fiber" ? (
							<g filter="url(#dente-glow-indigo)">
								<path
									d={geom.canals}
									fill="none"
									stroke="url(#fiber-post-gradient)"
									strokeWidth="3.8"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<path
									d={geom.canals}
									fill="none"
									stroke="#ffffff"
									strokeWidth="1.4"
									strokeLinecap="round"
									opacity="0.95"
								/>
							</g>
						) : hasPost && (postType === "cast_core" || postType === "titanium") ? (
							/* Cast Core Metal Post */
							<g filter="url(#dente-metallic-specular)">
								<path
									d={geom.canals}
									fill="none"
									stroke="url(#cast-core-post-gradient)"
									strokeWidth="4.2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<polygon
									points={isTop ? "40,88 60,88 56,106 44,106" : "40,72 60,72 56,54 44,54"}
									fill="url(#cast-core-post-gradient)"
									stroke="#334155"
									strokeWidth="1.2"
								/>
							</g>
						) : (
							/* Standard Endodontic Obturation (Gutta-percha / Bioceramic) */
							<g>
								<path
									d={geom.canals}
									fill="none"
									stroke={
										effectiveObturation === "bioceramic"
											? "#0d9488"
											: effectiveObturation === "calcium_hydroxide"
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
										effectiveObturation === "bioceramic"
											? "#ccfbf1"
											: effectiveObturation === "calcium_hydroxide"
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

				{/* Crown Cervical Collar Ring (Zirconia / PFM margin ring) */}
				{state === "Crown" && (
					<path
						d={isTop ? "M 22 85 Q 50 82 78 85 Q 50 88 22 85" : "M 22 75 Q 50 78 78 75 Q 50 72 22 75"}
						fill={colors.collarFill ?? "url(#dente-cervical-collar)"}
						stroke="#334155"
						strokeWidth="1.2"
					/>
				)}

				{/* Natural Enamel Specular Highlight Sheen */}
				{!colors.isMissing && state !== "Crown" && (
					<path
						d={isTop ? "M 32 135 Q 50 145 68 135" : "M 32 30 Q 50 20 68 30"}
						fill="none"
						stroke="rgba(255, 255, 255, 0.65)"
						strokeWidth="1.4"
						strokeLinecap="round"
						opacity="0.75"
					/>
				)}

				{/* Occlusal Fissures */}
				{geom.fissures && state !== "Crown" && !colors.isMissing && (
					<path
						d={geom.fissures}
						fill="none"
						stroke={state === "Caries" ? "#7f1d1d" : "rgba(15, 23, 42, 0.35)"}
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{/* Missing Tooth Ghost Diagonal X */}
				{colors.isMissing && (
					<g className="missing-tooth-cross" opacity="0.95">
						<line
							x1={cfg.viewX + 6}
							y1="8"
							x2={cfg.viewX + cfg.viewWidth - 6}
							y2="152"
							stroke="#ef4444"
							strokeWidth="3.2"
							strokeLinecap="round"
						/>
						<line
							x1={cfg.viewX + cfg.viewWidth - 6}
							y1="8"
							x2={cfg.viewX + 6}
							y2="152"
							stroke="#ef4444"
							strokeWidth="3.2"
							strokeLinecap="round"
						/>
					</g>
				)}

				{/* Interactive Surfaces (O, V, L/P, M, D, C) with stable delegated handlers (GC & render loop micro-optimized) */}
				{useSurfaces && (
					<g
						transform={`translate(${cfg.viewX + cfg.viewWidth / 2 - 12}, ${isTop ? 95 : 35})`}
						stroke="rgba(255,255,255,0.7)"
						strokeWidth="0.5"
						className="tooth-surface-interactive-group"
						onClick={handleSurfaceClick}
						onKeyDown={handleSurfaceKeyDown}
					>
						{/* O - Occlusal */}
						<g
							role="tab"
							tabIndex={0}
							data-surface="O"
							aria-label={`Поверхность O зуба ${number}`}
							className="tooth-surface-target cursor-pointer"
						>
							<polygon
								points="8,8 16,8 16,16 8,16"
								fill={
									surfaces?.includes("O")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* V - Vestibular / Buccal */}
						<g
							role="tab"
							tabIndex={0}
							data-surface="V"
							aria-label={`Поверхность V зуба ${number}`}
							className="tooth-surface-target cursor-pointer"
						>
							<polygon
								points="0,0 24,0 16,8 8,8"
								fill={
									surfaces?.includes("V") || surfaces?.includes("B")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* L/P - Lingual / Palatal */}
						<g
							role="tab"
							tabIndex={0}
							data-surface={isTop ? "P" : "L"}
							aria-label={`Поверхность ${isTop ? "P" : "L"} зуба ${number}`}
							className="tooth-surface-target cursor-pointer"
						>
							<polygon
								points="8,16 16,16 24,24 0,24"
								fill={
									surfaces?.includes("L") || surfaces?.includes("P")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* D - Distal (Facing away from sagittal midline) */}
						<g
							role="tab"
							tabIndex={0}
							data-surface="D"
							aria-label={`Поверхность D зуба ${number}`}
							className="tooth-surface-target cursor-pointer"
						>
							<polygon
								points="0,0 8,8 8,16 0,24"
								fill={
									surfaces?.includes("D")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* M - Mesial (Facing towards sagittal midline) */}
						<g
							role="tab"
							tabIndex={0}
							data-surface="M"
							aria-label={`Поверхность M зуба ${number}`}
							className="tooth-surface-target cursor-pointer"
						>
							<polygon
								points="24,0 24,24 16,16 16,8"
								fill={
									surfaces?.includes("M")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* C - Cervical / Gingival third (V class) */}
						<g
							role="tab"
							tabIndex={0}
							data-surface="C"
							aria-label={`Поверхность C зуба ${number}`}
							className="tooth-surface-target cursor-pointer"
						>
							<polygon
								points="0,25 24,25 20,29 4,29"
								fill={
									surfaces?.includes("C")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>
					</g>
				)}
			</g>
		</svg>
);
