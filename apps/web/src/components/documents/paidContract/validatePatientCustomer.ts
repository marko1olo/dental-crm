/**
 * paidContract/validatePatientCustomer.ts
 * Patient and customer requisites validation (Mandate 8b <= 120 lines)
 */

import type { PaidContractData, PaidContractMissingField, ValidatePaidContractOptions } from "./contractDataTypes";
import { checkFilled } from "./validateClinicRequisites";

export function validatePatientCustomer(
	contract: PaidContractData,
	options?: ValidatePaidContractOptions,
): { missing: PaidContractMissingField[]; warnings: string[] } {
	const missing: PaidContractMissingField[] = [];
	const warnings: string[] = [];
	const allowBlank = Boolean(options?.allowBlankForPrint || options?.isCito);
	const pt = contract.patient;
	const cust = contract.customer;

	if (!checkFilled(pt.fullName) && !allowBlank) {
		missing.push({
			section: "Сведения о Пациенте",
			field: "patient.fullName",
			label: "ФИО Пациента",
			hint: "Укажите фамилию, имя и отчество пациента.",
		});
	}

	const hasPassport = checkFilled(pt.passportSeries) && checkFilled(pt.passportNumber);
	if (!hasPassport) {
		if (allowBlank) {
			warnings.push("Паспортные данные пациента не заполнены: сформирован бланк с прочерками для заполнения в клинике.");
		} else {
			missing.push({
				section: "Сведения о Пациенте",
				field: "patient.passport",
				label: "Паспортные данные Пациента",
				hint: "Укажите серию и номер паспорта пациента.",
			});
		}
	}

	if (!checkFilled(pt.registrationAddress) && !allowBlank) {
		missing.push({
			section: "Сведения о Пациенте",
			field: "patient.registrationAddress",
			label: "Адрес регистрации Пациента",
			hint: "Укажите адрес места жительства / регистрации.",
		});
	}

	if (cust.isDifferentFromPatient) {
		if (!checkFilled(cust.fullName) && !allowBlank) {
			missing.push({
				section: "Сведения о Заказчике",
				field: "customer.fullName",
				label: "ФИО Заказчика",
				hint: "Укажите ФИО заказчика.",
			});
		}
		const hasCustPassport = checkFilled(cust.passportSeries) && checkFilled(cust.passportNumber);
		if (!hasCustPassport && !allowBlank) {
			missing.push({
				section: "Сведения о Заказчике",
				field: "customer.passport",
				label: "Паспортные данные Заказчика",
				hint: "Укажите серию и номер паспорта заказчика.",
			});
		}
	}

	return { missing, warnings };
}
