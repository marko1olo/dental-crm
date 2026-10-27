import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { type CanonicalLabOrderStatus, buildLabAppointmentDraft } from "../../lab/labMath";
import type { LabOrder } from "../LabOrdersPanel";

export async function transitionLabOrderStatus(orderId: string, targetStatus: CanonicalLabOrderStatus, onDone: () => void) {
	try {
		const res = await fetch(`/api/clinical/lab-orders/${orderId}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ status: targetStatus }),
		});
		if (res.ok) {
			showToast(`Статус наряда изменен: ${targetStatus}`, "success");
			onDone();
		}
	} catch {
		showToast("Ошибка сети при смене статуса", "error");
	}
}

export function scheduleLabAppointment(order: LabOrder, appLogic: any) {
	const draft = buildLabAppointmentDraft(order as any);
	if (!draft) return;
	if (appLogic?.updateNewAppointmentDraft) {
		appLogic.updateNewAppointmentDraft("patientId", order.patientId);
		if (order.doctorId) appLogic.updateNewAppointmentDraft("doctorUserId", order.doctorId);
		appLogic.updateNewAppointmentDraft("startsAt", draft.targetDateIso);
		appLogic.updateNewAppointmentDraft("reason", draft.reason);
		if (appLogic.setShowCreateForm) appLogic.setShowCreateForm(true);
	}
	window.location.hash = "#schedule";
	showToast(`Визит запланирован на дату готовности: ${new Date(draft.targetDateIso).toLocaleDateString("ru-RU")}`, "success");
}

export function copyLabOrderPortalLink(token: string) {
	const url = `${window.location.origin}/#/portal/lab-order/${token}`;
	navigator.clipboard.writeText(url);
	showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
}

export async function deleteLabOrder(id: string, onDone: () => void) {
	try {
		const res = await fetch(`/api/clinical/lab-orders/${id}`, {
			method: "DELETE",
			headers: denteAdminSecretRequestHeaders(),
		});
		if (res.ok) {
			showToast("Заказ ЗТЛ удален", "success");
			onDone();
		}
	} catch {
		showToast("Ошибка удаления", "error");
	}
}
