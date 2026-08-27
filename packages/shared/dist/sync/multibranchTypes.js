/**
 * ============================================================================
 * DENTE Dental CRM — Multi-Branch & Centralized Lab Sync Data Contracts
 *
 * Types, Zod schemas, and statutory constants for:
 * 1. Clinic network branches registry
 * 2. 152-FZ & 323-FZ Consent schemas
 * 3. Deposit Transfer Vouchers
 * 4. Centralized Lab (ZTL) order sync models
 * 5. Complete Patient Clinical Snapshot (043/у)
 * ============================================================================
 */
import { z } from "zod";
// ─────────────────────────────────────────────────────────────────────────────
// 1. Clinic Network Branches Registry
// ─────────────────────────────────────────────────────────────────────────────
export const clinicBranchIdSchema = z.enum([
    "central_hub",
    "branch_center",
    "branch_north",
    "branch_south",
    "branch_east",
]);
export const CLINIC_NETWORK_BRANCHES = [
    {
        id: "central_hub",
        code: "ЦК-01",
        okpoCode: "49201948",
        nameRu: "Центральный клинико-диагностический центр DENTE",
        shortNameRu: "Филиал «Центр-Хаб»",
        addressRu: "г. Москва, ул. Тверская, д. 12, стр. 1",
        phone: "+7 (495) 100-01-00",
        chiefDoctorRu: "Д-р Смирнов Александр Васильевич",
        seniorNurseRu: "Васильева Ольга Николаевна",
        isCentralHub: true,
    },
    {
        id: "branch_center",
        code: "ФИЛ-01",
        okpoCode: "49201954",
        nameRu: "Филиал «Центральный» (Тверская)",
        shortNameRu: "Филиал «Центр»",
        addressRu: "г. Москва, ул. Тверская, д. 24",
        phone: "+7 (495) 100-01-01",
        chiefDoctorRu: "Д-р Иванов Иван Иванович",
        seniorNurseRu: "Смирнова Анна Викторовна",
        isCentralHub: false,
    },
    {
        id: "branch_north",
        code: "ФИЛ-02",
        okpoCode: "49201960",
        nameRu: "Филиал «Северный» (Сокол)",
        shortNameRu: "Филиал «Север»",
        addressRu: "г. Москва, Ленинградский пр-т, д. 74",
        phone: "+7 (495) 100-01-02",
        chiefDoctorRu: "Д-р Кузнецов Павел Сергеевич",
        seniorNurseRu: "Кузнецова Ирина Сергеевна",
        isCentralHub: false,
    },
    {
        id: "branch_south",
        code: "ФИЛ-03",
        okpoCode: "49201977",
        nameRu: "Филиал «Южный» (Профсоюзная)",
        shortNameRu: "Филиал «Юг»",
        addressRu: "г. Москва, ул. Профсоюзная, д. 56",
        phone: "+7 (495) 100-01-03",
        chiefDoctorRu: "Д-р Морозов Дмитрий Алексеевич",
        seniorNurseRu: "Морозова Елена Павловна",
        isCentralHub: false,
    },
    {
        id: "branch_east",
        code: "ФИЛ-04",
        okpoCode: "49201985",
        nameRu: "Филиал «Восточный» (Сокольники)",
        shortNameRu: "Филиал «Восток»",
        addressRu: "г. Москва, ул. Сокольнический Вал, д. 18",
        phone: "+7 (495) 100-01-04",
        chiefDoctorRu: "Д-р Соколова Мария Евгеньевна",
        seniorNurseRu: "Федорова Екатерина Романовна",
        isCentralHub: false,
    },
];
export function getClinicBranch(branchId) {
    const found = CLINIC_NETWORK_BRANCHES.find((b) => b.id === branchId || b.code === branchId);
    if (found)
        return found;
    return {
        id: branchId,
        code: "ФИЛ-XX",
        okpoCode: "00000000",
        nameRu: `Филиал «${branchId}»`,
        shortNameRu: `Филиал «${branchId}»`,
        addressRu: "г. Москва, филиал сети",
        phone: "+7 (495) 000-00-00",
        chiefDoctorRu: "Главный врач филиала",
        seniorNurseRu: "Старшая медсестра",
        isCentralHub: false,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// 2. 152-FZ Consent Types & Schemas
// ─────────────────────────────────────────────────────────────────────────────
export const patientSignatureTypeSchema = z.enum([
    "simple_electronic_signature_sms",
    "tablet_stylus_biometric",
    "paper_scan",
    "ukep_crypto_pro",
]);
export const patientBranchTransferConsentSchema = z.object({
    consentId: z.string().min(1),
    patientId: z.string().min(1),
    patientFullName: z.string().min(1),
    patientPassportOrId: z.string().min(1),
    sourceBranchId: z.string().min(1),
    targetBranchId: z.string().min(1),
    transferPurposeRu: z.string().min(1),
    signedAtIso: z.string(),
    validUntilIso: z.string(),
    operatorFullName: z.string().min(1),
    operatorPosition: z.string().min(1),
    signatureType: patientSignatureTypeSchema,
    signatureHash: z.string().min(16),
    legalBasis: z.string().default("152-ФЗ ст. 6, 9; 323-ФЗ ст. 13; Постановление Правительства РФ № 140"),
    isRevoked: z.boolean().default(false),
    revokedAtIso: z.string().optional(),
});
// ─────────────────────────────────────────────────────────────────────────────
// 3. Deposit Transfer Voucher Schemas
// ─────────────────────────────────────────────────────────────────────────────
export const transferVoucherStatusSchema = z.enum([
    "issued",
    "in_transit",
    "redeemed",
    "cancelled",
    "expired",
]);
export const depositTransferVoucherSchema = z.object({
    voucherId: z.string().min(1),
    voucherCode: z.string().min(1),
    patientId: z.string().min(1),
    patientFullName: z.string().min(1),
    sourceBranchId: z.string().min(1),
    targetBranchId: z.string().min(1),
    amountKopecks: z.number().int().nonnegative(),
    amountRub: z.number().nonnegative(),
    issuedAtIso: z.string(),
    expiresAtIso: z.string(),
    status: transferVoucherStatusSchema,
    issuedByStaffId: z.string().min(1),
    issuedByStaffName: z.string().min(1),
    redeemedAtIso: z.string().optional(),
    redeemedByStaffId: z.string().optional(),
    redeemedByStaffName: z.string().optional(),
    idempotencyKey: z.string().min(1),
    payloadHash: z.string().min(16),
    crdtClock: z.record(z.string(), z.number()).optional(),
    notes: z.string().optional(),
});
// ─────────────────────────────────────────────────────────────────────────────
// 4. Centralized Lab Order Sync Schemas
// ─────────────────────────────────────────────────────────────────────────────
export const ztlSyncStageRank = {
    impression_sent: 10,
    cad_design: 20,
    milling_wax_up: 30,
    try_in_fitting: 40,
    glaze_finish: 50,
    ready_for_dispatch: 60,
    delivered_to_clinic: 70,
    fitted_completed: 80,
    cancelled: 99,
};
