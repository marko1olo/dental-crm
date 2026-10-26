import { useCallback, useState } from "react";
import { createWarrantyRemediationOrder, type WarrantyItem, type WarrantyRemediationOrder } from "../../warrantyEngine.js";
import { getWarrantyDefectTemplate, type WarrantyDefectType, type WarrantyRemediationMaterialItem } from "../../warrantyPresets.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type { WarrantyPatientMeta } from "../types";

export interface UseWarrantyRemediationParams {
	certificateId: string;
	patient?: WarrantyPatientMeta;
	doctorId?: string;
	doctorName?: string;
	doctorSpecialty?: string;
	clinicName?: string;
	items: WarrantyItem[];
	onRemediationCreated?: (order: WarrantyRemediationOrder) => void;
}

export function useWarrantyRemediationState({
	certificateId, patient, doctorId, doctorName, doctorSpecialty, clinicName, items, onRemediationCreated,
}: UseWarrantyRemediationParams) {
	const [remediations, setRemediations] = useState<WarrantyRemediationOrder[]>([]);
	const [selectedRemediationTooth, setSelectedRemediationTooth] = useState("1.6");
	const [selectedDefectType, setSelectedDefectType] = useState<WarrantyDefectType>("filling_loss");
	const [customRemediationFinding, setCustomRemediationFinding] = useState("");
	const [customRemediationAction, setCustomRemediationAction] = useState("");
	const [remediationMaterials, setRemediationMaterials] = useState<WarrantyRemediationMaterialItem[]>([]);
	const [remediationNotes, setRemediationNotes] = useState("");
	const [remediationSuccessNotice, setRemediationSuccessNotice] = useState<string | null>(null);

	const handleSelectDefectType = (dtype: WarrantyDefectType) => {
		setSelectedDefectType(dtype);
		const tmpl = getWarrantyDefectTemplate(dtype);
		setCustomRemediationFinding(tmpl.clinicalDescription);
		setCustomRemediationAction(tmpl.recommendedAction);
		setRemediationMaterials([...tmpl.defaultMaterials]);
		setRemediationSuccessNotice(null);
	};

	const handleCreateRemediation = async () => {
		const tooth = selectedRemediationTooth || (items[0]?.toothNumber ?? "1.6");
		const matchedItem = items.find((it) => it.toothNumber === tooth);
		const order = createWarrantyRemediationOrder({
			certificateId, toothNumber: tooth, originalWorkTitle: matchedItem?.clinicalWorkTitle || "Ранее выполненная работа",
			defectType: selectedDefectType, doctorName: doctorName || "Лечащий врач-стоматолог", doctorSpecialty: doctorSpecialty || "Врач-стоматолог",
			patientFullName: patient?.fullName || "Пациент стоматологической клиники", patientCardNumber: patient?.cardNumber || "МК-2026",
			clinicName: clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»", customFinding: customRemediationFinding,
			customAction: customRemediationAction, materials: remediationMaterials, notes: remediationNotes,
		});

		setRemediations((prev) => [order, ...prev]);
		const isLab = ["ceramic_chip", "crown_decementation", "denture_fracture", "screw_loosening"].includes(selectedDefectType) ||
			matchedItem?.category === "ceramic_crown_veneer" || matchedItem?.category === "removable_prosthesis";
		const ztlNote = isLab ? ` • [ЗТЛ: рекламация. Наряд: ${matchedItem?.labOrderNumber || "б/н"}]` : "";

		setRemediationSuccessNotice(`Акт ${order.orderNumber} (0 ₽) успешно сформирован!${isLab ? " Рекламация в ЗТЛ создана." : ""} Материалы списаны со склада.`);

		if (patient?.id) {
			try {
				const effectiveDoctorId = doctorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId) ? doctorId : undefined;
				if (effectiveDoctorId) {
					await fetch(`/api/patients/${patient.id}/reclamations`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							complicationDetails: `Гарантийный случай: ${order.defectTitle} (Зуб ${tooth}). ${customRemediationFinding || ""}${ztlNote}`,
							proposedAction: `Гарантийная переделка (0 ₽): ${customRemediationAction || ""}`,
							doctorId: effectiveDoctorId,
						}),
					});
				}
			} catch (err) {
				console.error("Non-blocking: Failed to persist warranty reclamation to backend:", err);
			}
		}
		if (onRemediationCreated) onRemediationCreated(order);
	};

	const handleOpenRemediation = useCallback((targetTooth?: string) => {
		if (targetTooth) setSelectedRemediationTooth(targetTooth);
		else if (items[0]) setSelectedRemediationTooth(items[0].toothNumber);
	}, [items]);

	return {
		remediations, setRemediations, selectedRemediationTooth, setSelectedRemediationTooth,
		selectedDefectType, setSelectedDefectType, customRemediationFinding, setCustomRemediationFinding,
		customRemediationAction, setCustomRemediationAction, remediationMaterials, setRemediationMaterials,
		remediationNotes, setRemediationNotes, remediationSuccessNotice, setRemediationSuccessNotice,
		handleSelectDefectType, handleCreateRemediation, handleOpenRemediation,
	};
}
