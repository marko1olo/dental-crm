import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { showToast } from "../../../GlobalToast";
import type { DentalLabOrderData } from "../../DentalLabOrderModal";

export function copyLabPortalLink(token?: string): void {
	if (!token || typeof window === "undefined") return;
	const url = `${window.location.origin}/#/portal/lab-order/${token}`;
	void navigator.clipboard.writeText(url);
	showToast("Ссылка для техника скопирована в буфер обмена", "success");
}

export async function executeLabPayFromCashbox(
	order: DentalLabOrderData,
	fetchOrders: () => Promise<void>,
): Promise<void> {
	if (!order.id) return;
	const res = await fetch(`/api/lab-orders/${order.id}/pay`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({ amountRub: order.priceRub, notes: `Оплата ЗТЛ (зуб ${order.toothFdi || "—"})` }),
	});
	if (!res.ok) throw new Error("Ошибка оплаты наряда из кассы");
	showToast(`Наряд ЗТЛ успешно оплачен из кассы (${order.priceRub} ₽)`, "success");
	void fetchOrders();
}
