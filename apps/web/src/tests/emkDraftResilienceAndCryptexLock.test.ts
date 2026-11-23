/**
 * apps/web/src/tests/emkDraftResilienceAndCryptexLock.test.ts
 *
 * Интеграционный тест надежности черновиков ЭМК (IndexedDB draft resilience),
 * Zero-Leak сброса черновиков (resetDraft()) и защиты Cryptex Lock (CORE-5 / TASK-EMR-01..02).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	getSynchronousDraft,
	saveOfflineDraftDebounced,
	loadOfflineDraft,
	deleteOfflineDraft,
	flushPendingOfflineDrafts,
} from "../services/offline/storage/idbDraftOps";
import { useVisitStore } from "../store/visitStore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("EMR SOAP Draft Resilience & Zero-Leak (CORE-5 / Mandates 8e, 8zq, 8bn)", () => {
	it("1. MedicalRecordStudioModal.tsx uses idbDraftOps instead of sessionStorage.setItem", () => {
		const modalPath = path.resolve(
			__dirname,
			"../components/emr/MedicalRecordStudioModal.tsx",
		);
		assert.ok(fs.existsSync(modalPath), "MedicalRecordStudioModal.tsx must exist");
		const code = fs.readFileSync(modalPath, "utf8");

		// Запрет ненадежного sessionStorage.setItem для автосохранения карты
		assert.ok(
			!code.includes("sessionStorage.setItem"),
			"MedicalRecordStudioModal.tsx must NOT use sessionStorage.setItem for draft autosave",
		);

		// Обязательное использование IndexedDB драфт-хранилища
		assert.ok(
			code.includes("saveOfflineDraftDebounced"),
			"MedicalRecordStudioModal.tsx must use saveOfflineDraftDebounced",
		);
		assert.ok(
			code.includes("loadOfflineDraft"),
			"MedicalRecordStudioModal.tsx must use loadOfflineDraft for async recovery",
		);
		assert.ok(
			code.includes("draft:emk:"),
			"MedicalRecordStudioModal.tsx must use canonical 'draft:emk:${patientId}' key",
		);
		assert.ok(
			code.includes("resetDraft"),
			"MedicalRecordStudioModal.tsx must implement resetDraft for Zero-Leak unmount",
		);
	});

	it("2. VisitView.tsx implements Zero-Leak resetDraft() cleanup on unmount", () => {
		const visitViewPath = path.resolve(__dirname, "../VisitView.tsx");
		assert.ok(fs.existsSync(visitViewPath), "VisitView.tsx must exist");
		const code = fs.readFileSync(visitViewPath, "utf8");

		assert.ok(
			code.includes("useVisitStore.getState().resetDraft()"),
			"VisitView.tsx must call useVisitStore.getState().resetDraft() on unmount",
		);
	});

	it("3. useVisitSave.ts integrates background heartbeat autosave (20s interval)", () => {
		const useVisitSavePath = path.resolve(
			__dirname,
			"../components/visit/useVisitSave.ts",
		);
		assert.ok(fs.existsSync(useVisitSavePath), "useVisitSave.ts must exist");
		const code = fs.readFileSync(useVisitSavePath, "utf8");

		assert.ok(
			code.includes("heartbeatInterval") || code.includes("20_000"),
			"useVisitSave.ts must contain periodic heartbeat draft autosave",
		);
	});

	it("4. IndexedDB draft operations store and retrieve drafts instantly via L1 RAM and fallback", async () => {
		const testPatientId = "00000000-0000-4000-a000-000000000999";
		const draftKey = `draft:emk:${testPatientId}`;
		const draftData = {
			anamnesis: { chiefComplaint: "Острая боль при накусывании 46" },
			passport: { patientFullName: "Тестовый Пациент Резильентный" },
		};

		// 1. Debounced save writes to L1 RAM immediately (0ms)
		saveOfflineDraftDebounced(
			draftKey,
			"DIARY_043_DRAFT",
			testPatientId,
			draftData,
			"test-org",
			10,
		);

		// 2. Immediate synchronous read from L1 RAM returns draft without loss
		const syncDraft = getSynchronousDraft<typeof draftData>(draftKey);
		assert.ok(syncDraft, "Draft must be retrievable synchronously from L1 RAM");
		assert.strictEqual(syncDraft.data.anamnesis.chiefComplaint, "Острая боль при накусывании 46");

		// 3. Flush pending writes
		await flushPendingOfflineDrafts();

		// 4. Async load returns valid draft
		const loaded = await loadOfflineDraft<typeof draftData>(draftKey);
		assert.ok(loaded, "Draft must be retrievable asynchronously via loadOfflineDraft");
		assert.strictEqual(loaded.data.passport.patientFullName, "Тестовый Пациент Резильентный");

		// 5. Clean delete
		await deleteOfflineDraft(draftKey);
		const afterDelete = getSynchronousDraft(draftKey);
		assert.strictEqual(afterDelete, null, "Draft must be deleted");
	});

	it("5. useVisitStore.getState().resetDraft() clears visit note and tooth state completely", () => {
		const store = useVisitStore.getState();

		// Set temporary draft state
		store.setTranscript("Пациент жалуется на ноющие боли");
		store.setVisitNoteForm({
			...store.visitNoteForm,
			complaint: "Ноющие боли",
		});

		assert.strictEqual(useVisitStore.getState().transcript, "Пациент жалуется на ноющие боли");
		assert.strictEqual(useVisitStore.getState().visitNoteForm.complaint, "Ноющие боли");

		// Trigger Zero-Leak Draft Reset
		useVisitStore.getState().resetDraft();

		// Verify state is clean
		assert.strictEqual(useVisitStore.getState().transcript, "");
		assert.strictEqual(useVisitStore.getState().visitNoteForm.complaint, "");
		assert.deepStrictEqual(useVisitStore.getState().visitToothStateByCode, {});
	});
});
