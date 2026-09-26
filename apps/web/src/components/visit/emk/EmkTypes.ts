import type React from "react";

export interface EmkSectionProps {
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (fieldKey: string, value: any) => void;
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
	textareaRef?: (el: HTMLTextAreaElement | null) => void;
	className?: string;
	placeholder?: string;
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
