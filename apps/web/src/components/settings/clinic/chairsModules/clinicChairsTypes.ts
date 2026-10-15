/**
 * apps/web/src/components/settings/clinic/chairsModules/clinicChairsTypes.ts
 *
 * Layer 0: Core types, props interfaces, and schedule contracts for clinic chairs section.
 * Zero-runtime dependencies.
 */

import type React from "react";
import type { Chair } from "@dental/shared";

export type TextInputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type WeekdayOption = { value: number; label: string };

export interface ChairDayHours {
	start?: string;
	end?: string;
}

export interface ChairScheduleDraft {
	start: string;
	end: string;
	workingDays: number[];
	perDay: Record<number, ChairDayHours>;
}

export interface SettingsClinicChairsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	typedChairs: Chair[];
	newChairName: string;
	setNewChairName?: (name: string) => void;
	handleAddChair: () => void;
	newChairReadyToCreate?: boolean;
	newChairHasXraySensor: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: state setter
	setNewChairHasXraySensor: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasMicroscope: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: state setter
	setNewChairHasMicroscope: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasSurgeryKit: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: state setter
	setNewChairHasSurgeryKit: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	// biome-ignore lint/suspicious/noExplicitAny: drafts record
	chairScheduleDrafts: Record<string, any>;
	chairScheduleSaveStates: Record<string, string>;
	// biome-ignore lint/suspicious/noExplicitAny: dirty ids
	chairScheduleDirtyIds?: Set<string> | any;
	chairScheduleSavingId?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: draft converter
	staffScheduleDraftFromWorkingHours: (hours: any) => any;
	// biome-ignore lint/suspicious/noExplicitAny: partial schedule
	updateChairScheduleDraft: (chairId: string, partial: any) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	// biome-ignore lint/suspicious/noExplicitAny: hours bag
	updateChairScheduleDay: (chairId: string, day: number, hours: any) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	deleteChair: (chairId: string) => Promise<void> | void;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	setChairPresetDays: (chairId: string, days: number[]) => void;
	applyChairHoursToAll: (chairId: string) => void;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export interface ClinicChairCardProps {
	chair: Chair;
	// biome-ignore lint/suspicious/noExplicitAny: raw draft
	rawScheduleDraft: any;
	scheduleSaveState: string;
	scheduleDirty: boolean;
	scheduleSaving: boolean;
	scheduleSaveLabel: string;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	// biome-ignore lint/suspicious/noExplicitAny: partial schedule
	updateChairScheduleDraft: (chairId: string, partial: any) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	// biome-ignore lint/suspicious/noExplicitAny: hours bag
	updateChairScheduleDay: (chairId: string, day: number, hours: any) => void;
	setChairPresetDays: (chairId: string, days: number[]) => void;
	applyChairHoursToAll: (chairId: string) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	deleteChair: (chairId: string) => Promise<void> | void;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
	onEditChair?: (chair: Chair) => void;
}

export interface ClinicChairEditModalProps {
	isOpen: boolean;
	chair: Chair | null;
	onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: patch bag
	onSave: (chairId: string, patch: Partial<Chair>) => Promise<void> | void;
	specialtyLabels: Record<string, string>;
}
