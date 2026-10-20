import { formatPersonName } from "./visitDiaryTypes";
import { realVisitFieldId } from "../visitIdentity";
import { specialtyLabels } from "../../../workspaceUiLabels";

export function resolvePrintPatient(
	patientId: string,
	activePatient: any,
	ctxDashboard?: any,
) {
	const selectedPatientId = realVisitFieldId(
		activePatient && typeof activePatient === "object" && "id" in activePatient
			? (activePatient as { id?: unknown }).id
			: null,
	);
	const diaryPatientId = realVisitFieldId(patientId);
	return (
		(diaryPatientId && selectedPatientId && selectedPatientId === diaryPatientId
			? activePatient
			: (ctxDashboard?.patients || []).find((p: any) => p.id === diaryPatientId) || activePatient) ?? null
	);
}

export function extractPatientPrintMeta(printPatient: any) {
	const patientFullName = formatPersonName(printPatient);
	const patientBirthDate =
		typeof printPatient?.birthDate === "string"
			? printPatient.birthDate
			: typeof printPatient?.dateOfBirth === "string"
				? printPatient.dateOfBirth
				: "";
	const patientCardNumber =
		typeof printPatient?.cardNumber === "string"
			? printPatient.cardNumber
			: typeof printPatient?.medicalCardNumber === "string"
				? printPatient.medicalCardNumber
				: typeof printPatient?.chartNumber === "string"
					? printPatient.chartNumber
					: "";

	const patientPassport =
		typeof (printPatient as any)?.administrativeProfile?.identityDocument === "string" &&
		(printPatient as any).administrativeProfile.identityDocument.trim()
			? (printPatient as any).administrativeProfile.identityDocument.trim()
			: typeof (printPatient as any)?.passport === "string" && (printPatient as any).passport.trim()
				? (printPatient as any).passport.trim()
				: typeof (printPatient as any)?.identityDocument === "string" && (printPatient as any).identityDocument.trim()
					? (printPatient as any).identityDocument.trim()
					: "";

	const patientOms =
		typeof (printPatient as any)?.administrativeProfile?.omsPolis === "string" &&
		(printPatient as any).administrativeProfile.omsPolis.trim()
			? (printPatient as any).administrativeProfile.omsPolis.trim()
			: typeof (printPatient as any)?.administrativeProfile?.insurancePolicyNumber === "string" &&
					(printPatient as any).administrativeProfile.insurancePolicyNumber.trim()
				? (printPatient as any).administrativeProfile.insurancePolicyNumber.trim()
				: typeof (printPatient as any)?.omsPolis === "string" && (printPatient as any).omsPolis.trim()
					? (printPatient as any).omsPolis.trim()
					: typeof (printPatient as any)?.insurancePolicyNumber === "string" &&
							(printPatient as any).insurancePolicyNumber.trim()
						? (printPatient as any).insurancePolicyNumber.trim()
						: "";

	const patientSnils =
		typeof (printPatient as any)?.administrativeProfile?.snils === "string" &&
		(printPatient as any).administrativeProfile.snils.trim()
			? (printPatient as any).administrativeProfile.snils.trim()
			: typeof (printPatient as any)?.snils === "string" && (printPatient as any).snils.trim()
				? (printPatient as any).snils.trim()
				: "";

	const patientPhone =
		typeof (printPatient as any)?.phone === "string" && (printPatient as any).phone.trim()
			? (printPatient as any).phone.trim()
			: "";

	const patientAddress =
		typeof (printPatient as any)?.administrativeProfile?.registrationAddress === "string" &&
		(printPatient as any).administrativeProfile.registrationAddress.trim()
			? (printPatient as any).administrativeProfile.registrationAddress.trim()
			: typeof (printPatient as any)?.address === "string" && (printPatient as any).address.trim()
				? (printPatient as any).address.trim()
				: "";

	return {
		patientFullName,
		patientBirthDate,
		patientCardNumber,
		patientPassport,
		patientOms,
		patientSnils,
		patientPhone,
		patientAddress,
	};
}

export function extractDoctorMeta(
	activeDoctor: any,
	diaryDoctorFullName?: string | null,
	diaryDoctorSpecialty?: string | null,
) {
	const sessionDoctorName = formatPersonName(activeDoctor);
	const raw = Array.isArray(activeDoctor?.specialties) ? activeDoctor.specialties : [];
	const codes = raw.map((x: unknown) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
	const meaningful = codes.filter((c: string) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const sessionDoctorSpecialty = list
		.map((c: string) => specialtyLabels[c as keyof typeof specialtyLabels] ?? c)
		.join(", ");

	return {
		sessionDoctorName,
		sessionDoctorSpecialty,
		doctorName: diaryDoctorFullName?.trim() || sessionDoctorName,
		doctorSpecialty: diaryDoctorSpecialty?.trim() || sessionDoctorSpecialty,
	};
}
