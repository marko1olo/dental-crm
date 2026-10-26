import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";

export interface SbpGatewayCheckResult {
	readonly paid: boolean;
	readonly fiscalReceiptId: string | null;
	readonly message: string;
	readonly type: "info" | "success" | "warning";
}

export async function checkSbpOrderStatus(
	orderId: string,
	customChecker?: ((orderId: string) => Promise<{ paid: boolean; fiscalReceiptId?: string | null }>) | undefined,
): Promise<SbpGatewayCheckResult> {
	if (customChecker) {
		const res = await customChecker(orderId);
		if (res.paid) {
			const rcId = res.fiscalReceiptId || null;
			return {
				paid: true,
				fiscalReceiptId: rcId,
				message: rcId
					? "Эквайринговый шлюз подтвердил зачисление средств! Кассовый чек сформирован."
					: "Эквайринговый шлюз подтвердил зачисление средств.",
				type: "success",
			};
		}
	} else {
		try {
			const res = await fetch(`/api/invoices/${encodeURIComponent(orderId)}`, {
				headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
			});
			if (res.ok) {
				const data = (await res.json().catch(() => null)) as {
					status?: string;
					isPaid?: boolean;
					fiscalReceiptId?: string;
				} | null;
				if (data && (data.status === "paid" || data.isPaid)) {
					const rcId = data.fiscalReceiptId || null;
					return {
						paid: true,
						fiscalReceiptId: rcId,
						message: rcId
							? "Банковский шлюз подтвердил оплату счета! Кассовый чек сформирован."
							: "Банковский шлюз подтвердил оплату счета!",
						type: "success",
					};
				}
			}
		} catch {
			return {
				paid: false,
				fiscalReceiptId: null,
				message: "Не удалось связаться со шлюзом НСПК. Воспользуйтесь ручной сверкой с банковской выпиской.",
				type: "warning",
			};
		}
	}

	return {
		paid: false,
		fiscalReceiptId: null,
		message: "Банковский шлюз НСПК: платёж ещё не поступил. Ожидается проведение банком плательщика.",
		type: "info",
	};
}
