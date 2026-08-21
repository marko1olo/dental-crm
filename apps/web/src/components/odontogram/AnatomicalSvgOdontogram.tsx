import { Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
	DenteToothSvgDefs,
	type ToothData,
	type ToothState,
	TOOTH_STATE_LABELS,
	type ToothVisualProps,
} from "./ToothChart";
import {
	ANATOMICAL_SURFACE_LABELS_RU,
	type AnatomicalSurfaceKey,
	type CanalObturationMaterial,
	type FurcationGrade,
	getAnatomicalToothGeometry,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	getPhysiologicalRootResorptionGeometry,
	getSurfaceShading,
	isSurfaceActive,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type RootResorptionStage,
	ROOT_RESORPTION_STAGES,
} from "./anatomicalToothGeometries";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "./ClassicGostOdontogram";
import "./odontogram.css";

export interface AnatomicalSvgOdontogramProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	showWisdomTeeth?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	className?: string | undefined;
}

const TOP_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
const BOTTOM_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
const PEDIATRIC_TOP_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const PEDIATRIC_BOTTOM_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const MIXED_TOP_TEETH = [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
const MIXED_BOTTOM_TEETH = [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];

const MIN_ARCH_SCALE = 0.5;

function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}

const getAnatomicalToothColors = (
	state: ToothState,
	material?: RestorativeMaterialKey,
): ToothVisualProps => {
	switch (state) {
		case "Healthy":
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "var(--tooth-root-stroke, #64748b)",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.12)",
				badgeText: "#059669",
			};
		case "Caries":
			return {
				fill: "url(#dente-caries-grad)",
				crownFill: "url(#dente-caries-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#991b1b",
				opacity: "1",
				badgeColor: "#ef4444",
				badgeBg: "rgba(239, 68, 68, 0.15)",
				badgeText: "#b91c1c",
			};
		case "Pulpitis":
			return {
				fill: "url(#dente-pulpitis-grad)",
				crownFill: "url(#dente-pulpitis-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#991b1b",
				opacity: "1",
				badgeColor: "#ef4444",
				badgeBg: "rgba(239, 68, 68, 0.15)",
				badgeText: "#991b1b",
			};
		case "Periodontitis":
			return {
				fill: "url(#dente-periodontitis-grad)",
				crownFill: "url(#dente-periodontitis-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#c2410c",
				opacity: "1",
				badgeColor: "#f97316",
				badgeBg: "rgba(249, 115, 22, 0.15)",
				badgeText: "#c2410c",
			};
		case "Filled":
			if (material === "amalgam") {
				return {
					fill: "url(#amalgam-metal-gradient)",
					crownFill: "url(#amalgam-metal-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#334155",
					opacity: "1",
					badgeColor: "#64748b",
					badgeBg: "rgba(100, 116, 139, 0.15)",
					badgeText: "#475569",
				};
			}
			if (material === "ceramic_emax") {
				return {
					fill: "url(#ceramic-emax-gradient)",
					crownFill: "url(#ceramic-emax-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#0284c7",
					opacity: "1",
					badgeColor: "#38bdf8",
					badgeBg: "rgba(56, 189, 248, 0.15)",
					badgeText: "#0284c7",
				};
			}
			if (material === "gold") {
				return {
					fill: "url(#gold-crown-gradient)",
					crownFill: "url(#gold-crown-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#b45309",
					opacity: "1",
					badgeColor: "#f59e0b",
					badgeBg: "rgba(245, 158, 11, 0.15)",
					badgeText: "#b45309",
				};
			}
			return {
				fill: "url(#composite-fill-gradient)",
				crownFill: "url(#composite-fill-gradient)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#0f766e",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.15)",
				badgeText: "#0f766e",
			};
		case "Crown":
			if (material === "gold") {
				return {
					fill: "url(#gold-crown-gradient)",
					crownFill: "url(#gold-crown-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#b45309",
					opacity: "1",
					badgeColor: "#f59e0b",
					badgeBg: "rgba(245, 158, 11, 0.15)",
					badgeText: "#b45309",
				};
			}
			if (material === "pfm_crown") {
				return {
					fill: "url(#pfm-crown-gradient)",
					crownFill: "url(#pfm-crown-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#1e3a8a",
					collarFill: "url(#pfm-metal-collar)",
					opacity: "1",
					badgeColor: "#2563eb",
					badgeBg: "rgba(37, 99, 235, 0.15)",
					badgeText: "#1d4ed8",
				};
			}
			if (material === "ceramic_emax") {
				return {
					fill: "url(#ceramic-emax-gradient)",
					crownFill: "url(#ceramic-emax-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#0284c7",
					opacity: "1",
					badgeColor: "#38bdf8",
					badgeBg: "rgba(56, 189, 248, 0.15)",
					badgeText: "#0284c7",
				};
			}
			return {
				fill: "url(#zirconia-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#1d4ed8",
				collarFill: "url(#dente-cervical-collar)",
				opacity: "1",
				badgeColor: "#3b82f6",
				badgeBg: "rgba(59, 130, 246, 0.15)",
				badgeText: "#1d4ed8",
			};
		case "Implant":
			return {
				fill: "url(#gold-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#titanium-implant-gradient)",
				stroke: "#334155",
				opacity: "1",
				badgeColor: "#64748b",
				badgeBg: "rgba(100, 116, 139, 0.15)",
				badgeText: "#334155",
			};
		case "Planned_Implant":
			return {
				fill: "url(#gold-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#titanium-implant-gradient)",
				stroke: "#6366f1",
				opacity: "1",
				isPulsing: true,
				badgeColor: "#6366f1",
				badgeBg: "rgba(99, 102, 241, 0.15)",
				badgeText: "#4f46e5",
			};
		case "Missing":
			return {
				fill: "transparent",
				crownFill: "none",
				rootFill: "none",
				stroke: "var(--tooth-root-stroke, #94a3b8)",
				opacity: "0.12",
				isMissing: true,
				badgeColor: "#94a3b8",
				badgeBg: "rgba(148, 163, 184, 0.15)",
				badgeText: "#64748b",
			};
		default:
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "var(--tooth-root-stroke, #94a3b8)",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.12)",
				badgeText: "#059669",
			};
	}
};

