import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type CreateSterilizerEquipmentDto,
	type PopularSterilizerBrandPreset,
	type SterilizerEquipment,
	type UpdateSterilizerEquipmentDto,
} from "@dental/shared";
import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import type { SterilizerFormData, SterilizerTabId } from "./types";

const INITIAL_FORM_DATA: SterilizerFormData = {
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

export function useSterilizerEquipmentForm(
	editingEquipment: SterilizerEquipment | null | undefined,
	isOpen: boolean,
	onSuccess?: () => void,
	onClose?: () => void,
) {
	const isEditing = Boolean(editingEquipment);
	const [activeTab, setActiveTab] = useState<SterilizerTabId>("passport");
	const [formData, setFormData] = useState<SterilizerFormData>(INITIAL_FORM_DATA);
	const [submitting, setSubmitting] = useState(false);
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const [showDecommissionConfirm, setShowDecommissionConfirm] = useState(false);
	const [decommissionReason, setDecommissionReason] = useState("Акт технической экспертизы и дефектации № ");

	useEffect(() => {
		setShowDecommissionConfirm(false);
		if (editingEquipment) {
			setDecommissionReason(`Акт технической экспертизы и дефектации № ${editingEquipment.inventoryNumber || ""}`.trim());
			setFormData({
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
			});
			setSelectedPresetId(null);
		} else {
			const today = new Date();
			const todayStr = today.toISOString().slice(0, 10);
			const nextYear = new Date(today);
			nextYear.setFullYear(nextYear.getFullYear() + 1);
			const next6Months = new Date(today);
			next6Months.setMonth(next6Months.getMonth() + 6);

			const defaultPreset = POPULAR_STERILIZER_BRAND_PRESETS[0]!;
			setFormData({
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
			});
			setSelectedPresetId(defaultPreset.id);
		}
	}, [editingEquipment, isOpen]);

	const updateField = <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (field === "brandModel") setSelectedPresetId(null);
	};

	const applyPreset = (preset: PopularSterilizerBrandPreset) => {
		setSelectedPresetId(preset.id);
		setFormData((prev) => ({
			...prev,
			brandModel: preset.brandModel,
			name: preset.recommendedNameRu,
			deviceType: preset.deviceType,
			deviceClass: preset.deviceClass,
			chamberVolumeLiters: preset.chamberVolumeLiters,
		}));
	};

	const getAuthHeaders = () => {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		return {
			"Content-Type": "application/json",
			...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
			...(staffToken ? { "X-Staff-Token": staffToken } : {}),
		};
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) return showToast("Укажите наименование аппарата в клинике", "warning");
		if (!formData.brandModel.trim()) return showToast("Укажите марку/модель аппарата", "warning");
		if (!formData.serialNumber.trim()) return showToast("Укажите заводской серийный номер аппарата", "warning");
		if (formData.chamberVolumeLiters <= 0) return showToast("Объем камеры должен быть больше 0 литров", "warning");

		try {
			setSubmitting(true);
			const headers = getAuthHeaders();
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
				if (onSuccess) onSuccess();
				if (onClose) onClose();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка сохранения аппарата", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка сохранения", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const performStatusAction = async (body: Record<string, unknown>, successMsg: string) => {
		if (!editingEquipment) return;
		try {
			setSubmitting(true);
			const res = await fetch(`/api/registers/sterilizers/equipments/${editingEquipment.id}`, {
				method: "PUT",
				headers: getAuthHeaders(),
				body: JSON.stringify(body),
			});
			if (res.ok) {
				showToast(successMsg, "success");
				if (onSuccess) onSuccess();
				if (onClose) onClose();
			} else {
				showToast("Ошибка изменения статуса", "error");
			}
		} catch {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
			setShowDecommissionConfirm(false);
		}
	};

	return {
		isEditing,
		activeTab,
		setActiveTab,
		formData,
		updateField,
		selectedPresetId,
		applyPreset,
		submitting,
		showDecommissionConfirm,
		setShowDecommissionConfirm,
		decommissionReason,
		setDecommissionReason,
		handleSubmit,
		handleQuickMaintenance: () => performStatusAction({ action: "put_in_maintenance", notes: formData.notes || "Выведен на плановое ТО" }, "Аппарат переведен в статус «На техобслуживании (ТО)»"),
		handleQuickReturnToService: () => performStatusAction({ action: "return_to_service" }, "Аппарат успешно возвращен в строй и допущен к стерилизации"),
		handleQuickDecommission: (customReason?: string) => performStatusAction({ action: "decommission", decommissionReason: customReason?.trim() || decommissionReason.trim() }, "Аппарат списан и выведен из реестра действующих стерилизаторов"),
	};
}
