/**
 * apps/web/src/components/treatment-plans/completedActPrint/actRequisitesResolver.ts
 *
 * Нормализация реквизитов клиники, пациента и лечащего врача для Акта.
 */

import type { TreatmentPlanCompletedActPrintProps } from "./types";

export function resolveActRequisites(
	props: TreatmentPlanCompletedActPrintProps,
	branding: any,
) {
	const {
		actData,
		clinicLegalName,
		clinicInn,
		clinicOgrn,
		clinicKpp,
		clinicAddress,
		clinicLicense,
		clinicPhone,
		clinicWebsite,
		clinicEmail,
		patientPassport,
		patientBirthDate,
		patientGender,
		patientPhone,
		patientAddress,
		patientSnils,
		patientOmsPolis,
		patientMedicalCardNumber,
		doctorSpecialty,
		doctorSnils,
		contractDate,
	} = props;

	const legalName = clinicLegalName || branding.clinicLegalName || "Стоматологическая клиника";
	const inn = clinicInn || branding.clinicInn || "";
	const kpp = clinicKpp || "";
	const ogrn = clinicOgrn || branding.clinicOgrn || "";
	const address = clinicAddress || branding.clinicAddress || "";
	const license = clinicLicense || branding.licenseNumber || "";
	const phone = clinicPhone || branding.clinicPhone || "";
	const website = clinicWebsite || branding.clinicWebsite || "";
	const email = clinicEmail || "";

	const patientDob = patientBirthDate || "____________";
	const patientGenderText = patientGender ? (patientGender === "female" ? "Женский" : "Мужской") : "—";
	const patientPass =
		patientPassport ||
		"Паспорт РФ: серия _____ № _______, выдан ____________________, дата: __________, код: ________";
	const patientRegAddress = patientAddress || "________________________________________________________";
	const patientContactPhone = patientPhone || "____________________";
	const patientSnilsVal = patientSnils || "—";
	const patientOmsVal = patientOmsPolis || "—";
	const patientMedCard =
		patientMedicalCardNumber ||
		(actData.patientId.replace(/\D/g, "") ? `МК-${actData.patientId.replace(/\D/g, "")}` : "б/н");

	const doctorSpec = doctorSpecialty || "Врач-стоматолог";
	const doctorSnilsVal = doctorSnils || "—";

	const contractDateFormatted =
		contractDate ||
		(actData.createdAtIso ? new Date(actData.createdAtIso).toLocaleDateString("ru-RU") : actData.actDate);

	return {
		legalName,
		inn,
		kpp,
		ogrn,
		address,
		license,
		phone,
		website,
		email,
		patientDob,
		patientGenderText,
		patientPass,
		patientRegAddress,
		patientContactPhone,
		patientSnilsVal,
		patientOmsVal,
		patientMedCard,
		doctorSpec,
		doctorSnilsVal,
		contractDateFormatted,
	};
}
