import { generateUuidV7, type CreateMedicalWasteLogDto } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";

export async function submitMedicalWasteEntry(payload: CreateMedicalWasteLogDto): Promise<boolean> {
	try {
		const res = await fetch("/api/registers/medical-waste", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(payload),
		});
		if (res.ok) {
			showToast("Запись движения отходов внесена в журнал", "success");
			return true;
		}
		let errorMessage = "Ошибка при сохранении";
		try {
			const err = (await res.json()) as { message?: string };
			if (err.message) errorMessage = err.message;
		} catch (parseErr) {
			clientLogger.debug("submitMedicalWasteEntry error parse failed", parseErr);
		}
		showToast(errorMessage, "error");
		return false;
	} catch (err) {
		clientLogger.warn("submitMedicalWasteEntry failed", err);
		showToast("Сетевая ошибка при сохранении", "error");
		return false;
	}
}
