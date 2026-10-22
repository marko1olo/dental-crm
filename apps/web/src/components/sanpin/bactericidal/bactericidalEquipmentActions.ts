import { showToast } from "../../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { provisionCanonicalBactericidalEquipment } from "./bactericidalPresets";

export async function replaceLampsAction(equipmentId: string, onRefresh: () => Promise<void>) {
	try {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const res = await fetch(`/api/registers/bactericidal/equipments/${equipmentId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
			body: JSON.stringify({ action: "replace_lamps" }),
		});
		if (res.ok) {
			showToast("Замена ламп зафиксирована. Счетчик обнулен.", "success");
			await onRefresh();
		}
	} catch (err) {
		showToast("Ошибка при сбросе счетчика ламп", "error");
	}
}

export async function provisionEquipmentAction(
	showToastNotice = true,
	onRefresh: () => Promise<void>,
): Promise<any[]> {
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
	} catch (err) {
		showToast("Сетевая ошибка при подключении типового рециркулятора", "error");
		return [];
	}
}
