/**
 * paidContract/validateClinicRequisites.ts
 * Clinic statutory requisites validation for paid contract (Mandate 8b <= 120 lines)
 */

import type { PaidContractData, PaidContractMissingField } from "./contractDataTypes";

export function checkFilled(val: string | number | undefined | null): boolean {
	if (val === undefined || val === null) return false;
	if (typeof val === "number") return val > 0;
	return val.trim().length > 0;
}

export function validateClinicRequisites(contract: PaidContractData): PaidContractMissingField[] {
	const missing: PaidContractMissingField[] = [];
	const cl = contract.clinic;

	if (!checkFilled(contract.contractNumber)) {
		missing.push({
			section: "Реквизиты договора",
			field: "contractNumber",
			label: "Номер договора",
			hint: "Укажите номер по реестру договоров клиники (например, ДПМУ-2026-001).",
		});
	}
	if (!checkFilled(contract.contractDate)) {
		missing.push({
			section: "Реквизиты договора",
			field: "contractDate",
			label: "Дата заключения договора",
			hint: "Укажите дату заключения договора.",
		});
	}
	if (!checkFilled(cl.fullName)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.fullName",
			label: "Полное фирменное наименование клиники",
			hint: "Укажите полное юридическое наименование организации согласно ЕГРЮЛ.",
		});
	}
	if (!checkFilled(cl.ogrn)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.ogrn",
			label: "ОГРН / ОГРНИП клиники",
			hint: "Укажите ОГРН клиники.",
		});
	}
	if (!checkFilled(cl.inn)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.inn",
			label: "ИНН клиники",
			hint: "Укажите ИНН организации.",
		});
	}
	if (!checkFilled(cl.legalAddress)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.legalAddress",
			label: "Адрес места нахождения (юридический)",
			hint: "Укажите юридический адрес организации.",
		});
	}
	if (!checkFilled(cl.licenseNumber)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.licenseNumber",
			label: "Номер медицинской лицензии (ЕРИЛ / Росздравнадзор)",
			hint: "Укажите номер лицензии единого реестра.",
		});
	}

	return missing;
}
