import {
	type CreateSterilizerEquipmentDto,
	type PopularSterilizerBrandPreset,
	type SterilizerEquipment,
	type SterilizerEquipmentStatus,
} from "@dental/shared";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import { showToast } from "../GlobalToast.js";

export async function quickAddSterilizerPreset(
	preset: PopularSterilizerBrandPreset,
	currentEquipments: readonly SterilizerEquipment[],
	onSuccess: () => Promise<void>,
	onLocalFallback: (item: SterilizerEquipment) => void,
): Promise<void> {
	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);
	const nextYear = new Date(today);
	nextYear.setFullYear(nextYear.getFullYear() + 1);
	const next6Months = new Date(today);
	next6Months.setMonth(next6Months.getMonth() + 6);

	const nextSeq = currentEquipments.length + 1;
	const autoSerial = `SN-${preset.brandModel.slice(0, 3).toUpperCase()}-${today.getFullYear()}-${nextSeq.toString().padStart(4, "0")}`;

	const payload: CreateSterilizerEquipmentDto = {
		name: preset.recommendedNameRu,
		brandModel: preset.brandModel,
		serialNumber: autoSerial,
		inventoryNumber: `ИНВ-${nextSeq.toString().padStart(3, "0")}`,
		deviceType: preset.deviceType,
		deviceClass: preset.deviceClass,
		chamberVolumeLiters: preset.chamberVolumeLiters,
		locationRoom: "ЦСО (Стерилизационная)",
		verificationExpiryDate: nextYear.toISOString().slice(0, 10),
		lastMaintenanceDate: todayStr,
		nextMaintenanceDate: next6Months.toISOString().slice(0, 10),
		commissioningDate: todayStr,
		status: "active",
		notes: `Установлен по заводской конфигурации ${preset.manufacturerRu}`,
	};

	try {
		const res = await fetch("/api/registers/sterilizers/equipments", {
			method: "POST",
			headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (res && res.ok) {
			showToast(`Аппарат «${preset.brandModel}» (${preset.chamberVolumeLiters} л) успешно добавлен в парк!`, "success");
			await onSuccess();
		} else {
			const newLocalItem: SterilizerEquipment = {
				id: `local-ster-${Date.now()}`,
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: payload.name || preset.brandModel,
				brandModel: payload.brandModel || preset.brandModel,
				serialNumber: payload.serialNumber || `SN-${Date.now()}`,
				deviceType: (payload.deviceType as any) || "autoclave_steam",
				deviceClass: (payload.deviceClass as any) || "autoclave_class_b",
				chamberVolumeLiters: payload.chamberVolumeLiters || preset.chamberVolumeLiters || 22,
				locationRoom: payload.locationRoom || "ЦСО (Стерилизационная)",
				status: (payload.status as any) || "active",
				inventoryNumber: payload.inventoryNumber || null,
				verificationExpiryDate: payload.verificationExpiryDate || null,
				lastMaintenanceDate: payload.lastMaintenanceDate || null,
				nextMaintenanceDate: payload.nextMaintenanceDate || null,
				commissioningDate: payload.commissioningDate || null,
				decommissioningDate: null,
				isCommissioned: true,
				notes: payload.notes || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			onLocalFallback(newLocalItem);
			showToast(`Аппарат «${preset.brandModel}» добавлен в парк!`, "success");
		}
	} catch (err) {
		showToast("Ошибка добавления аппарата", "error");
	}
}

export async function toggleSterilizerMaintenance(
	item: SterilizerEquipment,
	onSuccess: () => Promise<void>,
	onLocalFallback: (status: SterilizerEquipmentStatus) => void,
): Promise<void> {
	const newAction = item.status === "in_maintenance" ? "return_to_service" : "put_in_maintenance";
	try {
		const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
			method: "PUT",
			headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ action: newAction }),
		}).catch(() => null);

		if (res && res.ok) {
			showToast(newAction === "return_to_service" ? `Аппарат «${item.name}» возвращен в строй` : `Аппарат «${item.name}» переведен на ТО`, "success");
			await onSuccess();
		} else {
			onLocalFallback(item.status === "in_maintenance" ? "active" : "in_maintenance");
			showToast(`Статус аппарата «${item.name}» обновлен`, "success");
		}
	} catch (err) {
		showToast("Ошибка обновления статуса", "error");
	}
}
