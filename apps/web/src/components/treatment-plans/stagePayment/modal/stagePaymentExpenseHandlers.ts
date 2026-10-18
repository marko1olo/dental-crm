import { rublesToKopecks } from "@dental/shared";
import type { MilestoneStage, StageFiscalReceipt54Fz, TerminationExpenseItem } from "../stagePaymentEngine.js";
import { generate54FzStageFiscalReceipt } from "../stagePaymentEngine.js";

export function handleAddCustomExpenseHelper(
	title: string,
	rubStr: string,
	category: TerminationExpenseItem["category"],
	setCustomExpenses: React.Dispatch<React.SetStateAction<TerminationExpenseItem[]>>,
	setTitle: (v: string) => void,
	setRub: (v: string) => void,
	setStatusMessage: (v: string | null) => void,
): void {
	if (!title.trim()) {
		setStatusMessage("Укажите наименование расхода.");
		return;
	}
	const rub = parseFloat(rubStr);
	if (isNaN(rub) || rub <= 0) {
		setStatusMessage("Укажите корректную сумму расхода.");
		return;
	}
	setCustomExpenses((prev) => [
		...prev,
		{
			title: title.trim(),
			category,
			amountKopecks: rublesToKopecks(Math.round(rub)),
			justificationRu: `Затраты: ${title.trim()}`,
		},
	]);
	setTitle("");
	setRub("");
	setStatusMessage("Фактический расход успешно добавлен.");
}

export function handleGenerateFiscalReceiptHelper(
	stages: readonly MilestoneStage[],
	stageId: string,
	paymentType: "advance" | "completion" | "full",
	paymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR",
	clinicInn?: string,
	patientName?: string,
	clinicName?: string,
): StageFiscalReceipt54Fz | null {
	const target = stages.find((s) => s.id === stageId);
	if (!target) return null;
	return generate54FzStageFiscalReceipt(
		target,
		paymentType,
		paymentMethod,
		clinicInn,
		patientName,
		clinicName,
	);
}
