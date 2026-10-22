import type { SterilizerEquipment } from "@dental/shared";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import { showToast } from "../GlobalToast.js";

export async function recommissionSterilizerItem(
	item: SterilizerEquipment,
	onSuccess: () => Promise<void>,
	onLocalFallback: () => void,
): Promise<void> {
	try {
		const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
			method: "PUT",
			headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ action: "recommission" }),
		}).catch(() => null);

		if (res && res.ok) {
			showToast(`Аппарат «${item.name}» восстановлен в эксплуатации`, "success");
			await onSuccess();
		} else {
			onLocalFallback();
			showToast(`Аппарат «${item.name}» восстановлен`, "success");
		}
	} catch (err) {
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
		const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
			method: "PUT",
			headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ action: "decommission", decommissionReason: reason }),
		}).catch(() => null);

		if (res && res.ok) {
			showToast(`Аппарат «${item.name}» списан и выведен из эксплуатации`, "success");
			await onSuccess();
		} else {
			onLocalFallback(reason);
			showToast(`Аппарат «${item.name}» списан`, "success");
		}
	} catch (err) {
		showToast("Ошибка списания", "error");
	}
}

export async function deleteSterilizerItem(
	item: SterilizerEquipment,
	onSuccess: () => Promise<void>,
	onLocalFallback: () => void,
): Promise<void> {
	try {
		const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
			method: "DELETE",
			headers: getDenteAuthHeaders(),
		}).catch(() => null);

		if (res && res.ok) {
			showToast(`Аппарат «${item.name}» удален из реестра`, "success");
			await onSuccess();
		} else {
			onLocalFallback();
			showToast(`Аппарат «${item.name}» удален`, "success");
		}
	} catch (err) {
		showToast("Ошибка удаления", "error");
	}
}
