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
		fullName: p.clinicFullName || "ООО «Денте Стоматология»",
		shortName: p.clinicShortName || "ООО «Денте»",
		brandName: "ДЕНТЕ Клиника цифровой стоматологии",
		legalAddress: p.clinicLegalAddress || "119048, г. Москва, ул. Усачева, д. 22, стр. 1",
		actualAddress: p.clinicActualAddress || p.clinicLegalAddress || "119048, г. Москва, ул. Усачева, д. 22, стр. 1",
		inn: p.clinicInn || "7704123456",
		kpp: p.clinicKpp || "770401001",
		ogrn: p.clinicOgrn || "1207700123456",
		licenseNumber: p.clinicLicense || "Л041-01137-77/00584930 от 15.10.2021 г.",
		licenseDate: "15.10.2021",
		licenseIssuer: "Департамент здравоохранения города Москвы",
		bankName: p.clinicBankName || "ПАО Сбербанк г. Москва",
		bik: p.clinicBik || "044525225",
		checkingAccount: p.clinicCheckingAccount || "40702810938000012345",
		correspondentAccount: p.clinicCorrAccount || "30101810400000000225",
		phone: p.clinicPhone || "+7 (495) 777-22-11",
		email: isDemo ? "info@dente-clinic.ru" : "",
		website: isDemo ? "https://dente-clinic.ru" : "",
		directorTitle: p.directorTitle || "Генеральный директор",
		directorFullName: p.directorFullName || "Смирнов Алексей Викторович",
		actingOnBasis: "Устава",
	};
}

export function parsePassportSeriesNumber(passport?: string): { series: string; number: string } {
	if (!passport) return { series: "4510", number: "123456" };
	const clean = passport.trim().replace(/\s+/g, " ");
	const parts = clean.split(" ");
	if (parts.length >= 2) return { series: parts[0] ?? "", number: parts.slice(1).join("") };
	return {
		series: clean.length >= 4 ? clean.slice(0, 4) : "",
		number: clean.length > 4 ? clean.slice(4) : clean,
	};
}

export function resolveDefaultPatient(p: CreateDefaultPaidContractParams, ps: { series: string; number: string }): PaidContractPatientRequisites {
	return {
		fullName: p.patientFullName || "Иванов Иван Иванович",
		birthDate: p.patientBirthDate || "1985-05-15",
		gender: "Мужской",
		passportSeries: ps.series,
		passportNumber: ps.number,
		passportIssuedBy: "ГУ МВД России по г. Москве",
		passportIssuedDate: "20.05.2005",
		passportDepartmentCode: "770-001",
		snils: p.patientSnils || "123-456-789 00",
		registrationAddress: p.patientAddress || "г. Москва, ул. Арбат, д. 10",
		actualAddress: p.patientAddress || "г. Москва, ул. Арбат, д. 10",
		phone: p.patientPhone || "+7 (999) 111-22-33",
		email: "",
		cardNumber: p.cardNumber || "К-2026-001",
	};
}

export function resolveDefaultCustomer(p: CreateDefaultPaidContractParams, ps: { series: string; number: string }): PaidContractCustomerRequisites {
	const isDiff = Boolean(p.customer?.isDifferentFromPatient);
	return {
		isDifferentFromPatient: isDiff,
		fullName: p.customer?.fullName || (isDiff ? "" : "Иванов Иван Иванович"),
		birthDate: p.customer?.birthDate || "",
		passportSeries: p.customer?.passportSeries || (isDiff ? "" : ps.series),
		passportNumber: p.customer?.passportNumber || (isDiff ? "" : ps.number),
		passportIssuedBy: p.customer?.passportIssuedBy || "",
		passportIssuedDate: p.customer?.passportIssuedDate || "",
		passportDepartmentCode: p.customer?.passportDepartmentCode || "",
		registrationAddress: p.customer?.registrationAddress || "",
		phone: p.customer?.phone || "",
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
