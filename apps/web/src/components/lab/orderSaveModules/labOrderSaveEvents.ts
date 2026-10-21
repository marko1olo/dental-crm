import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { addWorkingDays, type DentalLabOrderData } from "../labMath";
import type { SaveLabOrderParams } from "./labOrderSaveTypes";
import { buildFittingAppointmentDraft } from "./labOrderPayloadBuilder";

export function dispatchSavedOrderEvents(
	params: SaveLabOrderParams,
	resultData: DentalLabOrderData,
	isExistingOrder: boolean,
) {
	if (typeof window === "undefined") return;

	window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: resultData }));
	for (const toothNum of params.selectedTeeth) {
		window.dispatchEvent(new CustomEvent("dente-quick-tooth-apply", {
			detail: { toothNumber: toothNum, state: "Planned_Crown", patientId: params.effectivePatientId },
		}));
	}

	const effectiveFittingDate = params.scheduledVisitDate || params.ceramicTrialDate ||
		(params.dueDate ? addWorkingDays(new Date(params.dueDate), 1).toISOString().slice(0, 10) : "");

	if (effectiveFittingDate) {
		const appointmentDraft = buildFittingAppointmentDraft({
			effectivePatientId: params.effectivePatientId,
			formPatientName: params.formPatientName,
			formDoctorId: params.formDoctorId,
			formDoctorName: params.formDoctorName,
			effectiveFittingDate,
			material: params.material,
			selectedTeeth: params.selectedTeeth,
			gostOrderNumber: params.gostOrderNumber,
			finalShade: params.finalShade,
			dueDate: params.dueDate,
		});
		try {
			window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(appointmentDraft));
			window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: appointmentDraft }));
			window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: appointmentDraft }));
		} catch { /* quota fallback */ }
	}

	if (params.includeImpressionBilling && !isExistingOrder) {
		const orgId = typeof window.localStorage !== "undefined"
			? window.localStorage.getItem("dente_organization_id") || "00000000-0000-0000-0000-000000000001"
			: "00000000-0000-0000-0000-000000000001";
		fetch(`/api/inventory/${orgId}/quick-writeoff-orthopedic`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				protocolId: params.impressionType === "digital_scan" ? "ortho_digital_scan_impression" : "ortho_impression_silicone",
				toothNumber: params.selectedTeeth.length > 0 ? params.selectedTeeth[0] : null,
				notes: `Автосписание материалов слепка по наряду ЗТЛ ${params.gostOrderNumber}`,
			}),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data?.deductedItems?.length) {
					const overdraftNote = data.isOverdraft ? " (мягкий овердрафт склада)" : "";
					showToast(
						`Склад: списаны материалы слепка (${data.deductedItems.length} поз.)${overdraftNote}`,
						data.isOverdraft ? "warning" : "info",
						3000,
					);
				}
			})
			.catch(() => {});
	}
}
