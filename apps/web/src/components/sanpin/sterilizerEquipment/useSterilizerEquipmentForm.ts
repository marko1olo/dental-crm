import type {
	PopularSterilizerBrandPreset,
	SterilizerEquipment,
} from "@dental/shared";
import { useEffect, useState } from "react";
import { submitSterilizerData, submitSterilizerStatusChange } from "./sterilizerEquipmentFormApi.js";
import {
	buildInitialSterilizerFormData,
	INITIAL_STERILIZER_FORM_DATA,
} from "./sterilizerEquipmentFormDefaults.js";
import type { SterilizerFormData, SterilizerTabId } from "./types.js";

export function useSterilizerEquipmentForm(
	editingEquipment: SterilizerEquipment | null | undefined,
	isOpen: boolean,
	onSuccess?: () => void,
	onClose?: () => void,
) {
	const isEditing = Boolean(editingEquipment);
	const [activeTab, setActiveTab] = useState<SterilizerTabId>("passport");
	const [formData, setFormData] = useState<SterilizerFormData>(INITIAL_STERILIZER_FORM_DATA);
	const [submitting, setSubmitting] = useState(false);
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const [showDecommissionConfirm, setShowDecommissionConfirm] = useState(false);
	const [decommissionReason, setDecommissionReason] = useState("Акт технической экспертизы и дефектации № ");

	useEffect(() => {
		setShowDecommissionConfirm(false);
		const initial = buildInitialSterilizerFormData(editingEquipment);
		setFormData(initial.formData);
		setSelectedPresetId(initial.presetId);
		setDecommissionReason(initial.decommissionReason);
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		const ok = await submitSterilizerData(formData, editingEquipment, isEditing);
		setSubmitting(false);
		if (ok && onSuccess) onSuccess();
		if (ok && onClose) onClose();
	};

	const performStatusAction = async (body: Record<string, unknown>, successMsg: string) => {
		if (!editingEquipment) return;
		setSubmitting(true);
		const ok = await submitSterilizerStatusChange(editingEquipment.id, body, successMsg);
		setSubmitting(false);
		setShowDecommissionConfirm(false);
		if (ok && onSuccess) onSuccess();
		if (ok && onClose) onClose();
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
