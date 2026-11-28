import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { setupMockDom } from "../../documents/__tests__/documentLegalAuditMockDom.js";
import { PerioDetailedProbeSection } from "../PerioDetailedProbeSection.js";
import { PerioStudioModal } from "../PerioStudioModal.js";
import { normalizePerioDentition } from "../perioCatalogData.js";
import { usePerioStudioState, type UsePerioStudioStateProps } from "../usePerioStudioState.js";

function installMockLocalStorage(): Map<string, string> {
	const store = new Map<string, string>();
	(globalThis as unknown as Record<string, unknown>).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => { store.set(k, String(v)); },
		removeItem: (k: string) => { store.delete(k); },
		clear: () => { store.clear(); },
		key: (i: number) => Array.from(store.keys())[i] ?? null,
		get length() { return store.size; },
	};
	return store;
}

describe("Perio Studio Runtime State, Draft Bleed & Mobile HIG Gates", () => {
	let origFetch: typeof globalThis.fetch;
	let origLocalStorage: Storage | undefined;

	beforeEach(() => {
		origFetch = globalThis.fetch;
		origLocalStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
	});

	afterEach(() => {
		globalThis.fetch = origFetch;
		if (origLocalStorage) {
			(globalThis as unknown as { localStorage?: Storage }).localStorage = origLocalStorage;
		}
	});

	it("1. Resets teeth & PSR immediately when switching patientId (Zero Draft State Bleed)", async () => {
		const store = installMockLocalStorage();
		const { doc } = setupMockDom();
		globalThis.fetch = (async () => new Response(JSON.stringify({ success: true, data: null }), { status: 200 })) as typeof fetch;

		let latestState: ReturnType<typeof usePerioStudioState> | null = null;
		function Harness(props: UsePerioStudioStateProps) {
			latestState = usePerioStudioState(props);
			return React.createElement("div", { "data-patient": props.patientId }, String(latestState.teeth[0]?.distoBuccal?.probingDepthMm ?? ""));
		}

		const container = doc.createElement("div");
		doc.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(React.createElement(Harness, { patientId: "pat-A", isOpen: true }));
		});
		assert.ok(latestState);

		await act(async () => {
			latestState!.handleUpdateDepth(7);
		});
		assert.equal(latestState!.teeth.find((t) => t.toothNumber === 16)?.distoBuccal.probingDepthMm, 7);

		globalThis.fetch = (async () => new Response("Internal Error", { status: 500 })) as typeof fetch;
		await act(async () => {
			root.render(React.createElement(Harness, { patientId: "pat-B", isOpen: true }));
		});

		const patBTooth16Depth = latestState!.teeth.find((t) => t.toothNumber === 16)?.distoBuccal.probingDepthMm;
		assert.notEqual(patBTooth16Depth, 7, "Tooth depth from pat-A must not bleed into pat-B");
		await new Promise((r) => setTimeout(r, 700));
		const patBDraft = store.get("dente_perio_draft_v2_pat-B");
		if (patBDraft) {
			assert.ok(!patBDraft.includes('"probingDepthMm":7'), "Autosave must never persist pat-A depth into pat-B draft");
		}
		await act(async () => { root.unmount(); });
	});

	it("2. Keeps modal open and preserves local draft when server POST fails (500)", async () => {
		const store = installMockLocalStorage();
		const { doc } = setupMockDom();
		globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
			if (init?.method === "POST") {
				return new Response(JSON.stringify({ error: "ServerError" }), { status: 500 });
			}
			return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
		}) as typeof fetch;

		let closeCount = 0;
		let saveCount = 0;
		let latestState: ReturnType<typeof usePerioStudioState> | null = null;
		function Harness() {
			latestState = usePerioStudioState({
				patientId: "pat-err",
				isOpen: true,
				isModal: true,
				onClose: () => { closeCount += 1; },
				onSave: () => { saveCount += 1; },
			});
			return React.createElement("div", null, latestState.syncStatus);
		}

		const container = doc.createElement("div");
		doc.body.appendChild(container);
		const root = createRoot(container);
		await act(async () => { root.render(React.createElement(Harness)); });
		await act(async () => { latestState!.handleUpdateDepth(6); });
		await act(async () => { await latestState!.handleSave(); });

		assert.equal(closeCount, 0, "Modal must stay open on 500 save failure");
		assert.equal(saveCount, 0, "onSave callback must not fire on 500 save failure");
		assert.equal(latestState!.syncStatus, "idle");
		const preservedDraft = store.get("dente_perio_draft_v2_pat-err") ?? "";
		assert.ok(preservedDraft.includes('"probingDepthMm":6'), "Draft must remain in localStorage after failed save");
		await act(async () => { root.unmount(); });
	});

	it("3. PerioDetailedProbeSection & PerioStudioModal render mobile-safe grids without x-overflow", () => {
		const dentition = normalizePerioDentition(null);
		const htmlSection = renderToString(
			React.createElement(PerioDetailedProbeSection, {
				isDetailedExpanded: true,
				onToggleDetailedExpanded: () => {},
				teeth: dentition,
				selectedToothNum: 16,
				selectedSiteKey: "distoBuccal",
				onSelectToothNum: () => {},
				onSelectSiteKey: () => {},
				onUpdateDepth: () => {},
				onUpdateGingivalMargin: () => {},
				onToggleBop: () => {},
				onTogglePlaque: () => {},
				onToggleSuppuration: () => {},
				onUpdateMobility: () => {},
				onUpdateFurcation: () => {},
			}),
		);
		assert.ok(htmlSection.includes("grid-cols-4"), "Mobile tooth strip must use 4-col grid without horizontal scroll");
		assert.ok(!htmlSection.includes("overflow-x-auto"), "Perio probe strip must not force horizontal overflow-x-auto");
		assert.ok(htmlSection.includes("min-h-[44px]"), "Touch targets must preserve >= 44px height");

		const modalHtml = renderToString(
			React.createElement(PerioStudioModal, { isOpen: true, onClose: () => {}, patientId: "pat-render-1" }),
		);
		assert.ok(modalHtml.includes("Пародонтограмма") || modalHtml.includes("PSR"));
	});
});
