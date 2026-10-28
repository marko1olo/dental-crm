import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeVectorClocks, resolveForm043DiaryCrdt } from "@dental/shared";

describe("STRESS 32: Network Partition / Split-Brain Mesh healing", () => {
	test("Heal split-brain mesh across clinical tablet clusters", () => {
		const clusterAClock: Record<string, number> = { "tablet-surg-1": 4, "tablet-surg-2": 2 };
		const surgeryDiary = {
			id: "visit-split-99",
			complaints: "Острая боль 36",
			statusLocalis: "Удален зуб 36",
			treatmentProtocol: ["Анестезия", "Удаление 36", "Наложение швов"],
		};

		const clusterBClock: Record<string, number> = { "rec-pc": 6, "tablet-ortho": 3 };
		const receptionAppointment = {
			id: "visit-split-99",
			complaints: "Острая боль 36",
			statusLocalis: "Контроль гемостаза",
			treatmentProtocol: ["Анестезия", "Назначение антибиотикотерапии"],
		};

		const healedClock = mergeVectorClocks(clusterAClock, clusterBClock);
		assert.deepEqual(healedClock, {
			"tablet-surg-1": 4,
			"tablet-surg-2": 2,
			"rec-pc": 6,
			"tablet-ortho": 3,
		});

		const resolved = resolveForm043DiaryCrdt({
			existingDiary: surgeryDiary,
			incomingDiary: receptionAppointment,
			existingClock: clusterAClock,
			incomingClock: clusterBClock,
			existingUpdatedAt: "2026-08-25T11:00:00.000Z",
			incomingUpdatedAt: "2026-08-25T11:15:00.000Z",
			nodeId: "reception-pc",
		});

		assert.ok(resolved.resolvedDiary);
		const protocol = resolved.resolvedDiary.treatmentProtocol as string[];
		assert.strictEqual(protocol.length, 4);
		assert.ok(protocol.includes("Удаление 36"));
		assert.ok(protocol.includes("Назначение антибиотикотерапии"));
	});
});
