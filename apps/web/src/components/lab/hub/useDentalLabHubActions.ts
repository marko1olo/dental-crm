import { useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	type DentalLabWorkflowOrder, LAB_WORKFLOW_STATUSES,
	advanceLabOrderStage, advanceLabOrderTechStage,
	sendOrderToWarrantyRework, getNextLabProductionStage,
	generateDentalLabOrderA4PrintBlank, exportDentalLabOrdersToCsv,
} from "../dentalLabWorkflowEngine";
import {
	LAB_TECHNOLOGICAL_STAGES, LAB_TECHNOLOGICAL_STAGE_ORDER, type LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";

export function useDentalLabHubActions(
	setOrders: React.Dispatch<React.SetStateAction<DentalLabWorkflowOrder[]>>,
	onSaveOrder: ((order: DentalLabWorkflowOrder) => void) | undefined,
	showToast: (msg: string) => void,
	onOpenReadyInClinicPrompt: (order: DentalLabWorkflowOrder) => void,
) {
	const handleAdvanceStage = useCallback((order: DentalLabWorkflowOrder) => {
		const next = getNextLabProductionStage(order.currentStage);
		if (!next) return;
		const updated = advanceLabOrderStage(order, next, "Врач-ортопед", `Перевод на ${LAB_WORKFLOW_STATUSES[next].nameRu}`);
		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		onSaveOrder?.(updated);
		showToast(`Наряд № ${order.orderNumber}: статус «${LAB_WORKFLOW_STATUSES[next].nameRu}»`);
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ stage: next }),
		}).catch(() => {});
		if (next === "fitting_scheduled") onOpenReadyInClinicPrompt(updated);
	}, [onOpenReadyInClinicPrompt, onSaveOrder, setOrders, showToast]);

	const handleAdvanceTechStage = useCallback((order: DentalLabWorkflowOrder, targetTech?: LabTechnologicalStageId) => {
		const stages = LAB_TECHNOLOGICAL_STAGE_ORDER;
		const cur = stages.indexOf(order.techStage || "impression_scan");
		const next = targetTech || (cur >= 0 && cur < stages.length - 1 ? stages[cur + 1] : undefined);
		if (!next) return;
		const updated = advanceLabOrderTechStage(order, next, "Врач-ортопед", `Этап: ${LAB_TECHNOLOGICAL_STAGES[next].nameRu}`);
		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		onSaveOrder?.(updated);
		showToast(`Наряд № ${order.orderNumber}: этап «${LAB_TECHNOLOGICAL_STAGES[next].shortTitleRu}»`);
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ stage: next }),
		}).catch(() => {});
		if (next === "ready_in_clinic") onOpenReadyInClinicPrompt(updated);
	}, [onOpenReadyInClinicPrompt, onSaveOrder, setOrders, showToast]);

	const handleWarrantyReworkSubmit = useCallback((order: DentalLabWorkflowOrder, reason: string) => {
		const updated = sendOrderToWarrantyRework(order, reason, "Врач-ортопед");
		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		onSaveOrder?.(updated);
		showToast(`Наряд № ${order.orderNumber}: оформлена рекламация (0 ₽ для пациента)`);
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ stage: "warranty_rework", status: "refitting", notes: reason }),
		}).catch(() => {});
	}, [onSaveOrder, setOrders, showToast]);

	const handleCreateOrder = useCallback((created: DentalLabWorkflowOrder) => {
		setOrders((prev) => [created, ...prev]);
		onSaveOrder?.(created);
		showToast(`Наряд № ${created.orderNumber} успешно создан`);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: created }));
		}
		fetch("/api/clinical/lab-orders", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				orderNumber: created.orderNumber, patientId: created.patientId, patientName: created.patientName,
				doctorId: created.doctorId, doctorName: created.doctorName, clinicName: created.clinicName,
				labName: created.labName, workTypeId: created.workTypeId, materialName: created.materialName,
				toothFdi: created.selectedTeeth.join(","), shadeCode: created.shadeCode,
				priceRub: created.financials.patientPriceTotalRub, costRub: created.financials.labCostTotalRub,
				status: created.currentStage, expectedLabDate: created.expectedLabDateIso, fittingDate: created.fittingDate,
			}),
		}).catch(() => {});
	}, [onSaveOrder, setOrders, showToast]);

	const handlePrintBlank = useCallback((order: DentalLabWorkflowOrder) => {
		const html = generateDentalLabOrderA4PrintBlank(order);
		const win = window.open("", "_blank");
		if (win) {
			win.document.open();
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 300);
		}
	}, []);

	const handleExportCsv = useCallback((list: DentalLabWorkflowOrder[]) => {
		const csv = exportDentalLabOrdersToCsv(list);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Наряды_ЗТЛ_DENTE_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast(`Экспортировано ${list.length} нарядов в CSV`);
	}, [showToast]);

	return {
		handleAdvanceStage, handleAdvanceTechStage, handleWarrantyReworkSubmit,
		handleCreateOrder, handlePrintBlank, handleExportCsv,
	};
}
