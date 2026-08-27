import { Settings } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { getToothConfig, getToothPath } from "../../utils/math/toothGeometry";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "./ClassicGostOdontogram";
import {
	isPrimaryTooth,
	getPrimaryToothResorptionVisual,
	type ResorptionVisualProps,
	type DentitionMode,
} from "./pediatricDentitionEngine";
import "./odontogram.css";

export { getNextFocusedTooth, getToothStateFromHotkey };
export type { DentitionMode };

export type ToothState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Missing"
	| "Crown"
	| "Implant"
	| "Filled"
	| "Healthy"
	| "Planned_Implant";

/**
 * Русские названия состояний — для доступного имени зуба.
 *
 * Объявлено здесь, рядом с самим типом ToothState: OdontogramModule уже
 * импортирует ToothChart, и обратный импорт замкнул бы цикл. Record без
 * необязательных ключей заставляет компилятор потребовать перевод при
 * добавлении нового состояния.
 */
export const TOOTH_STATE_LABELS: Record<ToothState, string> = {
	Caries: "кариес",
	Pulpitis: "пульпит",
	Periodontitis: "периодонтит",
	Filled: "пломба",
	Crown: "коронка",
	Implant: "имплантат",
	Planned_Implant: "план. имплантат",
	Missing: "отсутствует",
	Healthy: "здоров",
};

import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import type { EndoToothClinicalData } from "./EndoCanalLogModal";
import {
	type CanalObturationMaterial,
	type FurcationGrade,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type RootResorptionStage,
	ROOT_RESORPTION_STAGES,
} from "./anatomicalToothGeometries";

export interface ToothData {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[];
	material?: RestorativeMaterialKey;
	canalObturation?: CanalObturationMaterial;
	hasPost?: boolean;
	postType?: PostCoreType;
	boneLossLevel?: number;
	boneLossType?: PeriodontalBoneLossPattern;
	furcationGrade?: FurcationGrade;
	furcation?: FurcationGrade;
	rootResorptionStage?: RootResorptionStage;
	rootResorption?: RootResorptionStage;
	mobility?: 0 | 1 | 2 | 3;
	gingivalRecession?: number;
	bopSites?: string[];
	suppurationSites?: string[];
	periapicalLesion?: boolean;
	pocketDepth?: number;
	pocketDepthMm?: number;
	maxPocketDepth?: number;
	notes?: string;
	clinicalData?: EndoToothClinicalData | Record<string, unknown>;
}

export type OdontogramQuadrantId =
	| "all"
	| "Q1"
	| "Q2"
	| "Q3"
	| "Q4"
	| "Q5"
	| "Q6"
	| "Q7"
	| "Q8";

export interface QuadrantDefinition {
	id: OdontogramQuadrantId;
	label: string;
	shortLabel: string;
	rangeText: string;
	jaw: "upper" | "lower";
	side: "right" | "left";
	teeth: number[];
}

export const ADULT_QUADRANTS: readonly QuadrantDefinition[] = [
	{
		id: "Q1",
		label: "Q1: Верхняя челюсть (Правый)",
		shortLabel: "Q1 18–11",
		rangeText: "18–11 (Правый)",
		jaw: "upper",
		side: "right",
		teeth: [18, 17, 16, 15, 14, 13, 12, 11],
	},
	{
		id: "Q2",
		label: "Q2: Верхняя челюсть (Левый)",
		shortLabel: "Q2 21–28",
		rangeText: "21–28 (Левый)",
		jaw: "upper",
		side: "left",
		teeth: [21, 22, 23, 24, 25, 26, 27, 28],
	},
	{
		id: "Q4",
		label: "Q4: Нижняя челюсть (Правый)",
		shortLabel: "Q4 48–41",
		rangeText: "48–41 (Правый)",
		jaw: "lower",
		side: "right",
		teeth: [48, 47, 46, 45, 44, 43, 42, 41],
	},
	{
		id: "Q3",
		label: "Q3: Нижняя челюсть (Левый)",
		shortLabel: "Q3 31–38",
		rangeText: "31–38 (Левый)",
		jaw: "lower",
		side: "left",
		teeth: [31, 32, 33, 34, 35, 36, 37, 38],
	},
];

export const PEDIATRIC_QUADRANTS: readonly QuadrantDefinition[] = [
	{
		id: "Q5",
		label: "Q5: Верхняя челюсть (Правый)",
		shortLabel: "Q5 55–51",
		rangeText: "55–51 (Правый)",
		jaw: "upper",
		side: "right",
		teeth: [55, 54, 53, 52, 51],
	},
	{
		id: "Q6",
		label: "Q6: Верхняя челюсть (Левый)",
		shortLabel: "Q6 61–65",
		rangeText: "61–65 (Левый)",
		jaw: "upper",
		side: "left",
		teeth: [61, 62, 63, 64, 65],
	},
	{
		id: "Q8",
		label: "Q8: Нижняя челюсть (Правый)",
		shortLabel: "Q8 85–81",
		rangeText: "85–81 (Правый)",
		jaw: "lower",
		side: "right",
		teeth: [85, 84, 83, 82, 81],
	},
	{
		id: "Q7",
		label: "Q7: Нижняя челюсть (Левый)",
		shortLabel: "Q7 71–75",
		rangeText: "71–75 (Левый)",
		jaw: "lower",
		side: "left",
		teeth: [71, 72, 73, 74, 75],
	},
];

export function getQuadrantForTooth(
	toothNumber: number,
	pediatricMode?: boolean,
): OdontogramQuadrantId {
	const q = Math.floor(toothNumber / 10);
	switch (q) {
		case 1:
			return "Q1";
		case 2:
			return "Q2";
		case 3:
			return "Q3";
		case 4:
			return "Q4";
		case 5:
			return "Q5";
		case 6:
			return "Q6";
		case 7:
			return "Q7";
		case 8:
			return "Q8";
		default:
			return pediatricMode ? "Q5" : "Q1";
	}
}

export function getAdjacentQuadrant(
	current: OdontogramQuadrantId,
	direction: "next" | "prev",
	pediatricMode?: boolean,
): OdontogramQuadrantId {
	const adultOrder: OdontogramQuadrantId[] = ["Q1", "Q2", "Q3", "Q4"];
	const pedOrder: OdontogramQuadrantId[] = ["Q5", "Q6", "Q7", "Q8"];
	const order = pediatricMode ? pedOrder : adultOrder;
	const idx = order.indexOf(current);
	if (idx === -1) return order[0]!;
	if (direction === "next") {
		return order[(idx + 1) % order.length]!;
	}
	return order[(idx - 1 + order.length) % order.length]!;
}

export function isQuadrantTop(quadrant: OdontogramQuadrantId): boolean {
	return quadrant === "Q1" || quadrant === "Q2" || quadrant === "Q5" || quadrant === "Q6";
}

export function getQuadrantTitle(quadrant: OdontogramQuadrantId, pediatricMode?: boolean): string {
	switch (quadrant) {
		case "Q1":
			return "Верхняя челюсть (Правая) • Зубы 18–11";
		case "Q2":
			return "Верхняя челюсть (Левая) • Зубы 21–28";
		case "Q3":
			return "Нижняя челюсть (Левая) • Зубы 31–38";
		case "Q4":
			return "Нижняя челюсть (Правая) • Зубы 48–41";
		case "Q5":
			return "Верхняя челюсть (Правая) • Зубы 55–51";
		case "Q6":
			return "Верхняя челюсть (Левая) • Зубы 61–65";
		case "Q7":
			return "Нижняя челюсть (Левая) • Зубы 71–75";
		case "Q8":
			return "Нижняя челюсть (Правая) • Зубы 85–81";
		default:
			return pediatricMode ? "Все молочные зубы (55–85)" : "Все взрослые зубы (18–48)";
	}
}

export interface ToothChartProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	dentitionMode?: DentitionMode | undefined;
	onDentitionModeChange?: ((mode: DentitionMode) => void) | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	hideDentitionSwitcher?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	className?: string | undefined;
}

export const TOP_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const BOTTOM_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
export const ALL_ADULT_TEETH_NUMBERS: readonly number[] = [
	...TOP_TEETH,
	...BOTTOM_TEETH,
];

export const ADULT_MOLARS: readonly number[] = [
	18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38,
];
export const ADULT_PREMOLARS: readonly number[] = [
	15, 14, 24, 25, 45, 44, 34, 35,
];
export const ADULT_FRONTAL: readonly number[] = [
	13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33,
];

export function createDefaultAdultTeethData(): ToothData[] {
	return ALL_ADULT_TEETH_NUMBERS.map((toothNumber) => ({
		toothNumber,
		state: "Healthy" as ToothState,
	}));
}

