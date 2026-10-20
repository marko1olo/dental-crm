import { calculateAllTierStrings } from './pricelistTierPricesHelper';
import type { DoctorSpecialty, Order804nCategory, ServicePricelistItem } from './servicePricelistPresets';

export interface FormInitialValues {
	code: string;
	commercialTitle: string;
	statutoryTitle: string;
	category: Order804nCategory;
	specialty: DoctorSpecialty;
	priceRub: string;
	materialCost: string;
	labCost: string;
	duration: number;
	icd10: string;
	vip: string;
	dms: string;
	promo: string;
	night: string;
	showTiers: boolean;
}

export function getInitialFormValues(editingItem: ServicePricelistItem | null): FormInitialValues {
	if (!editingItem) {
		return {
			code: '', commercialTitle: '', statutoryTitle: '', category: 'therapy',
			specialty: 'therapist', priceRub: '', materialCost: '0', labCost: '0',
			duration: 30, icd10: '', vip: '', dms: '', promo: '', night: '', showTiers: false,
		};
	}
	const t = calculateAllTierStrings(editingItem.basePriceRub);
	return {
		code: editingItem.code804n || '',
		commercialTitle: editingItem.commercialTitle,
		statutoryTitle: editingItem.statutoryTitle804n,
		category: editingItem.category,
		specialty: editingItem.specialty,
		priceRub: String(editingItem.basePriceRub),
		materialCost: String(editingItem.materialCostRub ?? 0),
		labCost: String(editingItem.labCostRub ?? 0),
		duration: editingItem.estimatedDurationMin,
		icd10: editingItem.icd10Indications.join(', '),
		vip: String(editingItem.tierPrices?.vip ?? t.vip),
		dms: String(editingItem.tierPrices?.dms ?? t.dms),
		promo: String(editingItem.tierPrices?.promo ?? t.promo),
		night: String(editingItem.tierPrices?.night_weekend ?? t.night),
		showTiers: Boolean(editingItem.tierPrices && Object.keys(editingItem.tierPrices).length > 0),
	};
}
