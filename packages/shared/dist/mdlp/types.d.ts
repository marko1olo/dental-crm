import { z } from "zod";
export declare const dentalAnestheticVasoconstrictorSchema: z.ZodEnum<["none", "1:100000", "1:200000", "1:50000"]>;
export type DentalAnestheticVasoconstrictor = z.infer<typeof dentalAnestheticVasoconstrictorSchema>;
export interface DentalAnestheticInfo {
    readonly id: string;
    readonly tradeName: string;
    readonly tradeNameLatin: string;
    readonly inn: string;
    readonly innLatin: string;
    readonly activeSubstance: string;
    readonly concentrationPct: number;
    readonly vasoconstrictor: DentalAnestheticVasoconstrictor;
    readonly vasoconstrictorName: string;
    readonly carpuleVolumeMl: number;
    readonly dosageForm: string;
    readonly manufacturer: string;
    readonly atxCode: string;
    readonly gtinMatches: readonly string[];
    readonly isPrescriptionOnly: boolean;
    readonly storageConditions?: string | undefined;
    readonly maxCarpulesPerPatient?: number | undefined;
    readonly notes?: string | undefined;
}
export interface MdlpExpirationResult {
    readonly isoDate: string | null;
    readonly isExpired: boolean;
    readonly daysUntilExpiration: number | null;
    readonly isExpiringSoon: boolean;
    readonly error?: string | undefined;
}
export interface MdlpParsedBarcode {
    readonly rawBarcode: string;
    readonly gtin: string;
    readonly serialNumber: string;
    readonly cryptoKey: string;
    readonly cryptoSignature: string;
    readonly sgtin: string;
    readonly expirationDate: string | null;
    readonly expirationDateRaw: string | null;
    readonly series: string | null;
    readonly lot: string | null;
    readonly isValidGtinChecksum: boolean;
    readonly isExpired: boolean;
    readonly daysUntilExpiration: number | null;
    readonly isExpiringSoon: boolean;
    readonly recognizedDrug: DentalAnestheticInfo | null;
    readonly parsedAIs: Readonly<Record<string, string>>;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
    readonly isValid: boolean;
}
export interface MdlpDisposalItem {
    readonly sgtin: string;
    readonly gtin: string;
    readonly serialNumber: string;
    readonly series?: string | null | undefined;
    readonly lot?: string | null | undefined;
    readonly expirationDate?: string | null | undefined;
    readonly costRub?: number | null | undefined;
    readonly tradeName?: string | null | undefined;
    readonly inn?: string | null | undefined;
}
export interface MdlpDisposalParams {
    readonly subjectId: string;
    readonly operationDate?: string | Date | null | undefined;
    readonly docNum: string;
    readonly docDate: string;
    readonly withdrawalType?: number | undefined;
    readonly patientId?: string | null | undefined;
    readonly visitId?: string | null | undefined;
    readonly doctorId?: string | null | undefined;
    readonly notes?: string | null | undefined;
    readonly items: readonly MdlpDisposalItem[];
}
export interface MdlpSchema10560Document {
    readonly actionId: 10560;
    readonly subjectId: string;
    readonly operationDate: string;
    readonly docNum: string;
    readonly docDate: string;
    readonly withdrawalType: 13;
    readonly patientId?: string | null | undefined;
    readonly visitId?: string | null | undefined;
    readonly doctorId?: string | null | undefined;
    readonly items: readonly MdlpDisposalItem[];
    readonly xmlContent: string;
    readonly jsonContent: Readonly<Record<string, unknown>>;
}
export type MdlpCarpuleStatus = "queued" | "disposed" | "rejected" | "quarantine";
export interface MdlpCarpuleQueueItem {
    readonly id: string;
    readonly rawBarcode: string;
    readonly gtin: string;
    readonly serialNumber: string;
    readonly sgtin: string;
    readonly series: string | null;
    readonly expirationDate: string | null;
    readonly expirationDateRaw: string | null;
    readonly isExpired: boolean;
    readonly isExpiringSoon: boolean;
    readonly daysUntilExpiration: number | null;
    readonly drugInfo: DentalAnestheticInfo | null;
    readonly costRub: number | null;
    readonly patientId?: string | null | undefined;
    readonly patientName?: string | null | undefined;
    readonly visitId?: string | null | undefined;
    readonly doctorId?: string | null | undefined;
    readonly doctorName?: string | null | undefined;
    readonly cabinetId?: string | null | undefined;
    readonly scannedAt: string;
    readonly status: MdlpCarpuleStatus;
}
export interface MdlpCarpuleBatch {
    readonly drugId: string;
    readonly tradeName: string;
    readonly inn: string;
    readonly series: string;
    readonly expirationDate: string | null;
    readonly isExpired: boolean;
    readonly isExpiringSoon: boolean;
    readonly count: number;
    readonly items: readonly MdlpCarpuleQueueItem[];
    readonly totalCostRub: number;
}
export interface MdlpCarpuleQueueStats {
    readonly totalCount: number;
    readonly totalCostRub: number;
    readonly expiredCount: number;
    readonly expiringSoonCount: number;
    readonly validCount: number;
    readonly uniqueDrugsCount: number;
    readonly uniqueSeriesCount: number;
}
export interface DisposalCommissionMember {
    readonly role: "senior_nurse" | "chief_doctor" | "department_head" | "dentist" | "member";
    readonly roleTitleRu: string;
    readonly fullName: string;
    readonly positionRu: string;
}
export interface SeniorNurseDisposalActItem {
    readonly itemIndex: number;
    readonly tradeName: string;
    readonly inn: string;
    readonly dosageForm: string;
    readonly series: string;
    readonly expirationDate: string;
    readonly sgtin: string;
    readonly carpulesCount: number;
    readonly unitCostRub: number;
    readonly totalCostRub: number;
    readonly patientFullName?: string | undefined;
    readonly patientCardNumber?: string | undefined;
    readonly visitNumber?: string | undefined;
    readonly disposalReasonRu: string;
}
export interface SeniorNurseDisposalActData {
    readonly actNumber: string;
    readonly actDate: string;
    readonly organizationName: string;
    readonly organizationInn: string;
    readonly organizationAddress: string;
    readonly departmentName: string;
    readonly cabinetName?: string | undefined;
    readonly basisRu: string;
    readonly schema10560ActionId: 10560;
    readonly crptReceiptNumber?: string | undefined;
    readonly commission: readonly DisposalCommissionMember[];
    readonly items: readonly SeniorNurseDisposalActItem[];
    readonly totalQuantityCarpules: number;
    readonly totalCostRub: number;
    readonly totalCostInWordsRu: string;
    readonly totalQuantityInWordsRu: string;
    readonly notes?: string | undefined;
    readonly approvedByFullName?: string | undefined;
    readonly approvedByPositionRu?: string | undefined;
    readonly approvalDate?: string | undefined;
}
