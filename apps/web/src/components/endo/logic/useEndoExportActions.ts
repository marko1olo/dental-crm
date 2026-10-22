import type React from "react";
import type { EndoCanalData } from "@dental/shared";
import { formatEndoPatientMemo, type EndoStageStamp } from "../endoCanalConstants";
import { showToast } from "../../GlobalToast";

interface UseEndoExportActionsProps {
	readonly activeTooth: number;
	readonly toothAnatomicalName: string;
	readonly canals: EndoCanalData[];
	readonly stageStamp: EndoStageStamp;
	readonly irrigation: string;
	readonly rotarySystem: string;
	readonly radiologyControl: string;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly generatedProtocolText: string;
	readonly setCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useEndoExportActions({
	activeTooth,
	toothAnatomicalName,
	canals,
	stageStamp,
	irrigation,
	rotarySystem,
	radiologyControl,
	clinicName,
	clinicPhone,
	doctorName,
	patientName,
	generatedProtocolText,
	setCopied,
}: UseEndoExportActionsProps) {
	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(generatedProtocolText);
			setCopied(true);
			showToast("Протокол скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	const handleCopyPatientMemo = async () => {
		try {
			const isPermanent = Boolean(
				stageStamp === "COMPLETED" ||
				canals.some((c) => c.obturationTechnique && c.obturationTechnique !== "none") ||
				radiologyControl.toLowerCase().includes("обтурирован"),
			);
			const isTemporaryCaOh2 = Boolean(
				stageStamp === "TEMP_CAOH2" ||
				!isPermanent ||
				irrigation.toLowerCase().includes("ca(oh)2") ||
				rotarySystem.toLowerCase().includes("ca(oh)2") ||
				canals.some((c) => c.notes?.toLowerCase().includes("ca(oh)2")),
			);
			const text = formatEndoPatientMemo({
				clinicName: clinicName || "Стоматологическая клиника DENTE",
				clinicPhone: clinicPhone || "",
				patientName: patientName || "Пациент",
				doctorName: doctorName || "Врач-стоматолог-терапевт (эндодонтист)",
				toothNumber: activeTooth,
				toothAnatomicalNameRu: toothAnatomicalName,
				isTemporaryCaOh2,
				isPermanentObturation: isPermanent,
			});
			await navigator.clipboard.writeText(text);
			showToast("Памятка по уходу после лечения каналов скопирована для пациента", "success");
		} catch {
			showToast("Не удалось скопировать памятку для пациента", "error");
		}
	};

	const handlePrintWorksheet = () => {
		showToast("Отправка эндо-карты на печать...", "info");
		window.print();
	};

	return { handleCopyText, handleCopyPatientMemo, handlePrintWorksheet };
}
