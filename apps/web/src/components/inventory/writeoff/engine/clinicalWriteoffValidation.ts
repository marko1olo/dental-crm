import type { ClinicalWriteoffDocument } from "./clinicalWriteoffTypes.js";

export function validateWriteoffDocument(
	doc: Partial<ClinicalWriteoffDocument>,
): { isValid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const isQuick = doc.isQuickCarpuleWriteoff === true;

	if (!isQuick && (!doc.patientName || doc.patientName.trim().length < 2)) {
		errors.push("Укажите ФИО пациента для списания материалов в медицинскую карту.");
	}

	if (!doc.doctorFullName && !doc.assistantFullName) {
		errors.push(isQuick ? "Укажите лицо, производящее списание карпул." : "Укажите ФИО лечащего врача.");
	}

	if (!doc.lines || doc.lines.length === 0) {
		errors.push("Акт списания должен содержать хотя бы одну позицию.");
	} else {
		for (const line of doc.lines) {
			if (line.actualQuantity < 0) errors.push(`Отрицательное количество для «${line.nameRu}».`);
			if (line.requiresSerialNumber && line.actualQuantity > 0 && !line.serialNumber) {
				errors.push(`Для «${line.nameRu}» обязателен ввод серийного номера (МДЛП).`);
			}
			if (line.isExpired) {
				const isDisposal = doc.statutoryFormType === "disposal_act" || doc.statutoryFormType === "TORG16" || line.discrepancyReasonCode === "expired_quarantine";
				if (isDisposal) {
					warnings.push(`Партия «${line.nameRu}» с истекшим сроком направлена на списание.`);
				} else {
					warnings.push(`Срок годности «${line.nameRu}» истек: оформляется акт списания материалов.`);
				}
			} else if (line.isExpiringSoon) {
				warnings.push(`Партия «${line.nameRu}» истекает в течение 30 дней (${line.expirationDate}).`);
			}
			if (line.stockStatus === "deficit") warnings.push(`Дефицит «${line.nameRu}» в кабинете.`);
		}
	}

	return { isValid: errors.length === 0, errors, warnings };
}
