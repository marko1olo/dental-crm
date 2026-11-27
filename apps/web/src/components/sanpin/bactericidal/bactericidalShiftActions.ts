import { generateUuidV7, type BactericidalEquipment } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { executePreShift30Min, executeShiftAutopilot } from "../bactericidalShiftHelpers";

export async function openMorningShiftAction({
	equipments,
	onProvisionFallback,
	onRefresh,
}: {
	equipments: readonly BactericidalEquipment[];
	onProvisionFallback: () => Promise<BactericidalEquipment[]>;
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

	const targetId = currentEquips.length === 1 ? currentEquips[0]?.id : undefined;
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
	});

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
		clientLogger.warn("openMorningShiftAction failed", err);
		showToast("Сетевая ошибка при открытии утренней смены", "error");
	}
}

export async function closeEveningShiftAction({
	equipments,
	onProvisionFallback,
	onRefresh,
}: {
	equipments: readonly BactericidalEquipment[];
	onProvisionFallback: () => Promise<BactericidalEquipment[]>;
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

	const targetId = currentEquips.length === 1 ? currentEquips[0]?.id : undefined;
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
	});

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
		clientLogger.warn("closeEveningShiftAction failed", err);
		showToast("Сетевая ошибка при закрытии вечерней смены", "error");
	}
}
