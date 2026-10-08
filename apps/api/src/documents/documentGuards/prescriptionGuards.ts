import type { CreateDocumentInput } from "@dental/shared";

/**
 * Проверка наличия структурированных данных для рецептов (107-1/у), анестезии и зуботехнических заказов.
 */
export function checkPrescriptionPayloadMissingReason(
	input: CreateDocumentInput,
): string | null {
	if (
		input.kind === "anesthesia_consent_log" &&
		!input.payload?.anesthesiaConsentLog
	) {
		return "Для журнала анестезии нужны структурированные данные: метод, препарат, зона, аллергоанамнез и дозы.";
	}
	if (
		input.kind === "prescription_medication_order" &&
		!input.payload?.prescriptionMedicationOrder
	) {
		return "Для назначения препаратов нужны структурированные данные: препарат, дозировка, режим, срок и памятка безопасности.";
	}
	if (input.kind === "lab_work_order" && !input.payload?.labWorkOrder) {
		return "Для лабораторного заказа нужны структурированные данные: работа, зона, материал, цвет, источник данных и срок.";
	}
	return null;
}
