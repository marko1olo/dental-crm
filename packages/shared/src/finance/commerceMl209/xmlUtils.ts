import { escapeXml } from "../../cda/c14n.js";
import { canonicalJsonStringify, sha256Hex } from "../../sync/hashing.js";
import { validateRussianInn, validateRussianKpp, validateRussianOgrn } from "../taxDeduction.js";
import type { OneCClinicProfile, OneCCommerceMlPackage } from "./types.js";

export function computeCommerceMlSha256(payload: unknown): string {
	if (typeof payload !== "object" || payload === null) return sha256Hex(String(payload));
	const clone = { ...(payload as Record<string, unknown>) };
	delete clone.sha256Hash;
	return sha256Hex(canonicalJsonStringify(clone));
}

export function computeCommerceMlCompositeKey(docId: string, payload: unknown): string {
	return `${docId}#${computeCommerceMlSha256(payload)}`;
}

export interface OneCCredentialValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
}

export function validateOneCClinicCredentials(profile: OneCClinicProfile): OneCCredentialValidationResult {
	const errors: string[] = [];
	if (!profile.name?.trim()) errors.push("Не указано краткое наименование организации");
	const innRes = validateRussianInn(profile.inn);
	if (!innRes.isValid) errors.push(innRes.errorMessageRu || `Некорректный ИНН клиники: ${profile.inn}`);
	if (profile.kpp) {
		const kppRes = validateRussianKpp(profile.kpp);
		if (!kppRes.isValid) errors.push(kppRes.errorMessageRu || `Некорректный КПП клиники: ${profile.kpp}`);
	}
	if (profile.ogrn) {
		const ogrnRes = validateRussianOgrn(profile.ogrn);
		if (!ogrnRes.isValid) errors.push(ogrnRes.errorMessageRu || `Некорректный ОГРН клиники: ${profile.ogrn}`);
	}
	if (profile.bankBik && !/^\d{9}$/.test(profile.bankBik.trim())) errors.push("БИК банка должен состоять строго из 9 цифр");
	if (profile.bankAccount && !/^\d{20}$/.test(profile.bankAccount.trim())) errors.push("Расчетный счет организации должен состоять строго из 20 цифр");
	if (profile.bankCorrAccount && !/^\d{20}$/.test(profile.bankCorrAccount.trim())) errors.push("Корреспондентский счет банка должен состоять строго из 20 цифр");
	return { isValid: errors.length === 0, errors };
}

export interface OneCPackageIntegrityResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly totalsKop: {
		readonly salesGross: number;
		readonly salesPayments: number;
		readonly actsTotal: number;
		readonly materialsCost: number;
		readonly payrollGross: number;
		readonly payrollNdfl: number;
		readonly payrollSocial: number;
		readonly payrollNet: number;
	};
	readonly sha256: string;
}

