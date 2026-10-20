/**
 * usePrescriptionContextStrings.ts — Clinic & Patient Context Strings Resolvers
 * Decomposed hook <= 120 lines (Mandate 8b).
 */

import type { PrescriptionPrintModalProps } from "./PrescriptionPrintModal";

export function usePrescriptionContextStrings(
	props: PrescriptionPrintModalProps,
) {
	const {
		patient,
		patientName: patientNameProp,
		doctorName,
		doctorSpecialty,
		doctorSnils,
		clinicName,
		clinicAddress,
		clinicPhone,
		clinicOgrn,
		clinicInn,
		medicalLicenseNumber = "ЛО41-01137-77/00368421",
	} = props;

	return {
		patientName: patient?.fullName || patientNameProp || "",
		patientBirth: patient?.birthDate || "",
		patientCard: patient?.medicalCardNumber || patient?.cardNumber || "",
		docName: doctorName || "Лечащий врач",
		docSpecialty: doctorSpecialty || "Врач-стоматолог",
		docSnils: doctorSnils || "",
		clinic: clinicName || "Стоматологическая клиника",
		address: clinicAddress || "",
		phone: clinicPhone || "",
		ogrn: clinicOgrn || "",
		inn: clinicInn || "",
		licNum: medicalLicenseNumber,
	};
}
