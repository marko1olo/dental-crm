import { useCallback, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { createWarrantyRemediationOrder, type WarrantyItem, type WarrantyRemediationOrder } from "../../warrantyEngine.js";
import { getWarrantyDefectTemplate, type WarrantyDefectType, type WarrantyRemediationMaterialItem } from "../../warrantyPresets.js";
import { denteClinicalMutationHeaders } from "../../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { showToast } from "../../../GlobalToast";
import type { WarrantyPatientMeta } from "../types";

export interface UseWarrantyRemediationParams {
	certificateId: string;
	organizationId?: string | null | undefined;
	patient?: WarrantyPatientMeta | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	items: WarrantyItem[];
	onRemediationCreated?: ((order: WarrantyRemediationOrder) => void) | undefined;
}

export function useWarrantyRemediationState({
	certificateId, organizationId, patient, doctorId, doctorName, doctorSpecialty, clinicName, items, onRemediationCreated,
}: UseWarrantyRemediationParams) {
	const [remediations, setRemediations] = useState<WarrantyRemediationOrder[]>([]);
	const [selectedRemediationTooth, setSelectedRemediationTooth] = useState(items[0]?.toothNumber ?? "");
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
		const tooth = selectedRemediationTooth || (items[0]?.toothNumber ?? "—");
		const matchedItem = items.find((it) => it.toothNumber === tooth);
		const order = createWarrantyRemediationOrder({
			certificateId, toothNumber: tooth, originalWorkTitle: matchedItem?.clinicalWorkTitle || "Ранее выполненная работа",
			defectType: selectedDefectType, doctorName: doctorName || "Лечащий врач-стоматолог", doctorSpecialty: doctorSpecialty || "Врач-стоматолог",
			patientFullName: patient?.fullName || "Пациент стоматологической клиники", patientCardNumber: patient?.cardNumber || "МК-2026",
			clinicName: clinicName || "Стоматологическая клиника", customFinding: customRemediationFinding,
			customAction: customRemediationAction, materials: remediationMaterials, notes: remediationNotes,
		});

		setRemediations((prev) => [order, ...prev]);
		const isLab = ["ceramic_chip", "crown_decementation", "denture_fracture", "screw_loosening"].includes(selectedDefectType) ||
			matchedItem?.category === "ceramic_crown_veneer" || matchedItem?.category === "removable_prosthesis";
		const ztlNote = isLab ? ` • [ЗТЛ: рекламация. Наряд: ${matchedItem?.labOrderNumber || "б/н"}]` : "";

		// Мандат 8v: Реальное фоновое списание расходных материалов со склада по гарантийному акту (/api/inventory/:orgId/deduct)
		let stockDeductedOnServer = remediationMaterials.length === 0;
		if (remediationMaterials && remediationMaterials.length > 0) {
			try {
				const resolvedOrgId =
					organizationId ||
					(typeof window !== "undefined"
						? sessionStorage.getItem("dente_org_id") || localStorage.getItem("dente_org_id")
						: null);
				const deductUrl = resolvedOrgId
					? `/api/inventory/${encodeURIComponent(resolvedOrgId)}/deduct`
					: "/api/inventory/deduct";
				const deductRes = await fetch(deductUrl, {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						...(resolvedOrgId ? { organizationId: resolvedOrgId } : {}),
						reason: `Списание по гарантийному акту ${order.orderNumber} (Зуб ${tooth}): ${order.defectTitle}`,
						operationTitle: `Гарантийное устранение ${order.orderNumber}`,
						allowOverdraft: true,
						items: remediationMaterials.map((m) => ({
							itemName: m.name,
							quantity: m.quantity || 1,
							allowOverdraft: true,
						})),
					}),
				});
				if (deductRes.ok) {
					stockDeductedOnServer = true;
				} else {
					const errText = await deductRes.text().catch(() => "");
					clientLogger.warn("[useWarrantyRemediationState] Ошибка списания расходников по гарантии", {
						status: deductRes.status,
						errText,
					}, { module: "Warranty" });
				}
			} catch (whErr) {
				clientLogger.warn("[useWarrantyRemediationState] Non-blocking warehouse deduct error", whErr, {
					module: "Warranty",
				});
			}
		}

		setRemediationSuccessNotice(
			`Акт ${order.orderNumber} (0 ₽) успешно сформирован!${isLab ? " Рекламация в ЗТЛ создана." : ""} ${
				stockDeductedOnServer ? "Материалы списаны со склада." : "Списание со склада ожидает синхронизации."
			}`,
		);

		if (patient?.id) {
			try {
				let effectiveDoctorId =
					doctorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId)
						? doctorId
						: undefined;

				if (!effectiveDoctorId && typeof window !== "undefined") {
					const stored =
						sessionStorage.getItem("dente_staff_id") ||
						localStorage.getItem("dente_active_doctor_id") ||
						sessionStorage.getItem("dente_user_id") ||
						localStorage.getItem("dente_user_id");
					if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored)) {
						effectiveDoctorId = stored;
					}
				}

				const numericTooth = Number.parseInt(tooth.replace(/\D/g, ""), 10);

				const reclRes = await fetch(`/api/patients/${patient.id}/reclamations`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						complicationDetails: `Гарантийный случай: ${order.defectTitle} (Зуб ${tooth}). ${customRemediationFinding || ""}${ztlNote}`,
						proposedAction: `Гарантийная переделка (0 ₽): ${customRemediationAction || ""}`,
						...(effectiveDoctorId ? { doctorId: effectiveDoctorId } : {}),
						toothNumber: Number.isFinite(numericTooth) ? numericTooth : undefined,
						warrantyCertificateId: certificateId,
						defectType: selectedDefectType,
					}),
				});

				if (!reclRes.ok) {
					const errBody = (await reclRes.json().catch(() => null)) as { message?: string; error?: string } | null;
					const errMsg = errBody?.message || errBody?.error || `Код ошибки ${reclRes.status}`;
					clientLogger.warn("[useWarrantyRemediationState] Ошибка фиксации рекламации", { status: reclRes.status, errMsg }, { module: "Warranty" });
					showToast(`Внимание: рекламация не зафиксирована на сервере (${errMsg})`, "error");
				} else {
					showToast(
						stockDeductedOnServer
							? `Акт ${order.orderNumber} (0 ₽) оформлен. Расходники списаны по гарантии.`
							: `Акт ${order.orderNumber} (0 ₽) оформлен.`,
						"success",
					);
				}
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : "Не удалось связаться с сервером";
				clientLogger.error("[useWarrantyRemediationState] Failed to persist warranty reclamation to backend", err, {
					module: "Warranty",
				});
				showToast(`Сбой сохранения рекламации: ${errMsg}`, "error");
			}
		} else {
			showToast(`Акт ${order.orderNumber} (0 ₽) сформирован локально.`, "info");
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
