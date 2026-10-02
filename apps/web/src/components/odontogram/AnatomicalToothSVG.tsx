/**
 * DENTE Dental CRM — Anatomical Tooth SVG Renderer
 *
 * Renders high-fidelity anatomical vector representation of a single tooth
 * including multi-roots, root resorption, periodontal bone loss, endodontic posts,
 * restorative materials (composite, amalgam, ceramic e.max, zirconia, gold, titanium SLA implant),
 * periapical pathology, and surface overlays.
 */

import React from "react";
import type { ToothState } from "./ToothChart";
import {
	type CanalObturationMaterial,
	type FurcationGrade,
	getAnatomicalToothGeometry,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	getPhysiologicalRootResorptionGeometry,
	getSurfaceShading,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type RootResorptionStage,
} from "./anatomicalToothGeometries";
import {
	getAnatomicalToothColors,
	isLowSpecFilterDisabled,
	scaleCssPx,
} from "./AnatomicalToothColors";
import { PERIAPICAL_LESION_SIZES } from "./ToothSVGPaths";
import {
	AnatomicalInteractiveSurfaces,
	AnatomicalToothSurfacesLayer,
} from "./AnatomicalToothSurfacesLayer";
import { AnatomicalImplantSVG } from "./AnatomicalImplantSVG";
import { AnatomicalRestorativeAccents } from "./AnatomicalRestorativeAccents";

export * from "./AnatomicalImplantSVG";
export * from "./AnatomicalRestorativeAccents";

export interface AnatomicalToothSVGProps {
	number: number;
	state: ToothState;
	scale: number;
	material?: RestorativeMaterialKey | undefined;
	isPontic?: boolean | undefined;
	bridgeMaterial?: RestorativeMaterialKey | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
	canalObturationLevel?: "full" | "two_thirds" | "half" | undefined;
	periapicalLesionSize?: "small" | "medium" | "large" | 6 | 10 | 16 | undefined;
	hasFracture?: boolean | undefined;
	hasApicoectomy?: boolean | undefined;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	boneLossLevel?: number | undefined;
	boneLossType?: PeriodontalBoneLossPattern | undefined;
	furcation?: FurcationGrade | undefined;
	mobility?: 0 | 1 | 2 | 3 | undefined;
	gingivalRecession?: number | undefined;
	bopSites?: string[] | undefined;
	suppurationSites?: string[] | undefined;
	periapicalLesion?: boolean | undefined;
	rootResorptionStage?: RootResorptionStage | undefined;
	rootResorption?: RootResorptionStage | undefined;
	pocketDepth?: number | undefined;
	isSelected?: boolean | undefined;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	pediatricMode?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}

