import { generateUuidV7, type SterilizerEquipment } from "@dental/shared";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
import { showToast } from "../GlobalToast.js";

export async function recommissionSterilizerItem(
	item: SterilizerEquipment,
	onSuccess: () => Promise<void>,
	onLocalFallback: () => void,
): Promise<void> {
	try {
		const res = await fetch(`/api/sanpin/sterilization/equipments/${item.id}`, {
			method: "PUT",
			headers: getDenteAuthHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({ action: "recommission" }),
		});

		if (res.ok) {
			showToast(`Аппарат «${item.name}» восстановлен в эксплуатации`, "success");
			await onSuccess();
		} else {
			clientLogger.warn("[sterilizerDecommissionActions] Recommission HTTP error", {
				id: item.id,
				status: res.status,
			});
			onLocalFallback();
			showToast(`Аппарат «${item.name}» восстановлен`, "success");
		}
	} catch (err) {
		clientLogger.warn("[sterilizerDecommissionActions] Recommission failed", { error: String(err) });
		showToast("Ошибка восстановления", "error");
	}
}

export async function decommissionSterilizerItem(
	item: SterilizerEquipment,
	reason: string,
	onSuccess: () => Promise<void>,
	onLocalFallback: (reason: string) => void,
): Promise<void> {
	try {
		const res = await fetch(`/api/sanpin/sterilization/equipments/${item.id}`, {
			method: "PUT",
			headers: getDenteAuthHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({ action: "decommission", decommissionReason: reason }),
		});

		if (res.ok) {
			showToast(`Аппарат «${item.name}» списан и выведен из эксплуатации`, "success");
			await onSuccess();
		} else {
			clientLogger.warn("[sterilizerDecommissionActions] Decommission HTTP error", {
				id: item.id,
				status: res.status,
			});
			onLocalFallback(reason);
			showToast(`Аппарат «${item.name}» списан`, "success");
		}
	} catch (err) {
		clientLogger.warn("[sterilizerDecommissionActions] Decommission failed", { error: String(err) });
		showToast("Ошибка списания", "error");
	}
}

export async function deleteSterilizerItem(
	item: SterilizerEquipment,
	onSuccess: () => Promise<void>,
	onLocalFallback: () => void,
): Promise<void> {
	try {
		const res = await fetch(`/api/sanpin/sterilization/equipments/${item.id}`, {
			method: "DELETE",
			headers: getDenteAuthHeaders({
				"Idempotency-Key": generateUuidV7(),
			}),
		});

		if (res.ok) {
			showToast(`Аппарат «${item.name}» удален из реестра`, "success");
			await onSuccess();
		} else {
			clientLogger.warn("[sterilizerDecommissionActions] Delete HTTP error", {
				id: item.id,
				status: res.status,
			});
			onLocalFallback();
			showToast(`Аппарат «${item.name}» удален`, "success");
		}
	} catch (err) {
		clientLogger.warn("[sterilizerDecommissionActions] Delete failed", { error: String(err) });
		showToast("Ошибка удаления", "error");
	}
}
