import type React from "react";
import type { ClinicalFormFieldTarget } from "@dental/shared";

export interface EmkVisitNoteForm {
	complaint?: string | null | undefined;
	complaints?: string | null | undefined;
	anamnesis?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	objectiveInspection?: string | null | undefined;
	diagnosis?: string | null | undefined;
	treatment?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	recommendations?: string | null | undefined;
	anesthesia?: string | null | undefined;
	anesthetic?: string | null | undefined;
	patientId?: string | undefined;
	visitId?: string | undefined;
	id?: string | undefined;
	[key: string]: unknown;
}

export interface EmkSectionProps {
	visitNoteForm?: EmkVisitNoteForm | Record<string, unknown> | null | undefined;
	updateVisitNoteField?: ((fieldKey: string, value: unknown) => void) | undefined;
	isLocked?: boolean | undefined;
	disabled?: boolean | undefined;
	isRevising?: boolean | undefined;
	beginRevise?: (() => void) | undefined;
	activeSpecialty?: string | undefined;
	activeTooth?: number | null | undefined;
	patientAge?: number | null | undefined;
	patientGender?: string | null | undefined;
}

export interface DebouncedEmkTextareaProps {
	fieldKey: string;
	label: string;
	value: string;
	onCommit: (fieldKey: string, value: string) => void;
	textareaRef?: ((el: HTMLTextAreaElement | null) => void) | React.RefObject<HTMLTextAreaElement | null>;
	className?: string;
	placeholder?: string;
	enableStenographer?: boolean;
	showStenographerChips?: boolean;
	stenographerFieldTarget?: ClinicalFormFieldTarget;
}

/**
 * Дописывает текст к содержимому поля ЭМК так, как это сделал бы врач руками.
 */
export function appendClinicalText(
	current: string,
	addition: string,
	separator: string,
): string {
	const base = current.replace(/\s+$/, "");
	if (!base) return addition;
	if (/[,;.:-]$/.test(base)) return `${base} ${addition}`;
	return `${base}${separator}${addition}`;
}
