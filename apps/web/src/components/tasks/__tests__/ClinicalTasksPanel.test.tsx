import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ClinicalTasksPanel } from "../../../ClinicalTasksPanel";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

const mockAppContext = {
	dashboard: {
		appointments: [],
		patients: [{ id: "pat-1", fullName: "Иванов И.И." }],
		staff: [],
	},
	auth: {
		currentUser: { name: "Врач-ортопед" },
		denteClinicalReadHeaders: (extra: Record<string, string> = {}) => ({
			"x-test-auth": "true",
			...extra,
		}),
		denteClinicalMutationHeaders: (extra: Record<string, string> = {}) => ({
			"x-test-auth": "true",
			...extra,
		}),
	},
} as unknown as AppLogicContextType;

describe("ClinicalTasksPanel — Clinical Transfer Presets & Doctor Autonomy (Mandates 8d, 8e, 8k)", () => {
	it("renders ClinicalTasksPanel with phase completion presets", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<ClinicalTasksPanel patientId="pat-1" />
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="clinical-tasks-panel"'), "Must render clinical tasks panel");
		assert.ok(html.includes("Передача между этапами"), "Must contain panel title");
		assert.ok(html.includes("Завершить терапию — передать на ортопедию"), "Must contain Phase 1 therapy preset button");
		assert.ok(html.includes("Завершить хирургию — передать на ортопедию"), "Must contain Phase 2 surgery preset button");
	});

	it("returns null when patientId is not provided", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<ClinicalTasksPanel patientId={null} />
			</AppLogicProvider>,
		);

		assert.strictEqual(html, "", "Must return empty string when patientId is null");
	});

	it("provides clinical guidance without blocking doctor workflow", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<ClinicalTasksPanel patientId="pat-1" />
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes("Когда терапевтический или хирургический этап закончен"),
			"Must render clear clinical workflow instructions",
		);
		assert.ok(
			html.includes("Комментарий к передаче (необязательно)"),
			"Notes must be optional to prevent doctor blockage (Mandate 8e)",
		);
	});

	it("complies strictly with Mandate 8d p. 7 (Zero cartoon emojis in clinical documents/tasks)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<ClinicalTasksPanel patientId="pat-1" />
			</AppLogicProvider>,
		);

		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(html), "ClinicalTasksPanel must contain 0 cartoon emojis");
	});
});
