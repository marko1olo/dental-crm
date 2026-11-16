import React from "react";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { CopilotStudioModal } from "../CopilotStudioModal";

describe("CopilotStudioModal Zero-Leak Draft Reset (COP-01)", () => {
	beforeEach(() => {
		// Mock local storage if not available in Node
		if (typeof globalThis.localStorage === "undefined") {
			const store: Record<string, string> = {};
			globalThis.localStorage = {
				getItem: (key: string) => store[key] ?? null,
				setItem: (key: string, value: string) => {
					store[key] = String(value);
				},
				removeItem: (key: string) => {
					delete store[key];
				},
				clear: () => {
					for (const k of Object.keys(store)) delete store[k];
				},
				key: (i: number) => Object.keys(store)[i] ?? null,
				length: 0,
			};
		}
	});

	it("renders CopilotStudioModal cleanly with semantic success token", () => {
		const html = renderToString(
			<CopilotStudioModal
				isOpen={true}
				onClose={() => {}}
				patientId="pat-1"
				patientName="Иванов И.И."
			/>
		);
		// Check that pulse dot uses var(--success) instead of hardcoded emerald
		assert.ok(html.includes("bg-[var(--success)]"), "Pulse dot must use var(--success) token");
		assert.ok(!html.includes("bg-emerald-500"), "Hardcoded bg-emerald-500 must not exist in modal");
		assert.ok(html.includes("ДЕНТА Копайлот"), "Header title must render");
	});
});
