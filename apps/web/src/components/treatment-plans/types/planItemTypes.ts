/**
 * apps/web/src/components/treatment-plans/types/planItemTypes.ts
 *
 * Типы манипуляций, каталога услуг и врачей.
 */

import type { Ffd12PaymentSubject, Ffd12VatRate } from "@dental/shared";
import type { TreatmentPlanStageKind } from "./planStageTypes";

export interface TreatmentPlanDoctorOption {
	readonly id: string;
	readonly fullName: string;
	readonly role?: string | undefined;
	readonly specialty?: string | undefined;
}

export interface ClinicalProcedureDefinition {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly stageKind: TreatmentPlanStageKind;
	readonly stageNumber: number;
	readonly keywords: readonly string[];
	readonly materialsDefault: string;
	readonly uetDoctor?: number;
	readonly uetNurse?: number;
}

export type ServiceCatalogProcedureDefinition = ClinicalProcedureDefinition;
export type Order804nProcedureDefinition = ClinicalProcedureDefinition;

export interface TreatmentPlanItem {
	readonly id: string;
	readonly toothNumber?: number | undefined;
	readonly relatedToothNumbers?: readonly number[] | undefined;
	readonly serviceCode?: string | undefined;
	readonly code804n: string;
	readonly name: string;
	readonly category: string;
	readonly priceRub: number;
	readonly unitPriceRub: number;
	readonly discountRub: number;
	readonly quantity: number;
	readonly phase?: number | undefined;
	readonly stageKind: TreatmentPlanStageKind;
	readonly isAuto?: boolean | undefined;
	readonly priceId?: string | null | undefined;
	readonly fromCatalog?: boolean | undefined;
	readonly materials?: string | undefined;
	readonly clinicalRationale?: string | undefined;
	readonly isDraft?: boolean | undefined;
	readonly requiresManualPricing?: boolean | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined;
	readonly warrantyPriceRub?: number | undefined;
	readonly vatRate?: Ffd12VatRate | undefined;
	readonly paymentSubject?: Ffd12PaymentSubject | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly isRetail?: boolean | undefined;
	readonly currentCatalogPriceRub?: number | undefined;
	readonly isArchivedInCatalog?: boolean | undefined;
	readonly isPriceLocked?: boolean | undefined;
	readonly planStatus?: "draft" | "approved" | "in_progress" | "completed" | undefined;
	readonly archivedResolution?: "keep_agreed_price" | "replace_from_catalog" | undefined;
	readonly catalogDriftRub?: number | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly isCompleted?: boolean | undefined;
	readonly status?: "planned" | "completed" | "in_progress" | string | undefined;
	readonly completedAtIso?: string | null | undefined;
	readonly visitId?: string | null | undefined;
}
