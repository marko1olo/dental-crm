/**
 * types.ts — Canonical Types, Interfaces, and Constants for Deep Demo Seeder (Layer 0).
 */

import type { db } from "../../../db/client.js";
import type { TenantDb } from "../../../db/rls.js";

export type DbTx =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

// ─── Канонические ID демо-контура (SSOT) ─────────────────────────────────────────

export const DEMO_SHOWCASE_ORG_ID = "01a00000-0000-0000-0000-000000000000";

export const DEMO_CLINIC_ID = "01a00000-0000-0001-0000-000000000001";

export const DEMO_CHAIR_1_ID = "01a00000-0000-0000-0002-000000000001"; // Терапия
export const DEMO_CHAIR_2_ID = "01a00000-0000-0000-0002-000000000002"; // Ортопедия / Хирургия
export const DEMO_CHAIR_3_ID = "01a00000-0000-0000-0002-000000000003"; // Ортодонтия

export const DEMO_DOCTOR_1_ID = "01a00000-0000-0000-0003-000000000001"; // Терапевт (Соколов А. В.)
export const DEMO_DOCTOR_ORTHOPEDIST_ID = "01a00000-0000-0000-0003-000000000006"; // Ортопед (Орлов А. В.)
export const DEMO_DOCTOR_2_ID = "01a00000-0000-0000-0003-000000000002"; // Ортодонт (Морозова Е. И.)
export const DEMO_DOCTOR_SURGEON_ID = "01a00000-0000-0000-0003-000000000003"; // Хирург-имплантолог (Громов К. Д.)
export const DEMO_OWNER_ID = "01a00000-0000-0000-0003-000000000004"; // Главврач / Владелец (Воронов М. С.)
export const DEMO_ADMIN_ID = "01a00000-0000-0000-0003-000000000005"; // Старший администратор (Смирнова А. П.)

export const DEMO_PATIENT_1_ID = "01a00000-0000-0000-0000-000000000001"; // Иванов А. С. (Терапия)
export const DEMO_PATIENT_2_ID = "01a00000-0000-0000-0000-000000000002"; // Смирнова Е. В. (Ортопедия / ЗТЛ)
export const DEMO_PATIENT_3_ID = "01a00000-0000-0000-0000-000000000003"; // Кузнецов Д. П. (Ортодонтия)
export const DEMO_PATIENT_4_ID = "01a00000-0000-0000-0000-000000000004"; // Морозова А. Д. (Хирургия)

export const DEMO_WAREHOUSE_ID = "01a00000-0000-0004-0000-000000000001";
export const DEMO_LAB_ORDER_1_ID = "01a00000-0000-0005-0000-000000000001";

export interface SeedDeepDemoDataParams {
	readonly organizationId: string;
	readonly doctorUserId: string;
	readonly primaryChairId: string;
	readonly orthopedistUserId?: string;
	readonly surgeonUserId?: string;
	readonly chair2Id?: string;
	readonly chair3Id?: string;
}

export interface DeepDemoSeedResult {
	patientIds: string[];
	appointmentIds: string[];
	visitId?: string | undefined;
	treatmentPlanId?: string | undefined;
	labOrderId?: string | undefined;
	warehouseId?: string | undefined;
	leadIds: string[];
}

export interface EnsureDemoShowcaseResult {
	alreadyExisted: boolean;
	organizationId: string;
	clinicId: string;
	chairsCount: number;
	staffCount: number;
	patientsCount: number;
	appointmentsCount: number;
	labOrderId?: string | undefined;
	warehouseId?: string | undefined;
	leadsCount: number;
}
