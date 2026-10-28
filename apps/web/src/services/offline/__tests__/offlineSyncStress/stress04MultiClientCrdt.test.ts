import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeFieldLevelCrdt } from "@dental/shared";

describe("STRESS 4: Multi-client CRDT merge", () => {
	test("3 Doctors + 2 Receptionists concurrent edits with deterministic LWW resolution", () => {
		const basePatient = {
			id: "pat-multi-99",
			fullName: "Кузнецов Дмитрий Сергеевич",
			phone: "+7 (999) 000-00-00",
			notes: "Исходное примечание",
			statusLocalis: "Первичный статус",
			anamnesis: "Первичный анамнез",
			treatmentPlan: "Первичный план",
		};

		const baseVector = {
			fullName: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			phone: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			notes: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			statusLocalis: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			anamnesis: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			treatmentPlan: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
		};

		const patches = [
			{ patch: { statusLocalis: "Кариес 3.6 на жевательной поверхности" }, vec: { statusLocalis: { updatedAt: "2026-08-23T08:10:00.000Z", version: 2 } }, time: "2026-08-23T08:10:00.000Z", id: "doc-1" },
			{ patch: { anamnesis: "Жалобы на боли от сладкого" }, vec: { anamnesis: { updatedAt: "2026-08-23T08:12:00.000Z", version: 2 } }, time: "2026-08-23T08:12:00.000Z", id: "doc-2" },
			{ patch: { treatmentPlan: "Пломбирование зуба 3.6 светоотверждаемым композитом" }, vec: { treatmentPlan: { updatedAt: "2026-08-23T08:14:00.000Z", version: 2 } }, time: "2026-08-23T08:14:00.000Z", id: "doc-3" },
			{ patch: { phone: "+7 (999) 111-22-33", notes: "Пациент просил напомнить за 2 часа" }, vec: { phone: { updatedAt: "2026-08-23T08:05:00.000Z", version: 2 }, notes: { updatedAt: "2026-08-23T08:05:00.000Z", version: 2 } }, time: "2026-08-23T08:05:00.000Z", id: "rec-1" },
			{ patch: { notes: "Пациент перенес визит на вечер (новейшая запись)" }, vec: { notes: { updatedAt: "2026-08-23T08:20:00.000Z", version: 3 } }, time: "2026-08-23T08:20:00.000Z", id: "rec-2" },
		];

		let currentEntity: Record<string, unknown> = { ...basePatient };
		let currentVector: typeof baseVector = { ...baseVector };

		for (const p of patches) {
			const res = mergeFieldLevelCrdt<{
				id: string; fullName: string; phone: string; notes: string;
				statusLocalis: string; anamnesis: string; treatmentPlan: string;
			}>({
				entityKind: "patient",
				entityId: "pat-multi-99",
				serverEntity: currentEntity,
				serverVector: currentVector,
				clientPatch: p.patch,
				clientVector: p.vec,
				clientUpdatedAt: p.time,
				clientId: p.id,
			});
			currentEntity = res.mergedEntity as unknown as Record<string, unknown>;
			currentVector = res.updatedVector as typeof baseVector;
		}

		assert.strictEqual(currentEntity.statusLocalis, "Кариес 3.6 на жевательной поверхности");
		assert.strictEqual(currentEntity.anamnesis, "Жалобы на боли от сладкого");
		assert.strictEqual(currentEntity.treatmentPlan, "Пломбирование зуба 3.6 светоотверждаемым композитом");
		assert.strictEqual(currentEntity.phone, "+7 (999) 111-22-33");
		assert.strictEqual(currentEntity.notes, "Пациент перенес визит на вечер (новейшая запись)");
		assert.strictEqual(currentEntity.fullName, "Кузнецов Дмитрий Сергеевич");
	});
});
