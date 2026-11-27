import { generateUuidV7, type BactericidalEquipment } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { provisionCanonicalBactericidalEquipment } from "./bactericidalPresets";

export async function replaceLampsAction(equipmentId: string, onRefresh: () => Promise<void>) {
	try {
		const res = await fetch(`/api/registers/bactericidal/equipments/${equipmentId}`, {
			method: "PUT",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({ action: "replace_lamps" }),
		});
		if (res.ok) {
			showToast("Замена ламп зафиксирована. Счетчик обнулен.", "success");
			await onRefresh();
		} else {
			showToast("Ошибка при сбросе счетчика ламп", "error");
		}
	} catch (err) {
		clientLogger.warn("replaceLampsAction failed", err);
		showToast("Ошибка при сбросе счетчика ламп", "error");
	}
}

export async function provisionEquipmentAction(
	showToastNotice = true,
	onRefresh: () => Promise<void>,
): Promise<BactericidalEquipment[]> {
	try {
		const created = await provisionCanonicalBactericidalEquipment();
		if (created) {
			if (showToastNotice) {
				showToast("Типовой рециркулятор (Дезар-4, Кабинет №1) успешно подключен!", "success");
			}
			await onRefresh();
			return [created];
		}
		showToast("Ошибка при подключении типового рециркулятора", "error");
		return [];
	} catch {
		showToast("Сетевая ошибка при подключении типового рециркулятора", "error");
		return [];
	}
}
