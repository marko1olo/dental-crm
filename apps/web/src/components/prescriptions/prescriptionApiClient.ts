import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface PrescriptionItemPayload {
	catalogDrugId?: string | null;
	innLatin: string;
	dosageFormLatin: string;
	dosageDoseConcentration: string;
	dispenseInstructionLatin: string;
	signatureDirectionRussian: string;
	tradeName?: string | null;
	quantityPackages?: number;
	durationDays?: number;
	frequencyTimesPerDay?: number;
	mealRelation?: "before_meal" | "with_meal" | "after_meal" | "independent";
}

export interface CreatePrescriptionApiPayload {
	patientId: string;
	visitId?: string | null;
	prescribingDoctorId: string;
	formType: "form_107_1_u" | "form_148_1_u_88" | "form_148_1_u_04_l";
	validityPeriod: "days_15" | "days_30" | "days_60" | "year_1";
	isSpecialChronicIndication?: boolean;
	chronicDispenseFrequencyNotes?: string | null;
	patientAddress?: string | null;
	patientSnils?: string | null;
	patientOmsPolicy?: string | null;
	clinicalDiagnosisMkb10?: string | null;
	clinicalDiagnosisDescription?: string | null;
	notes?: string | null;
	items: PrescriptionItemPayload[];
	ukepSignature?: any;
}

export async function savePrescriptionToBackend(payload: CreatePrescriptionApiPayload) {
	const res = await fetch("/api/prescriptions", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
		const errMsg =
			errJson?.message ||
			errJson?.error ||
			`Не удалось сохранить рецепт (${res.status} ${res.statusText})`;
		throw new Error(errMsg);
	}

	return await res.json();
}

export async function fetchPatientPrescriptions(patientId: string) {
	if (!patientId) return [];
	try {
		const res = await fetch(`/api/prescriptions?patientId=${encodeURIComponent(patientId)}`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return [];
		const data = await res.json();
		return data.prescriptions || [];
	} catch (e) {
		console.warn("[prescriptionApiClient] failed to fetch patient prescriptions:", e);
		return [];
	}
}

export async function signPrescriptionOnBackend(
	prescriptionId: string,
	ukepData: {
		pkcs7Signature: string;
		certificateSerialNumber?: string;
		certificateThumbprint?: string;
		certificateIssuer?: string;
		certificateValidFrom?: string;
		certificateValidTo?: string;
		doctorSnils?: string;
		signatureAlgorithm?: string;
		egiszDocumentId?: string;
	},
) {
	const res = await fetch(`/api/prescriptions/${encodeURIComponent(prescriptionId)}/sign-ukep`, {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify(ukepData),
	});

	if (!res.ok) {
		const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
		throw new Error(errJson?.message || errJson?.error || "Ошибка сохранения подписи УКЭП");
	}

	return await res.json();
}
