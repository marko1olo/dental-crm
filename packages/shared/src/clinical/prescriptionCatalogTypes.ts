/**
 * packages/shared/src/clinical/prescriptionCatalogTypes.ts
 *
 * Types and 14 Canonical Dosage Forms for Dental Prescription Engine.
 */

export type DentalMedicationForm =
	| "tablets"
	| "tablets_coated"
	| "tablets_dispersible"
	| "capsules"
	| "sachet_granules"
	| "solution_oral_topical"
	| "solution_injection"
	| "dental_gel"
	| "dental_paste"
	| "ointment"
	| "spray"
	| "suspension"
	| "varnish"
	| "drops";

export interface DentalDosageFormMeta {
	readonly code: DentalMedicationForm;
	readonly nameRu: string;
	readonly nameLatin: string;
	readonly latinAbbr: string;
	readonly dispensePatternLatin: string;
	readonly defaultUnitRu: string;
}

export const DENTAL_14_DOSAGE_FORMS: readonly DentalDosageFormMeta[] = [
	{ code: "tablets", nameRu: "таблетки", nameLatin: "Tabulettae", latinAbbr: "tab.", dispensePatternLatin: "D.t.d. N {count} in tab.", defaultUnitRu: "таб." },
	{ code: "tablets_coated", nameRu: "таблетки, покрытые оболочкой", nameLatin: "Tabulettae obductae", latinAbbr: "tab. obd.", dispensePatternLatin: "D.t.d. N {count} in tab.", defaultUnitRu: "таб." },
	{ code: "tablets_dispersible", nameRu: "таблетки диспергируемые", nameLatin: "Tabulettae dispersibiles", latinAbbr: "tab. dispers.", dispensePatternLatin: "D.t.d. N {count} in tab.", defaultUnitRu: "таб." },
	{ code: "capsules", nameRu: "капсулы", nameLatin: "Capsulae", latinAbbr: "caps.", dispensePatternLatin: "D.t.d. N {count} in caps.", defaultUnitRu: "капс." },
	{ code: "sachet_granules", nameRu: "саше / гранулы для суспензии", nameLatin: "Granulae pro suspensionis oralis", latinAbbr: "gran.", dispensePatternLatin: "D.t.d. N {count} in gran.", defaultUnitRu: "пакет." },
	{ code: "solution_oral_topical", nameRu: "раствор для местного применения / полоскания", nameLatin: "Solutio ad usum localem", latinAbbr: "sol.", dispensePatternLatin: "D.t.d. N {count} in flac.", defaultUnitRu: "флак." },
	{ code: "solution_injection", nameRu: "раствор для инъекций", nameLatin: "Solutio pro injectionibus", latinAbbr: "sol.", dispensePatternLatin: "D.t.d. N {count} in amp.", defaultUnitRu: "амп." },
	{ code: "dental_gel", nameRu: "гель стоматологический", nameLatin: "Gelum dentale", latinAbbr: "gel.", dispensePatternLatin: "D.t.d. N {count} in tuba", defaultUnitRu: "туба" },
	{ code: "dental_paste", nameRu: "дентальная адгезивная паста", nameLatin: "Pasta dentalis adhesiva", latinAbbr: "past.", dispensePatternLatin: "D.t.d. N {count} in tuba", defaultUnitRu: "туба" },
	{ code: "ointment", nameRu: "мазь для наружного и местного применения", nameLatin: "Unguentum", latinAbbr: "ung.", dispensePatternLatin: "D.t.d. N {count} in tuba", defaultUnitRu: "туба" },
	{ code: "spray", nameRu: "спрей дозированный", nameLatin: "Aerosolum / Spray", latinAbbr: "aeros.", dispensePatternLatin: "D.t.d. N {count} in flac.", defaultUnitRu: "флак." },
	{ code: "suspension", nameRu: "суспензия для приема внутрь", nameLatin: "Suspensio", latinAbbr: "susp.", dispensePatternLatin: "D.t.d. N {count} in flac.", defaultUnitRu: "флак." },
	{ code: "varnish", nameRu: "лак стоматологический фторирующий", nameLatin: "Lacca dentalis", latinAbbr: "lacc.", dispensePatternLatin: "D.t.d. N {count} in flac.", defaultUnitRu: "флак." },
	{ code: "drops", nameRu: "капли для приема внутрь", nameLatin: "Guttae", latinAbbr: "gutt.", dispensePatternLatin: "D.t.d. N {count} in flac.", defaultUnitRu: "флак." },
];

export type DentalDrugTherapeuticClass =
	| "antibiotic"
	| "nsaid"
	| "antiseptic"
	| "topical_dental"
	| "antihistamine"
	| "anesthetic"
	| "emergency"
	| "corticosteroid"
	| "gastroprotective"
	| "antifungal_antiviral";

export interface DentalCatalogMedicationItem {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly innLatin: string;
	readonly category: DentalDrugTherapeuticClass;
	readonly categoryLabelRu: string;
	readonly form: DentalMedicationForm;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly routeRu: string;
	readonly frequencyRu: string;
	readonly quantityDefault: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly requiresPrescription: boolean;
	readonly validityDays: 15 | 30 | 60 | 365;
}

export function formatPrescriptionSignature(
	item: DentalCatalogMedicationItem,
	options?: { readonly count?: number; readonly customSigna?: string },
): { readonly latinRp: string; readonly dispenseLatin: string; readonly signaRu: string } {
	const count = options?.count ?? 1;
	const formMeta = DENTAL_14_DOSAGE_FORMS.find((f) => f.code === item.form);
	const dispenseLatin = formMeta
		? formMeta.dispensePatternLatin.replace("{count}", String(count))
		: item.dispenseLatin;

	return {
		latinRp: `Rp.: ${item.innLatin} ${item.dosageRu}`,
		dispenseLatin,
		signaRu: options?.customSigna || item.signaRu,
	};
}
