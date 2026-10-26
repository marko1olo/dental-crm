/**
 * prescriptionMnnValidator.ts — MNN Name Verification & Alias Normalization
 * DENTE Dental CRM (Clean clinical language, Mandate 8x & Mandate 8b <= 120 lines).
 */

import { DENTAL_STATUTORY_MNN_CATALOG } from "./prescriptionMnnData";
import type { DentalMnnValidationResult } from "./prescriptionMnnTypes";

/**
 * Валидация Международного Непатентованного Наименования (МНН) препарата
 * согласно клиническим стандартам и ГРЛС РФ.
 */
export function validateDentalMnn(query: string): DentalMnnValidationResult {
	const cleaned = query.trim().toLowerCase();
	if (!cleaned) {
		return {
			isValid: false,
			normalizedQuery: "",
			messageRu: "Наименование МНН препарата не может быть пустым.",
			warning: "Наименование МНН препарата не может быть пустым.",
		};
	}

	const found = DENTAL_STATUTORY_MNN_CATALOG.find((item) => {
		if (item.mnnRu.toLowerCase() === cleaned) return true;
		if (item.mnnLatin.toLowerCase() === cleaned) return true;
		if (
			item.aliasesRu.some(
				(a) =>
					cleaned.includes(a.toLowerCase()) ||
					a.toLowerCase().includes(cleaned),
			)
		) {
			return true;
		}
		return false;
	});

	if (found) {
		const isDirectMnn =
			found.mnnRu.toLowerCase() === cleaned ||
			found.mnnLatin.toLowerCase() === cleaned;
		const isTradeName = !isDirectMnn;

		return {
			isValid: true,
			matchedMnn: { ...found, key: found.id },
			normalizedQuery: cleaned,
			isTradeName,
			messageRu: `Препарат верифицирован по МНН: ${found.mnnRu} (${found.mnnLatin}). Группа: ${found.categoryLabelRu}.`,
			warning: isTradeName
				? `Внимание: указано торговое наименование «${query}». В официальном рецептурном бланке препарат выписывается по действующему веществу (МНН): «${found.mnnRu}».`
				: undefined,
		};
	}

	return {
		isValid: false,
		normalizedQuery: cleaned,
		messageRu: `Препарат «${query}» не найден в клиническом стоматологическом справочнике МНН. Рекомендуется сверить с Государственным реестром лекарственных средств (ГРЛС).`,
		warning: `Выписка официальных рецептурных бланков осуществляется строго по действующему веществу (МНН). Для торгового наименования «${query}» требуется уточнение МНН.`,
	};
}
