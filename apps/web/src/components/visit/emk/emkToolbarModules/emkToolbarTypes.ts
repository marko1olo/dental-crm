import React from "react";
import type { ClinicalSoapPreset } from "../../clinicalSoapPresets";

export interface EmkToolbarProps {
	activeEmkTab?: string | undefined;
	setActiveEmkTab?: ((tabId: string) => void) | undefined;
	onTabChange?: ((tabId: any) => void) | undefined;
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset) => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	onOpenStarProtocols?: (() => void) | undefined;
	isStarProtocolsOpen?: boolean | undefined;
	onOpenProtocolsCatalog?: (() => void) | undefined;
	onOpenSoapTemplates?: (() => void) | undefined;
	onToggleCopilot?: (() => void) | undefined;
	isCopilotOpen?: boolean | undefined;
	onScheduleNextVisit?: ((days: number) => void) | undefined;
	onScheduleNext?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onOpenConsentModal?: (() => void) | undefined;
	onPrint043?: (() => void) | undefined;
	onOpenPrintModal?: (() => void) | undefined;
	isSignedVisit?: boolean | undefined;
	isRevisingVisitNote?: boolean | undefined;
	onBeginRevise?: (() => void) | undefined;
	visitNoteForm?: Record<string, any> | undefined;
	updateVisitNoteField?: ((field: string, value: any) => void) | undefined;
	autosaveState?: any;
	lastSavedAt?: Date | null | undefined;
	hasUnsavedChanges?: boolean | undefined;
	voicePilotNode?: React.ReactNode | undefined;
	specialtyFocusNode?: React.ReactNode | undefined;
	noteForm?: Record<string, any> | undefined;
	onUndo?: (() => boolean) | undefined;
	onRedo?: (() => boolean) | undefined;
}

export interface EmkTabItem {
	id: string;
	label: string;
	shortLabel: string;
}

export interface MobileStepItem {
	id: string;
	label: string;
	shortLabel?: string;
}

export const DEFAULT_EMK_TABS: EmkTabItem[] = [
	{ id: "all", label: "Все разделы", shortLabel: "Все" },
	{ id: "complaints", label: "Жалобы & Анамнез", shortLabel: "Жалобы" },
	{ id: "objectiveStatus", label: "Осмотр & Формула", shortLabel: "Осмотр" },
	{ id: "diary", label: "Диагноз & Лечение", shortLabel: "Лечение" },
	{ id: "recommendations", label: "Рекомендации", shortLabel: "Советы" },
];

export const MOBILE_EMK_STEPS: MobileStepItem[] = [
	{ id: "complaints", label: "1. Жалобы", shortLabel: "1. Жалобы" },
	{ id: "objectiveStatus", label: "2. Осмотр", shortLabel: "2. Осмотр" },
	{ id: "diagnosis", label: "3. Диагноз", shortLabel: "3. Диагноз" },
	{ id: "treatmentPlan", label: "4. Лечение", shortLabel: "4. План" },
];

export function isEmkTabFilled(tabId: string, noteForm: Record<string, any> = {}): boolean {
	if (tabId === "all") return false;
	if (tabId === "complaints") {
		return Boolean(
			String(noteForm.complaint ?? "").trim() ||
			String(noteForm.anamnesis ?? "").trim() ||
			String(noteForm.complaints ?? "").trim()
		);
	}
	if (tabId === "objectiveStatus") {
		return Boolean(
			String(noteForm.objectiveStatus ?? "").trim() ||
			String(noteForm.examination ?? "").trim() ||
			String(noteForm.statusLocalis ?? "").trim()
		);
	}
	if (tabId === "diary" || tabId === "treatmentPlan") {
		return Boolean(
			String(noteForm.treatmentPlan ?? "").trim() ||
			String(noteForm.treatmentDescription ?? "").trim()
		);
	}
	if (tabId === "diagnosis") {
		return Boolean(
			String(noteForm.diagnosis ?? "").trim() ||
			String(noteForm.icd10 ?? "").trim()
		);
	}
	if (tabId === "recommendations") {
		return Boolean(String(noteForm.recommendations ?? "").trim());
	}
	return Boolean(String(noteForm[tabId] ?? "").trim().length > 0);
}

export function isEmkTabActive(tabId: string, activeEmkTab: string, noteForm: Record<string, any> = {}): boolean {
	if (activeEmkTab === tabId) return true;
	if (tabId === "complaints" && (activeEmkTab === "complaint" || activeEmkTab === "anamnesis")) return true;
	if (tabId === "objectiveStatus" && (activeEmkTab === "status" || activeEmkTab === "objective")) return true;
	if (tabId === "diary" && (activeEmkTab === "diagnosis" || activeEmkTab === "treatmentPlan" || activeEmkTab === "protocol")) return true;
	if (tabId === "diagnosis" && (activeEmkTab === "diagnosis" || (activeEmkTab === "diary" && !noteForm.treatmentPlan))) return true;
	if (tabId === "treatmentPlan" && (activeEmkTab === "treatmentPlan" || activeEmkTab === "protocol")) return true;
	return false;
}
