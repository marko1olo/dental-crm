import {
	generateUuidV7,
	type CreateSterilizerEquipmentDto,
	type SterilizerEquipment,
	type UpdateSterilizerEquipmentDto,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import type { SterilizerFormData } from "./types.js";

export function getSterilizerAuthHeaders(): Record<string, string> {
	return denteClinicalMutationHeaders({
		"Content-Type": "application/json",
	});
}

export async function submitSterilizerData(
	formData: SterilizerFormData,
	editingEquipment: SterilizerEquipment | null | undefined,
	isEditing: boolean,
): Promise<boolean> {
	if (!formData.name.trim()) {
		showToast("Укажите наименование аппарата в клинике", "warning");
		return false;
	}
	if (!formData.brandModel.trim()) {
		showToast("Укажите марку/модель аппарата", "warning");
		return false;
	}
	if (!formData.serialNumber.trim()) {
		showToast("Укажите заводской серийный номер аппарата", "warning");
		return false;
	}
	if (formData.chamberVolumeLiters <= 0) {
		showToast("Объем камеры должен быть больше 0 литров", "warning");
		return false;
	}

	try {
		const headers = {
			...getSterilizerAuthHeaders(),
			"Idempotency-Key": generateUuidV7(),
		};
		const payload: CreateSterilizerEquipmentDto | UpdateSterilizerEquipmentDto = {
			name: formData.name.trim(),
			brandModel: formData.brandModel.trim(),
			serialNumber: formData.serialNumber.trim(),
			inventoryNumber: formData.inventoryNumber.trim() || null,
			deviceType: formData.deviceType,
			deviceClass: formData.deviceClass,
			chamberVolumeLiters: Number(formData.chamberVolumeLiters),
			locationRoom: formData.locationRoom.trim(),
			verificationExpiryDate: formData.verificationExpiryDate || null,
			lastMaintenanceDate: formData.lastMaintenanceDate || null,
			nextMaintenanceDate: formData.nextMaintenanceDate || null,
			commissioningDate: formData.commissioningDate || null,
			status: formData.status,
			notes: formData.notes.trim() || null,
		};

		const url = isEditing && editingEquipment
			? `/api/sanpin/sterilization/equipments/${editingEquipment.id}`
			: "/api/sanpin/sterilization/equipments";
		const method = isEditing ? "PUT" : "POST";

		const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
		if (res.ok) {
			showToast(`Данные аппарата «${formData.name}» успешно сохранены`, "success");
			return true;
		}
		let errorMessage = "Ошибка сохранения аппарата";
		try {
			const err = (await res.json()) as { message?: string };
			if (err.message) errorMessage = err.message;
		} catch (parseErr) {
			clientLogger.debug("sterilizerEquipmentFormApi error parse failed", parseErr);
		}
		showToast(errorMessage, "error");
		return false;
	} catch (err) {
		clientLogger.warn("submitSterilizerData failed", err);
		showToast("Сетевая ошибка сохранения", "error");
		return false;
	}
}

export async function submitSterilizerStatusChange(
	equipmentId: string,
	body: Record<string, unknown>,
	successMsg: string,
): Promise<boolean> {
	try {
		const res = await fetch(`/api/sanpin/sterilization/equipments/${equipmentId}`, {
			method: "PUT",
			headers: {
				...getSterilizerAuthHeaders(),
				"Idempotency-Key": generateUuidV7(),
			},
			body: JSON.stringify(body),
		});
		if (res.ok) {
			showToast(successMsg, "success");
			return true;
		}
		showToast("Ошибка изменения статуса", "error");
		return false;
	} catch (err) {
		clientLogger.warn("submitSterilizerStatusChange failed", err);
		showToast("Сетевая ошибка", "error");
		return false;
	}
}
