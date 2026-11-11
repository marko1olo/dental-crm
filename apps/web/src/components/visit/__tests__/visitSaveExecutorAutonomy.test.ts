import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useVisitSaveExecutor } from "../save/useVisitSaveExecutor";
import type { VisitNoteForm } from "../../../AppHelpers";

function renderHookProbe<T>(hookFn: () => T): T {
	let result!: T;
	function Probe() {
		result = hookFn();
		return createElement("span", null, "probe");
	}
	renderToStaticMarkup(createElement(Probe));
	return result;
}

describe("useVisitSaveExecutor Autonomy & Resilience (Defect 1 Invariant)", () => {
	it("executes local queueSave and returns success: true without 422 network request when patientId is undefined or invalid", async () => {
		let fetchCalled = false;

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (url: string) => {
			fetchCalled = true;
			if (url.includes("/draft/autosave")) {
				return {
					ok: false,
					status: 422,
					json: async () => ({ error: "ValidationError", message: "Invalid patientId" }),
				} as any;
			}
			return { ok: true, json: async () => ({}) } as any;
		}) as any;

		try {
			const currentFormRef = {
				current: {
					complaints: "Боль в зубе 46",
					anamnesis: "Без соматической патологии",
					objective: "Глубокий кариес 46",
					diagnosis: "K02.1 Кариес дентина",
					treatment: "Препарирование и пломба",
				} as VisitNoteForm,
			};
			const currentTranscriptRef = { current: "Осмотр зуба 46" };
			const lastSavedSignatureRef = { current: "initial-sig" };
			const isMountedRef = { current: true };

			let saveState = "idle";
			let serverSyncState = "idle";

			const saveExecutor = renderHookProbe(() =>
				useVisitSaveExecutor({
					canSave: true,
					computeSignature: () => "sig-new-1",
					lastSavedSignatureRef,
					currentFormRef,
					currentTranscriptRef,
					isMountedRef,
					visitId: "11111111-2222-3333-4444-555555555555",
					patientId: undefined, // Отсутствует patientId (Дефект 1)
					activeVisit: { id: "11111111-2222-3333-4444-555555555555", patientId: undefined },
					setSaveState: (s) => {
						saveState = s;
					},
					setLastSavedAt: () => {},
					setHasUnsavedChanges: () => {},
					setServerDraftSyncState: (s) => {
						serverSyncState = s;
					},
					setLastServerDraftSavedAt: () => {},
				}),
			);

			const outcome = await saveExecutor({ force: true });

			assert.equal(outcome.success, true, "Must succeed via queueSave fallback");
			assert.equal(fetchCalled, false, "Must NOT dispatch invalid network fetch leading to 422");
			assert.equal(saveState, "queued", "Must transition saveState to queued");
			assert.equal(serverSyncState, "queued", "Must transition serverDraftSyncState to queued");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("dispatches network PUT /draft/autosave when both visitId and patientId are valid UUIDs", async () => {
		if (typeof navigator !== "undefined") {
			try {
				Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
			} catch {}
		}
		let fetchUrl = "";
		let requestBody: any = null;

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (url: string, init?: RequestInit) => {
			fetchUrl = url;
			if (init?.body) requestBody = JSON.parse(init.body as string);
			return {
				ok: true,
				status: 200,
				json: async () => ({
					serverDraft: {
						serverSavedAt: new Date().toISOString(),
					},
				}),
			} as any;
		}) as any;

		try {
			const currentFormRef = {
				current: {
					complaints: "Жалоб нет",
				} as VisitNoteForm,
			};
			const currentTranscriptRef = { current: "" };
			const lastSavedSignatureRef = { current: "sig-old" };
			const isMountedRef = { current: true };

			const validVisitId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
			const validPatientId = "ffffffff-1111-4222-8333-444444444444";

			const saveExecutor = renderHookProbe(() =>
				useVisitSaveExecutor({
					canSave: true,
					computeSignature: () => "sig-valid-uuid",
					lastSavedSignatureRef,
					currentFormRef,
					currentTranscriptRef,
					isMountedRef,
					visitId: validVisitId,
					patientId: validPatientId,
					setSaveState: () => {},
					setLastSavedAt: () => {},
					setHasUnsavedChanges: () => {},
					setServerDraftSyncState: () => {},
					setLastServerDraftSavedAt: () => {},
				}),
			);

			const outcome = await saveExecutor({ force: true });

			assert.equal(outcome.success, true, "Must succeed on 200 OK");
			assert.ok(fetchUrl.includes(`/api/visits/${validVisitId}/draft/autosave`), "Must call autosave endpoint");
			assert.equal(requestBody?.patientId, validPatientId, "Must send valid patientId UUID in payload");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
