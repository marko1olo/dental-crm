import { useCallback } from "react";
import { apply1ClickDoctorAutopilot } from "../presets/autopilotPresets";
import type { VisitSoapNoteValues } from "./types";

interface ApplyNormParams {
	readonly selectedTooth: number | null;
	readonly isLocked: boolean;
	readonly isCorrectionMode: boolean;
	readonly setIsCorrectionMode: (val: boolean) => void;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
	readonly saveDraftToStorage: (vals: VisitSoapNoteValues) => void;
	readonly onSave?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onApplyFullDiary?: ((fullText: string) => void) | undefined;
}

export function useVisitSoapApplyNorm({
	selectedTooth,
	isLocked,
	isCorrectionMode,
	setIsCorrectionMode,
	setValues,
	valuesRef,
	setSaveStatus,
	saveDraftToStorage,
	onSave,
	onChange,
	onApplyFullDiary,
}: ApplyNormParams) {
	const handleApplyNorm = useCallback(() => {
		const targetTooth = selectedTooth ?? 16;
		if (isLocked && !isCorrectionMode) {
			setIsCorrectionMode(true);
		}
		const dateStr = new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const autopilot = apply1ClickDoctorAutopilot("norm", { toothNumber: targetTooth });
		const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";
		const defaultNormComplaint =
			"Жалоб на момент осмотра не предъявляет. Обратился(лась) с целью профилактического осмотра и гигиены.";
		const defaultNormAnamnesis =
			"Соматически здоров. Аллергологический анамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает.";
		const normValues: VisitSoapNoteValues = {
			complaint: autopilot.preset.complaint || defaultNormComplaint,
			anamnesis: autopilot.preset.anamnesis || defaultNormAnamnesis,
			objectiveStatus: `Прикус физиологический. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Зуб ${targetTooth}: интактен, зондирование и перкуссия безболезненны, реакция на термопробу адекватная, подвижность отсутствует. Зубные отложения умеренные.`,
			diagnosis: "Z01.2 Стоматологическое обследование (Здоров)",
			treatmentPlan: `${autopilot.diary.treatmentDescription}${auditStamp}`,
			recommendations: autopilot.preset.recommendations ?? "",
			icd10: autopilot.preset.icd10,
		};
		setValues(normValues);
		valuesRef.current = normValues;
		setSaveStatus("saved");
		saveDraftToStorage(normValues);
		onSave?.(normValues);
		onChange?.(normValues);

		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${targetTooth}) ===`,
			`[Жалобы]: ${normValues.complaint}`,
			`[Анамнез]: ${normValues.anamnesis}`,
			`[Объективный статус]: ${normValues.objectiveStatus}`,
			`[Диагноз]: [${normValues.icd10}] ${normValues.diagnosis}`,
			`[Протокол лечения]: ${normValues.treatmentPlan}`,
			`[Рекомендации]: ${normValues.recommendations}`,
		].join("\n\n");
		onApplyFullDiary?.(fullText);
	}, [selectedTooth, isLocked, isCorrectionMode, setIsCorrectionMode, onSave, onChange, onApplyFullDiary, saveDraftToStorage, setSaveStatus, valuesRef, setValues]);

	return { handleApplyNorm };
}
