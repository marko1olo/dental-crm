import { useEffect, useState } from "react";
import { getInitialFormValues } from "./pricelistFormStateHelpers";
import { buildServicePricelistItem } from "./pricelistServiceFormBuilder";
import {
	calculateAllTierStrings,
	parseTierPricesRecord,
} from "./pricelistTierPricesHelper";
import { detectCategoryFrom804nCode } from "./servicePricelistEngine";
import {
	type DoctorSpecialty,
	type Order804nCategory,
	type ServicePricelistItem,
	STATUTORY_ORDER_804N_PRESETS,
} from "./servicePricelistPresets";

export function usePricelistServiceForm(
	editingItem: ServicePricelistItem | null,
	_isOpen: boolean,
	onSave: (item: ServicePricelistItem) => void,
) {
	const init = getInitialFormValues(editingItem);
	const [formCode804n, setFormCode804n] = useState(init.code);
	const [formCommercialTitle, setFormCommercialTitle] = useState(
		init.commercialTitle,
	);
	const [formStatutoryTitle, setFormStatutoryTitle] = useState(
		init.statutoryTitle,
	);
	const [formCategory, setFormCategory] = useState<Order804nCategory>(
		init.category,
	);
	const [formSpecialty, setFormSpecialty] = useState<DoctorSpecialty>(
		init.specialty,
	);
	const [formPriceRub, setFormPriceRub] = useState(init.priceRub);
	const [formMaterialCostRub, setFormMaterialCostRub] = useState(
		init.materialCost,
	);
	const [formLabCostRub, setFormLabCostRub] = useState(init.labCost);
	const [formDurationMin, setFormDurationMin] = useState(init.duration);
	const [formIcd10, setFormIcd10] = useState(init.icd10);
	const [formVipPrice, setFormVipPrice] = useState(init.vip);
	const [formDmsPrice, setFormDmsPrice] = useState(init.dms);
	const [formPromoPrice, setFormPromoPrice] = useState(init.promo);
	const [formNightPrice, setFormNightPrice] = useState(init.night);
	const [showTiersSection, setShowTiersSection] = useState(init.showTiers);

	useEffect(() => {
		const v = getInitialFormValues(editingItem);
		setFormCode804n(v.code);
		setFormCommercialTitle(v.commercialTitle);
		setFormStatutoryTitle(v.statutoryTitle);
		setFormCategory(v.category);
		setFormSpecialty(v.specialty);
		setFormPriceRub(v.priceRub);
		setFormMaterialCostRub(v.materialCost);
		setFormLabCostRub(v.labCost);
		setFormDurationMin(v.duration);
		setFormIcd10(v.icd10);
		setFormVipPrice(v.vip);
		setFormDmsPrice(v.dms);
		setFormPromoPrice(v.promo);
		setFormNightPrice(v.night);
		setShowTiersSection(v.showTiers);
	}, [editingItem]);

	const handleBasePriceChange = (newVal: string) => {
		setFormPriceRub(newVal);
		const parsed = parseFloat(newVal.replace(",", ".")) || 0;
		if (parsed > 0) {
			const t = calculateAllTierStrings(parsed);
			setFormVipPrice(t.vip);
			setFormDmsPrice(t.dms);
			setFormPromoPrice(t.promo);
			setFormNightPrice(t.night);
		}
	};

	const handleCodeChange = (newCode: string) => {
		setFormCode804n(newCode);
		const trimmed = newCode.trim().toUpperCase();
		if (!trimmed) return;
		const match = STATUTORY_ORDER_804N_PRESETS.find(
			(p) => p.code804n.toUpperCase() === trimmed,
		);
		if (match) {
			if (!formStatutoryTitle || formStatutoryTitle === formCommercialTitle)
				setFormStatutoryTitle(match.statutoryTitle804n);
			setFormCategory(match.category);
			setFormSpecialty(match.specialty);
			if (match.icd10Indications.length > 0 && !formIcd10)
				setFormIcd10(match.icd10Indications.join(", "));
			if (match.estimatedDurationMin && !editingItem)
				setFormDurationMin(match.estimatedDurationMin);
		} else {
			const detected = detectCategoryFrom804nCode(trimmed, formCommercialTitle);
			if (detected !== "other") setFormCategory(detected);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(
			buildServicePricelistItem({
				id: editingItem ? editingItem.id : `srv-custom-${Date.now()}`,
				code: formCode804n,
				commercialTitle: formCommercialTitle,
				statutoryTitle: formStatutoryTitle,
				category: formCategory,
				specialty: formSpecialty,
				priceRub: parseFloat(formPriceRub.replace(",", ".")) || 0,
				materialCostRub: parseFloat(formMaterialCostRub.replace(",", ".")) || 0,
				labCostRub: parseFloat(formLabCostRub.replace(",", ".")) || 0,
				durationMin: formDurationMin,
				icd10List: formIcd10
					.split(",")
					.map((s) => s.trim().toUpperCase())
					.filter(Boolean),
				tierPrices: parseTierPricesRecord({
					vip: formVipPrice,
					dms: formDmsPrice,
					promo: formPromoPrice,
					night: formNightPrice,
				}),
				fallbackItem: editingItem,
			}),
		);
	};

	return {
		formCode804n,
		formCommercialTitle,
		setFormCommercialTitle,
		formStatutoryTitle,
		setFormStatutoryTitle,
		formCategory,
		setFormCategory,
		formSpecialty,
		setFormSpecialty,
		formPriceRub,
		handleBasePriceChange,
		formMaterialCostRub,
		setFormMaterialCostRub,
		formLabCostRub,
		setFormLabCostRub,
		formDurationMin,
		setFormDurationMin,
		formIcd10,
		setFormIcd10,
		formVipPrice,
		setFormVipPrice,
		formDmsPrice,
		setFormDmsPrice,
		formPromoPrice,
		setFormPromoPrice,
		formNightPrice,
		setFormNightPrice,
		showTiersSection,
		setShowTiersSection,
		handleCodeChange,
		handleSubmit,
		handleAutoRecalculateTiers: () => handleBasePriceChange(formPriceRub),
	};
}
