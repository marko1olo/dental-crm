/**
 * @file apps/web/src/helpers/financialHelpers.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type AcceptVisitDraftResponse,
	type InstallmentPaymentStatus,
	type PaymentMethod,
	type PricelistSourceKind,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	pricelistSourceKindLabels,
} from "../pricelistUiMeta";
import {
	formatTime,
} from "../utils/dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	logger,
} from "../utils/logger";
import {
	paymentMethodLabels,
} from "../workspaceUiLabels";
import {
	isRecordKey,
	isStringUnionValue,
} from "./guardUtils";
import {
	type DocumentPaymentSelectionEntry,
	type DocumentPaymentSelectionStore,
	type PaymentRefundCorrectionAction,
	type PaymentRefundCorrectionMethod,
} from "./types";

export const documentPaymentSelectionStorageKey =
	"dental-crm:document-payment-selection:v1";

export function documentPaymentSelectionLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentPaymentSelectionStorageKey,
		organizationId,
	);
}

export function emptyDocumentPaymentSelectionStore(): DocumentPaymentSelectionStore {
	return { version: 1, selections: {} };
}

export function normalizedDocumentPaymentSelectionIds(
	value: unknown,
): string[] {
	if (!Array.isArray(value)) return [];
	const paymentIds: string[] = [];
	const seenPaymentIds = new Set<string>();
	for (const rawPaymentId of value) {
		if (typeof rawPaymentId !== "string") continue;
		const paymentId = rawPaymentId.trim();
		if (!paymentId || paymentId.length > 120 || seenPaymentIds.has(paymentId))
			continue;
		seenPaymentIds.add(paymentId);
		paymentIds.push(paymentId);
		if (paymentIds.length >= 80) break;
	}
	return paymentIds;
}

export function loadDocumentPaymentSelectionStore(
	organizationId: string | null | undefined = null,
): DocumentPaymentSelectionStore {
	if (typeof window === "undefined")
		return emptyDocumentPaymentSelectionStore();
	try {
		const localKey = documentPaymentSelectionLocalKey(organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(documentPaymentSelectionStorageKey)
				: null);
		if (!raw) return emptyDocumentPaymentSelectionStore();
		const parsed = JSON.parse(raw) as Partial<DocumentPaymentSelectionStore>;
		if (
			parsed?.version !== 1 ||
			!parsed.selections ||
			typeof parsed.selections !== "object"
		) {
			return emptyDocumentPaymentSelectionStore();
		}
		const selections: DocumentPaymentSelectionStore["selections"] = {};
		let pruned = false;
		for (const [key, rawEntry] of Object.entries(parsed.selections)) {
			if (
				!key ||
				key.length > 260 ||
				!rawEntry ||
				typeof rawEntry !== "object"
			) {
				pruned = true;
				continue;
			}
			const entry = rawEntry as Partial<DocumentPaymentSelectionEntry>;
			const savedAt =
				typeof entry.savedAt === "string" && entry.savedAt
					? entry.savedAt
					: null;
			if (
				!savedAt ||
				!localSavedAtFresh(savedAt, localConvenienceRetentionMs)
			) {
				pruned = true;
				continue;
			}
			selections[key] = {
				paymentIds: normalizedDocumentPaymentSelectionIds(entry.paymentIds),
				savedAt,
			};
		}
		if (pruned || organizationId) {
			if (Object.keys(selections).length) {
				safeLocalStorageSetItem(
					localKey,
					JSON.stringify({
						version: 1,
						selections,
					} satisfies DocumentPaymentSelectionStore),
				);
			} else {
				safeLocalStorageRemoveItem(localKey);
			}
			if (organizationId)
				safeLocalStorageRemoveItem(documentPaymentSelectionStorageKey);
		}
		return { version: 1, selections };
	} catch (error) {
		logger.error("Failed to load signature draft", error);
		// Document payment selection is local operator convenience; read failures are safe to ignore.
		return emptyDocumentPaymentSelectionStore();
	}
}

export function loadDocumentPaymentSelection(
	organizationId: string | null | undefined,
	key: string | null,
): string[] | null {
	if (!key || typeof window === "undefined") return null;
	const entry =
		loadDocumentPaymentSelectionStore(organizationId).selections[key];
	return entry ? normalizedDocumentPaymentSelectionIds(entry.paymentIds) : null;
}

export function saveDocumentPaymentSelection(
	organizationId: string | null | undefined,
	key: string | null,
	paymentIds: string[],
): void {
	if (!key || typeof window === "undefined") return;
	try {
		const store = loadDocumentPaymentSelectionStore(organizationId);
		store.selections[key] = {
			paymentIds: normalizedDocumentPaymentSelectionIds(paymentIds),
			savedAt: new Date().toISOString(),
		};
		const trimmedSelections = Object.fromEntries(
			Object.entries(store.selections)
				.sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
				.slice(0, 80),
		);
		safeLocalStorageSetItem(
			documentPaymentSelectionLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				selections: trimmedSelections,
			} satisfies DocumentPaymentSelectionStore),
		);
	} catch (error) {
		logger.error("Failed to save payment selection", error);
		// Document payment selection is local operator convenience; failed storage must not block document issue.
	}
}

export const paymentRefundCorrectionActionOptions: readonly PaymentRefundCorrectionAction[] =
	[
		"full_refund",
		"partial_refund",
		"payment_transfer",
		"receipt_correction",
		"payer_details_correction",
	];

export const paymentRefundCorrectionMethodOptions: readonly PaymentRefundCorrectionMethod[] =
	["cash", "card", "bank_transfer", "internal_offset", "no_money_movement"];

export const installmentPaymentStatusAliases: Record<
	string,
	InstallmentPaymentStatus
> = {
	план: "planned",
	запланирован: "planned",
	запланировано: "planned",
	ожидается: "planned",
	planned: "planned",
	оплачен: "paid",
	оплачено: "paid",
	paid: "paid",
	просрочен: "overdue",
	просрочено: "overdue",
	просрочка: "overdue",
	overdue: "overdue",
	перенесен: "rescheduled",
	перенесено: "rescheduled",
	перенос: "rescheduled",
	rescheduled: "rescheduled",
	отменен: "cancelled",
	отменено: "cancelled",
	отмена: "cancelled",
	cancelled: "cancelled",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
	return isRecordKey(value, paymentMethodLabels);
}

export function isPricelistSourceKind(
	value: unknown,
): value is PricelistSourceKind {
	return isRecordKey(value, pricelistSourceKindLabels);
}

export function normalizedPaymentRefundCorrectionAction(
	value: unknown,
): PaymentRefundCorrectionAction {
	return isStringUnionValue(value, paymentRefundCorrectionActionOptions)
		? value
		: "partial_refund";
}

export function normalizedPaymentRefundCorrectionMethod(
	value: unknown,
): PaymentRefundCorrectionMethod {
	return isStringUnionValue(value, paymentRefundCorrectionMethodOptions)
		? value
		: "card";
}

export function visitSaveReceiptText(
	receipt: AcceptVisitDraftResponse["saveReceipt"],
): string {
	if (receipt.status === "duplicate") {
		return `Повторная отправка распознана: дубль не создан, серверная версия ${receipt.serverRevision}.`;
	}
	if (receipt.warning) {
		return `${receipt.warning} Серверная версия ${receipt.serverRevision}.`;
	}
	return `Сервер подтвердил сохранение ${formatTime(receipt.savedAt)}, версия карты ${receipt.serverRevision}.`;
}
