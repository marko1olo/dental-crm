import React, { useCallback, useState } from "react";
import type { VisitSoapNoteValues } from "./types";

export function useVisitSoapTextUtilities(
	values: VisitSoapNoteValues,
	selectedTooth: number | null,
) {
	const [copied, setCopied] = useState<boolean>(false);

	const handleCopyFullText = useCallback(() => {
		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${selectedTooth ?? "Общий"}) ===`,
			`[Жалобы]: ${values.complaint || "Не указаны"}`,
			`[Анамнез]: ${values.anamnesis || "Соматически здоров"}`,
			`[Объективный статус]: ${values.objectiveStatus || "Без патологии"}`,
			`[Диагноз]: ${values.icd10 ? `[${values.icd10}] ` : ""}${values.diagnosis || "Не установлен"}`,
			`[Протокол лечения]: ${values.treatmentPlan || "Лечение и гигиена"}`,
			`[Рекомендации]: ${values.recommendations || "Стандартная гигиена"}`,
		].join("\n\n");

		navigator.clipboard.writeText(fullText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [values, selectedTooth]);

	const handleInputFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
		const target = e.currentTarget;
		setTimeout(() => {
			target.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 300);
	}, []);

	return { copied, handleCopyFullText, handleInputFocus };
}
