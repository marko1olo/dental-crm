import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";

export async function executeQuickShiftWaste(onSuccess: () => Promise<void>) {
	try {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const res = await fetch("/api/registers/medical-waste/quick-shift-bundle", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
			body: JSON.stringify({}),
		});

		if (res.ok) {
			showToast(
				"Отходы смены зафиксированы (Белый пакет Класса А 3.2 кг + Желтый пакет Класса Б 2.5 кг + Контейнер игл 0.8 кг)",
				"success",
			);
			await onSuccess();
		} else {
			const err = await res.json().catch(() => ({}));
			showToast(err.message || "Ошибка при фиксации смены отходов", "error");
		}
	} catch {
		showToast("Сетевая ошибка при фиксации отходов смены", "error");
	}
}
