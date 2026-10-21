import { useMemo } from "react";
import type {
	FastClinicalPrintEngineProps,
	FastPrintClinicInfo,
	FastPrintPatientInfo,
} from "./types";
import { DEFAULT_CLINIC } from "./types";

export function useFastClinicalPrintData(
	patient: FastClinicalPrintEngineProps["patient"],
	clinic: FastPrintClinicInfo | undefined,
	customClinic: FastPrintClinicInfo,
	services: FastClinicalPrintEngineProps["services"],
) {
	const effectivePatient: FastPrintPatientInfo = useMemo(
		() => ({
			fullName: patient?.fullName || "Пациент Неуказанный",
			birthDate: patient?.birthDate || "15.05.1988",
			phone: patient?.phone || "+7 (900) 000-00-00",
			address: patient?.address || "г. Москва",
			cardNumber: patient?.cardNumber || "043/2026-01",
			allergies: patient?.allergies || "Не отягощен (отрицает)",
			somaticNotes: patient?.somaticNotes || "Соматически здоров",
		}),
		[patient],
	);

	const effectiveClinic: FastPrintClinicInfo = useMemo(
		() => ({
			name: customClinic?.name || clinic?.name || DEFAULT_CLINIC.name,
			legalName:
				customClinic?.legalName || clinic?.legalName || DEFAULT_CLINIC.legalName,
			inn: customClinic?.inn || clinic?.inn || DEFAULT_CLINIC.inn,
			ogrn: customClinic?.ogrn || clinic?.ogrn || DEFAULT_CLINIC.ogrn,
			address: customClinic?.address || clinic?.address || DEFAULT_CLINIC.address,
			phone: customClinic?.phone || clinic?.phone || DEFAULT_CLINIC.phone,
			licenseNumber:
				customClinic?.licenseNumber ||
				clinic?.licenseNumber ||
				DEFAULT_CLINIC.licenseNumber,
		}),
		[clinic, customClinic],
	);

	const totalServicesAmount = useMemo(
		() =>
			services && services.length > 0
				? services.reduce((acc, s) => acc + (s.amount || s.price * s.quantity), 0)
				: 4800,
		[services],
	);

	return { effectivePatient, effectiveClinic, totalServicesAmount };
}
