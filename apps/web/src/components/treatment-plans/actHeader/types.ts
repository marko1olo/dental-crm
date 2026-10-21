/**
 * apps/web/src/components/treatment-plans/actHeader/types.ts
 *
 * Типы пропсов компонентов шапки Акта выполненных работ.
 */

import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore";
import type { CompletedWorksActAndWriteOffData } from "../types";

export interface TreatmentPlanActHeaderProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly headerStyle: "modern_split" | "classic_centered" | "minimal_clean";
	readonly showClinicLogo: boolean;
	readonly logoUrl?: string | null | undefined;
	readonly showClinicRequisites: boolean;
	readonly clinicName: string;
	readonly slogan?: string;
	readonly legalName: string;
	readonly inn: string;
	readonly kpp: string;
	readonly ogrn: string;
	readonly address: string;
	readonly license: string;
	readonly phone: string;
	readonly website: string;
	readonly email: string;
	readonly patientDob: string;
	readonly patientGenderText: string;
	readonly patientPass: string;
	readonly patientRegAddress: string;
	readonly patientContactPhone: string;
	readonly patientSnilsVal: string;
	readonly patientOmsVal: string;
	readonly patientMedCard: string;
	readonly doctorSpec: string;
	readonly doctorSnilsVal: string;
	readonly contractDateFormatted: string;
}

export interface ActRequisitesTableProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly legalName: string;
	readonly inn: string;
	readonly kpp: string;
	readonly ogrn: string;
	readonly license: string;
	readonly patientDob: string;
	readonly patientGenderText: string;
	readonly patientPass: string;
	readonly patientRegAddress: string;
	readonly patientContactPhone: string;
	readonly patientSnilsVal: string;
	readonly patientOmsVal: string;
	readonly patientMedCard: string;
	readonly doctorSpec: string;
	readonly doctorSnilsVal: string;
}
