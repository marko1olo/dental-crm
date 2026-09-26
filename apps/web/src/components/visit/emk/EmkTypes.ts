import type React from "react";

export interface EmkSectionProps {
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (fieldKey: string, value: any) => void;
	isLocked: boolean;
	isRevising?: boolean;
	beginRevise?: () => void;
	activeSpecialty?: string;
	activeTooth?: number | null;
	patientAge?: number | null;
	patientGender?: string | null;
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
