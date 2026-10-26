/**
 * paidContract/contractDefaultParties.ts
 * Requisite resolvers for default contract parties (Mandate 8b <= 120 lines)
 */

import { isDemoShowcaseMode } from "../../../utils/demoModeEngine";
import type {
	PaidContractClinicRequisites,
	PaidContractCustomerRequisites,
	PaidContractPatientRequisites,
	PaidContractRepresentativeRequisites,
} from "./contractDataTypes";
import type { CreateDefaultPaidContractParams } from "./contractDefaultParams";

export function resolveDefaultClinic(p: CreateDefaultPaidContractParams): PaidContractClinicRequisites {
	const isDemo = isDemoShowcaseMode();
	return {
		fullName: p.clinicFullName || (isDemo ? "ООО «Денте Стоматология»" : ""),
		shortName: p.clinicShortName || (isDemo ? "ООО «Денте»" : ""),
		brandName: isDemo ? "ДЕНТЕ Клиника цифровой стоматологии" : "",
		legalAddress: p.clinicLegalAddress || (isDemo ? "119048, г. Москва, ул. Усачева, д. 22, стр. 1" : ""),
		actualAddress: p.clinicActualAddress || p.clinicLegalAddress || (isDemo ? "119048, г. Москва, ул. Усачева, д. 22, стр. 1" : ""),
		inn: p.clinicInn || (isDemo ? "7704123456" : ""),
		kpp: p.clinicKpp || (isDemo ? "770401001" : ""),
		ogrn: p.clinicOgrn || (isDemo ? "1207700123456" : ""),
		licenseNumber: p.clinicLicense || (isDemo ? "Л041-01137-77/00584930 от 15.10.2021 г." : ""),
		licenseDate: isDemo ? "15.10.2021" : "",
		licenseIssuer: isDemo ? "Департамент здравоохранения города Москвы" : "",
		bankName: p.clinicBankName || (isDemo ? "ПАО Сбербанк г. Москва" : ""),
		bik: p.clinicBik || (isDemo ? "044525225" : ""),
		checkingAccount: p.clinicCheckingAccount || (isDemo ? "40702810938000012345" : ""),
		correspondentAccount: p.clinicCorrAccount || (isDemo ? "30101810400000000225" : ""),
		phone: p.clinicPhone || (isDemo ? "+7 (495) 777-22-11" : ""),
		email: isDemo ? "info@dente-clinic.ru" : "",
		website: isDemo ? "https://dente-clinic.ru" : "",
		directorTitle: p.directorTitle || (isDemo ? "Генеральный директор" : ""),
		directorFullName: p.directorFullName || (isDemo ? "Смирнов Алексей Викторович" : ""),
		actingOnBasis: isDemo ? "Устава" : "",
	};
}

export function parsePassportSeriesNumber(passport?: string): { series: string; number: string } {
	if (!passport) {
		const isDemo = isDemoShowcaseMode();
		return { series: isDemo ? "4510" : "", number: isDemo ? "123456" : "" };
	}
	const clean = passport.trim().replace(/\s+/g, " ");
	const parts = clean.split(" ");
	if (parts.length >= 2) return { series: parts[0] ?? "", number: parts.slice(1).join("") };
	return {
		series: clean.length >= 4 ? clean.slice(0, 4) : "",
		number: clean.length > 4 ? clean.slice(4) : clean,
	};
}

export function resolveDefaultPatient(p: CreateDefaultPaidContractParams, ps: { series: string; number: string }): PaidContractPatientRequisites {
	const isDemo = isDemoShowcaseMode();
	return {
		fullName: p.patientFullName || (isDemo ? "Иванов Иван Иванович" : ""),
		birthDate: p.patientBirthDate || (isDemo ? "1985-05-15" : ""),
		gender: isDemo ? "Мужской" : "",
		passportSeries: ps.series,
		passportNumber: ps.number,
		passportIssuedBy: isDemo ? "ГУ МВД России по г. Москве" : "",
		passportIssuedDate: isDemo ? "20.05.2005" : "",
		passportDepartmentCode: isDemo ? "770-001" : "",
		snils: p.patientSnils || (isDemo ? "123-456-789 00" : ""),
		registrationAddress: p.patientAddress || (isDemo ? "г. Москва, ул. Арбат, д. 10" : ""),
		actualAddress: p.patientAddress || (isDemo ? "г. Москва, ул. Арбат, д. 10" : ""),
		phone: p.patientPhone || (isDemo ? "+7 (999) 111-22-33" : ""),
		email: "",
		cardNumber: p.cardNumber || (isDemo ? "К-2026-001" : ""),
	};
}

export function resolveDefaultCustomer(p: CreateDefaultPaidContractParams, ps: { series: string; number: string }): PaidContractCustomerRequisites {
	const isDemo = isDemoShowcaseMode();
	const isDiff = Boolean(p.customer?.isDifferentFromPatient);
	return {
		isDifferentFromPatient: isDiff,
		fullName: p.customer?.fullName || (isDiff ? "" : (p.patientFullName || (isDemo ? "Иванов Иван Иванович" : ""))),
		birthDate: p.customer?.birthDate || (isDiff ? "" : (p.patientBirthDate || (isDemo ? "1985-05-15" : ""))),
		passportSeries: p.customer?.passportSeries || (isDiff ? "" : ps.series),
		passportNumber: p.customer?.passportNumber || (isDiff ? "" : ps.number),
		passportIssuedBy: p.customer?.passportIssuedBy || "",
		passportIssuedDate: p.customer?.passportIssuedDate || "",
		passportDepartmentCode: p.customer?.passportDepartmentCode || "",
		registrationAddress: p.customer?.registrationAddress || (isDiff ? "" : (p.patientAddress || (isDemo ? "г. Москва, ул. Арбат, д. 10" : ""))),
		phone: p.customer?.phone || (isDiff ? "" : (p.patientPhone || (isDemo ? "+7 (999) 111-22-33" : ""))),
	};
}

export function resolveDefaultRepresentative(p: CreateDefaultPaidContractParams): PaidContractRepresentativeRequisites {
	return {
		hasRepresentative: Boolean(p.representative?.hasRepresentative ?? p.representative?.fullName),
		fullName: p.representative?.fullName || "",
		passportSeries: p.representative?.passportSeries || "",
		passportNumber: p.representative?.passportNumber || "",
		passportIssuedBy: p.representative?.passportIssuedBy || "",
		passportIssuedDate: p.representative?.passportIssuedDate || "",
		passportDepartmentCode: p.representative?.passportDepartmentCode || "",
		basisDocument: p.representative?.basisDocument || "",
		phone: p.representative?.phone || "",
	};
}
