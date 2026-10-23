import type React from "react";
import { buildServicePricelistItem } from "./pricelistServiceFormBuilder";
import {
	calculateAllTierStrings,
	parseTierPricesRecord,
} from "./pricelistTierPricesHelper";
import { detectCategoryFromServiceCode } from "./servicePricelistEngine";
import {
	CANONICAL_SERVICE_PRESETS,
	type ServicePricelistItem,
} from "./servicePricelistPresets";
import { usePricelistServiceFormState } from "./usePricelistServiceFormState";

export function usePricelistServiceForm(
	editingItem: ServicePricelistItem | null,
	_isOpen: boolean,
	onSave: (item: ServicePricelistItem) => void,
) {
	const s = usePricelistServiceFormState(editingItem);

	const handleBasePriceChange = (newVal: string) => {
		s.setFormPriceRub(newVal);
		const parsed = parseFloat(newVal.replace(",", ".")) || 0;
		if (parsed > 0) {
			const t = calculateAllTierStrings(parsed);
			s.setFormVipPrice(t.vip);
			s.setFormDmsPrice(t.dms);
			s.setFormPromoPrice(t.promo);
			s.setFormNightPrice(t.night);
		}
	};

	const handleCodeChange = (newCode: string) => {
		s.setFormStatutoryCode(newCode);
		const trimmed = newCode.trim().toUpperCase();
		if (!trimmed) return;
		const match = CANONICAL_SERVICE_PRESETS.find(
			(p) => (p.statutoryCode || p.code804n).toUpperCase() === trimmed,
		);
		if (match) {
			const title = match.statutoryTitle || match.statutoryTitle804n;
			if (!s.formStatutoryTitle || s.formStatutoryTitle === s.formCommercialTitle)
				s.setFormStatutoryTitle(title);
			s.setFormCategory(match.category);
			s.setFormSpecialty(match.specialty);
			if (match.icd10Indications.length > 0 && !s.formIcd10)
				s.setFormIcd10(match.icd10Indications.join(", "));
			if (match.estimatedDurationMin && !editingItem)
				s.setFormDurationMin(match.estimatedDurationMin);
		} else {
			const detected = detectCategoryFromServiceCode(
				trimmed,
				s.formCommercialTitle,
			);
			if (detected !== "other") s.setFormCategory(detected);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(
			buildServicePricelistItem({
				id: editingItem ? editingItem.id : `srv-custom-${Date.now()}`,
				code: s.formStatutoryCode,
				commercialTitle: s.formCommercialTitle,
				statutoryTitle: s.formStatutoryTitle,
				category: s.formCategory,
				specialty: s.formSpecialty,
				priceRub: parseFloat(s.formPriceRub.replace(",", ".")) || 0,
				materialCostRub: parseFloat(s.formMaterialCostRub.replace(",", ".")) || 0,
				labCostRub: parseFloat(s.formLabCostRub.replace(",", ".")) || 0,
				durationMin: s.formDurationMin,
				icd10List: s.formIcd10
					.split(",")
					.map((str) => str.trim().toUpperCase())
					.filter(Boolean),
				tierPrices: parseTierPricesRecord({
					vip: s.formVipPrice,
					dms: s.formDmsPrice,
					promo: s.formPromoPrice,
					night: s.formNightPrice,
				}),
				fallbackItem: editingItem,
			}),
		);
	};

	return {
		formStatutoryCode: s.formStatutoryCode,
		formCode804n: s.formStatutoryCode, // Backwards-compatible alias
		formCommercialTitle: s.formCommercialTitle,
		setFormCommercialTitle: s.setFormCommercialTitle,
		formStatutoryTitle: s.formStatutoryTitle,
		setFormStatutoryTitle: s.setFormStatutoryTitle,
		formCategory: s.formCategory,
		setFormCategory: s.setFormCategory,
		formSpecialty: s.formSpecialty,
		setFormSpecialty: s.setFormSpecialty,
		formPriceRub: s.formPriceRub,
		handleBasePriceChange,
		formMaterialCostRub: s.formMaterialCostRub,
		setFormMaterialCostRub: s.setFormMaterialCostRub,
		formLabCostRub: s.formLabCostRub,
		setFormLabCostRub: s.setFormLabCostRub,
		formDurationMin: s.formDurationMin,
		setFormDurationMin: s.setFormDurationMin,
		formIcd10: s.formIcd10,
		setFormIcd10: s.setFormIcd10,
		formVipPrice: s.formVipPrice,
		setFormVipPrice: s.setFormVipPrice,
		formDmsPrice: s.formDmsPrice,
		setFormDmsPrice: s.setFormDmsPrice,
		formPromoPrice: s.formPromoPrice,
		setFormPromoPrice: s.setFormPromoPrice,
		formNightPrice: s.formNightPrice,
		setFormNightPrice: s.setFormNightPrice,
		showTiersSection: s.showTiersSection,
		setShowTiersSection: s.setShowTiersSection,
		handleCodeChange,
		handleSubmit,
		handleAutoRecalculateTiers: () => handleBasePriceChange(s.formPriceRub),
	};
}
