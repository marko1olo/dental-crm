import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";

export async function familyIdOfPatient(checkedPatientId: string): Promise<string | null> {
	try {
		const res = await fetch(`/api/finance/family/patient/${checkedPatientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json().catch((err) => {
			logger.error("[Dente]", err);
			showToast(actionFailureToast("Семья пациента не прочитана", (err as { status?: number })?.status ?? null), "error");
			return null;
		});
		return data && typeof data.id === "string" ? data.id : null;
	} catch {
		return null;
	}
}

export async function createFamilyGroupApi(name: string, headPatientId: string) {
	const res = await fetch("/api/finance/family", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({ name, headPatientId }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({} as { message?: string }));
		if (res.status === 409) {
			throw new Error(body.message || "Пациент уже состоит в другой семейной группе. Не создавайте вторую.");
		}
		throw new Error(body.message || "Ошибка при создании семьи");
	}
	return res.json();
}

export async function updatePatientFamilyGroupApi(patientId: string, familyGroupId: string | null) {
	const res = await fetch(`/api/patients/${patientId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({ familyGroupId }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({} as { message?: string }));
		throw new Error(body.message || "Ошибка при обновлении семейной группы пациента");
	}
	return res.json();
}

export async function searchFamilyGroupsApi(query: string) {
	const res = await fetch(`/api/finance/family?search=${encodeURIComponent(query)}`, {
		headers: denteAdminSecretRequestHeaders(),
	});
	if (!res.ok) throw new Error("Search failed");
	const data = await res.json();
	return Array.isArray(data) ? data : [];
}
