import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { showToast } from "../../../GlobalToast";
import type { DentalLabOrderData } from "../../labMath";

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
	// Финансовая честность (Мандаты 8e, 8n): касса списывает себестоимость работы техника, а не розничный чек пациента!
	const costRub =
		order.labCostRub ??
		order.costRub ??
		(order.costKopecks ? order.costKopecks / 100 : undefined) ??
		(order.labCostKopecks ? order.labCostKopecks / 100 : undefined);
	const paymentAmountRub = costRub !== undefined && costRub > 0 ? costRub : (order.priceRub ?? 0);

	const res = await fetch(`/api/lab-orders/${order.id}/pay`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({
			amountRub: paymentAmountRub,
			notes: `Оплата себестоимости ЗТЛ (зуб ${order.toothFdi || "—"})`,
		}),
	});
	if (!res.ok) {
		const errData = await res.json().catch(() => null);
		const errMsg = errData?.message || "Ошибка оплаты наряда из кассы";
		showToast(errMsg, "error");
		throw new Error(errMsg);
	}
	showToast(`Наряд ЗТЛ успешно оплачен из кассы (${paymentAmountRub} ₽)`, "success");
	void fetchOrders();
}
