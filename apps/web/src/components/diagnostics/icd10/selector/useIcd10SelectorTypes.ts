import type { DentalIcd10Item, DentalSpecialty } from "../../icd10DentalCatalog";

export interface UseIcd10SelectorStateProps {
	readonly selectedCode?: string | null | undefined;
	readonly selectedTooth?: number | string | null | undefined;
	readonly onSelect: (item: DentalIcd10Item, toothNumber?: number | null) => void;
	readonly onClear?: (() => void) | undefined;
	readonly filterSpecialty?: DentalSpecialty | undefined;
	readonly initialRubric?: string | undefined;
}