export function validatePackageIntegrity(pkg: OneCCommerceMlPackage): OneCPackageIntegrityResult {
	const errors: string[] = [];

	const calculatedSalesKop = pkg.retailSalesDocument.items.reduce((sum, it) => sum + it.totalKopecks, 0);
	if (calculatedSalesKop !== pkg.retailSalesDocument.totalRevenueKopecks) {
		errors.push(`Несходимость выручки в Отчете о розничных продажах: сумма строк (${calculatedSalesKop} коп.) != итого документа (${pkg.retailSalesDocument.totalRevenueKopecks} коп.)`);
	}

	const calculatedPaymentsKop = pkg.retailSalesDocument.payments.reduce((sum, p) => sum + p.amountKopecks, 0);
	if (calculatedPaymentsKop !== pkg.retailSalesDocument.totalRevenueKopecks) {
		errors.push(`Несходимость оплат в Отчете о розничных продажах: сумма способов оплат (${calculatedPaymentsKop} коп.) != сумма выручки (${pkg.retailSalesDocument.totalRevenueKopecks} коп.)`);
	}

	let calculatedActsKop = 0;
	if (pkg.medicalActs?.length) {
		for (const act of pkg.medicalActs) {
			const actItemsSum = act.items.reduce((s, it) => s + it.totalKopecks, 0);
			if (actItemsSum !== act.totalKopecks) {
				errors.push(`Несходимость сумм в Акте № ${act.actNumber}: сумма строк (${actItemsSum} коп.) != итого (${act.totalKopecks} коп.)`);
			}
			calculatedActsKop += act.totalKopecks;
		}
	}

	const calculatedMaterialsKop = pkg.materialWriteoffDocument.items.reduce((sum, it) => sum + it.totalCostKopecks, 0);
	if (calculatedMaterialsKop !== pkg.materialWriteoffDocument.totalCostKopecks) {
		errors.push(`Несходимость себестоимости материалов (Счет 10): сумма строк (${calculatedMaterialsKop} коп.) != итого накладной (${pkg.materialWriteoffDocument.totalCostKopecks} коп.)`);
	}

	let calcPayrollGross = 0;
	let calcPayrollNdfl = 0;
	let calcPayrollSocial = 0;
	let calcPayrollNet = 0;

	if (pkg.payrollDocument) {
		for (const emp of pkg.payrollDocument.employees) {
			calcPayrollGross += emp.grossEarnedKopecks;
			calcPayrollNdfl += emp.ndfl13Kopecks;
			calcPayrollSocial += emp.socialInsuranceTaxesKopecks;
			calcPayrollNet += emp.netPayoutKopecks;
			if (emp.grossEarnedKopecks - emp.ndfl13Kopecks !== emp.netPayoutKopecks) {
				errors.push(`Ошибка расчета сотрудника «${emp.employeeName}»: Начислено (${emp.grossEarnedKopecks}) - НДФЛ (${emp.ndfl13Kopecks}) != На руки (${emp.netPayoutKopecks})`);
			}
		}

		if (calcPayrollGross !== pkg.payrollDocument.totalGrossKopecks) {
			errors.push(`Несходимость ФОТ зарплаты: сумма начислений (${calcPayrollGross} коп.) != итого документа (${pkg.payrollDocument.totalGrossKopecks} коп.)`);
		}
		if (calcPayrollNdfl !== pkg.payrollDocument.totalNdflKopecks) {
			errors.push(`Несходимость НДФЛ: сумма налога (${calcPayrollNdfl} коп.) != итого документа (${pkg.payrollDocument.totalNdflKopecks} коп.)`);
		}
		if (calcPayrollSocial !== pkg.payrollDocument.totalSocialTaxesKopecks) {
			errors.push(`Несходимость страховых взносов: сумма взносов (${calcPayrollSocial} коп.) != итого документа (${pkg.payrollDocument.totalSocialTaxesKopecks} коп.)`);
		}
		if (calcPayrollNet !== pkg.payrollDocument.totalNetPayoutKopecks) {
			errors.push(`Несходимость выплаты на руки: сумма выплат (${calcPayrollNet} коп.) != итого документа (${pkg.payrollDocument.totalNetPayoutKopecks} коп.)`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		totalsKop: {
			salesGross: calculatedSalesKop,
			salesPayments: calculatedPaymentsKop,
			actsTotal: calculatedActsKop,
			materialsCost: calculatedMaterialsKop,
			payrollGross: calcPayrollGross,
			payrollNdfl: calcPayrollNdfl,
			payrollSocial: calcPayrollSocial,
			payrollNet: calcPayrollNet,
		},
		sha256: computeCommerceMlSha256(pkg),
	};
}

export function formatKopToRub(kopecks: number): string {
	return (Math.max(0, Math.round(kopecks)) / 100).toFixed(2);
}

export function formatKopToRubLocale(kopecks: number): string {
	return `${(Math.max(0, Math.round(kopecks)) / 100).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;
}

export const reqVal = (name: string, val: string | number | boolean): string =>
	`\t\t\t<ЗначениеРеквизита>\n\t\t\t\t<Наименование>${name}</Наименование>\n\t\t\t\t<Значение>${val}</Значение>\n\t\t\t</ЗначениеРеквизита>`;
