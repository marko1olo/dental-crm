/**
 * packages/shared/src/demo/demoConstants.ts
 *
 * DENTE Dental CRM — Demo Mode Identifiers & Contracts (Mandates 8c, 8f, 8y).
 * Canonical Single Source of Truth (SSOT) shared across Frontend & Backend.
 */

import { z } from "zod";

export const DEMO_SHOWCASE_ORG_ID = "01a00000-0000-0000-0000-000000000000";

export const DEMO_CHAIR_1_ID = "01a00000-0000-0000-0002-000000000001";
export const DEMO_CHAIR_2_ID = "01a00000-0000-0000-0002-000000000002";
export const DEMO_CHAIR_3_ID = "01a00000-0000-0000-0002-000000000003";

export const DEMO_DOCTOR_1_ID = "01a00000-0000-0000-0003-000000000001"; // Терапевт (Соколов А. В.)
export const DEMO_DOCTOR_ORTHOPEDIST_ID = "01a00000-0000-0000-0003-000000000006"; // Ортопед (Орлов А. В.)
export const DEMO_DOCTOR_2_ID = "01a00000-0000-0000-0003-000000000002"; // Ортодонт (Морозова Е. И.)
export const DEMO_DOCTOR_SURGEON_ID = "01a00000-0000-0000-0003-000000000003"; // Хирург-имплантолог (Громов К. Д.)
export const DEMO_OWNER_ID = "01a00000-0000-0000-0003-000000000004"; // Главврач / Владелец (Воронов М. С.)
export const DEMO_ADMIN_ID = "01a00000-0000-0000-0003-000000000005"; // Старший администратор (Смирнова А. П.)

export const DEMO_STUDY_INSTANCE_UID = "1.2.826.0.1.3680043.8.demo.kavo.op300";

export const demoModeStateSchema = z.object({
	isDemoMode: z.boolean(),
	organizationId: z.string().uuid().optional(),
	seededAt: z.string().optional(),
});
export type DemoModeState = z.infer<typeof demoModeStateSchema>;

/**
 * Checks whether the given organization ID belongs to the Demo Showcase environment.
 */
export function isDemoOrganizationId(orgId: string | null | undefined): boolean {
	if (!orgId) return false;
	return orgId.toLowerCase() === DEMO_SHOWCASE_ORG_ID.toLowerCase();
}

/**
 * Checks whether an ID belongs to a demo seeded entity (prefix 01a00000-).
 */
export function isDemoEntityId(id: string | null | undefined): boolean {
	if (!id) return false;
	return id.toLowerCase().startsWith("01a00000-");
}
