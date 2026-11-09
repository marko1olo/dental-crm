/**
 * apps/api/src/routes/leadsModules/__tests__/leadsModules.test.ts
 *
 * DENTE Dental CRM — Leads Modules, Schema & Patient Relationship Integration Test Suite.
 * Mandates:
 * - Mandate 8e, 8n (Solo Doctor Autonomy & CRM Funnel)
 * - DEF-PAT-02: Relational patientId foreign key in crmLeads table and conversion stage transitions.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crmLeads, crmLeadStageHistory } from "../../../db/schema.js";
import { leadSchema, patchLeadSchema } from "../types.js";
import {
	recordLeadStageTransition,
	type StageTransitionDbExecutor,
} from "../../leadsConversionModules/leadStageTransition.js";

describe("Leads Modules & Relational Patient Linking (DEF-PAT-02)", () => {
	it("1. crmLeads Drizzle schema includes relational patientId column", () => {
		assert.ok(crmLeads.patientId, "crmLeads must expose patientId column");
		assert.equal(crmLeads.patientId.name, "patient_id");
	});

	it("2. leadSchema and patchLeadSchema validate UUID patientId cleanly", () => {
		const validUuid = "018e3a2b-7c10-7000-8000-000000000101";
		const parsed = leadSchema.safeParse({
			name: "Иван Иванов",
			phone: "+7 999 111-22-33",
			patientId: validUuid,
		});
		assert.equal(parsed.success, true);
		if (parsed.success) {
			assert.equal(parsed.data.patientId, validUuid);
		}

		const patchParsed = patchLeadSchema.safeParse({
			patientId: validUuid,
			status: "converted",
		});
		assert.equal(patchParsed.success, true);
	});

	it("3. recordLeadStageTransition persists patientId into update values during conversion", async () => {
		const updatedSet: Record<string, unknown>[] = [];
		const insertedHistory: Record<string, unknown>[] = [];

		const mockTx: StageTransitionDbExecutor = {
			insert: (_table: unknown) => ({
				values: async (vals: Record<string, unknown>) => {
					insertedHistory.push(vals);
				},
			}),
			update: (_table: unknown) => ({
				set: (vals: Record<string, unknown>) => {
					updatedSet.push(vals);
					return {
						where: async () => {},
					};
				},
			}),
		};

		const testOrgId = "018e3a2b-7c10-7000-8000-000000000001";
		const testLeadId = "018e3a2b-7c10-7000-8000-000000000002";
		const testPatientId = "018e3a2b-7c10-7000-8000-000000000003";

		await recordLeadStageTransition({
			tx: mockTx,
			organizationId: testOrgId,
			leadId: testLeadId,
			fromStage: "consult_booked",
			toStage: "converted",
			stageEnteredAt: new Date(),
			changedByUserId: null,
			patientId: testPatientId,
		});

		assert.equal(insertedHistory.length, 1);
		const firstHistory = insertedHistory[0];
		assert.ok(firstHistory);
		assert.equal(firstHistory.toStage, "converted");
		assert.equal(updatedSet.length, 1);
		const firstUpdate = updatedSet[0];
		assert.ok(firstUpdate);
		assert.equal(firstUpdate.status, "converted");
		assert.equal(firstUpdate.patientId, testPatientId, "patientId must be persisted into crmLeads table upon conversion");
	});
});
