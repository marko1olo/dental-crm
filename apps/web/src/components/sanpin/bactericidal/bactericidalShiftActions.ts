import { showToast } from "../../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { executePreShift30Min, executeShiftAutopilot } from "../bactericidalShiftHelpers";
import { provisionCanonicalBactericidalEquipment } from "./bactericidalPresets";

export async function openMorningShiftAction({
	equipments,
	onProvisionFallback,
	onRefresh,
}: {
	equipments: any[];
	onProvisionFallback: () => Promise<any[]>;
	onRefresh: () => Promise<void>;
}): Promise<void> {
	let currentEquips = equipments;
	if (currentEquips.length === 0) {
		currentEquips = await onProvisionFallback();
		if (currentEquips.length === 0) {
			showToast("Не удалось подключить типовой рециркулятор", "error");
			return;
		}
	}

	const targetId = currentEquips.length === 1 ? currentEquips[0].id : undefined;
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const headers = {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
	};

	try {
		const res = await fetch("/api/registers/bactericidal/open-morning-shift", {
			method: "POST",
			headers,
			body: JSON.stringify({
				equipmentId: targetId,
				date: new Date().toISOString().slice(0, 10),
			}),
		});

		if (res.ok) {
			const data = await res.json();
			showToast(
				data.message || "Утренняя смена открыта: бактерицидная обработка 30 мин + норма зафиксированы!",
				"success",
			);
			await onRefresh();
		} else {
			await executePreShift30Min(targetId, currentEquips, onRefresh);
		}
	} catch (err) {
		showToast("Сетевая ошибка при открытии утренней смены", "error");
	}
}

export async function closeEveningShiftAction({
	equipments,
	onProvisionFallback,
	onRefresh,
}: {
	equipments: any[];
	onProvisionFallback: () => Promise<any[]>;
	onRefresh: () => Promise<void>;
}): Promise<void> {
	let currentEquips = equipments;
	if (currentEquips.length === 0) {
		currentEquips = await onProvisionFallback();
		if (currentEquips.length === 0) {
			showToast("Не удалось подключить типовой рециркулятор", "error");
			return;
		}
	}

	const targetId = currentEquips.length === 1 ? currentEquips[0].id : undefined;
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const headers = {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
	};

	try {
		const res = await fetch("/api/registers/bactericidal/close-evening-shift", {
			method: "POST",
			headers,
			body: JSON.stringify({
				equipmentId: targetId,
				date: new Date().toISOString().slice(0, 10),
				shiftHours: 6,
			}),
		});

		if (res.ok) {
			const data = await res.json();
			showToast(
				data.message || "Вечерняя смена закрыта: финальная дезинфекция и наработка ламп зафиксированы!",
				"success",
			);
			await onRefresh();
		} else {
			await executeShiftAutopilot(6, currentEquips, onRefresh);
		}
	} catch (err) {
		showToast("Сетевая ошибка при закрытии вечерней смены", "error");
	}
}
