/**
 * documentContracts.ts — Реквизиты клиники, договоры и документы планов лечения.
 */

import type { Kopecks } from "../../../utils/money.js";
import type { PlanTierKey } from "./stageTierContracts.js";
import type { TreatmentPlanItemInput, TreatmentPlanStageSummary, TreatmentPlanTierEstimate } from "./itemContracts.js";

export interface ClinicLegalRequisites {
	readonly clinicFullName: string;
	readonly clinicBrandName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicEmail?: string;
	readonly clinicInn: string;
	readonly clinicKpp?: string;
	readonly clinicOgrn: string;
	readonly medicalLicenseNumber: string;
	readonly medicalLicenseDate: string;
	readonly medicalLicenseIssuer: string;
	readonly chiefDoctorFullName?: string;
}

export const DEFAULT_CLINIC_LEGAL_REQUISITES: ClinicLegalRequisites = {
	clinicFullName: "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicBrandName: "DENTE Стоматологическая Клиника",
	clinicAddress: "127006, г. Москва, ул. Долгоруковская, д. 21, стр. 1",
	clinicPhone: "+7 (495) 777-22-33",
	clinicEmail: "info@dente-clinic.ru",
	clinicInn: "7707441122",
	clinicKpp: "770701001",
	clinicOgrn: "1217700554433",
	medicalLicenseNumber: "ЛО41-01137-77/00368421",
	medicalLicenseDate: "12 октября 2021 г.",
	medicalLicenseIssuer: "Департамент здравоохранения города Москвы",
	chiefDoctorFullName: "Барабаш Сергей Владимирович",
};

export interface MultiOptionTreatmentPlanInput {
	readonly planId?: string;
	readonly planNumber?: string;
	readonly clinicId?: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string;
	readonly patientPhone?: string;
	readonly patientPassport?: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string;
	readonly clinicalDiagnosisRu: string;
	readonly createdAtIso?: string;
	readonly validUntilIso?: string;
	readonly clinicRequisites?: Partial<ClinicLegalRequisites>;
	readonly items: readonly TreatmentPlanItemInput[];
	readonly globalDiscountPercent?: number;
	readonly selectedTierKey?: PlanTierKey;
}

export interface MultiOptionTreatmentPlan {
	readonly planId: string;
	readonly planNumber: string;
	readonly clinicId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientPhone: string;
	readonly patientPassport: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly clinicalDiagnosisRu: string;
	readonly createdAtIso: string;
	readonly validUntilIso: string;
	readonly clinicRequisites: ClinicLegalRequisites;
	readonly tiers: Record<PlanTierKey, TreatmentPlanTierEstimate>;
	readonly availableTierKeys: readonly PlanTierKey[];
	readonly selectedTierKey: PlanTierKey;
	readonly selectedTier: TreatmentPlanTierEstimate;
	readonly isPennyExact: boolean;
}

export interface TreatmentPlanAppendix1DocumentData {
	readonly planNumber: string;
	readonly contractNumber: string;
	readonly documentDateRu: string;
	readonly clinicFullName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicLicense: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientPhone: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly clinicalDiagnosisRu: string;
	readonly selectedTierNameRu: string;
	readonly selectedTierBadgeRu: string;
	readonly stages: readonly TreatmentPlanStageSummary[];
	readonly totalGrossCostRu: string;
	readonly totalDiscountRu: string;
	readonly totalLaborCostRu: string;
	readonly totalMaterialsCostRu: string;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostRu: string;
	readonly totalCostInWordsRu: string;
	readonly warrantyPeriodRu: string;
	readonly ndflRefundRu: string;
	readonly installment12Ru: string;
	readonly termsAndConditionsAccepted: boolean;
}
