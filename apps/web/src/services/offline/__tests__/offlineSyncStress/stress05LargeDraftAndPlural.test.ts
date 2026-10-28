import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { deleteOfflineDraft, loadOfflineDraft, saveOfflineDraft } from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 5 & 6: Large draft payload & Russian pluralization", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("STRESS 5: Large draft payload preservation (100KB+ SOAP transcript with 10 overwrites)", async () => {
		const draftKey = "dente_large_draft_surgery_1";
		const largeParagraph = "Детальный протокол хирургической операции синус-лифтинга и дентальной имплантации. ".repeat(200);

		for (let version = 1; version <= 10; version++) {
			const largeData = {
				version,
				text: largeParagraph,
				transcripts: Array.from({ length: 50 }, (_, idx) => `Фрагмент аудио ${idx}: ${largeParagraph.slice(0, 100)}`),
				teethPlan: Array.from({ length: 32 }, (_, idx) => ({ tooth: idx + 11, status: `healthy_v${version}` })),
			};
			const saved = await saveOfflineDraft(draftKey, "DIARY_043_DRAFT", "surgery-visit-1", largeData, "org-large");
			assert.strictEqual(saved.data.version, version);
		}

		const loaded = await loadOfflineDraft<{ version: number; text: string }>(draftKey);
		assert.ok(loaded);
		assert.strictEqual(loaded.data.version, 10);
		assert.ok(loaded.data.text.length > 10000);

		await deleteOfflineDraft(draftKey);
		const afterDelete = await loadOfflineDraft(draftKey);
		assert.strictEqual(afterDelete, null);
	});

	test("STRESS 6: Russian pluralization rules for offline continuity strip", () => {
		function pluralizeChanges(count: number): string {
			const abs = Math.abs(count) % 100;
			const num = abs % 10;
			if (abs > 10 && abs < 20) return `${count} изменений`;
			if (num > 1 && num < 5) return `${count} изменения`;
			if (num === 1) return `${count} изменение`;
			return `${count} изменений`;
		}

		assert.strictEqual(pluralizeChanges(1), "1 изменение");
		assert.strictEqual(pluralizeChanges(2), "2 изменения");
		assert.strictEqual(pluralizeChanges(3), "3 изменения");
		assert.strictEqual(pluralizeChanges(4), "4 изменения");
		assert.strictEqual(pluralizeChanges(5), "5 изменений");
		assert.strictEqual(pluralizeChanges(11), "11 изменений");
		assert.strictEqual(pluralizeChanges(12), "12 изменений");
		assert.strictEqual(pluralizeChanges(14), "14 изменений");
		assert.strictEqual(pluralizeChanges(20), "20 изменений");
		assert.strictEqual(pluralizeChanges(21), "21 изменение");
		assert.strictEqual(pluralizeChanges(22), "22 изменения");
		assert.strictEqual(pluralizeChanges(25), "25 изменений");
		assert.strictEqual(pluralizeChanges(101), "101 изменение");
		assert.strictEqual(pluralizeChanges(104), "104 изменения");
		assert.strictEqual(pluralizeChanges(500), "500 изменений");
	});
});
