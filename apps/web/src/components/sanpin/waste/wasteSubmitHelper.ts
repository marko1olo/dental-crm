import type { CreateMedicalWasteLogDto } from "@dental/shared";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";

export async function submitMedicalWasteEntry(payload: CreateMedicalWasteLogDto): Promise<boolean> {
	try {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const res = await fetch("/api/registers/medical-waste", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
			body: JSON.stringify(payload),
		});
		if (res.ok) {
			showToast("Запись движения отходов внесена в журнал", "success");
			return true;
		}
		const err = await res.json().catch(() => ({}));
		showToast(err.message || "Ошибка при сохранении", "error");
		return false;
	} catch {
		showToast("Сетевая ошибка при сохранении", "error");
		return false;
	}
}
