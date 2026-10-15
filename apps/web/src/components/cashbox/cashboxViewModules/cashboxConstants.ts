/**
 * apps/web/src/components/cashbox/cashboxViewModules/cashboxConstants.ts
 *
 * Layer 1: Pure Utilities & Constants for 54-FZ Cashbox Workspace.
 * Zero side-effects, 100% deterministic pure functions.
 */

import type { CashboxOperationItem } from "./types.js";

export const CASHBOX_AMOUNT_PRESETS = [1000, 3000, 5000, 10000] as const;

export const CASHBOX_DISCOUNT_PRESETS = [50, 20, 10] as const;

export const CASHBOX_54FZ_STATUS_BADGE = {
	text: "Касса: без барьеров",
	tooltip: "Автономия 54-ФЗ: физические лица не блокируются требованием ИНН",
} as const;

/**
 * Format currency in Russian locale with ruble symbol
 */
export function formatCurrencyRub(amountRub: number): string {
	return `${amountRub.toLocaleString("ru-RU")} ₽`;
}

/**
 * Returns human-readable operation type name and badge styling
 */
export function getOperationTypeLabel(type: CashboxOperationItem["type"]): {
	label: string;
	badgeClass: string;
} {
	switch (type) {
		case "payment":
			return { label: "Приход (Оплата)", badgeClass: "text-[var(--ok-fg,#10b981)]" };
		case "refund":
			return { label: "Возврат прихода", badgeClass: "text-[var(--warning-fg,#f59e0b)]" };
		case "cash_in":
			return { label: "Внесение наличных", badgeClass: "text-[var(--teal,#0d9488)]" };
		case "cash_out":
			return { label: "Инкассация / Изъятие", badgeClass: "text-[var(--muted)]" };
		case "correction":
			return { label: "Чек коррекции", badgeClass: "text-[var(--brand-primary,#6366f1)]" };
		default:
			return { label: "Операция", badgeClass: "text-[var(--ink)]" };
	}
}

/**
 * Returns human-readable label for payment tender
 */
export function getPaymentMethodName(method: CashboxOperationItem["method"]): string {
	switch (method) {
		case "cash":
			return "Наличные";
		case "card":
			return "Банковская карта";
		case "sbp":
			return "СБП (QR-код)";
		case "deposit":
			return "Депозит пациента";
		case "split":
			return "Сплит-оплата";
		default:
			return "Оплата";
	}
}
