import type {
	CreateSterilizerEquipmentDto,
	SterilizerEquipment,
	UpdateSterilizerEquipmentDto,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage.js";
import type { SterilizerFormData } from "./types.js";

export function getSterilizerAuthHeaders() {
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	return {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
	};
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
		const headers = getSterilizerAuthHeaders();
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
			? `/api/registers/sterilizers/equipments/${editingEquipment.id}`
			: "/api/registers/sterilizers/equipments";
		const method = isEditing ? "PUT" : "POST";

		const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
		if (res.ok) {
			showToast(`Данные аппарата «${formData.name}» успешно сохранены`, "success");
			return true;
		}
		const err = await res.json().catch(() => ({}));
		showToast(err.message || "Ошибка сохранения аппарата", "error");
		return false;
	} catch {
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
		const res = await fetch(`/api/registers/sterilizers/equipments/${equipmentId}`, {
			method: "PUT",
			headers: getSterilizerAuthHeaders(),
			body: JSON.stringify(body),
		});
		if (res.ok) {
			showToast(successMsg, "success");
			return true;
		}
		showToast("Ошибка изменения статуса", "error");
		return false;
	} catch {
		showToast("Сетевая ошибка", "error");
		return false;
	}
}
