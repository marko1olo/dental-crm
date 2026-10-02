/**
 * DENTE Dental CRM — Odontogram View Container Types & Options
 */

import React from "react";
import { Sparkles, Zap, FileText } from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import type {
	ToothData,
	ToothState,
	OdontogramQuadrantId,
} from "./ToothChart";

export interface OdontogramViewOption {
	mode: OdontogramViewMode;
	label: string;
	shortLabel: string;
	compactLabel?: string;
	mobileLabel?: string;
	icon: React.ReactNode;
	tooltip: string;
	badge?: string;
}

export const ODONTOGRAM_VIEW_MODES: readonly OdontogramViewOption[] = [
	{
		mode: "anatomical_svg",
		label: "3D Анатомический",
		shortLabel: "Анатомический",
		compactLabel: "3D",
		mobileLabel: "3D",
		icon: <Sparkles size={14} className="text-indigo-500 shrink-0" />,
		tooltip: "Векторная анатомическая визуализация коронок, корней и каналов",
		badge: "3D",
	},
	{
		mode: "compact_clinical",
		label: "Клинический 6-поверхностный",
		shortLabel: "6-Поверхностный FDI",
		compactLabel: "FDI 6-гр",
		mobileLabel: "FDI",
		icon: <Zap size={14} className="text-amber-500 shrink-0" />,
		tooltip: "Быстрая разметка патологий по 6 граням зуба (O, V, L/P, M, D, C)",
		badge: "FDI",
	},
	{
		mode: "classic_gost",
		label: "Классический ГОСТ",
		shortLabel: "Классический",
		compactLabel: "ГОСТ",
		mobileLabel: "ГОСТ",
		icon: <FileText size={14} className="text-[var(--teal)] shrink-0" />,
		tooltip: "Табличная форма карты стоматологического пациента (Минздрав РФ)",
		badge: "МЗ РФ",
	},
] as const;

export interface OdontogramViewContainerProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	onDentitionModeChange?: ((mode: "adult" | "pediatric" | "mixed") => void) | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	onToothClick?: ((num: number, rect: DOMRect, surface?: string) => void) | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideModeSwitcher?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	className?: string | undefined;
	initialViewMode?: OdontogramViewMode | undefined;
	onViewModeChange?: ((mode: OdontogramViewMode) => void) | undefined;
	onOpenVoiceDictation?: (() => void) | undefined;
	onOpenPediatricModal?: (() => void) | undefined;
	onTogglePerio?: (() => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onToggleEstimator?: (() => void) | undefined;
	isEstimatorOpen?: boolean | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	onSelectTeethGroup?: ((teeth: number[]) => void) | undefined;
	onMarkIntactDentition?: (() => void) | undefined;
	onMarkWisdomTeethMissing?: (() => void) | undefined;
	patientId?: string | undefined;
	onSyncAllToDiary?: (() => void) | undefined;
	liveGrossTotalRub?: number | undefined;
	onOpenFastCheckout?: (() => void) | undefined;
	allergyText?: string | undefined;
	onOneClickLabOrder?: ((teeth: number[]) => void) | undefined;
	contextDrawerTooth?: number | null | undefined;
	setContextDrawerTooth?: ((tooth: number | null) => void) | React.Dispatch<React.SetStateAction<number | null>> | undefined;
}

export const STAMP_ITEMS: Array<{
	state: ToothState;
	label: string;
	short: string;
	testId: string;
	activeClass: string;
	badgeClass: string;
}> = [
	{
		state: "Caries",
		label: "Кариес (К)",
		short: "Кариес",
		testId: "stamp-caries-btn",
		activeClass: "bg-amber-500 text-white",
		badgeClass: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border-amber-500/20",
	},
	{
		state: "Filled",
		label: "Пломба (П)",
		short: "Пломба",
		testId: "stamp-filled-btn",
		activeClass: "bg-blue-600 text-white",
		badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border-blue-500/30",
	},
	{
		state: "Pulpitis",
		label: "Пульпит (Ф)",
		short: "Пульпит",
		testId: "stamp-pulpitis-btn",
		activeClass: "bg-rose-600 text-white",
		badgeClass: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border-rose-500/20",
	},
	{
		state: "Crown",
		label: "Коронка (Кр)",
		short: "Коронка",
		testId: "stamp-crown-primary-btn",
		activeClass: "bg-[var(--teal,#10b981)] text-white",
		badgeClass: "bg-[var(--teal-soft,rgba(16,185,129,0.1))] text-[var(--teal-dark,#047857)] dark:text-[var(--teal-light,#34d399)] hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30",
	},
	{
		state: "Implant",
		label: "Имплант (И)",
		short: "Имплант",
		testId: "stamp-implant-btn",
		activeClass: "bg-[var(--ink,#1e293b)] text-[var(--paper,#ffffff)]",
		badgeClass: "bg-[var(--paper-soft,rgba(100,116,139,0.15))] text-[var(--ink,#1e293b)] hover:bg-[var(--paper-hover,rgba(100,116,139,0.25))] border border-[var(--line,#cbd5e1)]",
	},
	{
		state: "Missing",
		label: "Удален (X)",
		short: "Удален",
		testId: "stamp-missing-btn",
		activeClass: "bg-[var(--muted,#64748b)] text-[var(--paper,#ffffff)]",
		badgeClass: "bg-[var(--paper-soft,rgba(100,116,139,0.1))] text-[var(--muted-dark,#475569)] dark:text-[var(--muted-light,#94a3b8)] hover:bg-[var(--muted)]/20 border border-[var(--line,#cbd5e1)]",
	},
	{
		state: "Healthy",
		label: "Здоров (З)",
		short: "Здоров",
		testId: "stamp-healthy-btn",
		activeClass: "bg-[var(--ok-fg,#10b981)] text-white",
		badgeClass: "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] hover:opacity-90 border border-[var(--ok-fg,rgba(16,185,129,0.3))]",
	},
];

