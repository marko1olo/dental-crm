/**
 * DENTE Dental CRM — Service Catalog & Nomenclature Presets
 *
 * Layer 2: Preset Scoring & Verbal Complaint Matcher Engine
 */

import { COMPLAINT_KEYWORDS_MAP } from "./presetComplaintDictionary";
import type {
	Order804nCategory,
	PresetMatcherCriteria,
	PresetMatchResult,
	ServicePricelistItem,
} from "./types";

/**
 * Finds presets matching patient verbal complaints
 */
export function findPresetsByComplaint(
	presets: readonly ServicePricelistItem[],
	complaintText: string,
): ServicePricelistItem[] {
	const query = complaintText.toLowerCase().trim();
	if (!query) return [];

	const matchedCategories = new Set<Order804nCategory>();
	const matchedTags = new Set<string>();

	for (const [kw, meta] of Object.entries(COMPLAINT_KEYWORDS_MAP)) {
		if (query.includes(kw)) {
			matchedCategories.add(meta.category);
			for (const t of meta.tags) matchedTags.add(t);
		}
	}

	return presets.filter((item) => {
		if (matchedCategories.has(item.category)) return true;
		return item.tags.some(
			(tag) => matchedTags.has(tag) || query.includes(tag.toLowerCase()),
		);
	});
}

/**
 * Autoselect presets by rich criteria (complaint, ICD-10, tooth, category, specialty)
 */
export function matchPresets(
	presets: readonly ServicePricelistItem[],
	criteria: PresetMatcherCriteria,
): PresetMatchResult[] {
	const results: PresetMatchResult[] = [];

	for (const item of presets) {
		let score = 0;
		let matchedBy: PresetMatchResult["matchedBy"] = "tag";
		let matchReason = "";

		if (criteria.category && item.category === criteria.category) {
			score += 30;
			matchedBy = "specialty";
			matchReason = `Категория: ${item.category}`;
		}
		if (criteria.specialty && item.specialty === criteria.specialty) {
			score += 25;
			matchedBy = "specialty";
			matchReason = `Специальность: ${item.specialty}`;
		}
		if (
			criteria.icd10Code &&
			item.icd10Indications.some(
				(icd) => icd.toUpperCase() === criteria.icd10Code?.toUpperCase(),
			)
		) {
			score += 50;
			matchedBy = "icd10";
			matchReason = `МКБ-10: ${criteria.icd10Code}`;
		}
		if (criteria.complaintText) {
			const query = criteria.complaintText.toLowerCase();
			for (const tag of item.tags) {
				if (query.includes(tag.toLowerCase())) {
					score += 20;
					matchedBy = "complaint";
					matchReason = `Жалоба совпала с тегом: ${tag}`;
					break;
				}
			}
		}
		if (criteria.maxPriceRub && item.basePriceRub <= criteria.maxPriceRub) {
			score += 10;
		}
		if (score > 0) {
			results.push({ item, score, matchedBy, matchReason });
		}
	}

	return results.sort((a, b) => b.score - a.score);
}
