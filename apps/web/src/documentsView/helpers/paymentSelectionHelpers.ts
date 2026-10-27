import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../../utils/localStorageHelpers";

export const documentPaymentSelectionStorageKey =
	"dental-crm:document-payment-selection:v1";

export type DocumentPaymentSelectionEntry = {
	paymentIds: string[];
	savedAt: string;
};

export type DocumentPaymentSelectionStore = {
	version: 1;
	selections: Record<string, DocumentPaymentSelectionEntry>;
};

export function emptyDocumentPaymentSelectionStore(): DocumentPaymentSelectionStore {
	return { version: 1, selections: {} };
}

export function documentPaymentSelectionLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentPaymentSelectionStorageKey,
		organizationId,
	);
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
		const raw = safeLocalStorageGetItem(localKey) ?? (organizationId ? safeLocalStorageGetItem(documentPaymentSelectionStorageKey) : null);
		if (!raw) return emptyDocumentPaymentSelectionStore();
		const parsed = JSON.parse(raw) as Partial<DocumentPaymentSelectionStore>;
		if (parsed?.version !== 1 || !parsed.selections || typeof parsed.selections !== "object") return emptyDocumentPaymentSelectionStore();
		const selections: DocumentPaymentSelectionStore["selections"] = {};
		for (const [key, rawEntry] of Object.entries(parsed.selections)) {
			if (!key || key.length > 260 || !rawEntry || typeof rawEntry !== "object") continue;
			const entry = rawEntry as Partial<DocumentPaymentSelectionEntry>;
			const savedAt = typeof entry.savedAt === "string" && entry.savedAt ? entry.savedAt : null;
			if (!savedAt || !localSavedAtFresh(savedAt, localConvenienceRetentionMs)) continue;
			selections[key] = { paymentIds: normalizedDocumentPaymentSelectionIds(entry.paymentIds), savedAt };
		}
		return { version: 1, selections };
	} catch (error) {
		logger.error("Failed to load document payment selection store", error);
		return emptyDocumentPaymentSelectionStore();
	}
}

export function loadDocumentPaymentSelection(
	organizationId: string | null | undefined,
	key: string | null,
): string[] | null {
	if (!key || typeof window === "undefined") return null;
	const entry = loadDocumentPaymentSelectionStore(organizationId).selections[key];
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
			Object.entries(store.selections).sort((l, r) => r[1].savedAt.localeCompare(l[1].savedAt)).slice(0, 80),
		);
		safeLocalStorageSetItem(
			documentPaymentSelectionLocalKey(organizationId),
			JSON.stringify({ version: 1, selections: trimmedSelections } satisfies DocumentPaymentSelectionStore),
		);
	} catch (error) {
		logger.error("Failed to save payment selection", error);
	}
}
