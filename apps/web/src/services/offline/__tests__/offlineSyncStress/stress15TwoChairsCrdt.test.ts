import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { mergeFieldLevelCrdt } from "@dental/shared";
import {
	deleteForm043Draft,
	loadForm043Draft,
	resetOfflineDbConnection,
	saveForm043Draft,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 15: Two Dental Chairs Concurrent Multi-Field CRDT Resolution", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Multi-field CRDT merge and 3-second autosave crash recovery", async () => {
		const orgId = "org-dual-chairs";
		const patientId = "patient-dual-chair-101";

		const baseCard = {
			id: patientId, fullName: "Морозов А.П.", anamnesis: "Первичный",
			status16: "Здоров", status15: "Здоров", status48: "Здоров",
			treatmentPlan: "Санация", notes: "Без особенностей",
		};
		const baseVector = {
			fullName: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			anamnesis: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			status16: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			status15: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			status48: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			treatmentPlan: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			notes: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
		};

		const chair1Patch = { anamnesis: "Пульсирующая боль 15", status15: "Пульпит", status16: "Кариес" };
		const chair1Vector = {
			anamnesis: { updatedAt: "2026-08-24T09:15:00.000Z", version: 2 },
			status15: { updatedAt: "2026-08-24T09:15:00.000Z", version: 2 },
			status16: { updatedAt: "2026-08-24T09:15:00.000Z", version: 2 },
		};

		const chair2Patch = { status48: "Дистопия 48", treatmentPlan: "Эндо 15 + удаление 48", notes: "Ultracain 1.7ml" };
		const chair2Vector = {
			status48: { updatedAt: "2026-08-24T09:18:00.000Z", version: 2 },
			treatmentPlan: { updatedAt: "2026-08-24T09:18:00.000Z", version: 2 },
			notes: { updatedAt: "2026-08-24T09:18:00.000Z", version: 2 },
		};

		const m1 = mergeFieldLevelCrdt<typeof baseCard>({
			entityKind: "patient", entityId: patientId, serverEntity: baseCard, serverVector: baseVector,
			clientPatch: chair1Patch, clientVector: chair1Vector, clientUpdatedAt: "2026-08-24T09:15:00.000Z", clientId: "chair-1",
		});

		const m2 = mergeFieldLevelCrdt<typeof baseCard>({
			entityKind: "patient", entityId: patientId, serverEntity: m1.mergedEntity, serverVector: m1.updatedVector,
			clientPatch: chair2Patch, clientVector: chair2Vector, clientUpdatedAt: "2026-08-24T09:18:00.000Z", clientId: "chair-2",
		});

		const finalCard = m2.mergedEntity;
		assert.strictEqual(finalCard.status15, "Пульпит");
		assert.strictEqual(finalCard.status48, "Дистопия 48");

		for (let sec = 3; sec <= 15; sec += 3) {
			await saveForm043Draft(patientId, { ...finalCard, examSeconds: sec }, orgId);
		}

		resetOfflineDbConnection();

		const restored = await loadForm043Draft<typeof finalCard & { examSeconds: number }>(patientId);
		assert.ok(restored);
		assert.strictEqual(restored.data.examSeconds, 15);

		await deleteForm043Draft(patientId);
		assert.strictEqual(await loadForm043Draft(patientId), null);
	});
});
