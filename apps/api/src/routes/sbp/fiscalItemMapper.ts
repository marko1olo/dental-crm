import type { CreateFiscalReceiptPayloadInput, ItemizedFfd12Tag } from "./types.js";
import {
	resolveTag1199,
	resolveTag1212,
	resolveTag1214,
	resolveTag2108,
} from "./fiscalTagsResolver.js";

/** Maps receipt items to FFD 1.2 tags */
export function buildItemizedFfd12Tags(
	items: CreateFiscalReceiptPayloadInput["items"],
): ItemizedFfd12Tag[] {
	return items.map((item) => ({
		name: item.name,
		priceKopecks: item.priceKopecks,
		quantity: item.quantity,
		amountKopecks: item.amountKopecks,
		tag1212_paymentSubject: resolveTag1212(item.subject),
		tag1214_paymentMethod: resolveTag1214(item.method),
		tag1199_vatRate: resolveTag1199(item.vatRate),
		tag2108_quantityMeasure: resolveTag2108(item.measure),
		medicalServiceCode804n: item.medicalServiceCode804n || null,
	}));
}
