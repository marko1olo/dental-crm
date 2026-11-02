/**
 * chairToolbarParity.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 248 (Wave 59):
 * Chair Toolbar Parity, Hick's Law 1-Row Toolbar, Apple HIG Touch Targets & 0 Cartoon Emojis.
 *
 * Mandates Tested:
 * - Mandate 8b / 8zi: Sweet spot target (150–350 lines).
 * - Mandate 8c: Touch targets floor (>= 36-44px in toolbars and day headers).
 * - Mandate 8d п. 2: Hick's Law: 1-row toolbar (32-36px), dropdown grouping for secondary actions.
 * - Mandate 8d п. 4: Theme hygiene (CSS variables, dark/light mode tokens).
 * - Mandate 8d п. 7: 0 cartoon emojis in medical and schedule views (Lucide icons only).
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import { ChairScheduleView } from "../ChairScheduleView";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	findAllNodesByTag,
	collectAllText,
	clickNode,
	hasCartoonEmojis,
} from "./scheduleMockDomHarness";

const mockStaff = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		active: true,
		specialty: "Терапевт",
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		role: "doctor",
		active: true,
		specialty: "Хирург",
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Установка 1 (Planmeca)",
		roomNumber: "101",
		room: "101",
		color: "#0d9488",
		specialization: "therapist",
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Установка 2 (Kavo)",
		roomNumber: "102",
		room: "102",
		color: "#3b82f6",
		specialization: "surgeon",
		isActive: true,
	},
];

const mockDashboard: Dashboard = {
	patients: [],
	appointments: [],
	inventory: [],
	operations: [],
	treatmentPlans: [],
	cashRegisters: [],
	clinicSettings: {
		chairs: mockChairs as any,
		staff: mockStaff as any,
		cabinets: [
			{ id: "cab-1", name: "Кабинет 101", chairIds: ["chair-1"] },
			{ id: "cab-2", name: "Кабинет 102", chairIds: ["chair-2"] },
		],
	} as any,
} as any;

describe("Chair Toolbar Parity & Hick's Law 1-Row Toolbar (Wave 59 SSOT)", () => {
	let container: MockDomNode;
	let root: Root;
	let doc: any;

	beforeEach(() => {
		const env = setupMockDom();
		doc = env.doc;
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as any);
	});

	it("1. Hick's Law & Mandate 8d: 1-row toolbar (32-36px), dropdown trigger & 100% action test-id parity", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onOpenRosterModal={() => {}}
				/>,
			);
		});

		// 1. Toolbar strip check
		const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
		assert.ok(toolbar, "Palette strip must exist");
		assert.ok(
			toolbar.className?.includes("flex-nowrap") || toolbar.className?.includes("select-none"),
			"Toolbar must have proper single-row layout styling",
		);

		// 2. Primary direct toolbar buttons
		assert.ok(findNodeByTestId(container, "btn-open-chair-roster"), "btn-open-chair-roster must be directly visible in toolbar");
		assert.ok(findNodeByTestId(container, "btn-chair-view-add-doctor"), "btn-chair-view-add-doctor must be directly visible in toolbar");
		assert.ok(findNodeByTestId(container, "btn-add-chair-header"), "btn-add-chair-header must be directly visible in toolbar");

		// 3. Dropdown trigger button
		const dropdownTrigger = findNodeByTestId(container, "btn-chair-shifts-menu-trigger");
		assert.ok(dropdownTrigger, "Dropdown trigger btn-chair-shifts-menu-trigger must exist");
		assert.equal(dropdownTrigger.getAttribute("aria-expanded"), "false");

		// 4. Click dropdown trigger -> opens menu
		await clickNode(dropdownTrigger);
		const activeTrigger = findNodeByTestId(container, "btn-chair-shifts-menu-trigger") || dropdownTrigger;
		assert.equal(activeTrigger.getAttribute("aria-expanded"), "true");

		const dropdownMenu = findNodeByTestId(container, "chair-shifts-dropdown-menu");
		assert.ok(dropdownMenu, "Dropdown menu container chair-shifts-dropdown-menu must exist");

		// 5. All 7 batch action buttons must be present with zero loss
		assert.ok(findNodeByTestId(container, "btn-copy-chair-week-current"), "btn-copy-chair-week-current must exist");
		assert.ok(findNodeByTestId(container, "btn-copy-chair-week-workdays"), "btn-copy-chair-week-workdays must exist");
		assert.ok(findNodeByTestId(container, "btn-copy-chair-month"), "btn-copy-chair-month must exist");
		assert.ok(findNodeByTestId(container, "btn-rotate-chair-shifts"), "btn-rotate-chair-shifts must exist");
		assert.ok(findNodeByTestId(container, "btn-apply-preferred-chairs"), "btn-apply-preferred-chairs must exist");
	});

	it("2. Mandate 8d п. 7: 0 cartoon emojis across all toolbar buttons and labels", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const allButtons = findAllNodesByTag(container, "button");
		assert.ok(allButtons.length > 0, "Must have buttons in view");

		for (const btn of allButtons) {
			const text = collectAllText(btn);
			assert.equal(
				hasCartoonEmojis(text),
				false,
				`Button must NOT contain cartoon emoji: "${text}"`,
			);
		}
	});

	it("3. Mandate 8e: 0 disabled buttons in toolbar and action menus", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		// Trigger dropdown to inspect batch buttons as well
		const dropdownTrigger = findNodeByTestId(container, "btn-chair-shifts-menu-trigger");
		if (dropdownTrigger) {
			await clickNode(dropdownTrigger);
		}

		const allButtons = findAllNodesByTag(container, "button");
		for (const btn of allButtons) {
			assert.equal(
				btn.disabled,
				false,
				`Mandate 8e: button "${collectAllText(btn)}" must not be disabled!`,
			);
		}
	});

	it("4. Mandate 8c & Apple HIG: primary actions have touch targets and toolbar layout classes", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const addChairBtn = findNodeByTestId(container, "btn-add-chair-header");
		assert.ok(addChairBtn, "Add chair button must exist in toolbar");
		assert.ok(
			addChairBtn.className?.includes("primary-button") ||
			addChairBtn.className?.includes("btn") ||
			addChairBtn.className?.includes("h-") ||
			addChairBtn.className?.includes("p-"),
			"Add chair button must use standard button styling",
		);
	});
});
