import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";

export async function executeQuickShiftWaste(onSuccess: () => Promise<void>) {
	try {
		const res = await fetch("/api/registers/medical-waste/quick-shift-bundle", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({}),
		});

		if (res.ok) {
			showToast(
				"Отходы смены зафиксированы (Белый пакет Класса А 3.2 кг + Желтый пакет Класса Б 2.5 кг + Контейнер игл 0.8 кг)",
				"success",
			);
			await onSuccess();
		} else {
			let errorMessage = "Ошибка при фиксации смены отходов";
			try {
				const err = (await res.json()) as { message?: string };
				if (err.message) errorMessage = err.message;
			} catch (parseErr) {
				clientLogger.debug("executeQuickShiftWaste error parse failed", parseErr);
			}
			showToast(errorMessage, "error");
		}
	} catch (err) {
		clientLogger.warn("executeQuickShiftWaste failed", err);
		showToast("Сетевая ошибка при фиксации отходов смены", "error");
	}
}
