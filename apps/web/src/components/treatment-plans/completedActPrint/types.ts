/**
 * types.ts — Layer 0: Строгие типы и интерфейсы печатной формы Акта выполненных работ
 * по плану лечения согласно стандартам Минздрава РФ (Приказ 804н), Постановлению № 736
 * и Закону о защите прав потребителей № 2300-1.
 */

import type { Kopecks } from "@dental/shared";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore.js";
import type { CompletedWorksActAndWriteOffData, TreatmentPlanItem } from "../types.js";

export type { ActPrintHeaderProps } from "./types/actPrintHeaderTypes.js";

export type { CompletedWorksActAndWriteOffData };
export type CompletedActProcedureItem = TreatmentPlanItem;
export type ActPalette = DocumentBrandColorPalette;
export type TreatmentPlanActPrintData = CompletedWorksActAndWriteOffData;

export interface TreatmentPlanCompletedActPrintProps {
	readonly isOpen: boolean;
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly clinicLegalName?: string;
	readonly clinicInn?: string;
	readonly clinicOgrn?: string;
	readonly clinicKpp?: string;
	readonly clinicAddress?: string;
	readonly clinicLicense?: string;
	readonly clinicPhone?: string;
	readonly clinicWebsite?: string;
	readonly clinicEmail?: string;
	readonly patientPassport?: string;
	readonly patientBirthDate?: string;
	readonly patientGender?: "male" | "female" | string;
	readonly patientPhone?: string;
	readonly patientAddress?: string;
	readonly patientSnils?: string;
	readonly patientOmsPolis?: string;
	readonly patientMedicalCardNumber?: string;
	readonly doctorSpecialty?: string;
	readonly doctorSnils?: string;
	readonly contractDate?: string;
	readonly onClose: () => void;
	readonly onConfirmExecuteWriteOff?: (() => void) | undefined;
	readonly isExecuting?: boolean | undefined;
}

export interface ActPrintServicesTableProps {
	readonly visibleProcedures: CompletedWorksActAndWriteOffData["completedProcedures"];
	readonly microConsumables: CompletedWorksActAndWriteOffData["completedProcedures"];
	readonly showMicroConsumables: boolean;
	readonly palette: DocumentBrandColorPalette;
	readonly grossServicesRub: number;
	readonly discountTotalRub: number;
	readonly netServicesRub: number;
	readonly netServicesKopecks: Kopecks;
	readonly servicesInWords: string;
}

export interface ActPrintFinancialSummaryProps {
	readonly netServicesRub: number;
	readonly netServicesKopecks: Kopecks;
	readonly netMaterialRub: number;
	readonly netMaterialKopecks: Kopecks;
	readonly marginRub: number;
	readonly marginPercent: number;
	readonly palette: DocumentBrandColorPalette;
}

export interface ActPrintSignaturesAndLegalProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly legalName: string;
	readonly patientPassport?: string | null | undefined;
	readonly showDoctorStampFrame: boolean;
	readonly showQrVerification: boolean;
	readonly verificationHash: string;
	readonly customDisclaimer?: string;
}

export interface ActPrintActionBarProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly hasDeficit: boolean;
	readonly isExecuting: boolean;
	readonly showMicroConsumables: boolean;
	readonly microConsumablesCount: number;
	readonly onConfirmExecuteWriteOff?: (() => void) | undefined;
	readonly onToggleMicroConsumables: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export interface ActPrintWatermarkProps {
	readonly status: CompletedWorksActAndWriteOffData["status"];
}
