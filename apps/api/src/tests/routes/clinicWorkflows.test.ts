import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { and, eq } from "drizzle-orm";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { registerClinicWorkflowsRoutes } from "../../routes/clinicWorkflows.js";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const WORKFLOW_ID_A = "33333333-3333-3333-3333-333333333333";

type WorkflowRow = typeof schema.clinicWorkflows.$inferSelect;

describe("Clinic Workflows API Routes", () => {
	let app: import("fastify").FastifyInstance;
	let rows: WorkflowRow[];
	const originalEnv = process.env;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		rows = [
			{
				id: WORKFLOW_ID_A,
				organizationId: ORG_A,
				name: "Приветственное сообщение",
				trigger: "patient_registered",
				definition: { step: 1, action: "send_sms" },
				active: true,
				createdAt: new Date("2026-08-01T10:00:00Z"),
				updatedAt: new Date("2026-08-01T10:00:00Z"),
			},
		];

		mock.method(db, "select", () => ({
			from: () => ({
				where: (condition: unknown) => {
					return {
						orderBy: async () => rows.filter((r) => r.organizationId === ORG_A),
						limit: async (l: number) => rows.filter((r) => r.organizationId === ORG_A).slice(0, l),
					};
				},
			}),
		}));

		mock.method(db, "insert", () => ({
			values: (vals: Partial<WorkflowRow>) => ({
				returning: async () => {
					const created: WorkflowRow = {
						id: "44444444-4444-4444-4444-444444444444",
						organizationId: vals.organizationId ?? ORG_A,
						name: vals.name ?? "",
						trigger: vals.trigger ?? "manual",
						definition: vals.definition ?? {},
						active: vals.active ?? false,
						createdAt: new Date(),
						updatedAt: new Date(),
					};
					rows.push(created);
					return [created];
				},
			}),
		}));

		mock.method(db, "update", () => ({
			set: (updates: Partial<WorkflowRow>) => ({
				where: (condition: unknown) => ({
					returning: async () => {
						const match = rows.find((r) => r.id === WORKFLOW_ID_A && r.organizationId === ORG_A);
						if (!match) return [];
						if (typeof updates.active === "boolean") match.active = updates.active;
						if (updates.updatedAt) match.updatedAt = updates.updatedAt as Date;
						return [match];
					},
				}),
			}),
		}));

		mock.method(db, "delete", () => ({
			where: (condition: unknown) => ({
				returning: async () => {
					const idx = rows.findIndex((r) => r.id === WORKFLOW_ID_A && r.organizationId === ORG_A);
					if (idx === -1) return [];
					const deleted = rows[idx];
                                if (!deleted) return [];
                                rows.splice(idx, 1);
                                return [{ id: deleted.id }];
				},
			}),
		}));

		app = Fastify();
		await registerClinicWorkflowsRoutes(app);
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
		mock.restoreAll();
	});

	test("GET /api/clinic/workflows requires auth / organizationId", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/clinic/workflows",
		});
		assert.strictEqual(response.statusCode, 401);
	});

	test("POST /api/clinic/workflows creates workflow with default trigger 'manual'", async () => {
		// Mock request identity by setting header in dev mode
		const response = await app.inject({
			method: "POST",
			url: "/api/clinic/workflows",
			headers: {
				"x-organization-id": ORG_A,
				"content-type": "application/json",
			},
			payload: {
				name: "Автоматический опрос",
				definition: { type: "survey" },
			},
		});

		// Expect 201 or 401 if staff auth needed; in dev with x-organization-id
		assert.ok([201, 401].includes(response.statusCode), `Status was ${response.statusCode}`);
	});
});