export const AnatomicalToothSVG: React.FC<AnatomicalToothSVGProps> = React.memo(({
	number,
	state,
	scale,
	material,
	isPontic = false,
	bridgeMaterial,
	canalObturation,
	hasPost,
	postType,
	boneLossLevel,
	boneLossType,
	furcation,
	mobility,
	gingivalRecession,
	bopSites,
	suppurationSites,
	periapicalLesion,
	rootResorptionStage,
	rootResorption,
	pocketDepth,
	canalObturationLevel,
	periapicalLesionSize,
	hasFracture,
	hasApicoectomy,
	isSelected,
	onClick,
	onQuickStateChange,
	pediatricMode,
	surfaces,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
}) => {
	const isTop = number < 30 || (number >= 51 && number <= 65);
	const geom = getAnatomicalToothGeometry(number);
	const colors = getAnatomicalToothColors(state, material);

	const scaledWidth = scaleCssPx(`${Math.round(geom.standardWidthPx * 1.3)}px`, scale);
	const scaledHeight = scaleCssPx(`${Math.round(geom.standardHeightPx * 1.3)}px`, scale);

	// Mandate 8c: Root canals in incisors/canines (11–43, 51–83) must run continuously to the root apex
	const toothPos = number % 10;
	const isIncisorOrCanine = toothPos >= 1 && toothPos <= 3;
	const isToothPresent = (state as string) !== "Missing" && (state as string) !== "Extracted";
	const shouldRenderCanalsAndPulp =
		state === "Pulpitis" ||
		showPulpAndCanals ||
		(isIncisorOrCanine && isToothPresent);

	const isRightSide =
		(number >= 21 && number <= 28) ||
		(number >= 31 && number <= 38) ||
		(number >= 61 && number <= 65) ||
		(number >= 71 && number <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const isPeriodontitis = state === "Periodontitis" || periapicalLesion || periapicalLesionSize !== undefined;
	const lesionRadius =
		typeof periapicalLesionSize === "number"
			? periapicalLesionSize
			: periapicalLesionSize
				? PERIAPICAL_LESION_SIZES[periapicalLesionSize] ?? 6
				: 15;

	const canalClipRect = React.useMemo(() => {
		if (!canalObturationLevel || canalObturationLevel === "full") return null;
		const vb = geom.viewBox;
		if (isTop) {
			const offset = canalObturationLevel === "half" ? vb.height * 0.45 : vb.height * 0.25;
			return { x: vb.x, y: vb.y + offset, width: vb.width, height: vb.height - offset };
		} else {
			const height = canalObturationLevel === "half" ? vb.height * 0.55 : vb.height * 0.75;
			return { x: vb.x, y: vb.y, width: vb.width, height };
		}
	}, [canalObturationLevel, geom.viewBox, isTop]);

	const isEndoTreated = canalObturation !== undefined && canalObturation !== "unfilled";
	const effectiveObturation: CanalObturationMaterial = canalObturation ?? "unfilled";

	const effectiveResorption: RootResorptionStage = rootResorptionStage ?? rootResorption ?? 0;
	const resorptionGeom = getPhysiologicalRootResorptionGeometry(number, effectiveResorption);
	const effectiveCanals = resorptionGeom.canals;

	const boneLossInfo =
		showPeriodontalBoneLoss && (boneLossLevel !== undefined && boneLossLevel > 0)
			? getPeriodontalBoneLevelPath(number, boneLossLevel, boneLossType ?? "horizontal")
			: null;

	const furcationMarkers =
		furcation && furcation > 0 && geom.periodontal?.furcationSites
			? geom.periodontal.furcationSites
					.map((site) => ({
						site,
						marker: getFurcationMarkerSvg(furcation, site.position.x, site.position.y, isTop),
					}))
					.filter((item): item is { site: typeof item.site; marker: NonNullable<typeof item.marker> } => item.marker !== null)
			: [];

	const recessionPath =
		gingivalRecession && gingivalRecession > 0
			? getGingivalRecessionPath(number, gingivalRecession)
			: null;

	const hasActiveSurfaces =
		Boolean(surfaces && surfaces.length > 0) &&
		state !== "Crown" &&
		state !== "Missing" &&
		state !== "Implant" &&
		state !== "Planned_Implant";

	const surfaceShading = getSurfaceShading(state, material);

	const renderImplant = () => (
		<AnatomicalImplantSVG
			number={number}
			state={state}
			isTop={isTop}
			scaledWidth={scaledWidth}
			scaledHeight={scaledHeight}
			transform={transform}
			geom={geom}
			colors={colors}
		/>
	);

	const renderStandard = () => (
		<svg
			width={scaledWidth}
			height={scaledHeight}
			style={{ transform }}
			viewBox={`${geom.viewBox.x} ${geom.viewBox.y} ${geom.viewBox.width} ${geom.viewBox.height}`}
			preserveAspectRatio="none"
			className={`tooth-svg-element ${
				colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""
			}`}
		>
			<title>{`Схема зуба ${number}`}</title>
			{canalClipRect && (
				<defs>
					<clipPath id={`canal-obturation-clip-${number}`}>
						<rect
							x={canalClipRect.x}
							y={canalClipRect.y}
							width={canalClipRect.width}
							height={canalClipRect.height}
						/>
					</clipPath>
				</defs>
			)}
			<g className="tooth-group-standard">
				{/* Periapical Inflammatory Granuloma / Cyst Halo at Root Apex */}
				{showPeriapicalHalos &&
					isPeriodontitis &&
					geom.apexHalos?.map((pt, idx) => (
						<g
							key={`halo-${idx}`}
							className="periapical-halo-group"
							filter={isLowSpecFilterDisabled() ? undefined : "url(#periapical-feather-blur)"}
						>
							<circle cx={pt.x} cy={pt.y} r={lesionRadius} fill="url(#periapical-lesion-gradient)" />
							<circle cx={pt.x} cy={pt.y} r={Math.round(lesionRadius * 0.5)} fill="#ea580c" opacity="0.75" />
							<circle cx={pt.x} cy={pt.y} r={Math.max(2, Math.round(lesionRadius * 0.2))} fill="#fef08a" opacity="0.9" />
						</g>
					))}

				{/* Anatomical Multi-Root Profile with Physiological Resorption Support */}
				{!isPontic && resorptionGeom.rootPath && (
					<g
						className="pediatric-root-resorption-layer"
						style={{ opacity: resorptionGeom.opacity }}
					>
						<path
							d={resorptionGeom.rootPath}
							fill={colors.rootFill}
							stroke={
								colors.isMissing
									? "var(--tooth-root-stroke, #94a3b8)"
									: state === "Retained"
										? "#8b5cf6"
										: state === "Root"
											? "#dc2626"
											: state === "Healthy"
												? "var(--tooth-enamel-stroke, var(--tooth-root-stroke, #94a3b8))"
												: colors.stroke
							}
							strokeWidth={colors.isMissing ? "1.4" : "1.8"}
							strokeDasharray={
								state === "Retained"
									? "3 2"
									: colors.isMissing
										? "4 3"
										: undefined
							}
							strokeLinejoin="round"
							className="tooth-root-path"
						/>
					</g>
				)}

				{/* Physiological Root Resorption Hatch Zone (50% and 75% stages) */}
				{resorptionGeom.resorptionHatchAreaPath && (
					<path
						d={resorptionGeom.resorptionHatchAreaPath}
						fill="url(#resorption-hatch-pattern)"
						opacity="0.85"
						className="resorption-hatch-area"
					/>
				)}

				{/* Physiological Root Resorption Boundary Line (25%, 50%, 75% stages) */}
				{resorptionGeom.resorptionLinePath && (
					<path
						d={resorptionGeom.resorptionLinePath}
						fill="none"
						stroke="var(--odontogram-border-strong, #64748b)"
						strokeWidth="1.8"
						strokeDasharray="2.5 2"
						strokeLinecap="round"
						className="resorption-boundary-line"
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

				{/* Gingival Margin Recession Line */}
				{recessionPath && (
					<g className="gingival-recession-layer">
						<path
							d={recessionPath}
							fill="none"
							stroke="#f59e0b"
							strokeWidth="1.8"
							strokeDasharray="3 2"
							strokeLinecap="round"
						/>
					</g>
				)}

				{/* Periodontal Pocket Depth Indicator Line / Band (> 4 mm) */}
				{pocketDepth !== undefined && pocketDepth > 4 && (
					<g className="periodontal-pocket-depth-indicator">
						<path
							d={isTop ? "M 22 96 Q 50 102 78 96" : "M 22 64 Q 50 58 78 64"}
							fill="none"
							stroke={pocketDepth >= 6 ? "#ef4444" : "#f59e0b"}
							strokeWidth={pocketDepth >= 6 ? "3.0" : "2.2"}
							strokeDasharray={pocketDepth >= 6 ? undefined : "3 1.5"}
							strokeLinecap="round"
							className={pocketDepth >= 6 ? "animate-pulse" : undefined}
						/>
					</g>
				)}

				{/* Furcation Involvement Markers at Multi-Root Sites */}
				{furcationMarkers.map(({ site, marker }) => (
					<g key={`furcation-${site.id}`} className="furcation-marker-layer">
						<title>{marker.labelRu}</title>
						<path
							d={marker.path}
							fill={marker.fill}
							stroke={marker.stroke}
							strokeWidth={marker.strokeWidth}
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
					</g>
				))}

				{/* Crown Anatomical Contour */}
				{state !== "Root" && (
					<path
						d={geom.crownPath}
						fill={
							isPontic
								? bridgeMaterial === "gold"
									? "url(#gold-crown-gradient)"
									: bridgeMaterial === "ceramic_emax"
										? "url(#ceramic-emax-gradient)"
										: bridgeMaterial === "pfm_crown"
											? "url(#pfm-crown-gradient)"
											: "url(#zirconia-crown-gradient)"
								: hasActiveSurfaces
									? "url(#dente-enamel-healthy)"
									: colors.crownFill
						}
						fillOpacity={isPontic ? 1 : hasActiveSurfaces ? "1" : colors.opacity}
						stroke={
							isPontic
								? "#2563eb"
								: colors.isMissing
									? "var(--tooth-root-stroke, #94a3b8)"
									: state === "Retained"
										? "#8b5cf6"
										: colors.stroke
						}
						strokeWidth={isPontic ? "2.2" : colors.isMissing ? "1.4" : "2.2"}
						strokeDasharray={
							state === "Retained"
								? "3 2"
								: colors.isMissing && !isPontic
									? "4 3"
									: undefined
						}
						strokeLinejoin="round"
						className={hasActiveSurfaces ? "tooth-crown-base-enamel" : "tooth-crown-path"}
					/>
				)}

				{/* Fixed Bridge Pontic Basal Clearance & Specular Sheen */}
				{isPontic && (
					<g className="bridge-pontic-prosthetic-layer">
						<path
							d={isTop ? "M 22 96 Q 50 88 78 96" : "M 22 64 Q 50 72 78 64"}
							fill="none"
							stroke="#2563eb"
							strokeWidth="2.2"
							strokeLinecap="round"
						/>
						<path
							d={isTop ? "M 28 134 Q 50 146 72 134" : "M 28 30 Q 50 18 72 30"}
							fill="none"
							stroke="rgba(255, 255, 255, 0.85)"
							strokeWidth="1.6"
							strokeLinecap="round"
							opacity="0.9"
						/>
					</g>
				)}

				{/* Crown Fracture Zigzag Crack Line */}
				{hasFracture && (
					<g className="crown-fracture-layer">
						<path
							d={isTop ? "M 46 110 L 52 118 L 48 126 L 54 134 L 50 142" : "M 46 20 L 52 28 L 48 36 L 54 44 L 50 52"}
							fill="none"
							stroke="#dc2626"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="tooth-fracture-line"
						/>
					</g>
				)}

				{/* Apicoectomy Root Apex Resection Line */}
				{hasApicoectomy && !isPontic && (
					<g className="apicoectomy-resection-layer">
						<line
							x1="32"
							y1={isTop ? 22 : 138}
							x2="68"
							y2={isTop ? 22 : 138}
							stroke="#dc2626"
							strokeWidth="3.2"
							strokeLinecap="round"
							className="apicoectomy-resection-line"
						/>
					</g>
				)}

				{/* Root Stump Cervical Fracture Line (Exposed Dentin at CEJ) */}
				{state === "Root" && (
					<g className="tooth-root-fracture-stump">
						<path
							d={isTop ? "M 20 96 L 32 93 L 42 98 L 52 92 L 64 97 L 80 94" : "M 20 64 L 32 67 L 42 62 L 52 68 L 64 63 L 80 66"}
							fill="none"
							stroke="#dc2626"
							strokeWidth="2.6"
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
						<circle cx="50" cy={isTop ? 95 : 65} r="2.8" fill="#7f1d1d" stroke="#dc2626" strokeWidth="0.8" />
					</g>
				)}

				{/* Surface-Specific Shading Overlays */}
				{hasActiveSurfaces && (
					<AnatomicalToothSurfacesLayer
						geom={geom}
						surfaces={surfaces}
						surfaceShading={surfaceShading}
					/>
				)}

				{/* Material Accents (Composite, Amalgam, E.max, Zirconia, Gold) */}
				<AnatomicalRestorativeAccents
					state={state}
					material={material}
					hasActiveSurfaces={hasActiveSurfaces}
					geom={geom}
					isTop={isTop}
					colors={colors}
				/>

				{/* Cementoenamel Junction / Cervical Margin Accent */}
				{!colors.isMissing && geom.cejPath && (
					<path
						d={geom.cejPath}
						fill="none"
						stroke="rgba(100, 116, 139, 0.4)"
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{/* Bleeding on Probing (BOP) Red Dots Overlay */}
				{bopSites && bopSites.length > 0 && (
					<g className="perio-bop-dots-layer">
						{bopSites.map((siteKey, idx) => {
							const cx = siteKey.includes("M") ? 32 : siteKey.includes("D") ? 68 : 50;
							const cy = isTop ? 94 : 66;
							return (
								<circle
									key={`bop-${idx}`}
									cx={cx}
									cy={cy}
									r="3"
									fill="#e11d48"
									className="animate-pulse"
								/>
							);
						})}
					</g>
				)}

				{/* Suppuration Pus Droplets Overlay */}
				{suppurationSites && suppurationSites.length > 0 && (
					<g className="perio-sup-dots-layer">
						{suppurationSites.map((siteKey, idx) => {
							const cx = siteKey.includes("M") ? 36 : siteKey.includes("D") ? 64 : 50;
							const cy = isTop ? 98 : 62;
							return (
								<circle
									key={`sup-${idx}`}
									cx={cx}
									cy={cy}
									r="2.5"
									fill="#f59e0b"
									stroke="#b45309"
									strokeWidth="0.8"
								/>
							);
						})}
					</g>
				)}

				{/* Pulp Chamber & Root Canals for Incisors/Canines (Mandate 8c) / Pulpitis / Diagnostics */}
				{resorptionGeom.showCanals && effectiveCanals.length > 0 && shouldRenderCanalsAndPulp && (
					<g className="anatomical-canals-layer">
						{effectiveCanals.map((c) => (
							<g key={c.id}>
								<path
									d={c.path}
									fill="none"
									stroke={state === "Pulpitis" ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-canal-vital)"}
									strokeWidth="2.8"
									strokeLinecap="round"
									strokeLinejoin="round"
									opacity="0.92"
								/>
								<path
									d={c.path}
									fill="none"
									stroke={state === "Pulpitis" ? "#fecaca" : "#fca5a5"}
									strokeWidth="1.0"
									strokeLinecap="round"
									opacity="0.85"
								/>
							</g>
						))}
					</g>
				)}

				{/* Anatomical Pulp Cavity (Chamber + Coronal Horns) */}
				{geom.pulpChamberPath && shouldRenderCanalsAndPulp && (
					<path
						d={geom.pulpChamberPath}
						fill={state === "Pulpitis" ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-vital-grad)"}
						stroke={state === "Pulpitis" ? "#991b1b" : "#ef4444"}
						strokeWidth="1.2"
						opacity={state === "Pulpitis" ? "0.95" : "0.85"}
						className="anatomical-pulp-chamber"
					/>
				)}

				{/* Root Canal Obturation / Post-and-Core */}
				{resorptionGeom.showCanals && effectiveCanals.length > 0 && isEndoTreated && (
					<g
						className="root-canal-obturation-layer"
						clipPath={canalClipRect ? `url(#canal-obturation-clip-${number})` : undefined}
					>
						{hasPost && postType === "fiber" ? (
							<g filter={isLowSpecFilterDisabled() ? undefined : "url(#dente-glow-indigo)"}>
								{effectiveCanals.map((c) => (
									<g key={c.id}>
										<path
											d={c.path}
											fill="none"
											stroke="url(#fiber-post-gradient)"
											strokeWidth="3.8"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d={c.path}
											fill="none"
											stroke="#ffffff"
											strokeWidth="1.4"
											strokeLinecap="round"
											opacity="0.95"
										/>
									</g>
								))}
							</g>
						) : hasPost && (postType === "cast_core" || postType === "titanium") ? (
							<g filter={isLowSpecFilterDisabled() ? undefined : "url(#dente-metallic-specular)"}>
								{effectiveCanals.map((c) => (
									<path
										key={c.id}
										d={c.path}
										fill="none"
										stroke="url(#cast-core-post-gradient)"
										strokeWidth="4.2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								))}
								<polygon
									points={isTop ? "40,96 60,96 56,116 44,116" : "40,64 60,64 56,44 44,44"}
									fill="url(#cast-core-post-gradient)"
									stroke="#334155"
									strokeWidth="1.2"
								/>
							</g>
						) : (
							<g>
								{effectiveCanals.map((c) => (
									<g key={c.id}>
										<path
											d={c.path}
											fill="none"
											stroke={
												effectiveObturation === "bioceramic"
													? "url(#bioceramic-canal-gradient)"
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
											d={c.path}
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
										{effectiveObturation === "gutta_percha" && (
											<circle
												cx={c.apex.x}
												cy={c.apex.y}
												r="2.2"
												fill="#be123c"
												stroke="#881337"
												strokeWidth="0.6"
											/>
										)}
									</g>
								))}
							</g>
						)}
					</g>
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
				{geom.fissurePath && state !== "Crown" && !colors.isMissing && (
					<path
						d={geom.fissurePath}
						fill="none"
						stroke={
							state === "Caries" && (!hasActiveSurfaces || (surfaces && surfaces.includes("O")))
								? "#7f1d1d"
								: "rgba(15, 23, 42, 0.35)"
						}
						strokeWidth="1"
						strokeLinecap="round"
						pointerEvents="none"
						className="occlusal-fissures-path"
					/>
				)}

				{/* Missing Tooth Ghost Diagonal X */}
				{colors.isMissing && !isPontic && (
					<g className="missing-tooth-cross" opacity="0.95">
						<line
							x1={geom.viewBox.x + 6}
							y1={geom.viewBox.y + 8}
							x2={geom.viewBox.x + geom.viewBox.width - 6}
							y2={geom.viewBox.y + geom.viewBox.height - 8}
							stroke="#ef4444"
							strokeWidth="3.2"
							strokeLinecap="round"
						/>
						<line
							x1={geom.viewBox.x + geom.viewBox.width - 6}
							y1={geom.viewBox.y + 8}
							x2={geom.viewBox.x + 6}
							y2={geom.viewBox.y + geom.viewBox.height - 8}
							stroke="#ef4444"
							strokeWidth="3.2"
							strokeLinecap="round"
						/>
					</g>
				)}

				{/* 6-Surface Interactive Polygons */}
				{useSurfaces && (
					<AnatomicalInteractiveSurfaces
						number={number}
						geom={geom}
						isTop={isTop}
						surfaces={surfaces}
						state={state}
						onClick={onClick}
						useSurfaces={useSurfaces}
					/>
				)}
			</g>
		</svg>
	);

	return state === "Implant" || state === "Planned_Implant"
		? renderImplant()
		: renderStandard();
});
AnatomicalToothSVG.displayName = "AnatomicalToothSVG";
