import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastClinicalPrintEngineProps,
} from "../FastClinicalPrintEngine";

export type InsertCutLayout = "a4_cut" | "a5_direct";

export interface PartisanInsert043uProps {
	clinic: FastPrintClinicInfo;
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
	visitData?: FastClinicalPrintEngineProps["visitData"];
	cutLayout?: InsertCutLayout;
}

export function calculateAge(birthDateStr?: string | null): string {
	if (!birthDateStr) return "37 лет";
	const parts = birthDateStr.split(".");
	if (parts.length === 3) {
		const year = parseInt(parts[2] ?? "", 10);
		if (!isNaN(year) && year > 1900) {
			const age = new Date().getFullYear() - year;
			return `${age} лет`;
		}
	}
	return "37 лет";
}