const AnatomicalToothSVG = ({
	number,
	state,
	scale,
	material,
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
	isSelected,
	onClick,
	onQuickStateChange,
	pediatricMode,
	surfaces,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
}: {
	number: number;
	state: ToothState;
	scale: number;
	material?: RestorativeMaterialKey | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
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
	isSelected?: boolean | undefined;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState) => void) | undefined;
	pediatricMode?: boolean | undefined;
	surfaces?: string[] | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}) => {
	const isTop = number < 30 || (number >= 51 && number <= 65);
	const geom = getAnatomicalToothGeometry(number);
	const colors = getAnatomicalToothColors(state, material);

	const scaledWidth = scaleCssPx(`${geom.standardWidthPx}px`, scale);
	const scaledHeight = scaleCssPx(`${geom.standardHeightPx}px`, scale);

	const isRightSide =
		(number >= 21 && number <= 28) ||
		(number >= 31 && number <= 38) ||
		(number >= 61 && number <= 65) ||
		(number >= 71 && number <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const isPeriodontitis = state === "Periodontitis" || periapicalLesion;
	const isEndoTreated = state === "Filled" || canalObturation !== undefined;
	const effectiveObturation: CanalObturationMaterial =
		canalObturation ?? (state === "Filled" ? "gutta_percha" : "unfilled");

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

	const surfaceKeys: readonly AnatomicalSurfaceKey[] = ["O", "V", "L", "M", "D", "C"];
	const surfaceShading = getSurfaceShading(state, material);

	const renderImplant = () => (
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
			<title>{`Имплант зуба ${number}`}</title>
			<g className="tooth-group-implant">
				{isTop ? (
					<g className="implant-upper-fixture">
						{/* Tapered Titanium SLA Fixture */}
						<path
							d="M 28 85 L 34 25 Q 50 12 66 25 L 72 85 Z"
							fill="url(#titanium-implant-gradient)"
							stroke="#334155"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						{/* Crestal Micro-grooves */}
						<rect x="29" y="80" width="42" height="4" fill="url(#implant-microgrooves-pattern)" />
						<line x1="28.5" y1="82" x2="71.5" y2="82" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />

						{/* Self-Tapping Helical Thread Ridges */}
						<line x1="36" y1="31" x2="64" y2="33" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="36" y1="32.5" x2="64" y2="34.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="34" y1="43" x2="66" y2="45" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="34" y1="44.5" x2="66" y2="46.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="32" y1="55" x2="68" y2="57" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="32" y1="56.5" x2="68" y2="58.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="30" y1="67" x2="70" y2="69" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="30" y1="68.5" x2="70" y2="70.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="29" y1="77" x2="71" y2="79" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="29" y1="78.5" x2="71" y2="80.5" stroke="#1e293b" strokeWidth="1.2" />

						{/* Apical Vent Cutting Flute Slot */}
						<path d="M 46 14 L 50 28 L 54 14" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />

						{/* Internal Hex Connector */}
						<polygon points="44,83 56,83 60,86 56,89 44,89 40,86" fill="url(#implant-hex-gradient)" stroke="#475569" strokeWidth="0.8" />
						{/* Gold/TiN Transgingival Abutment Collar */}
						<rect x="27" y="83" width="46" height="6" rx="2" fill="url(#gold-crown-gradient)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				) : (
					<g className="implant-lower-fixture">
						{/* Tapered Titanium SLA Fixture */}
						<path
							d="M 28 75 L 34 135 Q 50 148 66 135 L 72 75 Z"
							fill="url(#titanium-implant-gradient)"
							stroke="#334155"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						{/* Crestal Micro-grooves */}
						<rect x="29" y="76" width="42" height="4" fill="url(#implant-microgrooves-pattern)" />
						<line x1="28.5" y1="78" x2="71.5" y2="78" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />

						{/* Self-Tapping Helical Thread Ridges */}
						<line x1="29" y1="81" x2="71" y2="83" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="29" y1="82.5" x2="71" y2="84.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="30" y1="93" x2="70" y2="95" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="30" y1="94.5" x2="70" y2="96.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="32" y1="105" x2="68" y2="107" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="32" y1="106.5" x2="68" y2="108.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="34" y1="117" x2="66" y2="119" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="34" y1="118.5" x2="66" y2="120.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="36" y1="129" x2="64" y2="131" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="36" y1="130.5" x2="64" y2="132.5" stroke="#1e293b" strokeWidth="1.2" />

						{/* Apical Vent Cutting Flute Slot */}
						<path d="M 46 146 L 50 132 L 54 146" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />

						{/* Internal Hex Connector */}
						<polygon points="44,71 56,71 60,68 56,65 44,65 40,68" fill="url(#implant-hex-gradient)" stroke="#475569" strokeWidth="0.8" />
						{/* Gold/TiN Transgingival Abutment Collar */}
						<rect x="27" y="71" width="46" height="6" rx="2" fill="url(#gold-crown-gradient)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				)}

				{/* Restorative Crown on Abutment */}
				<path
					d={geom.crownPath}
					fill={colors.crownFill}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>

				{/* Planned Surgical Trajectory Guideline */}
				{state === "Planned_Implant" && (
					<line
						x1="50"
						y1="10"
						x2="50"
						y2="140"
						stroke="#6366f1"
						strokeWidth="1.6"
						strokeDasharray="4 3"
						strokeLinecap="round"
					/>
				)}
			</g>
		</svg>
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
			<g className="tooth-group-standard">
				{/* Periapical Inflammatory Granuloma / Cyst Halo at Root Apex */}
				{showPeriapicalHalos &&
					isPeriodontitis &&
					geom.apexHalos?.map((pt, idx) => (
						<g key={`halo-${idx}`} className="periapical-halo-group" filter="url(#periapical-feather-blur)">
							<circle cx={pt.x} cy={pt.y} r="15" fill="url(#periapical-lesion-gradient)" />
							<circle cx={pt.x} cy={pt.y} r="7.5" fill="#ea580c" opacity="0.75" />
							<circle cx={pt.x} cy={pt.y} r="3" fill="#fef08a" opacity="0.9" />
						</g>
					))}

				{/* Anatomical Multi-Root Profile with Physiological Resorption Support */}
				{resorptionGeom.rootPath && (
					<g
						className="pediatric-root-resorption-layer"
						style={{ opacity: resorptionGeom.opacity }}
					>
						<path
							d={resorptionGeom.rootPath}
							fill={colors.rootFill}
							stroke={colors.isMissing ? "var(--tooth-root-stroke, #94a3b8)" : "var(--tooth-root-stroke, #64748b)"}
							strokeWidth={colors.isMissing ? "1.4" : "1.8"}
							strokeDasharray={colors.isMissing ? "4 3" : undefined}
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
				<path
					d={geom.crownPath}
					fill={hasActiveSurfaces ? "url(#dente-enamel-healthy)" : colors.crownFill}
					fillOpacity={hasActiveSurfaces ? "1" : colors.opacity}
					stroke={colors.isMissing ? "var(--tooth-root-stroke, #94a3b8)" : colors.stroke}
					strokeWidth={colors.isMissing ? "1.4" : "2.2"}
					strokeDasharray={colors.isMissing ? "4 3" : undefined}
					strokeLinejoin="round"
					className={hasActiveSurfaces ? "tooth-crown-base-enamel" : "tooth-crown-path"}
				/>

				{/* Surface-Specific Shading Overlays (Highlights only active surfaces, keeps natural enamel visible) */}
				{hasActiveSurfaces && (
					<g className="tooth-active-surfaces-layer">
						{surfaceKeys.map((sKey) => {
							if (!isSurfaceActive(sKey, surfaces)) return null;
							const sPath = geom.surfaces[sKey];
							if (!sPath) return null;
							return (
								<g key={`surf-overlay-${sKey}`} className={`active-surface-group surface-${sKey.toLowerCase()}`}>
									<path
										d={sPath}
										fill={surfaceShading.fill}
										fillOpacity={surfaceShading.opacity}
										stroke={surfaceShading.stroke}
										strokeWidth={surfaceShading.strokeWidth}
										strokeLinejoin="round"
										className="active-surface-path"
									/>
									{surfaceShading.pattern && (
										<path
											d={sPath}
											fill={surfaceShading.pattern}
											opacity="0.42"
											pointerEvents="none"
											className="active-surface-pattern"
										/>
									)}
								</g>
							);
						})}
					</g>
				)}

				{/* 1. Photopolymer Composite Resin Multi-layer Stipple & Specular Sheen */}
				{!hasActiveSurfaces && state === "Filled" && (material === "composite" || !material) && (
					<g pointerEvents="none" className="composite-material-layer">
						<path
							d={geom.crownPath}
							fill="url(#composite-resin-pattern)"
							opacity="0.38"
						/>
						<path
							d={isTop ? "M 28 132 Q 50 144 72 132" : "M 28 32 Q 50 20 72 32"}
							fill="none"
							stroke="rgba(255, 255, 255, 0.75)"
							strokeWidth="1.5"
							strokeLinecap="round"
							opacity="0.85"
						/>
					</g>
				)}

				{/* 2. Silver Amalgam Burnished Texture & Dark Silver Oxide Edge */}
				{!hasActiveSurfaces && state === "Filled" && material === "amalgam" && (
					<g pointerEvents="none" className="amalgam-material-layer">
						<path
							d={geom.crownPath}
							fill="url(#amalgam-burnish-pattern)"
							opacity="0.5"
						/>
						<path
							d={geom.crownPath}
							fill="none"
							stroke="#0f172a"
							strokeWidth="1.2"
							opacity="0.7"
						/>
					</g>
				)}

				{/* 3. Ceramic IPS E.max Translucent Porcelain Glaze Reflection */}
				{!hasActiveSurfaces && (state === "Filled" || state === "Crown") && material === "ceramic_emax" && (
					<path
						d={geom.crownPath}
						fill="url(#ceramic-glaze-specular)"
						opacity="0.45"
						pointerEvents="none"
						className="ceramic-glaze-layer"
					/>
				)}

				{/* 4. Monolithic Zirconia & PFM Cusp Highlights & Cervical Collar Ring */}
				{state === "Crown" && (
					<g className="crown-restoration-accents">
						{material === "zirconia" && (
							<path
								d={isTop ? "M 30 134 Q 50 146 70 134" : "M 30 30 Q 50 18 70 30"}
								fill="none"
								stroke="rgba(255, 255, 255, 0.85)"
								strokeWidth="1.6"
								strokeLinecap="round"
								opacity="0.9"
							/>
						)}
						<path
							d={isTop ? "M 20 96 Q 50 92 80 96 Q 50 100 20 96" : "M 20 64 Q 50 68 80 64 Q 50 60 20 64"}
							fill={colors.collarFill ?? "url(#dente-cervical-collar)"}
							stroke="#334155"
							strokeWidth="1.2"
						/>
					</g>
				)}

				{/* 5. Cast Gold 24K Specular Golden Metallic Highlight & Marginal Burnish Line */}
				{!hasActiveSurfaces && (state === "Filled" || state === "Crown") && material === "gold" && (
					<path
						d={isTop ? "M 26 138 Q 50 148 74 138" : "M 26 26 Q 50 16 74 26"}
						fill="none"
						stroke="#fef08a"
						strokeWidth="1.6"
						strokeLinecap="round"
						opacity="0.9"
						pointerEvents="none"
						className="gold-marginal-burnish-layer"
					/>
				)}

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

				{/* Pulp Chamber & Root Canals for Pulpitis / Diagnostics */}
				{resorptionGeom.showCanals && effectiveCanals.length > 0 && (state === "Pulpitis" || showPulpAndCanals) && (
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
									stroke={state === "Pulpitis" ? "#fecaca" : "#fff1f2"}
									strokeWidth="1.0"
									strokeLinecap="round"
									opacity="0.85"
								/>
							</g>
						))}
					</g>
				)}

				{/* Anatomical Pulp Cavity (Chamber + Coronal Horns) */}
				{geom.pulpChamberPath && (state === "Pulpitis" || showPulpAndCanals) && (
					<path
						d={geom.pulpChamberPath}
						fill={state === "Pulpitis" ? "url(#dente-pulpitis-grad)" : "url(#dente-pulp-vital-grad)"}
						stroke={state === "Pulpitis" ? "#991b1b" : "#e11d48"}
						strokeWidth="1.2"
						opacity={state === "Pulpitis" ? "0.95" : "0.85"}
						className="anatomical-pulp-chamber"
					/>
				)}

				{/* Root Canal Obturation / Post-and-Core */}
				{resorptionGeom.showCanals && effectiveCanals.length > 0 && isEndoTreated && (
					<g className="root-canal-obturation-layer">
						{/* Fiber Glass Post */}
						{hasPost && postType === "fiber" ? (
							<g filter="url(#dente-glow-indigo)">
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
							/* Cast Core Metal Post */
							<g filter="url(#dente-metallic-specular)">
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
							/* Standard Endodontic Obturation (Gutta-percha / Bioceramic) with Apical Delta Seal */
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
										{/* Apical delta seal dot for gutta-percha */}
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
							state === "Caries" && (!hasActiveSurfaces || isSurfaceActive("O", surfaces))
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
				{colors.isMissing && (
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

				{/* 6-Surface Interactive Polygons directly mapped on the Anatomical Crown */}
				{useSurfaces && (
					<g className="tooth-surface-interactive-group">
						{(["O", "V", isTop ? "P" : "L", "M", "D", "C"] as const).map((surfKey) => {
							const geomKey = surfKey === "P" ? "L" : surfKey;
							const surfPath = geom.surfaces[geomKey as AnatomicalSurfaceKey];
							if (!surfPath) return null;
							const isHighlighted = isSurfaceActive(geomKey as AnatomicalSurfaceKey, surfaces);
							const labelInfo = ANATOMICAL_SURFACE_LABELS_RU[geomKey as AnatomicalSurfaceKey];
							return (
								<path
									key={surfKey}
									d={surfPath}
									role="tab"
									tabIndex={0}
									aria-label={`${labelInfo?.nameRu ?? `Поверхность ${surfKey}`} зуба ${number}`}
									fill={
										isHighlighted
											? state === "Filled"
												? "#10b981"
												: state === "Healthy"
													? "#3b82f6"
													: "#ef4444"
											: "transparent"
									}
									fillOpacity={isHighlighted ? 0.65 : 0}
									stroke={isHighlighted ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.3)"}
									strokeWidth="0.8"
									className={`tooth-surface-target surface-${geomKey.toLowerCase()} ${
										isHighlighted ? "surface-active" : ""
									}`}
									style={{ cursor: "pointer", transition: "fill 0.2s, fill-opacity 0.2s, stroke 0.2s" }}
									onClick={(e) => {
										e.stopPropagation();
										onClick(e, number, surfKey);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											e.stopPropagation();
											onClick(e as unknown as React.MouseEvent, number, surfKey);
										}
									}}
								>
									<title>{`${labelInfo?.nameRu ?? surfKey} — Зуб ${number}`}</title>
								</path>
							);
						})}
					</g>
				)}
			</g>
		</svg>
	);

	return state === "Implant" || state === "Planned_Implant"
		? renderImplant()
		: renderStandard();
};

export interface ToothWrapperProps {
	tooth: ToothData;
	isSelected: boolean;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onClick: (
		e: React.MouseEvent,
		num: number,
		surface?: string,
	) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState) => void) | undefined;
	useSurfaces?: boolean | undefined;
	isTop: boolean;
	scale?: number | undefined;
	pediatricMode?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}

const ToothWrapper: React.FC<ToothWrapperProps> = ({
	tooth,
	isSelected,
	selectedTeeth,
	activeStamp,
	onClick,
	onQuickStateChange,
	useSurfaces,
	isTop,
	scale = 1,
	pediatricMode,
	showPulpAndCanals,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
}) => {
	const {
		toothNumber: number,
		state,
		surfaces,
		material,
		canalObturation,
		hasPost,
		postType,
		boneLossLevel,
		boneLossType,
		furcationGrade,
		furcation: directFurcation,
		mobility,
		gingivalRecession,
		bopSites,
		suppurationSites,
		periapicalLesion,
		rootResorptionStage,
		rootResorption,
	} = tooth;

	const furcation = furcationGrade ?? directFurcation;
	const effectiveResorption = rootResorptionStage ?? rootResorption ?? 0;
	const colors = getAnatomicalToothColors(state, material);

	const renderNumberBadge = () => (
		<div className="relative flex flex-col items-center group/badge">
			{/* Hover Quick Action Micro-HUD (Clinical Russian Presets) when no global stamp is active */}
			{!activeStamp && onQuickStateChange && (
				<div
					className={`tooth-hover-quick-hud absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover/badge:opacity-100 transition-all duration-200 z-40 flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[var(--odontogram-paper)] border border-[var(--odontogram-border-strong)] shadow-2xl backdrop-blur-md pointer-events-auto whitespace-nowrap ${
						isTop ? "bottom-full mb-1.5" : "top-full mt-1.5"
					}`}
					onClick={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
							onQuickStateChange(targets, "Caries");
						}}
						className="px-1.5 py-0.5 min-h-[32px] rounded-md bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 touch-manipulation"
						title="Кариес (Кар.)"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
						<span>Кар.</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
							onQuickStateChange(targets, "Filled");
						}}
						className="px-1.5 py-0.5 min-h-[32px] rounded-md bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 touch-manipulation"
						title="Пломба (Пл.)"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
						<span>Пл.</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
							onQuickStateChange(targets, "Pulpitis");
						}}
						className="px-1.5 py-0.5 min-h-[32px] rounded-md bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 touch-manipulation"
						title="Пульпит (Пульп.)"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
						<span>Пульп.</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
							onQuickStateChange(targets, "Crown");
						}}
						className="px-1.5 py-0.5 min-h-[32px] rounded-md bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 touch-manipulation"
						title="Коронка (Кор.)"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
						<span>Кор.</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
							onQuickStateChange(targets, "Missing");
						}}
						className="px-1.5 py-0.5 min-h-[32px] rounded-md bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 touch-manipulation"
						title="Удален (Удал.)"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
						<span>Удал.</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
							onQuickStateChange(targets, "Healthy");
						}}
						className="px-1.5 py-0.5 min-h-[32px] rounded-md bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-white border border-teal-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 touch-manipulation"
						title="Здоров (Зд.)"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
						<span>Зд.</span>
					</button>
				</div>
			)}

			<span
				className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
				style={{ fontSize: scale < 0.85 ? "10px" : undefined }}
			>
				<span
					className="tooth-status-dot"
					style={{ backgroundColor: colors.badgeColor }}
				/>
				<span className="tooth-number-text">{number}</span>
				{mobility !== undefined && mobility > 0 && (
					<span
						className="ml-0.5 px-1 py-0.2 rounded text-[8px] font-black bg-indigo-600 text-white shadow-2xs leading-none"
						title={`Подвижность по Миллеру: ${mobility} ст.`}
					>
						M{mobility}
					</span>
				)}
				{furcation !== undefined && furcation > 0 && (
					<span
						className={`ml-0.5 px-1 py-0.2 rounded text-[8px] font-black text-white shadow-2xs leading-none ${
							furcation >= 3 ? "bg-rose-600" : "bg-amber-500"
						}`}
						title={`Поражение фуркации: ${furcation} ст.`}
					>
						F{furcation}
					</span>
				)}
				{effectiveResorption > 0 && (
					<span
						className="ml-0.5 px-1 py-0.2 rounded text-[8px] font-black text-white shadow-2xs leading-none"
						style={{ backgroundColor: ROOT_RESORPTION_STAGES[effectiveResorption]?.badgeColor ?? "#f59e0b" }}
						title={`Физиологическая резорбция корня: ${ROOT_RESORPTION_STAGES[effectiveResorption]?.nameRu ?? `${effectiveResorption}%`}`}
					>
						R{effectiveResorption}%
					</span>
				)}
			</span>
		</div>
	);

	return (
		<button
			type="button"
			className={`tooth-svg-wrapper group ${isTop ? "top" : "bottom"} ${
				isSelected ? "selected ring-2 ring-indigo-500/70" : ""
			}`}
			data-tooth-id={number}
			aria-label={`Зуб ${number}, ${TOOTH_STATE_LABELS[state]}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={(e) => {
				if (activeStamp && onQuickStateChange) {
					const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
					onQuickStateChange(targets, activeStamp);
					return;
				}
				onClick(e, number);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (activeStamp && onQuickStateChange) {
						const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
						onQuickStateChange(targets, activeStamp);
						return;
					}
					onClick(e as unknown as React.MouseEvent, number);
					return;
				}

				if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Home" || e.key === "End") {
					e.preventDefault();
					const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
						ArrowLeft: "left",
						ArrowRight: "right",
						ArrowUp: "up",
						ArrowDown: "down",
						Home: "home",
						End: "end",
					};
					const navDir = dirMap[e.key];
					if (navDir) {
						const nextTooth = getNextFocusedTooth(number, navDir, pediatricMode);
						const nextEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
						nextEl?.focus();
					}
					return;
				}

				// 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З)
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState && onQuickStateChange) {
					e.preventDefault();
					const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
					onQuickStateChange(targets, quickState);
				}
			}}
		>
			{isTop && renderNumberBadge()}
			<AnatomicalToothSVG
				number={number}
				state={state}
				scale={scale}
				material={material}
				canalObturation={canalObturation}
				hasPost={hasPost}
				postType={postType}
				boneLossLevel={boneLossLevel}
				boneLossType={boneLossType}
				furcation={furcation}
				mobility={mobility}
				gingivalRecession={gingivalRecession}
				bopSites={bopSites}
				suppurationSites={suppurationSites}
				periapicalLesion={periapicalLesion}
				rootResorptionStage={effectiveResorption}
				isSelected={isSelected}
				onClick={onClick}
				onQuickStateChange={onQuickStateChange}
				pediatricMode={pediatricMode}
				surfaces={surfaces}
				useSurfaces={useSurfaces}
				showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos}
				showPeriodontalBoneLoss={showPeriodontalBoneLoss}
			/>
			{!isTop && renderNumberBadge()}
		</button>
	);
};

function splitArchAtMidline(teeth: number[]): { left: number[]; right: number[] } {
	if (teeth.length <= 1) return { left: teeth, right: [] };
	let splitIndex = teeth.findIndex((num, i) => {
		if (i === 0) return false;
		const prev = teeth[i - 1];
		if (!prev) return false;
		const prevQ = Math.floor(prev / 10);
		const currQ = Math.floor(num / 10);
		return prevQ !== currQ;
	});
	if (splitIndex <= 0) {
		splitIndex = Math.ceil(teeth.length / 2);
	}
	return {
		left: teeth.slice(0, splitIndex),
		right: teeth.slice(splitIndex),
	};
}

export interface AnatomicalSvgOdontogramProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	showWisdomTeeth?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	className?: string | undefined;
}

export const AnatomicalSvgOdontogram: React.FC<AnatomicalSvgOdontogramProps> = ({
	teethData = [],
	pediatricMode,
	mixedDentition,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp = null,
	onToothClick,
	onQuickStateChange,
	useSurfaces,
	hideHeader = false,
	hideLegend = false,
	showWisdomTeeth = true,
	showPulpAndCanals = false,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
	className = "",
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);
	const [archScale, setArchScale] = useState(1);
	const appliedArchScaleRef = useRef(1);

	const rawTopTeethList =
		customTopTeeth ??
		(mixedDentition
			? MIXED_TOP_TEETH
			: pediatricMode
				? PEDIATRIC_TOP_TEETH
				: TOP_TEETH);
	const rawBottomTeethList =
		customBottomTeeth ??
		(mixedDentition
			? MIXED_BOTTOM_TEETH
			: pediatricMode
				? PEDIATRIC_BOTTOM_TEETH
				: BOTTOM_TEETH);

	const isWisdom = (n: number) => n === 18 || n === 28 || n === 38 || n === 48;
	const topTeethList = showWisdomTeeth ? rawTopTeethList : rawTopTeethList.filter((n) => !isWisdom(n));
	const bottomTeethList = showWisdomTeeth ? rawBottomTeethList : rawBottomTeethList.filter((n) => !isWisdom(n));

	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const element = archContainerRef.current;
			if (!element) return;
			const available = Math.max(0, element.clientWidth - 16);
			const row = element.querySelector<HTMLElement>(".teeth-row");
			if (!available || !row) return;

			const applied = appliedArchScaleRef.current;
			const naturalWidth = row.scrollWidth / applied;
			if (!Number.isFinite(naturalWidth) || naturalWidth <= 0) return;

			const next = Math.min(
				1.25,
				Math.max(MIN_ARCH_SCALE, available / naturalWidth),
			);
			if (Math.abs(applied - next) < 0.005) return;
			appliedArchScaleRef.current = next;
			setArchScale(next);
		};

		recalculate();
		const observer = new ResizeObserver(recalculate);
		observer.observe(element);
		return () => observer.disconnect();
	}, [topTeethList, bottomTeethList]);

	// High-speed keyboard triggers: instant 1-key assigning without opening sub-menus
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable
			) {
				return;
			}

			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					onQuickStateChange(selectedTeeth, quickState);
					return;
				}
			}

			const firstTooth = selectedTeeth[0];
			if (selectedTeeth.length === 1 && firstTooth !== undefined) {
				const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
					ArrowLeft: "left",
					ArrowRight: "right",
					ArrowUp: "up",
					ArrowDown: "down",
					Home: "home",
					End: "end",
				};
				const navDir = dirMap[e.key];
				if (navDir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(firstTooth, navDir, pediatricMode);
					const nextEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
					nextEl?.focus();
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [selectedTeeth, onQuickStateChange, pediatricMode]);

	const handleToothClick = (
		e: React.MouseEvent,
		num: number,
		surface?: string,
	) => {
		const rect = e.currentTarget.getBoundingClientRect();
		onToothClick(num, rect, surface);
	};

	const topSplit = splitArchAtMidline(topTeethList);
	const bottomSplit = splitArchAtMidline(bottomTeethList);

	return (
		<div className={`tooth-chart-container anatomical-svg-mode ${className}`.trim()} ref={containerRef}>
			<DenteToothSvgDefs />

			{!hideLegend && (
				<div className="tooth-chart-legend-row">
					<div className="tooth-chart-legend">
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" /> Кариес
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> Пульпит
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> Периодонтит
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm" /> Пломба
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" /> Коронка
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" /> Имплант
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-indigo-400 border border-indigo-500" /> План
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-50" /> Отсутствует
						</span>
					</div>
				</div>
			)}

			<div className="tooth-chart-arch-container" ref={archContainerRef}>
				<div
					className="tooth-chart-arch-wrapper"
					style={{
						minWidth: "max-content",
						margin: "0 auto",
						position: "relative",
					}}
				>
					{/* Upper Arch (Maxilla) */}
					<div className="teeth-row top-row">
						<div className="tooth-quadrant-group top-left-quad">
							{topSplit.left.map((num) => {
								const tData: ToothData = (teethData ?? []).find((t) => t.toothNumber === num) ?? {
									toothNumber: num,
									state: "Healthy",
								};
								return (
									<ToothWrapper
										key={num}
										tooth={tData}
										scale={archScale}
										isTop={true}
										isSelected={selectedTeeth.includes(num)}
										selectedTeeth={selectedTeeth}
										activeStamp={activeStamp}
										onClick={handleToothClick}
										onQuickStateChange={onQuickStateChange}
										useSurfaces={useSurfaces}
										showPulpAndCanals={showPulpAndCanals}
										showPeriapicalHalos={showPeriapicalHalos}
										showPeriodontalBoneLoss={showPeriodontalBoneLoss}
										pediatricMode={pediatricMode}
									/>
								);
							})}
						</div>

						<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						<div className="tooth-quadrant-group top-right-quad">
							{topSplit.right.map((num) => {
								const tData: ToothData = (teethData ?? []).find((t) => t.toothNumber === num) ?? {
									toothNumber: num,
									state: "Healthy",
								};
								return (
									<ToothWrapper
										key={num}
										tooth={tData}
										scale={archScale}
										isTop={true}
										isSelected={selectedTeeth.includes(num)}
										selectedTeeth={selectedTeeth}
										activeStamp={activeStamp}
										onClick={handleToothClick}
										onQuickStateChange={onQuickStateChange}
										useSurfaces={useSurfaces}
										showPulpAndCanals={showPulpAndCanals}
										showPeriapicalHalos={showPeriapicalHalos}
										showPeriodontalBoneLoss={showPeriodontalBoneLoss}
										pediatricMode={pediatricMode}
									/>
								);
							})}
						</div>
					</div>

					<div className="teeth-divider">
						<div className="divider-line" />
						<div className="divider-center" title="Центр окклюзионной плоскости">
							<div className="divider-diamond" />
						</div>
					</div>

					{/* Lower Arch (Mandible) */}
					<div className="teeth-row bottom-row">
						<div className="tooth-quadrant-group bottom-left-quad">
							{bottomSplit.left.map((num) => {
								const tData: ToothData = (teethData ?? []).find((t) => t.toothNumber === num) ?? {
									toothNumber: num,
									state: "Healthy",
								};
								return (
									<ToothWrapper
										key={num}
										tooth={tData}
										scale={archScale}
										isTop={false}
										isSelected={selectedTeeth.includes(num)}
										selectedTeeth={selectedTeeth}
										activeStamp={activeStamp}
										onClick={handleToothClick}
										onQuickStateChange={onQuickStateChange}
										useSurfaces={useSurfaces}
										showPulpAndCanals={showPulpAndCanals}
										showPeriapicalHalos={showPeriapicalHalos}
										showPeriodontalBoneLoss={showPeriodontalBoneLoss}
										pediatricMode={pediatricMode}
									/>
								);
							})}
						</div>

						<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						<div className="tooth-quadrant-group bottom-right-quad">
							{bottomSplit.right.map((num) => {
								const tData: ToothData = (teethData ?? []).find((t) => t.toothNumber === num) ?? {
									toothNumber: num,
									state: "Healthy",
								};
								return (
									<ToothWrapper
										key={num}
										tooth={tData}
										scale={archScale}
										isTop={false}
										isSelected={selectedTeeth.includes(num)}
										selectedTeeth={selectedTeeth}
										activeStamp={activeStamp}
										onClick={handleToothClick}
										onQuickStateChange={onQuickStateChange}
										useSurfaces={useSurfaces}
										showPulpAndCanals={showPulpAndCanals}
										showPeriapicalHalos={showPeriapicalHalos}
										showPeriodontalBoneLoss={showPeriodontalBoneLoss}
										pediatricMode={pediatricMode}
									/>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
