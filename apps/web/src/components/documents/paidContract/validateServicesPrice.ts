/**
 * paidContract/validateServicesPrice.ts
 * Services, amount and mandatory disclosures validation (Mandate 8b <= 120 lines)
 */

import type { PaidContractData, PaidContractMissingField, ValidatePaidContractOptions } from "./contractDataTypes";

export function validateServicesPrice(
	contract: PaidContractData,
	options?: ValidatePaidContractOptions,
): { missing: PaidContractMissingField[]; warnings: string[] } {
	const missing: PaidContractMissingField[] = [];
	const warnings: string[] = [];
	const allowBlank = Boolean(options?.allowBlankForPrint || options?.isCito);

	const hasCost = typeof contract.totalAmountKopecks === "number" && contract.totalAmountKopecks > 0;
	if (!hasCost) {
		if (allowBlank) {
			warnings.push("Сумма договора не указана: сформирован бланк с прочерками для согласования сметы.");
		} else {
			missing.push({
				section: "Стоимость и порядок расчетов",
				field: "totalAmountKopecks",
				label: "Стоимость медицинских услуг",
				hint: "Укажите стоимость услуг в копейках или рублях согласно плану лечения.",
			});
		}
	}

	const disc = contract.confirmedDisclosures;
	if (disc && !allowBlank) {
		const checks: Array<{ key: keyof typeof disc; label: string; field: string }> = [
			{ key: "freeCareNoticeUnderstood", label: "Уведомление о программе государственных гарантий (ОМС)", field: "confirmedDisclosures.freeCareNoticeUnderstood" },
			{ key: "paidBasisUnderstood", label: "Согласие на платную основу оказания медицинской помощи", field: "confirmedDisclosures.paidBasisUnderstood" },
			{ key: "clinicInfoConfirmed", label: "Сведения о клинике и лицензии", field: "confirmedDisclosures.clinicInfoConfirmed" },
			{ key: "serviceListAndPriceConfirmed", label: "Перечень услуг и смета согласованы", field: "confirmedDisclosures.serviceListAndPriceConfirmed" },
			{ key: "writtenChangesConfirmed", label: "Письменное оформление изменений", field: "confirmedDisclosures.writtenChangesConfirmed" },
			{ key: "recommendationsWarningUnderstood", label: "Предупреждение о соблюдении назначений", field: "confirmedDisclosures.recommendationsWarningUnderstood" },
		];
		for (const chk of checks) {
			if (!disc[chk.key]) {
				missing.push({
					section: "Обязательные уведомления",
					field: chk.field,
					label: chk.label,
					hint: "Подтвердите обязательное уведомление пациента.",
				});
			}
		}
	}

	return { missing, warnings };
}
