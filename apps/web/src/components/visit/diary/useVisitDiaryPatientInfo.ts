import { useState, useEffect } from "react";
import { formatPersonName } from "./visitDiaryTypes";
import { realVisitFieldId } from "../visitIdentity";
import { specialtyLabels } from "../../../workspaceUiLabels";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import type { RadiologySnapshotItem } from "../VisitSummaryModal";

export interface UseVisitDiaryPatientInfoParams {
	readonly patientId: string;
	readonly visitId?: string;
	readonly initialTeethData?: readonly {
		toothNumber: number;
		state: string;
		surfaces?: readonly string[] | null;
	}[];
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly clinicSettings?: any;
	readonly diaryDoctorFullName?: string | null;
	readonly diaryDoctorSpecialty?: string | null;
	readonly ctxDashboard?: any;
}

export function useVisitDiaryPatientInfo({
	patientId,
	visitId,
	initialTeethData = [],
	activePatient,
	activeDoctor,
	clinicSettings,
	diaryDoctorFullName,
	diaryDoctorSpecialty,
	ctxDashboard,
}: UseVisitDiaryPatientInfoParams) {
	const [activeTeeth, setActiveTeeth] = useState<
		readonly {
			toothNumber: number;
			state: string;
			surfaces?: readonly string[] | null;
		}[]
	>(initialTeethData);

	useEffect(() => {
		if (initialTeethData && initialTeethData.length > 0) {
			setActiveTeeth(initialTeethData);
			return;
		}
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/patients/${encodeURIComponent(patientId)}/odontogram`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!cancelled && data?.success && Array.isArray(data.states)) {
					setActiveTeeth(data.states);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [patientId, initialTeethData]);

	const [radiologySnapshots, setRadiologySnapshots] = useState<
		readonly RadiologySnapshotItem[]
	>([]);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/radiology/slices?patientId=${encodeURIComponent(patientId)}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (cancelled) return;
				const raw = Array.isArray(data?.slices)
					? data.slices
					: Array.isArray(data)
						? data
						: [];
				if (Array.isArray(raw)) {
					const mapped: RadiologySnapshotItem[] = raw
						.map((s: any, index: number) => ({
							id: String(
								s.id ||
									(s.sliceId
										? `slice_${s.sliceId}`
										: `rad_${visitId || patientId}_${index}`),
							),
							label: String(
								s.name || s.title || s.label || s.notes || "Снимок ОПТГ/КЛКТ",
							),
							imageDataUri: String(s.imageDataUri || s.previewUrl || s.url || ""),
							capturedAt: s.capturedAt || s.createdAt || undefined,
						}))
						.filter((item) => Boolean(item.imageDataUri));
					setRadiologySnapshots(mapped);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [patientId, visitId]);

	const selectedPatientId = realVisitFieldId(
		activePatient && typeof activePatient === "object" && "id" in activePatient
			? (activePatient as { id?: unknown }).id
			: null,
	);
	const diaryPatientId = realVisitFieldId(patientId);
	const printPatient =
		(diaryPatientId && selectedPatientId && selectedPatientId === diaryPatientId
			? activePatient
			: (ctxDashboard?.patients || []).find((p: any) => p.id === diaryPatientId) || activePatient) ?? null;

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
			: typeof (printPatient as any)?.passport === "string" &&
					(printPatient as any).passport.trim()
				? (printPatient as any).passport.trim()
				: typeof (printPatient as any)?.identityDocument === "string" &&
						(printPatient as any).identityDocument.trim()
					? (printPatient as any).identityDocument.trim()
					: "";

	const patientOms =
		typeof (printPatient as any)?.administrativeProfile?.omsPolis === "string" &&
		(printPatient as any).administrativeProfile.omsPolis.trim()
			? (printPatient as any).administrativeProfile.omsPolis.trim()
			: typeof (printPatient as any)?.administrativeProfile?.insurancePolicyNumber === "string" &&
					(printPatient as any).administrativeProfile.insurancePolicyNumber.trim()
				? (printPatient as any).administrativeProfile.insurancePolicyNumber.trim()
				: typeof (printPatient as any)?.omsPolis === "string" &&
						(printPatient as any).omsPolis.trim()
					? (printPatient as any).omsPolis.trim()
					: typeof (printPatient as any)?.insurancePolicyNumber === "string" &&
							(printPatient as any).insurancePolicyNumber.trim()
						? (printPatient as any).insurancePolicyNumber.trim()
						: "";

	const patientSnils =
		typeof (printPatient as any)?.administrativeProfile?.snils === "string" &&
		(printPatient as any).administrativeProfile.snils.trim()
			? (printPatient as any).administrativeProfile.snils.trim()
			: typeof (printPatient as any)?.snils === "string" &&
					(printPatient as any).snils.trim()
				? (printPatient as any).snils.trim()
				: "";

	const patientPhone =
		typeof (printPatient as any)?.phone === "string" &&
		(printPatient as any).phone.trim()
			? (printPatient as any).phone.trim()
			: "";

	const patientAddress =
		typeof (printPatient as any)?.administrativeProfile?.registrationAddress === "string" &&
		(printPatient as any).administrativeProfile.registrationAddress.trim()
			? (printPatient as any).administrativeProfile.registrationAddress.trim()
			: typeof (printPatient as any)?.address === "string" &&
					(printPatient as any).address.trim()
				? (printPatient as any).address.trim()
				: "";

	const clinicName =
		typeof clinicSettings?.name === "string"
			? clinicSettings.name
			: typeof clinicSettings?.clinicName === "string"
				? clinicSettings.clinicName
				: "";
	const clinicAddress =
		typeof clinicSettings?.address === "string" ? clinicSettings.address : "";
	const clinicInn =
		typeof clinicSettings?.inn === "string" ? clinicSettings.inn : "";

	const sessionDoctorName = formatPersonName(activeDoctor);
	const sessionDoctorSpecialty = (() => {
		const raw = Array.isArray(activeDoctor?.specialties)
			? activeDoctor.specialties
			: [];
		const codes = raw
			.map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
			.filter(Boolean);
		const meaningful = codes.filter((c: string) => c !== "universal");
		const list = meaningful.length > 0 ? meaningful : codes;
		return list
			.map((c: string) => specialtyLabels[c as keyof typeof specialtyLabels] ?? c)
			.join(", ");
	})();
	const doctorName = diaryDoctorFullName?.trim()
		? diaryDoctorFullName.trim()
		: sessionDoctorName;
	const doctorSpecialty = diaryDoctorSpecialty?.trim()
		? diaryDoctorSpecialty.trim()
		: sessionDoctorSpecialty;

	return {
		activeTeeth,
		setActiveTeeth,
		radiologySnapshots,
		printPatient,
		patientFullName,
		patientBirthDate,
		patientCardNumber,
		patientPassport,
		patientOms,
		patientSnils,
		patientPhone,
		patientAddress,
		clinicName,
		clinicAddress,
		clinicInn,
		sessionDoctorName,
		sessionDoctorSpecialty,
		doctorName,
		doctorSpecialty,
	};
}
