import { useCallback, useRef } from "react";
import type { VisitSoapNoteValues } from "./types";
import { useVisitSoapTextUtilities } from "./useVisitSoapTextUtilities";

interface SoapActionsParams {
	readonly values: VisitSoapNoteValues;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly setSaveStatus: React.Dispatch<React.SetStateAction<"idle" | "saving" | "saved">> | ((status: "idle" | "saving" | "saved") => void);
	readonly saveDraftToStorage: (vals: VisitSoapNoteValues) => void;
	readonly onSave?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly isLocked: boolean;
	readonly isCorrectionMode: boolean;
	readonly setIsCorrectionMode: (val: boolean) => void;
	readonly selectedTooth: number | null;
}

export function useVisitSoapActions({
	values,
	setValues,
	valuesRef,
	setSaveStatus,
	saveDraftToStorage,
	onSave,
	onChange,
	isLocked,
	isCorrectionMode,
	setIsCorrectionMode,
	selectedTooth,
}: SoapActionsParams) {
	const inFlightExplicitSaveRef = useRef(false);
	const textUtils = useVisitSoapTextUtilities(values, selectedTooth);

	const handleEnableCorrection = useCallback(() => {
		setIsCorrectionMode(true);
		const dateStr = new Date().toLocaleDateString("ru-RU", {
			day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
		});
		const stamp = `[Исправленному верить: ${dateStr}]`;
		setValues((prev) => {
			if (prev.treatmentPlan?.includes("Исправленному верить") || prev.objectiveStatus?.includes("Исправленному верить")) {
				return prev;
			}
			const next: VisitSoapNoteValues = {
				...prev,
				treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n${stamp}` : stamp,
			};
			valuesRef.current = next;
			setSaveStatus("saved");
			saveDraftToStorage(next);
			onSave?.(next);
			onChange?.(next);
			return next;
		});
	}, [onSave, onChange, saveDraftToStorage, setSaveStatus, valuesRef, setIsCorrectionMode, setValues]);

	const handleFieldChange = useCallback(
		(field: keyof VisitSoapNoteValues, val: string) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
				const dateStr = new Date().toLocaleDateString("ru-RU", {
					day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
				});
				const stamp = `[Исправленному верить: ${dateStr}]`;
				setSaveStatus("saving");
				setValues((prev) => {
					const next = { ...prev, [field]: val };
					if (!next.treatmentPlan?.includes("Исправленному верить")) {
						next.treatmentPlan = next.treatmentPlan ? `${next.treatmentPlan}\n\n${stamp}` : stamp;
					}
					valuesRef.current = next;
					saveDraftToStorage(next);
					return next;
				});
				return;
			}
			setSaveStatus("saving");
			setValues((prev) => {
				const next = { ...prev, [field]: val };
				valuesRef.current = next;
				saveDraftToStorage(next);
				return next;
			});
		},
		[isLocked, isCorrectionMode, saveDraftToStorage, setSaveStatus, valuesRef, setIsCorrectionMode, setValues],
	);

	const handleExplicitSave = useCallback(() => {
		if (inFlightExplicitSaveRef.current) return;
		inFlightExplicitSaveRef.current = true;
		try {
			onChange?.(values);
			onSave?.(values);
			saveDraftToStorage(values);
			setSaveStatus("saved");
		} finally {
			setTimeout(() => { inFlightExplicitSaveRef.current = false; }, 300);
		}
	}, [saveDraftToStorage, setSaveStatus, values, onChange, onSave]);

	return { handleEnableCorrection, handleFieldChange, handleExplicitSave, ...textUtils };
}
