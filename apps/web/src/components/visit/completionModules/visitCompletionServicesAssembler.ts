/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Completion Services Assembler
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Извлечение и агрегация фактически выполненных услуг из стора визита:
 * - completedServices (табличные позиции)
 * - visitToothRecordsByCode (услуги, добавленные через интерактивную одонтограмму)
 * Категоризация по технологическим картам 804н.
 */

import {
	useVisitStore,
} from "../../../store/visitStore";
import type {
	ClinicalEstimateItem,
	ProcedureCategory,
} from "../clinicalVisitWorkflow";

export function categorizeServiceCode(code: string): ProcedureCategory {
	if (code.startsWith("A11") || code.startsWith("A25")) return "anesthesia";
	if (code.startsWith("A06")) return "diagnostics";
	if (code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) return "endodontics";
	if (code.startsWith("A16.07.001") || code.startsWith("A16.07.097")) return "surgery";
	if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) return "hygiene";
	if (code.startsWith("A16.07.004") || code.startsWith("A16.07.006")) return "orthopedics";
	if (code === "A16.07.002.009") return "isolation";
	return "therapy";
}

/**
 * Извлекает все фактически выполненные врачом услуги из стора визита
 * (из completedServices и visitToothRecordsByCode) в формате сметы (Мандаты 8b, 8e, 8n).
 */
export function assembleVisitStoreCompletedServices(): ClinicalEstimateItem[] {
	const visitState = useVisitStore.getState();
	const assembled: ClinicalEstimateItem[] = [];

	// 1. Из completedServices стора визита
	for (const [idx, s] of (visitState.completedServices || []).entries()) {
		const code = s.code804n || s.serviceId || "A16.07.002";
		const category = categorizeServiceCode(code);

		const qty =
			typeof s.quantity === "number" && Number.isFinite(s.quantity) && s.quantity > 0
				? s.quantity
				: 1;
		const price =
			typeof s.priceRub === "number" && Number.isFinite(s.priceRub)
				? s.priceRub
				: 0;
		assembled.push({
			id: s.serviceId || `srv-store-${idx}-${code}`,
			code,
			name: s.toothNumber ? `${s.name} (зуб ${s.toothNumber})` : s.name,
			quantity: qty,
			priceRub: price,
			discountRub: 0,
			totalRub: price * qty,
			category,
			toothNumber: s.toothNumber ?? s.toothCode,
		});
	}

	// 2. Из visitToothRecordsByCode (если врач добавлял услуги в структурированные записи зуба)
	for (const [codeStr, rec] of Object.entries(visitState.visitToothRecordsByCode || {})) {
		if (rec.services && rec.services.length > 0) {
			for (const s of rec.services) {
				const isDup = assembled.some(
					(existing) =>
						existing.code === s.code && String(existing.toothNumber ?? "") === codeStr,
				);
				if (!isDup) {
					const category = categorizeServiceCode(s.code);
					const recPrice =
						typeof s.price === "number" && Number.isFinite(s.price) ? s.price : 0;
					assembled.push({
						id: `tooth-rec-${codeStr}-${s.code}`,
						code: s.code,
						name: `${s.title} (зуб ${codeStr})`,
						quantity: 1,
						priceRub: recPrice,
						discountRub: 0,
						totalRub: recPrice,
						category,
						toothNumber: codeStr,
					});
				}
			}
		}
	}

	return assembled;
}

/**
 * Объединяет явно переданные дополнительные услуги и услуги из стора визита без дублирования.
 */
export function mergeExplicitAndStoreServices(
	explicitServices: readonly ClinicalEstimateItem[] | undefined,
	storeServices: readonly ClinicalEstimateItem[],
): ClinicalEstimateItem[] {
	const merged: ClinicalEstimateItem[] = explicitServices ? [...explicitServices] : [];
	for (const stItem of storeServices) {
		const isDup = merged.some(
			(x) =>
				(x.id && x.id === stItem.id) ||
				(x.code && x.code === stItem.code && String(x.toothNumber ?? "") === String(stItem.toothNumber ?? "")),
		);
		if (!isDup) {
			merged.push(stItem);
		}
	}
	return merged;
}
