import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type SterilizerEquipment,
} from "@dental/shared";
import type { SterilizerFormData } from "./types.js";

export const INITIAL_STERILIZER_FORM_DATA: SterilizerFormData = {
	name: "",
	brandModel: "",
	serialNumber: "",
	inventoryNumber: "",
	deviceType: "autoclave_steam",
	deviceClass: "autoclave_class_b",
	chamberVolumeLiters: 22,
	locationRoom: "ЦСО (Стерилизационная)",
	verificationExpiryDate: "",
	lastMaintenanceDate: "",
	nextMaintenanceDate: "",
	commissioningDate: "",
	status: "active",
	notes: "",
};

export function buildInitialSterilizerFormData(
	editingEquipment: SterilizerEquipment | null | undefined,
): {
	formData: SterilizerFormData;
	presetId: string | null;
	decommissionReason: string;
} {
	if (editingEquipment) {
		return {
			decommissionReason: `Акт технической экспертизы и дефектации № ${editingEquipment.inventoryNumber || ""}`.trim(),
			presetId: null,
			formData: {
				name: editingEquipment.name,
				brandModel: editingEquipment.brandModel,
				serialNumber: editingEquipment.serialNumber,
				inventoryNumber: editingEquipment.inventoryNumber || "",
				deviceType: editingEquipment.deviceType,
				deviceClass: editingEquipment.deviceClass,
				chamberVolumeLiters: Number(editingEquipment.chamberVolumeLiters) || 22,
				locationRoom: editingEquipment.locationRoom || "ЦСО (Стерилизационная)",
				verificationExpiryDate: editingEquipment.verificationExpiryDate || "",
				lastMaintenanceDate: editingEquipment.lastMaintenanceDate || "",
				nextMaintenanceDate: editingEquipment.nextMaintenanceDate || "",
				commissioningDate: editingEquipment.commissioningDate || "",
				status: editingEquipment.status || "active",
				notes: editingEquipment.notes || "",
			},
		};
	}

	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);
	const nextYear = new Date(today);
	nextYear.setFullYear(nextYear.getFullYear() + 1);
	const next6Months = new Date(today);
	next6Months.setMonth(next6Months.getMonth() + 6);

	const defaultPreset = POPULAR_STERILIZER_BRAND_PRESETS[0]!;
	return {
		decommissionReason: "Акт технической экспертизы и дефектации № ",
		presetId: defaultPreset.id,
		formData: {
			name: defaultPreset.recommendedNameRu,
			brandModel: defaultPreset.brandModel,
			serialNumber: "",
			inventoryNumber: "",
			deviceType: defaultPreset.deviceType,
			deviceClass: defaultPreset.deviceClass,
			chamberVolumeLiters: defaultPreset.chamberVolumeLiters,
			locationRoom: "ЦСО (Стерилизационная)",
			verificationExpiryDate: nextYear.toISOString().slice(0, 10),
			lastMaintenanceDate: todayStr,
			nextMaintenanceDate: next6Months.toISOString().slice(0, 10),
			commissioningDate: todayStr,
			status: "active",
			notes: "",
		},
	};
}
