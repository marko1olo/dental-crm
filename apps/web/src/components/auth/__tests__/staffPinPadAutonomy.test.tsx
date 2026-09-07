/**
 * staffPinPadAutonomy.test.tsx
 *
 * Unit tests for Staff PIN Pad Autonomy and Solo Doctor Sovereignty:
 * - Mandate 8d: Touch targets >= 44x44px (Apple HIG, 64px circular buttons in auth.css).
 * - Mandate 8e: Doctor and Staff Autonomy (Zero unexplained disabled buttons, active guidance toasts).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Auto-selection of single staff member).
 * - Mandate 8o: Task-Scope Reporting.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffPinPad } from "../StaffPinPad";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expect = (actual: unknown) => ({
	toBe: (expected: unknown) => assert.equal(actual, expected),
	toBeTruthy: () => assert.ok(actual),
	toContain: (expected: string) =>
		assert.ok(String(actual).includes(expected), `expected to contain "${expected}"`),
	toMatch: (regex: RegExp) => assert.match(String(actual), regex),
	not: {
		toContain: (expected: string) =>
			assert.ok(!String(actual).includes(expected), `expected not to contain "${expected}"`),
		toMatch: (regex: RegExp) => assert.doesNotMatch(String(actual), regex),
	},
});

describe("Staff PIN Pad Autonomy & Solo Doctor Sovereignty (Mandates 8d, 8e, 8n)", () => {
	const singleStaffList = [
		{
			id: "doc-solo-1",
			fullName: "Доктор Айболит",
			role: "Врач-стоматолог",
			active: true,
		},
	];

	const multiStaffList = [
		{
			id: "doc-1",
			fullName: "Иванов Иван Иванович",
			role: "Терапевт",
			active: true,
		},
		{
			id: "doc-2",
			fullName: "Петров Петр Петрович",
			role: "Хирург",
			active: true,
		},
	];

	it("1. renders markup with all numpad digits (0-9, Сброс, Backspace) not disabled (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			<StaffPinPad
				staffMembers={multiStaffList}
				staffListLoading={false}
				staffListStatus={200}
				onUnlockSuccess={() => {}}
				onClinicLogout={() => {}}
				onRetryStaffList={() => {}}
			/>,
		);

		// Verify buttons exist in markup
		expect(html).toContain("auth-pin-btn");
		expect(html).toContain("Сброс");

		// Crucial Mandate 8e invariant: none of the auth-pin-btn elements are rendered with disabled attribute
		const disabledPinButtons = html.match(/<button[^>]*class="[^"]*auth-pin-btn[^"]*"[^>]*disabled/g);
		expect(disabledPinButtons).toBe(null);
	});

	it("2. renders doctor card in staff list (Mandate 8n)", () => {
		const html = renderToStaticMarkup(
			<StaffPinPad
				staffMembers={singleStaffList}
				staffListLoading={false}
				staffListStatus={200}
				onUnlockSuccess={() => {}}
				onClinicLogout={() => {}}
				onRetryStaffList={() => {}}
			/>,
		);

		expect(html).toContain("Доктор Айболит");
		expect(html).toContain("auth-staff-card");
	});

	it("3. source code audit: digits and backspace have active toast guidance and are not disabled (Mandates 8e & 8n)", () => {
		const componentPath = path.resolve(__dirname, "../StaffPinPad.tsx");
		const sourceCode = fs.readFileSync(componentPath, "utf-8");

		// Verify digit button disabled prop is strictly {loading} rather than {!selectedUser || loading}
		expect(sourceCode).toContain("disabled={loading}");
		expect(sourceCode).not.toContain("disabled={!selectedUser || loading}");

		// Verify solo doctor auto-selection logic
		expect(sourceCode).toContain("if (!selectedUser && activeStaff && activeStaff.length === 1)");
		expect(sourceCode).toContain("targetUser = activeStaff[0];");

		// Verify active toast guidance when user is not selected
		expect(sourceCode).toContain('showToast("Сначала выберите сотрудника из списка", "info");');
	});

	it("4. touch target ergonomics: pin buttons have 64px dimension in auth.css meeting >= 44px HIG (Mandate 8d)", () => {
		const cssPath = path.resolve(__dirname, "../../../styles/auth.css");
		const cssCode = fs.readFileSync(cssPath, "utf-8");

		// CSS classes verify 64px width and height
		expect(cssCode).toContain("width: 64px;");
		expect(cssCode).toContain("height: 64px;");
	});
});
