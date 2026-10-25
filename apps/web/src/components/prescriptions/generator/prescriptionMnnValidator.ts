/**
 * prescriptionMnnValidator.ts — MNN Name Verification & Alias Normalization
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import { DENTAL_STATUTORY_MNN_CATALOG } from "./prescriptionMnnData";
import type { DentalMnnValidationResult } from "./prescriptionMnnTypes";

/**
 * Валидация Международного Непатентованного Наименования (МНН) препарата
 * согласно требованиям Приказа Минздрава России № 1094н и ГРЛС РФ.
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
			messageRu: `Препарат верифицирован по МНН Минздрава РФ: ${found.mnnRu} (${found.mnnLatin}). Группа: ${found.categoryLabelRu}.`,
			warning: isTradeName
				? `Внимание (Приказ 1094н): указано торговое наименование «${query}». В официальном рецептурном бланке препарат будет выписан по МНН: «${found.mnnRu}».`
				: undefined,
		};
	}

	return {
		isValid: false,
		normalizedQuery: cleaned,
		messageRu: `Препарат «${query}» не найден в каноническом стоматологическом справочнике МНН (Приказ 1094н). Рекомендуется сверить с Государственным реестром лекарственных средств (ГРЛС).`,
		warning: `По Приказу Минздрава РФ № 1094н выписка рецептов осуществляется строго по МНН. Торговое или незарегистрированное название «${query}» требует уточнения МНН.`,
	};
}
