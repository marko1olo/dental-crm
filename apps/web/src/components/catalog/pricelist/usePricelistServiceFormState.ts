import { useEffect, useState } from "react";
import { getInitialFormValues } from "./pricelistFormStateHelpers";
import type {
	DoctorSpecialty,
	ServiceCategory,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export function usePricelistServiceFormState(
	editingItem: ServicePricelistItem | null,
) {
	const init = getInitialFormValues(editingItem);
	const [formStatutoryCode, setFormStatutoryCode] = useState(init.code);
	const [formCommercialTitle, setFormCommercialTitle] = useState(
		init.commercialTitle,
	);
	const [formStatutoryTitle, setFormStatutoryTitle] = useState(
		init.statutoryTitle,
	);
	const [formCategory, setFormCategory] = useState<ServiceCategory>(
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
		setFormStatutoryCode(v.code);
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

	return {
		formStatutoryCode,
		setFormStatutoryCode,
		formCommercialTitle,
		setFormCommercialTitle,
		formStatutoryTitle,
		setFormStatutoryTitle,
		formCategory,
		setFormCategory,
		formSpecialty,
		setFormSpecialty,
		formPriceRub,
		setFormPriceRub,
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
	};
}
