import {
	DENTAL_LAB_CONSTRUCTIONS,
	parseFdiTeethString,
	calculateZtlWageFinancials,
	createDentalLabOrderRecord,
} from "../dentalLabOrderEngine";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import type { DrawerSubmitContext } from "./dentalLabDrawerSubmitTypes";

export type { DrawerSubmitContext };

export function executeDrawerOrderSubmit(ctx: DrawerSubmitContext) {
	const { props, editingOrder, patientName, doctorName, labName, technicianName, teethInput, construction, vitaShade, translucency, stumpShade, sentDate, deadlineDate, scheduledVisit, patientPriceRub, ztlCostRub, doctorPercent, clinicalNotes, attachedScanUrl, status } = ctx;
	const teeth = parseFdiTeethString(teethInput);
	const teethFinal = teeth.length > 0 ? teeth : [16];
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];
	const fin = calculateZtlWageFinancials({ unitsCount: teethFinal.length, patientPriceRub, ztlCostRub, doctorSharePercent: doctorPercent });
	const record = createDentalLabOrderRecord({
		...(editingOrder || {}), patientName, doctorName, labName: labName.trim() || "Основная лаборатория",
		technicianName, teethFdi: teethFinal, constructionType: construction, materialRu: def?.defaultMaterialRu,
		vitaShade, translucency, stumpShade, sentDate, deadlineDate, scheduledVisitDate: scheduledVisit || undefined,
		status, patientPriceKopecks: fin.patientPriceKopecks, ztlCostKopecks: fin.ztlCostKopecks,
		doctorSharePercent: fin.doctorSharePercent, clinicalNotes, attachedScanUrl,
	});
	props.onSaveOrder?.(record, Boolean(editingOrder));
	props.onOrderSaved?.(record);
	showToast(editingOrder ? "Наряд-заказ сохранен" : "Наряд-заказ успешно оформлен", "success");
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: record }));
		try {
			const isExisting = Boolean(editingOrder?.id && /^[0-9a-fA-F-]{36}$/.test(editingOrder.id));
			const url = isExisting ? `/api/clinical/lab-orders/${editingOrder.id}` : "/api/clinical/lab-orders";
			const method = isExisting ? "PUT" : "POST";
			void fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": `lab-drawer-${record.id || Date.now()}`,
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId: props.patientId || props.currentPatientId || editingOrder?.patientId,
					patientName,
					doctorId: props.doctorId || props.currentDoctorId || editingOrder?.doctorId,
					doctorName,
					labName: labName.trim() || "Основная лаборатория",
					teethFdi: teethFinal,
					toothFdi: teethFinal.join(", "),
					constructionType: construction,
					material: def?.defaultMaterialRu || construction,
					colorVita: vitaShade,
					shadeCode: vitaShade,
					status,
					sentDate,
					dueDate: deadlineDate,
					scheduledVisitDate: scheduledVisit || undefined,
					priceRub: patientPriceRub,
					costRub: ztlCostRub,
					clinicalNotes,
					attachedImageUrl: attachedScanUrl,
					treatmentPlanId: props.treatmentPlanId,
					stageNumber: props.stageNumber,
					stageTitle: props.stageTitle,
				}),
			}).catch(() => {});
		} catch {}
	}
	props.onClose();
}

export function executeDrawerMarkReadyInClinic(ctx: DrawerSubmitContext) {
	const { props, editingOrder, patientName, doctorName, labName, technicianName, teethInput, construction, vitaShade, translucency, stumpShade, sentDate, deadlineDate, scheduledVisit, patientPriceRub, ztlCostRub, doctorPercent, clinicalNotes, attachedScanUrl } = ctx;
	const teeth = parseFdiTeethString(teethInput);
	const teethFinal = teeth.length > 0 ? teeth : [16];
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];
	const fin = calculateZtlWageFinancials({ unitsCount: teethFinal.length, patientPriceRub, ztlCostRub, doctorSharePercent: doctorPercent });
	const record = createDentalLabOrderRecord({
		...(editingOrder || {}), patientName, doctorName, labName: labName.trim() || "Основная лаборатория",
		technicianName, teethFdi: teethFinal, constructionType: construction, materialRu: def?.defaultMaterialRu,
		vitaShade, translucency, stumpShade, sentDate, deadlineDate, scheduledVisitDate: scheduledVisit || undefined,
		status: "ready_in_clinic", patientPriceKopecks: fin.patientPriceKopecks, ztlCostKopecks: fin.ztlCostKopecks,
		doctorSharePercent: fin.doctorSharePercent, clinicalNotes, attachedScanUrl,
	});
	props.onSaveOrder?.(record, Boolean(editingOrder));
	props.onOrderSaved?.(record);
	showToast("Работа принята в клинике! Ортопед уведомлен.", "success");
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-lab-order-ready", { detail: { ...record, status: "ready_in_clinic", stage: "fitting_scheduled" } }));
		window.dispatchEvent(new CustomEvent("dente-lab-order-status-changed", { detail: { orderId: record.id, status: "ready_in_clinic", stage: "fitting_scheduled" } }));
		if (editingOrder?.id && /^[0-9a-fA-F-]{36}$/.test(editingOrder.id)) {
			void fetch(`/api/clinical/lab-orders/${editingOrder.id}/status`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ status: "ready_in_clinic", stage: "fitting_scheduled" }),
			}).catch(() => {});
		}
	}
	props.onClose();
}