export const PEDIATRIC_TOP_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PEDIATRIC_BOTTOM_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export const PEDIATRIC_MOLARS: readonly number[] = [55, 54, 64, 65, 85, 84, 74, 75];
export const MIXED_TOP_TEETH = [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
export const MIXED_BOTTOM_TEETH = [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];

/**
 * Нижняя граница масштаба. Дуга масштабируется под экран мобильного устройства (375px–414px).
 */
const MIN_ARCH_SCALE = 0.35;

/** "56px" × 0.68 → "38.08px". Нечисловое значение возвращается как есть. */
function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}

export interface ToothVisualProps {
	fill: string;
	crownFill: string;
	rootFill: string;
	stroke: string;
	opacity: string;
	isPulsing?: boolean;
	isMissing?: boolean;
	badgeColor: string;
	badgeBg: string;
	badgeText: string;
	collarFill?: string;
	canalFill?: string;
	canalGlow?: string;
}

const getToothColors = (
	state: ToothState,
	material?: RestorativeMaterialKey,
): ToothVisualProps => {
	switch (state) {
		case "Healthy":
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
					stroke: "#d97706",
					collarFill: "url(#gold-ridge-burnish)",
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
					stroke: "#3b82f6",
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
					stroke: "#38bdf8",
					collarFill: "url(#ceramic-emax-gradient)",
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
				stroke: "#60a5fa",
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

/**
 * Shared SVG Defs component rendered once for high-fidelity dental shaders.
 * Implements complete material library: Photopolymer composite, Silver amalgam,
 * Ceramic E.max, Zirconia, PFM crown, Cast gold, Titanium SLA implant fixture,
 * Gutta-percha canal fill with apical seal, Fiber post, Cast core post, Periapical halo,
 * and Periodontal bone loss patterns.
 */
export const DenteToothSvgDefs: React.FC = () => (
	<svg
		aria-hidden="true"
		className="absolute -top-[9999px] -left-[9999px] w-0 h-0 pointer-events-none opacity-0"
		style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
	>
		<defs>
			{/* 1. Enamel Healthy Gradient (Natural Ivory & Specular Highlight Sheen) */}
			<linearGradient id="dente-enamel-healthy" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="20%" stopColor="#fefcf9" stopOpacity="1" />
				<stop offset="45%" stopColor="#f7f3eb" stopOpacity="1" />
				<stop offset="70%" stopColor="#ede6d8" stopOpacity="1" />
				<stop offset="88%" stopColor="#e0d7c7" stopOpacity="1" />
				<stop offset="100%" stopColor="#cfc4b2" stopOpacity="1" />
			</linearGradient>

			{/* 2. Root Dentin / Cementum Gradient */}
			<linearGradient id="dente-root-dentin" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#ded4c3" stopOpacity="0.95" />
				<stop offset="25%" stopColor="#efe7d8" stopOpacity="1" />
				<stop offset="50%" stopColor="#f9f4ea" stopOpacity="1" />
				<stop offset="75%" stopColor="#ece2d1" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#d5c8b5" stopOpacity="1" />
			</linearGradient>

			{/* 3. Photopolymer Composite Filling Multi-Layer Resin Gradients & Margins */}
			<linearGradient id="composite-fill-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="15%" stopColor="#f0fdfa" stopOpacity="0.96" />
				<stop offset="38%" stopColor="#ccfbf1" stopOpacity="0.92" />
				<stop offset="65%" stopColor="#99f6e4" stopOpacity="0.92" />
				<stop offset="85%" stopColor="#5eead4" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#0d9488" stopOpacity="0.98" />
			</linearGradient>
			<linearGradient id="dente-shader-composite" href="#composite-fill-gradient" />
			<linearGradient id="dente-filled-grad" href="#composite-fill-gradient" />

			<radialGradient id="composite-specular-highlight" cx="35%" cy="30%" r="40%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="45%" stopColor="#f0fdfa" stopOpacity="0.4" />
				<stop offset="100%" stopColor="#ccfbf1" stopOpacity="0" />
			</radialGradient>

			<linearGradient id="composite-margin-bevel" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#0f766e" stopOpacity="0.9" />
				<stop offset="50%" stopColor="#14b8a6" stopOpacity="0.75" />
				<stop offset="100%" stopColor="#0f766e" stopOpacity="0.9" />
			</linearGradient>

			{/* 4. Silver Amalgam Metal Gradient, Oxide Margin & Burnished Specular */}
			<linearGradient id="amalgam-metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#94a3b8" stopOpacity="1" />
				<stop offset="15%" stopColor="#e2e8f0" stopOpacity="1" />
				<stop offset="32%" stopColor="#64748b" stopOpacity="1" />
				<stop offset="52%" stopColor="#334155" stopOpacity="1" />
				<stop offset="72%" stopColor="#475569" stopOpacity="1" />
				<stop offset="88%" stopColor="#1e293b" stopOpacity="1" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-shader-amalgam" href="#amalgam-metal-gradient" />

			<radialGradient id="amalgam-burnished-specular" cx="40%" cy="35%" r="50%">
				<stop offset="0%" stopColor="#f8fafc" stopOpacity="0.75" />
				<stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.4" />
				<stop offset="70%" stopColor="#475569" stopOpacity="0.1" />
				<stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
			</radialGradient>

			<linearGradient id="amalgam-oxide-margin" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
				<stop offset="50%" stopColor="#1e293b" stopOpacity="0.8" />
				<stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
			</linearGradient>

			{/* 5. Ceramic IPS E.max Translucent Inlay / Onlay Gradient & Glaze */}
			<linearGradient id="ceramic-emax-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="15%" stopColor="#f0f9ff" stopOpacity="0.96" />
				<stop offset="35%" stopColor="#e0f2fe" stopOpacity="0.92" />
				<stop offset="60%" stopColor="#bae6fd" stopOpacity="0.95" />
				<stop offset="80%" stopColor="#7dd3fc" stopOpacity="0.95" />
				<stop offset="92%" stopColor="#38bdf8" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#0284c7" stopOpacity="0.92" />
			</linearGradient>
			<linearGradient id="dente-shader-ceramic-emax" href="#ceramic-emax-gradient" />

			<linearGradient id="ceramic-glaze-specular" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
				<stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.45" />
				<stop offset="70%" stopColor="#bae6fd" stopOpacity="0.1" />
				<stop offset="100%" stopColor="transparent" stopOpacity="0" />
			</linearGradient>

			{/* 6. Zirconia Full Contour Crown Ivory Luster Gradient & Cusp Highlights */}
			<linearGradient id="zirconia-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="18%" stopColor="#f8fafc" stopOpacity="1" />
				<stop offset="40%" stopColor="#e2e8f0" stopOpacity="1" />
				<stop offset="68%" stopColor="#bfdbfe" stopOpacity="1" />
				<stop offset="88%" stopColor="#60a5fa" stopOpacity="1" />
				<stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-shader-zirconia" href="#zirconia-crown-gradient" />
			<linearGradient id="dente-crown-zirconia" href="#zirconia-crown-gradient" />

			<radialGradient id="zirconia-cusp-specular" cx="50%" cy="20%" r="45%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
				<stop offset="40%" stopColor="#eff6ff" stopOpacity="0.5" />
				<stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
			</radialGradient>

			{/* 7. Porcelain-Fused-To-Metal (PFM) Crown & Cervical Collar */}
			<linearGradient id="pfm-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="20%" stopColor="#f1f5f9" stopOpacity="0.98" />
				<stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.95" />
				<stop offset="80%" stopColor="#94a3b8" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#475569" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-shader-pfm" href="#pfm-crown-gradient" />

			<linearGradient id="pfm-metal-collar" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#1e293b" />
				<stop offset="20%" stopColor="#475569" />
				<stop offset="45%" stopColor="#cbd5e1" />
				<stop offset="55%" stopColor="#f8fafc" />
				<stop offset="75%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>
			<linearGradient id="dente-cervical-collar" href="#pfm-metal-collar" />

			{/* 8. Cast Gold 24K Specular Metallic Shine Gradient & Marginal Burnish */}
			<linearGradient id="gold-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
				<stop offset="15%" stopColor="#fef08a" stopOpacity="1" />
				<stop offset="35%" stopColor="#facc15" stopOpacity="1" />
				<stop offset="58%" stopColor="#eab308" stopOpacity="1" />
				<stop offset="78%" stopColor="#ca8a04" stopOpacity="1" />
				<stop offset="92%" stopColor="#a16207" stopOpacity="1" />
				<stop offset="100%" stopColor="#78350f" stopOpacity="1" />
			</linearGradient>
			<linearGradient id="dente-shader-gold" href="#gold-crown-gradient" />
			<linearGradient id="dente-implant-gold" href="#gold-crown-gradient" />

			<linearGradient id="gold-ridge-burnish" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#b45309" />
				<stop offset="25%" stopColor="#facc15" />
				<stop offset="50%" stopColor="#fffbeb" />
				<stop offset="75%" stopColor="#f59e0b" />
				<stop offset="100%" stopColor="#92400e" />
			</linearGradient>

			{/* 9. Titanium SLA Threaded Implant Fixture & Abutment Connector */}
			<linearGradient id="titanium-implant-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#1e293b" />
				<stop offset="12%" stopColor="#475569" />
				<stop offset="28%" stopColor="#94a3b8" />
				<stop offset="45%" stopColor="#e2e8f0" />
				<stop offset="55%" stopColor="#ffffff" />
				<stop offset="70%" stopColor="#cbd5e1" />
				<stop offset="88%" stopColor="#475569" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>
			<linearGradient id="dente-shader-titanium-implant" href="#titanium-implant-gradient" />
			<linearGradient id="dente-implant-titanium" href="#titanium-implant-gradient" />

			<linearGradient id="implant-hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#475569" />
				<stop offset="30%" stopColor="#94a3b8" />
				<stop offset="50%" stopColor="#f1f5f9" />
				<stop offset="70%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#334155" />
			</linearGradient>

			<linearGradient id="titanium-abutment-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#334155" />
				<stop offset="20%" stopColor="#64748b" />
				<stop offset="50%" stopColor="#f8fafc" />
				<stop offset="80%" stopColor="#94a3b8" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>

			<linearGradient id="implant-healing-cap-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#cbd5e1" />
				<stop offset="40%" stopColor="#f8fafc" />
				<stop offset="70%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#334155" />
			</linearGradient>

			{/* 10. Gutta-Percha Root Canal Filling with Apical Delta Seal */}
			<linearGradient id="gutta-percha-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#fda4af" />
				<stop offset="20%" stopColor="#fb7185" />
				<stop offset="50%" stopColor="#f43f5e" />
				<stop offset="78%" stopColor="#e11d48" />
				<stop offset="94%" stopColor="#be123c" />
				<stop offset="100%" stopColor="#881337" />
			</linearGradient>
			<linearGradient id="dente-shader-gutta-percha" href="#gutta-percha-gradient" />

			{/* 11. Bioceramic Canal Sealer Gradient */}
			<linearGradient id="bioceramic-canal-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#ccfbf1" />
				<stop offset="30%" stopColor="#5eead4" />
				<stop offset="70%" stopColor="#0d9488" />
				<stop offset="100%" stopColor="#115e59" />
			</linearGradient>
			<linearGradient id="dente-shader-bioceramic" href="#bioceramic-canal-gradient" />

			{/* 12. Fiber Glass Post (Translucent White-Blue Canal Post) */}
			<linearGradient id="fiber-post-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.9" />
				<stop offset="25%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.95" />
				<stop offset="75%" stopColor="#ffffff" stopOpacity="0.98" />
				<stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
			</linearGradient>
			<linearGradient id="dente-shader-fiber-post" href="#fiber-post-gradient" />

			{/* 13. Cast Core Post (Металлический литой штифт) */}
			<linearGradient id="cast-core-post-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#1e293b" />
				<stop offset="20%" stopColor="#475569" />
				<stop offset="50%" stopColor="#f1f5f9" />
				<stop offset="80%" stopColor="#94a3b8" />
				<stop offset="100%" stopColor="#1e293b" />
			</linearGradient>
			<linearGradient id="dente-shader-cast-core" href="#cast-core-post-gradient" />

			{/* 14. Periapical Granuloma / Cyst Radiolucency Halo */}
			<radialGradient id="periapical-lesion-gradient" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.95" />
				<stop offset="25%" stopColor="#991b1b" stopOpacity="0.85" />
				<stop offset="55%" stopColor="#ea580c" stopOpacity="0.55" />
				<stop offset="80%" stopColor="#f97316" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#f97316" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="dente-periapical-halo" href="#periapical-lesion-gradient" />

			{/* 15. Pathology Diagnostics Gradients */}
			<radialGradient id="dente-caries-grad" cx="50%" cy="50%" r="65%">
				<stop offset="0%" stopColor="#f87171" stopOpacity="1" />
				<stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
				<stop offset="85%" stopColor="#dc2626" stopOpacity="1" />
				<stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
			</radialGradient>

			{/* Natural Living Pulp Gradient (Vital Vascular Soft Tissue) */}
			<linearGradient id="dente-pulp-vital-grad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#fda4af" stopOpacity="0.95" />
				<stop offset="35%" stopColor="#fb7185" stopOpacity="0.95" />
				<stop offset="75%" stopColor="#f43f5e" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#e11d48" stopOpacity="0.9" />
			</linearGradient>

			{/* Natural Living Root Canal Lumen Gradient */}
			<linearGradient id="dente-pulp-canal-vital" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#ffe4e6" />
				<stop offset="40%" stopColor="#fda4af" />
				<stop offset="80%" stopColor="#fb7185" />
				<stop offset="100%" stopColor="#f43f5e" />
			</linearGradient>

			{/* Pulpitis Inflammation Gradient (Hyperemic Deep Crimson / Ruby) */}
			<linearGradient id="dente-pulpitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#f87171" stopOpacity="1" />
				<stop offset="30%" stopColor="#ef4444" stopOpacity="1" />
				<stop offset="70%" stopColor="#dc2626" stopOpacity="1" />
				<stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
			</linearGradient>

			<linearGradient id="dente-pulp-canal-neon" href="#dente-pulp-canal-vital" />

			<linearGradient id="dente-periodontitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
				<stop offset="40%" stopColor="#fb923c" stopOpacity="1" />
				<stop offset="80%" stopColor="#ea580c" stopOpacity="1" />
				<stop offset="100%" stopColor="#c2410c" stopOpacity="1" />
			</linearGradient>

			{/* PATTERNS */}
			{/* Composite Micro-hybrid Resin Texture Pattern */}
			<pattern id="composite-resin-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
				<circle cx="2" cy="2" r="0.65" fill="rgba(255, 255, 255, 0.55)" />
				<circle cx="6" cy="6" r="0.75" fill="rgba(13, 148, 136, 0.35)" />
				<circle cx="6" cy="2" r="0.45" fill="rgba(255, 255, 255, 0.4)" />
				<circle cx="2" cy="6" r="0.5" fill="rgba(45, 212, 191, 0.3)" />
				<circle cx="4" cy="4" r="0.35" fill="rgba(255, 255, 255, 0.6)" />
			</pattern>

			{/* Amalgam Burnished Metal Texture Pattern */}
			<pattern id="amalgam-burnish-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
				<circle cx="1.5" cy="1.5" r="0.5" fill="rgba(203, 213, 225, 0.4)" />
				<circle cx="4.5" cy="4.5" r="0.6" fill="rgba(15, 23, 42, 0.45)" />
				<circle cx="4.5" cy="1.5" r="0.35" fill="rgba(148, 163, 184, 0.35)" />
				<circle cx="1.5" cy="4.5" r="0.4" fill="rgba(30, 41, 59, 0.4)" />
			</pattern>

			{/* Implant Crestal Microgrooves Pattern */}
			<pattern id="implant-microgrooves-pattern" width="10" height="2" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0.5" x2="10" y2="0.5" stroke="#94a3b8" strokeWidth="0.5" />
				<line x1="0" y1="1.5" x2="10" y2="1.5" stroke="#334155" strokeWidth="0.5" />
			</pattern>

			{/* Periodontal Bone Loss Resorption Hatch Pattern */}
			<pattern id="bone-loss-hatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0" y2="4" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
			</pattern>

			{/* Primary Tooth Physiological Root Resorption Hatch Pattern (100% Theme Safe) */}
			<pattern id="resorption-hatch-pattern" width="5" height="5" patternTransform="rotate(35 0 0)" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0" y2="5" stroke="var(--odontogram-border-strong, #94a3b8)" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.6" />
			</pattern>
			<pattern id="dente-resorption-hatch" href="#resorption-hatch-pattern" />

			{/* Primary Tooth Root Resorption Soft Transition Gradient */}
			<linearGradient id="resorption-fade-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="1" />
				<stop offset="60%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="0.8" />
				<stop offset="85%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="0.3" />
				<stop offset="100%" stopColor="var(--tooth-root-fill, #f1ede4)" stopOpacity="0" />
			</linearGradient>
			<linearGradient id="dente-resorption-fade" href="#resorption-fade-gradient" />

			{/* FILTERS */}
			{/* Periapical Lesion Soft Feathered Blur Filter */}
			<filter id="periapical-feather-blur" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="3.5" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
			<filter id="dente-periapical-blur" href="#periapical-feather-blur" />

			{/* Metallic Specular Reflection Filter */}
			<filter id="dente-metallic-specular" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
				<feSpecularLighting in="blur" surfaceScale="2" specularConstant="1.2" specularExponent="20" lightingColor="#ffffff" result="specular">
					<fePointLight x="50" y="30" z="100" />
				</feSpecularLighting>
				<feComposite in="SourceGraphic" in2="specular" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
			</filter>

			{/* Glow Filters */}
			<filter id="dente-glow-crimson" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.5" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-teal" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-coral" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-gold" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>

			<filter id="dente-glow-indigo" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
		</defs>
	</svg>
);

const ToothSVG = ({
	number,
	state,
	scale,
	material,
	canalObturation,
	hasPost,
	postType,
	boneLossLevel,
	boneLossType,
	rootResorptionStage,
	periapicalLesion,
	pocketDepth,
	pocketDepthMm,
	maxPocketDepth,
	isSelected,
	selectedTeeth,
	activeStamp,
	onClick,
	onQuickStateChange,
	onResorptionChange,
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
	rootResorptionStage?: RootResorptionStage | number | undefined;
	periapicalLesion?: boolean | undefined;
	pocketDepth?: number | undefined;
	pocketDepthMm?: number | undefined;
	maxPocketDepth?: number | undefined;
	isSelected?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	pediatricMode?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}) => {
	const effectivePocketDepth = pocketDepth ?? pocketDepthMm ?? maxPocketDepth;
	const isTop = number < 30 || (number >= 51 && number <= 65);
	const isPrimary = isPrimaryTooth(number);
	const resorptionVisual = isPrimary && rootResorptionStage !== undefined
		? getPrimaryToothResorptionVisual(number, rootResorptionStage)
		: null;
	const geom = getToothPath(number);
	const cfg = getToothConfig(number);
	const colors = getToothColors(state, material);

	const scaledWidth = scaleCssPx(cfg.width, scale);
	const scaledHeight = scaleCssPx(cfg.height, scale);

	const isRightSide =
		(number >= 21 && number <= 28) ||
		(number >= 31 && number <= 38) ||
		(number >= 61 && number <= 65) ||
		(number >= 71 && number <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const isPeriodontitis = state === "Periodontitis" || periapicalLesion;
	const isEndoTreated = canalObturation !== undefined && canalObturation !== "unfilled";
	const effectiveObturation: CanalObturationMaterial =
		canalObturation ?? "unfilled";

	const boneLossInfo =
		showPeriodontalBoneLoss && (boneLossLevel !== undefined && boneLossLevel > 0)
			? getPeriodontalBoneLevelPath(number, boneLossLevel, boneLossType ?? "horizontal")
			: null;

	const renderImplant = () => (
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
			<title>{`Имплант зуба ${number}`}</title>
			<g className="tooth-group-implant">
				{/* Titanium Threaded Fixture with SLA Microgrooves & Helical Threads */}
				{isTop ? (
					<g className="implant-upper-fixture">
						{/* Tapered Fixture Body */}
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

						{/* Hex Abutment Connector Collar */}
						<polygon points="44,83 56,83 60,86 56,89 44,89 40,86" fill="url(#implant-hex-gradient)" stroke="#475569" strokeWidth="0.8" />
						{/* Golden Transgingival Abutment Collar */}
						<rect x="27" y="83" width="46" height="6" rx="2" fill="url(#gold-crown-gradient)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				) : (
					<g className="implant-lower-fixture">
						{/* Tapered Fixture Body */}
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

						{/* Hex Abutment Connector Collar */}
						<polygon points="44,71 56,71 60,68 56,65 44,65 40,68" fill="url(#implant-hex-gradient)" stroke="#475569" strokeWidth="0.8" />
						{/* Golden Transgingival Abutment Collar */}
						<rect x="27" y="71" width="46" height="6" rx="2" fill="url(#gold-crown-gradient)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				)}

				{/* Restorative Crown on Abutment */}
				<path
					d={geom.crown}
					fill={colors.crownFill}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>

				{/* Planned Surgical Trajectory Guideline if planned */}
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
				<path
					d={geom.crown}
					fill={colors.crownFill}
					fillOpacity={colors.opacity}
					stroke={colors.stroke}
					strokeWidth={colors.isMissing ? "1.4" : "2.2"}
					strokeDasharray={colors.isMissing ? "4 3" : undefined}
					strokeLinejoin="round"
					className="tooth-crown-path"
				/>

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
						stroke={state === "Pulpitis" ? "#991b1b" : "#e11d48"}
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

				{/* Interactive Surfaces (O, V, L/P, M, D) */}
				{useSurfaces && (
					<g
						transform={`translate(${cfg.viewX + cfg.viewWidth / 2 - 12}, ${isTop ? 95 : 35})`}
						stroke="rgba(255,255,255,0.7)"
						strokeWidth="0.5"
						className="tooth-surface-interactive-group"
					>
						{/* O - Occlusal */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность O зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "O");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "O");
								}
							}}
							onMouseEnter={(e) => {
								if (!surfaces?.includes("O")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!surfaces?.includes("O")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
								}
							}}
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
							aria-label={`Поверхность V зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(
									e as unknown as React.MouseEvent,
									number,
									"V",
								);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(
										e as unknown as React.MouseEvent,
										number,
										"V",
									);
								}
							}}
							onMouseEnter={(e) => {
								if (!(surfaces?.includes("V") || surfaces?.includes("B"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!(surfaces?.includes("V") || surfaces?.includes("B"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
								}
							}}
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
							aria-label={`Поверхность ${isTop ? "P" : "L"} зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(
									e as unknown as React.MouseEvent,
									number,
									isTop ? "P" : "L",
								);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(
										e as unknown as React.MouseEvent,
										number,
										isTop ? "P" : "L",
									);
								}
							}}
							onMouseEnter={(e) => {
								if (!(surfaces?.includes("L") || surfaces?.includes("P"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!(surfaces?.includes("L") || surfaces?.includes("P"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
								}
							}}
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
							aria-label={`Поверхность D зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "D");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "D");
								}
							}}
							onMouseEnter={(e) => {
								if (!surfaces?.includes("D")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!surfaces?.includes("D")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
								}
							}}
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
							aria-label={`Поверхность M зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "M");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "M");
								}
							}}
							onMouseEnter={(e) => {
								if (!surfaces?.includes("M")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!surfaces?.includes("M")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
								}
							}}
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
					</g>
				)}
			</g>
		</svg>
	);

	const renderNumberBadge = () => {
		const isLeftMolar = (number >= 16 && number <= 18) || (number >= 46 && number <= 48) || (number >= 54 && number <= 55) || (number >= 84 && number <= 85);
		const isRightMolar = (number >= 26 && number <= 28) || (number >= 36 && number <= 38) || (number >= 64 && number <= 65) || (number >= 74 && number <= 75);
		const hudAlignClass = isLeftMolar
			? "left-0"
			: isRightMolar
			? "right-0"
			: "left-1/2 -translate-x-1/2";

		return (
			<div className="relative flex flex-col items-center group/badge">
				{/* Hover Quick Action Micro-HUD (Clinical Russian Presets) when no global stamp is active */}
				{!activeStamp && onQuickStateChange && (
					<div
						className={`tooth-hover-quick-hud absolute ${hudAlignClass} opacity-0 group-hover:opacity-100 group-hover/badge:opacity-100 transition-all duration-200 z-40 flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[var(--odontogram-paper)]/95 border border-[var(--odontogram-border-strong)] shadow-2xl backdrop-blur-xl pointer-events-auto whitespace-nowrap ${
							isTop ? "bottom-full mb-2" : "top-full mt-2"
						}`}
						onClick={(e) => e.stopPropagation()}
					>
						{isPrimary ? (
							<>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Caries", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Кариес молочного зуба"
									data-testid={`quick-caries-${number}`}
								>
									<span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-xs" />
									<span>Кариес</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Pulpitis", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Витальная пульпотомия молочного зуба (Biodentine/MTA)"
									data-testid={`quick-pulpotomy-${number}`}
								>
									<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-xs" />
									<span>Пульпотомия</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Filled", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.15))] hover:bg-[var(--teal)] text-[var(--teal)] hover:text-[var(--on-teal,#ffffff)] border border-[var(--teal)]/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Пломба стеклоиономерным цементом (СИЦ / Композит)"
									data-testid={`quick-filled-${number}`}
								>
									<span className="w-2 h-2 rounded-full bg-[var(--teal)] inline-block shadow-xs" />
									<span>Пломба / СИЦ</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Crown", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-[var(--brand-500,#3b82f6)]/15 hover:bg-[var(--brand-500,#3b82f6)] text-[var(--brand-500,#3b82f6)] hover:text-white border border-[var(--brand-500,#3b82f6)]/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Эстетическая циркониевая коронка NuSmile / 3M"
									data-testid={`quick-nusmile-${number}`}
								>
									<span className="w-2 h-2 rounded-full bg-[var(--brand-500,#3b82f6)] inline-block shadow-xs" />
									<span>Коронка NuSmile</span>
								</button>
								{onResorptionChange && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
											const currentStage = (rootResorptionStage ?? 0) as RootResorptionStage;
											const stages: RootResorptionStage[] = [0, 25, 50, 75, 100];
											const nextIdx = (stages.indexOf(currentStage) + 1) % stages.length;
											const nextStage = stages[nextIdx] ?? 0;
											onResorptionChange(targets, nextStage);
										}}
										className="px-2.5 py-1 min-h-[34px] rounded-lg bg-orange-500/15 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
										title={`Сменить стадию физиологической резорбции корня (текущая: ${rootResorptionStage ?? 0}%)`}
										data-testid={`quick-resorption-${number}`}
									>
										<span className="w-2 h-2 rounded-full bg-orange-500 inline-block shadow-xs" />
										<span>Резорбция {rootResorptionStage ? `${rootResorptionStage}%` : "R+"}</span>
									</button>
								)}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Missing", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-slate-500/15 hover:bg-slate-600 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Физиологическая смена зуба (выпал / эксфолиация)"
									data-testid={`quick-exfoliated-${number}`}
								>
									<span className="w-2 h-2 rounded-full bg-slate-500 inline-block shadow-xs" />
									<span>Смена (Выпал)</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Healthy", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Здоровый интактный молочный зуб"
									data-testid={`quick-healthy-${number}`}
								>
									<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs" />
									<span>Здоров</span>
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Caries", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Кариес"
								>
									<span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-xs" />
									<span>Кариес</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Filled", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.15))] hover:bg-[var(--teal)] text-[var(--teal)] hover:text-[var(--on-teal,#ffffff)] border border-[var(--teal)]/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Пломба"
								>
									<span className="w-2 h-2 rounded-full bg-[var(--teal)] inline-block shadow-xs" />
									<span>Пломба</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Pulpitis", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Пульпит"
								>
									<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-xs" />
									<span>Пульпит</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Crown", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-[var(--brand-500,#3b82f6)]/15 hover:bg-[var(--brand-500,#3b82f6)] text-[var(--brand-500,#3b82f6)] hover:text-white border border-[var(--brand-500,#3b82f6)]/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Коронка"
								>
									<span className="w-2 h-2 rounded-full bg-[var(--brand-500,#3b82f6)] inline-block shadow-xs" />
									<span>Коронка</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Missing", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-red-600/15 hover:bg-red-600 text-red-800 dark:text-red-300 hover:text-white border border-red-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Удален"
								>
									<span className="w-2 h-2 rounded-full bg-red-600 inline-block shadow-xs" />
									<span>Удален</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
										onQuickStateChange(targets, "Healthy", surfaces);
									}}
									className="px-2.5 py-1 min-h-[34px] rounded-lg bg-slate-500/15 hover:bg-slate-500 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 touch-manipulation"
									title="Здоров (Интактный)"
								>
									<span className="w-2 h-2 rounded-full bg-slate-400 inline-block shadow-xs" />
									<span>Здоров</span>
								</button>
							</>
						)}
					</div>
				)}

			<span
				className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
				style={{ fontSize: "12px" }}
			>
				<span
					className="tooth-status-dot"
					style={{ backgroundColor: colors.badgeColor }}
				/>
				<span className="tooth-number-text font-black">{number}</span>
				{resorptionVisual && resorptionVisual.stage > 0 && (
					<span
						className="ml-1 px-1 py-0.5 rounded text-[10px] font-black leading-none shadow-2xs"
						style={{
							backgroundColor: resorptionVisual.badgeBg,
							color: resorptionVisual.badgeColor,
						}}
						title={`Физиологическая резорбция корня: ${resorptionVisual.badgeText} (${resorptionVisual.descriptionRu})`}
						data-testid={`resorption-badge-${number}`}
					>
						R{resorptionVisual.stage}%
					</span>
				)}
				{effectivePocketDepth !== undefined && effectivePocketDepth > 4 && (
					<span
						className={`ml-1 px-1.5 py-0.5 rounded text-xs font-black text-white shadow-2xs leading-none ${
							effectivePocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
						}`}
						title={`Пародонтальный карман ${effectivePocketDepth} мм (Риск пародонтита K05.3)`}
					>
						P{effectivePocketDepth}
					</span>
				)}
			</span>
		</div>
	);
};

	return (
		<button
			type="button"
			className={`tooth-svg-wrapper group ${isTop ? "top" : "bottom"} ${
				isSelected ? "selected ring-2 ring-indigo-500/70" : ""
			}`}
			data-tooth-id={number}
			title={`${getToothFolkAndAnatomicalNameRu(number)} — Статус: ${TOOTH_STATE_LABELS[state]}`}
			aria-label={`${getToothFolkAndAnatomicalNameRu(number)}, статус: ${TOOTH_STATE_LABELS[state]}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={(e) => {
				if (activeStamp && onQuickStateChange) {
					const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
					onQuickStateChange(targets, activeStamp, surfaces);
					return;
				}
				onClick(e, number);
			}}
			onKeyDown={(e) => {
				// 1. Space: Fast toggle Healthy <-> Caries
				if (e.key === " " || e.code === "Space") {
					e.preventDefault();
					if (onQuickStateChange) {
						const targets =
							selectedTeeth?.includes(number) && selectedTeeth.length > 0
								? selectedTeeth
								: [number];
						const nextState: ToothState = state === "Caries" ? "Healthy" : "Caries";
						const nextSurfaces =
							nextState === "Healthy"
								? []
								: surfaces && surfaces.length > 0
									? surfaces
									: ["O"];
						onQuickStateChange(targets, nextState, nextSurfaces);
					}
					return;
				}

				// 2. Enter: Confirm and advance focus to next tooth
				if (e.key === "Enter") {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(number, "right", pediatricMode);
					const nextEl = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${nextTooth}"]`,
					);
					nextEl?.focus();
					return;
				}

				// 3. Arrow keys navigation (Left/Right/Up/Down/Home/End)
				if (
					e.key === "ArrowLeft" ||
					e.key === "ArrowRight" ||
					e.key === "ArrowUp" ||
					e.key === "ArrowDown" ||
					e.key === "Home" ||
					e.key === "End"
				) {
					e.preventDefault();
					const dirMap: Record<
						string,
						"left" | "right" | "up" | "down" | "home" | "end"
					> = {
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
						const nextEl = document.querySelector<HTMLButtonElement>(
							`[data-tooth-id="${nextTooth}"]`,
						);
						nextEl?.focus();
					}
					return;
				}

				// 4. Number keys 1..5 / Numpad 1..5 for surfaces (O, M, D, V, L)
				const surfaceMap: Record<string, string> = {
					"1": "O",
					"2": "M",
					"3": "D",
					"4": "V",
					"5": "L",
					Numpad1: "O",
					Numpad2: "M",
					Numpad3: "D",
					Numpad4: "V",
					Numpad5: "L",
				};
				const surfaceToToggle = surfaceMap[e.key] || surfaceMap[e.code];
				if (surfaceToToggle && onQuickStateChange) {
					e.preventDefault();
					const currSurfaces = surfaces ?? [];
					const nextSurfaces = currSurfaces.includes(surfaceToToggle)
						? currSurfaces.filter((s) => s !== surfaceToToggle)
						: [...currSurfaces, surfaceToToggle];
					const targets =
						selectedTeeth?.includes(number) && selectedTeeth.length > 0
							? selectedTeeth
							: [number];
					const nextState: ToothState =
						nextSurfaces.length > 0
							? state === "Healthy"
								? "Caries"
								: state
							: state === "Caries"
								? "Healthy"
								: state;
					onQuickStateChange(targets, nextState, nextSurfaces);
					return;
				}

				// 5. 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З)
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState && onQuickStateChange) {
					e.preventDefault();
					const targets =
						selectedTeeth?.includes(number) && selectedTeeth.length > 0
							? selectedTeeth
							: [number];
					onQuickStateChange(targets, quickState, surfaces);
				}
			}}
		>
			{isTop && renderNumberBadge()}
			{state === "Implant" || state === "Planned_Implant"
				? renderImplant()
				: renderStandard()}
			{!isTop && renderNumberBadge()}
		</button>
	);
};

