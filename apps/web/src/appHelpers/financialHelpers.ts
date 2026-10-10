import type {
	DocumentPaymentSelectionStore,
	DocumentPaymentSelectionEntry,
	PaymentRefundCorrectionAction,
	PaymentRefundCorrectionMethod,
	PricelistImageMimeType,
} from "./types.js";
import type {
	InstallmentPaymentStatus,
	PaymentMethod,
	PricelistSourceKind,
	TreatmentPlanAcceptanceVariant,
} from "@dental/shared";
import {
	blobToBase64,
	readFileAsDataUrl,
	loadImageFromDataUrl,
	isOptionValue,
	isRecordKey,
	isStringUnionValue,
} from "./uiFormatters.js";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";
import { paymentMethodLabels } from "../workspaceUiLabels";
import { pricelistSourceKindLabels } from "../pricelistUiMeta";

export { pricelistSourceKindLabels } from "../pricelistUiMeta";

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

export const treatmentAcceptanceVariantOptions: readonly TreatmentPlanAcceptanceVariant[] =
	["urgent", "standard", "optimal", "staged", "maintenance", "other"];

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

export function normalizedTreatmentPlanAcceptanceVariant(
	value: unknown,
): TreatmentPlanAcceptanceVariant {
	return isStringUnionValue(value, treatmentAcceptanceVariantOptions)
		? value
		: "standard";
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

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}
