import { formatKopecksToRub, generateUuidV7, rublesToKopecks } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { showToast } from "../../../GlobalToast";
import type { DentalLabOrderData } from "../../labMath";
import { getMaterialMeta } from "../../dentalLabCatalogData";

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
	// Финансовая честность (Мандаты 8e, 8n, 8bm): расчеты строго в копейках, без клиентского float-деления
	const materialKey = order.materialId || order.material || order.constructionType;
	const metaKopecks = materialKey ? getMaterialMeta(materialKey)?.baseLabCostKopecks : undefined;

	let costKopecks: number | undefined = undefined;
	if (typeof order.labCostKopecks === "number" && order.labCostKopecks > 0) {
		costKopecks = order.labCostKopecks;
	} else if (typeof order.costKopecks === "number" && order.costKopecks > 0) {
		costKopecks = order.costKopecks;
	} else if (typeof order.labCostRub === "number" && order.labCostRub > 0) {
		costKopecks = Number(rublesToKopecks(order.labCostRub));
	} else if (typeof order.costRub === "number" && order.costRub > 0) {
		costKopecks = Number(rublesToKopecks(order.costRub));
	} else if (typeof metaKopecks === "number" && metaKopecks > 0) {
		costKopecks = metaKopecks;
	}

	const paymentAmountKopecks = costKopecks !== undefined && costKopecks > 0 ? costKopecks : 0;

	if (paymentAmountKopecks <= 0) {
		const errMsg = "Себестоимость наряда ЗТЛ не определена или равна 0 ₽. Проверьте конструкцию перед оплатой технику.";
		showToast(errMsg, "error");
		throw new Error(errMsg);
	}

	const res = await fetch(`/api/lab/orders/${order.id}/pay`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify({
			amountKopecks: paymentAmountKopecks,
			notes: `Оплата себестоимости ЗТЛ (зуб ${order.toothFdi || "—"})`,
		}),
	});
	if (!res.ok) {
		const errData = await res.json().catch(() => null);
		const errMsg = errData?.message || "Ошибка оплаты наряда из кассы";
		showToast(errMsg, "error");
		throw new Error(errMsg);
	}
	const formattedCost = formatKopecksToRub(BigInt(paymentAmountKopecks));
	showToast(`Наряд ЗТЛ успешно оплачен из кассы (${formattedCost})`, "success");
	void fetchOrders();
}