export const SurfaceSelector = ({
	selected,
	onChange,
	size = 100,
	disabled = false,
}: {
	selected: string[];
	onChange: (newSelected: string[]) => void;
	size?: number;
	disabled?: boolean;
}) => {
	const toggle = (surface: string) => {
		if (disabled) return;
		if (selected.includes(surface)) {
			onChange(selected.filter((s) => s !== surface));
		} else {
			onChange([...selected, surface]);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center">
			<svg
				width={size}
				height={size}
				viewBox="0 0 100 100"
				className={`drop-shadow-md group ${
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
				}`}
				role="img"
				aria-label="Поверхности зуба"
			>
				<title>Поверхности зуба</title>
				{/* Top (B/V - Вестибулярная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="0,0 100,0 70,30 30,30"
					fill={
						selected.includes("B") || selected.includes("V")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("B") || selected.includes("V")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("V")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("V");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="18"
					fill={
						selected.includes("B") || selected.includes("V")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					V
				</text>

				{/* Bottom (L/P - Язычная/Нёбная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="30,70 70,70 100,100 0,100"
					fill={
						selected.includes("L") || selected.includes("P")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("L") || selected.includes("P")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("L")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("L");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="90"
					fill={
						selected.includes("L") || selected.includes("P")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					L
				</text>

				{/* Left (M - Мезиальная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="0,0 30,30 30,70 0,100"
					fill={
						selected.includes("M")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("M")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("M")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("M");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="12"
					y="54"
					fill={
						selected.includes("M") ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					M
				</text>

				{/* Right (D - Дистальная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="100,0 70,30 70,70 100,100"
					fill={
						selected.includes("D")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("D")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("D")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("D");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="88"
					y="54"
					fill={
						selected.includes("D") ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					D
				</text>

				{/* Center (O - Окклюзионная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="30,30 70,30 70,70 30,70"
					fill={
						selected.includes("O")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("O")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("O")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("O");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="54"
					fill={
						selected.includes("O") ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					O
				</text>
			</svg>
		</div>
	);
};

/**
 * Splits teeth row into left & right halves at midline for quadrant alignment.
 */
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

export function getQuadrantTeeth(
	quadrant: OdontogramQuadrantId,
	topTeeth: number[],
	bottomTeeth: number[],
	pediatricMode?: boolean,
): number[] {
	const topSplit = splitArchAtMidline(topTeeth);
	const bottomSplit = splitArchAtMidline(bottomTeeth);
	switch (quadrant) {
		case "Q1":
		case "Q5":
			return topSplit.left;
		case "Q2":
		case "Q6":
			return topSplit.right;
		case "Q4":
		case "Q8":
			return bottomSplit.left;
		case "Q3":
		case "Q7":
			return bottomSplit.right;
		default:
			return [...topTeeth, ...bottomTeeth];
	}
}

export const ToothChart: React.FC<ToothChartProps> = ({
	teethData = [],
	pediatricMode,
	mixedDentition,
	dentitionMode,
	onDentitionModeChange,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp = null,
	onToothClick,
	onQuickStateChange,
	onResorptionChange,
	useSurfaces,
	hideHeader = false,
	hideLegend = false,
	hideQuadrantSwitcher = false,
	hideDentitionSwitcher = false,
	showPulpAndCanals = false,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
	activeQuadrant: controlledQuadrant,
	onQuadrantChange,
	className = "",
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);
	const [archScale, setArchScale] = useState(1);
	const appliedArchScaleRef = useRef(1);

	const [localDentitionMode, setLocalDentitionMode] = useState<DentitionMode>(
		dentitionMode ?? (mixedDentition ? "mixed" : pediatricMode ? "pediatric" : "adult"),
	);
	const effectiveDentitionMode = dentitionMode ?? localDentitionMode;

	useEffect(() => {
		if (dentitionMode !== undefined) {
			setLocalDentitionMode(dentitionMode);
		} else if (mixedDentition) {
			setLocalDentitionMode("mixed");
		} else if (pediatricMode) {
			setLocalDentitionMode("pediatric");
		}
	}, [dentitionMode, mixedDentition, pediatricMode]);

	const isPediatricEffective = effectiveDentitionMode === "pediatric";
	const isMixedEffective = effectiveDentitionMode === "mixed";

	const [localQuadrant, setLocalQuadrant] = useState<OdontogramQuadrantId>(
		controlledQuadrant ?? "all",
	);
	const currentQuadrant = controlledQuadrant ?? localQuadrant;

	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		setLocalQuadrant(q);
		onQuadrantChange?.(q);
	};

	const handleSelectDentitionMode = (mode: DentitionMode) => {
		setLocalDentitionMode(mode);
		onDentitionModeChange?.(mode);
		if (currentQuadrant !== "all") {
			if (mode === "pediatric" && !["Q5", "Q6", "Q7", "Q8"].includes(currentQuadrant)) {
				handleSelectQuadrant("Q5");
			} else if (mode === "adult" && !["Q1", "Q2", "Q3", "Q4"].includes(currentQuadrant)) {
				handleSelectQuadrant("Q1");
			}
		}
	};

	useEffect(() => {
		if (controlledQuadrant !== undefined) {
			setLocalQuadrant(controlledQuadrant);
		}
	}, [controlledQuadrant]);

	const topTeethList =
		customTopTeeth ??
		(isMixedEffective
			? MIXED_TOP_TEETH
			: isPediatricEffective
				? PEDIATRIC_TOP_TEETH
				: TOP_TEETH);
	const bottomTeethList =
		customBottomTeeth ??
		(isMixedEffective
			? MIXED_BOTTOM_TEETH
			: isPediatricEffective
				? PEDIATRIC_BOTTOM_TEETH
				: BOTTOM_TEETH);

	/**
	 * Подгоняет дугу под фактическую ширину контейнера.
	 */
	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const element = archContainerRef.current;
			if (!element) return;
			// 16px safety buffer for container inner padding
			const available = Math.max(0, element.clientWidth - 16);
			const row = element.querySelector<HTMLElement>(".teeth-row");
			if (!available || !row) return;

			const applied = appliedArchScaleRef.current;
			const naturalWidth = row.scrollWidth / applied;
			if (!Number.isFinite(naturalWidth) || naturalWidth <= 0) return;

			const isQuadrantView = currentQuadrant !== "all";
			const minScale = isQuadrantView ? 0.75 : MIN_ARCH_SCALE;
			const next = Math.min(
				1.75,
				Math.max(minScale, available / naturalWidth),
			);
			if (Math.abs(applied - next) < 0.005) return;
			appliedArchScaleRef.current = next;
			setArchScale(next);
		};

		recalculate();
		const observer = new ResizeObserver(recalculate);
		observer.observe(element);
		return () => observer.disconnect();
	}, [currentQuadrant]);

	const digitBufferRef = useRef<{ buffer: string; timer: any }>({
		buffer: "",
		timer: null,
	});

	// High-speed keyboard triggers: instant 1-key assigning and digit/arrow navigation without mouse
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

			// 1. Hotkey status assignment for selected teeth
			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					const singleTooth =
						selectedTeeth.length === 1
							? (teethData ?? []).find((t) => t.toothNumber === selectedTeeth[0])
							: undefined;
					onQuickStateChange(selectedTeeth, quickState, singleTooth?.surfaces);
					return;
				}
			}

			// 2. Digit 1-8 tooth navigation (Quadrant-aware & 2-digit FDI typing)
			if (/^[1-8]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
				const digit = Number.parseInt(e.key, 10);
				const firstTooth = selectedTeeth[0];

				if (digitBufferRef.current.timer) {
					clearTimeout(digitBufferRef.current.timer);
				}

				const prevBuffer = digitBufferRef.current.buffer;
				if (prevBuffer.length === 1) {
					const firstDigit = Number.parseInt(prevBuffer, 10);
					const fdiCandidate = firstDigit * 10 + digit;
					digitBufferRef.current.buffer = "";
					if (currentQuadrant !== "all") {
						const targetQuad = getQuadrantForTooth(fdiCandidate, pediatricMode);
						if (targetQuad !== currentQuadrant) {
							handleSelectQuadrant(targetQuad);
						}
					}
					const targetBtn = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${fdiCandidate}"]`,
					);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
						return;
					}
				}

				const quadrant = firstTooth ? Math.floor(firstTooth / 10) : 1;
				const isPediatricQuad = quadrant >= 5 && quadrant <= 8;
				if (!isPediatricQuad || digit <= 5) {
					const targetTooth = quadrant * 10 + digit;
					if (currentQuadrant !== "all") {
						const targetQuad = getQuadrantForTooth(targetTooth, pediatricMode);
						if (targetQuad !== currentQuadrant) {
							handleSelectQuadrant(targetQuad);
						}
					}
					const targetBtn = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${targetTooth}"]`,
					);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
					}
				}

				digitBufferRef.current.buffer = e.key;
				digitBufferRef.current.timer = setTimeout(() => {
					digitBufferRef.current.buffer = "";
				}, 750);
				return;
			}

			// 3. Arrow Keys navigation (Left, Right, Up, Down, Home, End)
			const firstTooth = selectedTeeth[0];
			if (firstTooth !== undefined) {
				const dirMap: Record<
					string,
					"left" | "right" | "up" | "down" | "home" | "end"
				> = {
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
					if (currentQuadrant !== "all") {
						const nextQuad = getQuadrantForTooth(nextTooth, pediatricMode);
						if (nextQuad !== currentQuadrant) {
							handleSelectQuadrant(nextQuad);
						}
					}
					const nextEl = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${nextTooth}"]`,
					);
					if (nextEl) {
						nextEl.focus();
						nextEl.click();
					}
				}
			} else if (
				e.key === "ArrowLeft" ||
				e.key === "ArrowRight" ||
				e.key === "ArrowUp" ||
				e.key === "ArrowDown"
			) {
				// If nothing is selected, focus first tooth (18 or 11 or active quadrant first tooth)
				e.preventDefault();
				const initialTooth = pediatricMode ? 55 : 18;
				const initialEl = document.querySelector<HTMLButtonElement>(
					`[data-tooth-id="${initialTooth}"]`,
				);
				if (initialEl) {
					initialEl.focus();
					initialEl.click();
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [selectedTeeth, onQuickStateChange, pediatricMode, teethData, currentQuadrant]);

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

	const isQuadrantView = currentQuadrant !== "all";
	const activeQuadrantTeeth = isQuadrantView
		? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, pediatricMode)
		: [];
	const isTopQuadrant = isQuadrantTop(currentQuadrant);

	return (
		<div className={`tooth-chart-container ${className}`.trim()} ref={containerRef}>
			{/* Shared SVG Shaders & Gradients */}
			<DenteToothSvgDefs />

			{/* Responsive Dentition Formula Switcher (Adult 11–48 / Pediatric 51–85 / Mixed 24) */}
			{!hideDentitionSwitcher && (
				<div
					className="odontogram-dentition-switcher mb-2.5 select-none"
					data-testid="odontogram-dentition-switcher"
				>
					<div className="flex items-center justify-between gap-1 p-1 rounded-2xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] shadow-xs">
						<div
							className="flex items-center gap-1 w-full"
							role="tablist"
							aria-label="Переключение зубной формулы"
						>
							<button
								type="button"
								role="tab"
								aria-selected={effectiveDentitionMode === "adult"}
								onClick={() => handleSelectDentitionMode("adult")}
								className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
									effectiveDentitionMode === "adult"
										? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-md border border-[var(--teal-dark,var(--teal))] font-black"
										: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)] border border-transparent"
								}`}
								data-testid="dentition-mode-adult-btn"
								title="Постоянный прикус взрослых (11–48, 32 зуба)"
							>
								<span>Постоянный 11–48</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-black/15 font-mono font-black">
									32
								</span>
							</button>

							<button
								type="button"
								role="tab"
								aria-selected={effectiveDentitionMode === "pediatric"}
								onClick={() => handleSelectDentitionMode("pediatric")}
								className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
									effectiveDentitionMode === "pediatric"
										? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-md border border-[var(--teal-dark,var(--teal))] font-black"
										: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)] border border-transparent"
								}`}
								data-testid="dentition-mode-pediatric-btn"
								title="Детский молочный прикус (51–85, 20 зубов)"
							>
								<span>Молочный 51–85</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-black/15 font-mono font-black">
									20
								</span>
							</button>

							<button
								type="button"
								role="tab"
								aria-selected={effectiveDentitionMode === "mixed"}
								onClick={() => handleSelectDentitionMode("mixed")}
								className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
									effectiveDentitionMode === "mixed"
										? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-md border border-[var(--teal-dark,var(--teal))] font-black"
										: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)] border border-transparent"
								}`}
								data-testid="dentition-mode-mixed-btn"
								title="Сменный прикус: молочные зубы + первые постоянные моляры (16, 26, 36, 46)"
							>
								<span>Сменный прикус</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-black/15 font-mono font-black">
									24
								</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Responsive Mobile & Desktop Quadrant Adapter Bar (Compact Space-Efficient) */}
			{!hideQuadrantSwitcher && (
				<div className="odontogram-quadrant-bar mb-2 select-none" data-testid="odontogram-quadrant-bar">
					<div className="flex items-center gap-1.5 flex-wrap w-full">
						<button
							type="button"
							onClick={() => handleSelectQuadrant("all")}
							className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer select-none shrink-0 ${
								currentQuadrant === "all"
									? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:bg-[var(--odontogram-surface-hover)]"
							}`}
							title="Показать полную зубную формулу"
							data-testid="quadrant-btn-all"
						>
							Все зубы ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})
						</button>

						<div className="h-4 w-px bg-[var(--odontogram-border)] mx-0.5 hidden sm:block" />

						{/* Quadrant buttons in a sleek inline strip */}
						<div className="grid grid-cols-2 sm:flex sm:flex-row gap-1.5 flex-1 min-w-0">
							{/* Upper Right Quadrant: Q1 18–11 (or Q5 55–51) */}
							<button
								type="button"
								onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q5" : "Q1")}
								className={`quadrant-btn min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer select-none ${
									currentQuadrant === (isPediatricEffective ? "Q5" : "Q1")
										? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
										: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
								}`}
								title={isPediatricEffective ? "Q5 55–51 (Верхняя челюсть, Правый)" : "Q1 18–11 (Верхняя челюсть, Правый)"}
								data-testid={isPediatricEffective ? "quadrant-btn-Q5" : "quadrant-btn-Q1"}
							>
								<span className="font-extrabold truncate">{isPediatricEffective ? "Q5 55–51" : "Q1 18–11"}</span>
								<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black uppercase">ВЧ·П</span>
							</button>

							{/* Upper Left Quadrant: Q2 21–28 (or Q6 61–65) */}
							<button
								type="button"
								onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q6" : "Q2")}
								className={`quadrant-btn min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer select-none ${
									currentQuadrant === (isPediatricEffective ? "Q6" : "Q2")
										? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
										: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
								}`}
								title={isPediatricEffective ? "Q6 61–65 (Верхняя челюсть, Левый)" : "Q2 21–28 (Верхняя челюсть, Левый)"}
								data-testid={isPediatricEffective ? "quadrant-btn-Q6" : "quadrant-btn-Q2"}
							>
								<span className="font-extrabold truncate">{isPediatricEffective ? "Q6 61–65" : "Q2 21–28"}</span>
								<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black uppercase">ВЧ·Л</span>
							</button>

							{/* Lower Right Quadrant: Q4 48–41 (or Q8 85–81) */}
							<button
								type="button"
								onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q8" : "Q4")}
								className={`quadrant-btn min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer select-none ${
									currentQuadrant === (isPediatricEffective ? "Q8" : "Q4")
										? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
										: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
								}`}
								title={isPediatricEffective ? "Q8 85–81 (Нижняя челюсть, Правый)" : "Q4 48–41 (Нижняя челюсть, Правый)"}
								data-testid={isPediatricEffective ? "quadrant-btn-Q8" : "quadrant-btn-Q4"}
							>
								<span className="font-extrabold truncate">{isPediatricEffective ? "Q8 85–81" : "Q4 48–41"}</span>
								<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black uppercase">НЧ·П</span>
							</button>

							{/* Lower Left Quadrant: Q3 31–38 (or Q7 71–75) */}
							<button
								type="button"
								onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q7" : "Q3")}
								className={`quadrant-btn min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer select-none ${
									currentQuadrant === (isPediatricEffective ? "Q7" : "Q3")
										? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
										: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
								}`}
								title={isPediatricEffective ? "Q7 71–75 (Нижняя челюсть, Левый)" : "Q3 31–38 (Нижняя челюсть, Левый)"}
								data-testid={isPediatricEffective ? "quadrant-btn-Q7" : "quadrant-btn-Q3"}
							>
								<span className="font-extrabold truncate">{isPediatricEffective ? "Q7 71–75" : "Q3 31–38"}</span>
								<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black uppercase">НЧ·Л</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{!hideLegend && (
				<div className="tooth-chart-legend-row">
					<div className="tooth-chart-legend">
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" /> Кариес
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> {isPediatricEffective ? "Пульпотомия / Пульпит" : "Пульпит"}
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> Периодонтит
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)] shadow-sm" /> {isPediatricEffective ? "Пломба (СИЦ / Композит)" : "Пломба"}
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-500,#3b82f6)] shadow-sm" /> {isPediatricEffective ? "Коронка NuSmile / 3M" : "Коронка"}
						</span>
						{!isPediatricEffective && (
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" /> Имплант
							</span>
						)}
						{!isPediatricEffective && (
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-indigo-400 border border-indigo-500" /> План
							</span>
						)}
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-50" /> {isPediatricEffective ? "Смена (Выпал)" : "Отсутствует"}
						</span>
						{(isPediatricEffective || isMixedEffective) && (
							<span className="tooth-chart-legend-item" title="Физиологическая резорбция корней молочных зубов">
								<span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Резорбция (25–100%)
							</span>
						)}
					</div>
				</div>
			)}

			<div className="tooth-chart-arch-container" ref={archContainerRef}>
				{isQuadrantView ? (
					/* Focused Single Quadrant Large Mobile View (8 teeth with touch hit targets >= 48x48px) */
					<div
						className="tooth-chart-arch-wrapper quadrant-view-wrapper"
						data-testid="quadrant-focused-view"
						style={{
							minWidth: "max-content",
							margin: "0 auto",
							position: "relative",
						}}
					>
						<div className="flex items-center justify-between w-full max-w-lg px-3 py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] mb-2">
							<button
								type="button"
								onClick={() => handleSelectQuadrant(getAdjacentQuadrant(currentQuadrant, "prev", pediatricMode))}
								className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center gap-1 cursor-pointer transition-colors"
								title="Предыдущий квадрант"
								data-testid="quadrant-prev-btn"
							>
								← Пред.
							</button>
							<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink)] text-center px-2">
								{getQuadrantTitle(currentQuadrant, pediatricMode)}
							</span>
							<button
								type="button"
								onClick={() => handleSelectQuadrant(getAdjacentQuadrant(currentQuadrant, "next", pediatricMode))}
								className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center gap-1 cursor-pointer transition-colors"
								title="Следующий квадрант"
								data-testid="quadrant-next-btn"
							>
								След. →
							</button>
						</div>

						<div className={`teeth-row ${isTopQuadrant ? "top-row" : "bottom-row"} quadrant-row`}>
							<div className="tooth-quadrant-group focused-quadrant-group">
								{activeQuadrantTeeth.map((num) => {
									const tData = (teethData ?? []).find((t) => t.toothNumber === num);
									return (
										<ToothSVG
											key={num}
											number={num}
											scale={Math.max(0.85, archScale)}
											state={tData ? tData.state : "Healthy"}
											material={tData?.material}
											canalObturation={tData?.canalObturation}
											hasPost={tData?.hasPost}
											postType={tData?.postType}
											boneLossLevel={tData?.boneLossLevel}
											boneLossType={tData?.boneLossType}
											rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
											periapicalLesion={tData?.periapicalLesion}
											pocketDepth={tData?.pocketDepth}
											pocketDepthMm={tData?.pocketDepthMm}
											maxPocketDepth={tData?.maxPocketDepth}
											surfaces={tData?.surfaces}
											useSurfaces={useSurfaces}
											showPulpAndCanals={showPulpAndCanals}
											showPeriapicalHalos={showPeriapicalHalos}
											showPeriodontalBoneLoss={showPeriodontalBoneLoss}
											isSelected={selectedTeeth.includes(num)}
											selectedTeeth={selectedTeeth}
											activeStamp={activeStamp}
											onClick={handleToothClick}
											onQuickStateChange={onQuickStateChange}
											onResorptionChange={onResorptionChange}
											pediatricMode={isPediatricEffective}
										/>
									);
								})}
							</div>
						</div>
					</div>
				) : (
					/* Full Dual-Arch View (All 32 adult teeth, 20 pediatric teeth, or 24 mixed dentition teeth) */
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
							{/* Left Half (Q1: 18..11 or Q5: 55..51) */}
							<div className="tooth-quadrant-group top-left-quad">
								{topSplit.left.map((num) => {
									const tData = (teethData ?? []).find((t) => t.toothNumber === num);
									return (
										<ToothSVG
											key={num}
											number={num}
											scale={archScale}
											state={tData ? tData.state : "Healthy"}
											material={tData?.material}
											canalObturation={tData?.canalObturation}
											hasPost={tData?.hasPost}
											postType={tData?.postType}
											boneLossLevel={tData?.boneLossLevel}
											boneLossType={tData?.boneLossType}
											rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
											periapicalLesion={tData?.periapicalLesion}
											pocketDepth={tData?.pocketDepth}
											pocketDepthMm={tData?.pocketDepthMm}
											maxPocketDepth={tData?.maxPocketDepth}
											surfaces={tData?.surfaces}
											useSurfaces={useSurfaces}
											showPulpAndCanals={showPulpAndCanals}
											showPeriapicalHalos={showPeriapicalHalos}
											showPeriodontalBoneLoss={showPeriodontalBoneLoss}
											isSelected={selectedTeeth.includes(num)}
											selectedTeeth={selectedTeeth}
											activeStamp={activeStamp}
											onClick={handleToothClick}
											onQuickStateChange={onQuickStateChange}
											onResorptionChange={onResorptionChange}
											pediatricMode={isPediatricEffective}
										/>
									);
								})}
							</div>

							{/* Midline Vertical Guide Line Notch */}
							<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
								<div className="midline-notch" />
							</div>

							{/* Right Half (Q2: 21..28 or Q6: 61..65) */}
							<div className="tooth-quadrant-group top-right-quad">
								{topSplit.right.map((num) => {
									const tData = (teethData ?? []).find((t) => t.toothNumber === num);
									return (
										<ToothSVG
											key={num}
											number={num}
											scale={archScale}
											state={tData ? tData.state : "Healthy"}
											material={tData?.material}
											canalObturation={tData?.canalObturation}
											hasPost={tData?.hasPost}
											postType={tData?.postType}
											boneLossLevel={tData?.boneLossLevel}
											boneLossType={tData?.boneLossType}
											rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
											periapicalLesion={tData?.periapicalLesion}
											pocketDepth={tData?.pocketDepth}
											pocketDepthMm={tData?.pocketDepthMm}
											maxPocketDepth={tData?.maxPocketDepth}
											surfaces={tData?.surfaces}
											useSurfaces={useSurfaces}
											showPulpAndCanals={showPulpAndCanals}
											showPeriapicalHalos={showPeriapicalHalos}
											showPeriodontalBoneLoss={showPeriodontalBoneLoss}
											isSelected={selectedTeeth.includes(num)}
											selectedTeeth={selectedTeeth}
											activeStamp={activeStamp}
											onClick={handleToothClick}
											onQuickStateChange={onQuickStateChange}
											onResorptionChange={onResorptionChange}
											pediatricMode={isPediatricEffective}
										/>
									);
								})}
							</div>
						</div>

						{/* Horizontal Occlusal Arch Divider */}
						<div className="teeth-divider">
							<div className="divider-line" />
							<div className="divider-center" title="Центр окклюзионной плоскости">
								<div className="divider-diamond" />
							</div>
						</div>

						{/* Lower Arch (Mandible) */}
						<div className="teeth-row bottom-row">
							{/* Left Half (Q4: 48..41 or Q8: 85..81) */}
							<div className="tooth-quadrant-group bottom-left-quad">
								{bottomSplit.left.map((num) => {
									const tData = (teethData ?? []).find((t) => t.toothNumber === num);
									return (
										<ToothSVG
											key={num}
											number={num}
											scale={archScale}
											state={tData ? tData.state : "Healthy"}
											material={tData?.material}
											canalObturation={tData?.canalObturation}
											hasPost={tData?.hasPost}
											postType={tData?.postType}
											boneLossLevel={tData?.boneLossLevel}
											boneLossType={tData?.boneLossType}
											rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
											periapicalLesion={tData?.periapicalLesion}
											pocketDepth={tData?.pocketDepth}
											pocketDepthMm={tData?.pocketDepthMm}
											maxPocketDepth={tData?.maxPocketDepth}
											surfaces={tData?.surfaces}
											useSurfaces={useSurfaces}
											showPulpAndCanals={showPulpAndCanals}
											showPeriapicalHalos={showPeriapicalHalos}
											showPeriodontalBoneLoss={showPeriodontalBoneLoss}
											isSelected={selectedTeeth.includes(num)}
											selectedTeeth={selectedTeeth}
											activeStamp={activeStamp}
											onClick={handleToothClick}
											onQuickStateChange={onQuickStateChange}
											onResorptionChange={onResorptionChange}
											pediatricMode={isPediatricEffective}
										/>
									);
								})}
							</div>

							{/* Midline Vertical Guide Line Notch */}
							<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
								<div className="midline-notch" />
							</div>

							{/* Right Half (Q3: 31..38 or Q7: 71..75) */}
							<div className="tooth-quadrant-group bottom-right-quad">
								{bottomSplit.right.map((num) => {
									const tData = (teethData ?? []).find((t) => t.toothNumber === num);
									return (
										<ToothSVG
											key={num}
											number={num}
											scale={archScale}
											state={tData ? tData.state : "Healthy"}
											material={tData?.material}
											canalObturation={tData?.canalObturation}
											hasPost={tData?.hasPost}
											postType={tData?.postType}
											boneLossLevel={tData?.boneLossLevel}
											boneLossType={tData?.boneLossType}
											rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
											periapicalLesion={tData?.periapicalLesion}
											pocketDepth={tData?.pocketDepth}
											pocketDepthMm={tData?.pocketDepthMm}
											maxPocketDepth={tData?.maxPocketDepth}
											surfaces={tData?.surfaces}
											useSurfaces={useSurfaces}
											showPulpAndCanals={showPulpAndCanals}
											showPeriapicalHalos={showPeriapicalHalos}
											showPeriodontalBoneLoss={showPeriodontalBoneLoss}
											isSelected={selectedTeeth.includes(num)}
											selectedTeeth={selectedTeeth}
											activeStamp={activeStamp}
											onClick={handleToothClick}
											onQuickStateChange={onQuickStateChange}
											onResorptionChange={onResorptionChange}
											pediatricMode={isPediatricEffective}
										/>
									);
								})}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
