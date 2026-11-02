/**
 * quickAddChairModal.test.tsx
 *
 * Модульные и интеграционные тесты быстрого создания кресла:
 * - Подсказки названий CHAIR_NAME_SUGGESTIONS и 14 аутентичных цветовых палитр CHAIR_COLOR_PRESETS
 * - Суверенитет соло-практики и клиники на 1 кресло (Мандат 8n, DEFAULT_SOLO_CHAIR)
 * - Автономия врача (Мандат 8e: submit button is never disabled)
 * - Чистота клинического UI без эмодзи (Мандат 8d)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import {
	QuickAddChairModal,
	CHAIR_COLOR_PRESETS,
	CHAIR_NAME_SUGGESTIONS,
} from "../QuickAddChairModal";
import { ChairScheduleView } from "../ChairScheduleView";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
	collectAllText,
	hasCartoonEmojis,
	getMockDashboard,
	type MockDomNode,
} from "./chairDoctorRosterTestHelpers";

describe("Schedule Parity: QuickAddChairModal & Solo Doctor Sovereignty", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	describe("1. QuickAddChairModal: Name Suggestions & 14 Authentic Color Presets", () => {
		it("CHAIR_NAME_SUGGESTIONS export has authentic Russian clinical names", () => {
			assert.ok(Array.isArray(CHAIR_NAME_SUGGESTIONS), "CHAIR_NAME_SUGGESTIONS must be an array");
			assert.ok(CHAIR_NAME_SUGGESTIONS.length >= 4, "Must have at least 4 name suggestions");
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кресло 1"));
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кресло 2 (Хирургия)"));
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кресло 3 (Терапия)"));
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кабинет 1"));
		});

		it("CHAIR_COLOR_PRESETS export has 14 authentic color palettes with lightHex & darkHex", () => {
			assert.strictEqual(CHAIR_COLOR_PRESETS.length, 14, "Must have exactly 14 color palettes");
			for (const cp of CHAIR_COLOR_PRESETS) {
				assert.ok(cp.id, "Preset must have id");
				assert.ok(cp.label, "Preset must have label");
				assert.ok(cp.hex.startsWith("#"), "Preset must have valid hex");
				assert.ok(cp.lightHex.startsWith("#"), "Preset must have valid lightHex");
				assert.ok(cp.darkHex.startsWith("#"), "Preset must have valid darkHex");
			}
		});

		it("renders name suggestion chips and clicking one fills the chair name input", async () => {
			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						existingChairsCount={2}
					/>,
				);
			});

			const sugg0 = findNodeByTestId(container, "quick-add-chair-name-suggestion-0");
			const sugg1 = findNodeByTestId(container, "quick-add-chair-name-suggestion-1");
			assert.ok(sugg0, "quick-add-chair-name-suggestion-0 must exist");
			assert.ok(sugg1, "quick-add-chair-name-suggestion-1 must exist");

			const input = findNodeByTestId(container, "quick-add-chair-name-input");
			assert.ok(input, "quick-add-chair-name-input must exist");

			// Click suggestion 1 ("Кресло 2 (Хирургия)")
			await clickNode(sugg1);

			assert.strictEqual(
				input.value,
				CHAIR_NAME_SUGGESTIONS[1],
				"Input value should match selected suggestion chip",
			);
		});

		it("Mandate 8e: submit button is never disabled even with empty inputs", async () => {
			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						existingChairsCount={0}
					/>,
				);
			});

			const submitBtn = findNodeByTestId(container, "quick-add-chair-submit-btn");
			assert.ok(submitBtn, "quick-add-chair-submit-btn must exist");
			assert.strictEqual(
				submitBtn.disabled,
				false,
				"Submit button must NEVER be disabled (Mandate 8e Doctor Autonomy)",
			);
		});

		it("Mandate 8d: 0 cartoon emojis in QuickAddChairModal", async () => {
			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						existingChairsCount={1}
					/>,
				);
			});

			const allText = collectAllText(container);
			assert.strictEqual(
				hasCartoonEmojis(allText),
				false,
				"Must not contain cartoon emojis (Mandate 8d п. 7)",
			);
		});
	});

	describe("2. Solo Doctor & Small Clinic Sovereignty (Mandate 8n)", () => {
		it("DEFAULT_SOLO_CHAIR provides clean 1-chair default with zero setup", () => {
			assert.ok(DEFAULT_SOLO_CHAIR, "DEFAULT_SOLO_CHAIR must exist");
			assert.strictEqual(DEFAULT_SOLO_CHAIR.id, "default-chair");
			assert.ok(DEFAULT_SOLO_CHAIR.name.includes("Кресло 1"));
			assert.strictEqual(DEFAULT_SOLO_CHAIR.isActive, true);
		});

		it("ChairScheduleView falls back to DEFAULT_SOLO_CHAIR when chairs list is empty", async () => {
			const emptyDashboard = {
				clinicSettings: {
					chairs: [],
					staff: [],
					profile: { organizationId: "org-1", timezone: "Europe/Moscow" },
				},
				appointments: [],
				patients: [],
			} as unknown as Dashboard;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={emptyDashboard}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const soloBadge = findNodeByTestId(container, "chair-view-badge-default-chair");
			assert.ok(
				soloBadge,
				"Solo default chair badge must render when clinicSettings.chairs is empty (Mandate 8n)",
			);
		});

		it("ChairScheduleView toolbar has 1 unified compact row (32-36px, Hick's Law)", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onOpenRosterModal={() => {}}
					/>,
				);
			});

			const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
			assert.ok(toolbar, "chair-schedule-palette-strip toolbar must exist");
			assert.ok(
				toolbar.className?.includes("h-9") || toolbar.className?.includes("min-h-[36px]"),
				"Toolbar must be strictly 1 compact row 32-36px",
			);
		});
	});

	describe("6. Mandate 8d & 8e Compliance Audit", () => {
		it("all buttons in ChairScheduleView have zero cartoon emojis", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const text = collectAllText(container);
			assert.strictEqual(
				hasCartoonEmojis(text),
				false,
				"ChairScheduleView must contain 0 cartoon emojis (Mandate 8d)",
			);
		});
	});
});