export function areSurfacesEqual(
	a?: readonly string[] | string[] | undefined,
	b?: readonly string[] | string[] | undefined,
): boolean {
	if (a === b) return true;
	if (!a || !b) return !a && !b;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

export function areTeethDataEqual(prev?: ToothData[], next?: ToothData[]): boolean {
	if (prev === next) return true;
	if (!prev || !next) return !prev && !next;
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i++) {
		const pt = prev[i];
		const nt = next[i];
		if (!pt || !nt) return false;
		if (pt.toothNumber !== nt.toothNumber) return false;
		if (pt.state !== nt.state) return false;
		if (pt.material !== nt.material) return false;
		if (pt.canalObturation !== nt.canalObturation) return false;
		if (pt.hasPost !== nt.hasPost) return false;
		if (pt.postType !== nt.postType) return false;
		if (pt.boneLossLevel !== nt.boneLossLevel) return false;
		if (pt.boneLossType !== nt.boneLossType) return false;
		if ((pt.rootResorptionStage ?? pt.rootResorption) !== (nt.rootResorptionStage ?? nt.rootResorption)) return false;
		if (pt.periapicalLesion !== nt.periapicalLesion) return false;
		const pDepth = pt.pocketDepth ?? pt.pocketDepthMm ?? pt.maxPocketDepth;
		const nDepth = nt.pocketDepth ?? nt.pocketDepthMm ?? nt.maxPocketDepth;
		if (pDepth !== nDepth) return false;
		if (!areSurfacesEqual(pt.surfaces, nt.surfaces)) return false;
	}
	return true;
}

export function areOdontogramViewContainerPropsEqual(
	prev: OdontogramViewContainerProps,
	next: OdontogramViewContainerProps,
): boolean {
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.dentitionMode !== next.dentitionMode) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.hideModeSwitcher !== next.hideModeSwitcher) return false;
	if (prev.hideQuadrantSwitcher !== next.hideQuadrantSwitcher) return false;
	if (prev.activeQuadrant !== next.activeQuadrant) return false;
	if (prev.isPerioOpen !== next.isPerioOpen) return false;
	if (prev.isEstimatorOpen !== next.isEstimatorOpen) return false;
	if (prev.diagnocatLoading !== next.diagnocatLoading) return false;
	if (prev.isMultiSelectMode !== next.isMultiSelectMode) return false;
	if (prev.patientId !== next.patientId) return false;
	if (prev.className !== next.className) return false;
	if (prev.liveGrossTotalRub !== next.liveGrossTotalRub) return false;
	if (prev.allergyText !== next.allergyText) return false;
	if (prev.contextDrawerTooth !== next.contextDrawerTooth) return false;

	// Compare selectedTeeth array
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth
	if (prev.topTeeth !== next.topTeeth) {
		const pLen = prev.topTeeth?.length ?? 0;
		const nLen = next.topTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.topTeeth![i] !== next.topTeeth![i]) return false;
		}
	}
	if (prev.bottomTeeth !== next.bottomTeeth) {
		const pLen = prev.bottomTeeth?.length ?? 0;
		const nLen = next.bottomTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.bottomTeeth![i] !== next.bottomTeeth![i]) return false;
		}
	}

	// Compare teethData
	if (!areTeethDataEqual(prev.teethData, next.teethData)) return false;

	return true;
}
