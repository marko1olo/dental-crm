/**
 * patientSearchAutonomyWave45.test.tsx
 *
 * Targeted Unit Tests for Feature 224: Fast patient check-in and express search in schedule
 * (Wave 45 — Patient Check-in & Reception Search Autonomy Lead).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e & 8n: Doctor Autonomy & Solo Doctor / Small Clinic Sovereignty (Zero Dead-Ends).
 *   If a patient is not found in the search modal (or found), reception can create a quick patient
 *   in 1 click ("+ Быстрый пациент за 5 сек: ФИО + Телефон", data-testid="search-modal-quick-create-btn")
 *   without closing the modal or getting lost in CRM menus.
 * - Search query auto-prefills fullName or phone for 1-click check-in.
 * - 1-Click action triggers directly in search results:
 *   * «+ Записать на приём» (data-testid="quick-book-patient-${patient.id}")
 *   * «WhatsApp напоминание» (data-testid="quick-wa-patient-${patient.id}")
 *   * «Открыть карту» (data-testid="quick-open-card-${patient.id}")
 * - Mandate 8d п. 6: Anti-Matryoshka Law (modal depth strictly 1, no nested dialogs).
 * - Mandate 8d п. 4: Desktop density (toolbar/buttons 32–36px, touch targets >= 44px).
 * - Mandate 8d п. 7: Zero cartoon emojis in medical CRM (Lucide vector icons only).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Patient } from "@dental/shared";

import { PatientSearchModal } from "../PatientSearchModal";
import {
	parseSearchQueryForQuickPatient,
	searchPatientsQuick,
	type QuickPatientPrefill,
} from "../patientSearchEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

const mockPatients: Patient[] = [
	{
		id: "patient-101",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (916) 123-45-67",
		email: null,
		notes: null,
		gender: null,
		administrativeProfile: null,
		birthDate: "1988-04-12",
		balanceRub: 0,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "patient-102",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active",
		fullName: "Смирнова Елена Сергеевна",
		phone: "+7 (925) 987-65-43",
		email: null,
		notes: null,
		gender: null,
		administrativeProfile: null,
		birthDate: "1992-09-25",
		balanceRub: 1500,
		createdAt: "2026-01-02T00:00:00.000Z",
		updatedAt: "2026-01-02T00:00:00.000Z",
	},
	{
		id: "patient-103",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active",
		fullName: "Петров Петр Петрович",
		phone: null,
		email: null,
		notes: null,
		gender: null,
		administrativeProfile: null,
		birthDate: "1975-11-03",
		balanceRub: -3000,
		createdAt: "2026-01-03T00:00:00.000Z",
		updatedAt: "2026-01-03T00:00:00.000Z",
	},
];

describe("Wave 45: Patient Check-in & Reception Search Autonomy (Feature 224)", () => {
	const modalFilePath = path.resolve(__dirname, "../PatientSearchModal.tsx");
	const modalSource = fs.readFileSync(modalFilePath, "utf8");

	const engineFilePath = path.resolve(__dirname, "../patientSearchEngine.ts");
	const engineSource = fs.readFileSync(engineFilePath, "utf8");

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 1: Zero Dead-Ends & Quick Patient 1-Click Button (Mandates 8e, 8n)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("1. Zero Dead-Ends: Quick Patient Button (Mandates 8e, 8n)", () => {
		it("1.1. contains search-modal-quick-create-btn in source code with canonical label", () => {
			assert.equal(
				modalSource.includes('data-testid="search-modal-quick-create-btn"'),
				true,
				"Must contain button with data-testid='search-modal-quick-create-btn'",
			);
			assert.equal(
				modalSource.includes("+ Быстрый пациент за 5 сек: ФИО + Телефон"),
				true,
				"Must contain label '+ Быстрый пациент за 5 сек: ФИО + Телефон'",
			);
		});

		it("1.2. renders search-modal-quick-create-btn when search is empty", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={mockPatients}
					onClose={() => {}}
					onSelectPatientForBooking={() => {}}
					onOpenPatientCard={() => {}}
				/>,
			);
			assert.equal(html.includes('data-testid="search-modal-quick-create-btn"'), true);
			assert.equal(html.includes("+ Быстрый пациент за 5 сек: ФИО + Телефон"), true);
		});

		it("1.3. renders search-modal-quick-create-btn when patients list is empty (non-matching search)", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[]}
					onClose={() => {}}
					onSelectPatientForBooking={() => {}}
				/>,
			);
			assert.equal(html.includes('data-testid="search-modal-quick-create-btn"'), true);
			assert.equal(html.includes("Пациенты не найдены"), true);
			// Also renders secondary 1-click registration prompt in empty state
			assert.equal(html.includes('data-testid="search-modal-empty-quick-btn"'), true);
		});

		it("1.4. modal does not render when isOpen is false", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={false}
					patients={mockPatients}
					onClose={() => {}}
				/>,
			);
			assert.equal(html, "");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 2: Prefilling Name & Phone from Search Query (Mandate 8k Friction-Killer)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("2. Prefilling Name & Phone from Search Query (Mandate 8k Friction-Killer)", () => {
		it("2.1. parses Russian full name query into fullName with empty phone", () => {
			const res = parseSearchQueryForQuickPatient("Иванов Алексей");
			assert.equal(res.fullName, "Иванов Алексей");
			assert.equal(res.phone, "");
		});

		it("2.2. parses 10-digit phone number into formatted Russian phone", () => {
			const res = parseSearchQueryForQuickPatient("9161234567");
			assert.equal(res.fullName, "");
			assert.equal(res.phone, "+7 (916) 123-45-67");
		});

		it("2.3. parses 11-digit phone starting with 8 or 7 into formatted national phone", () => {
			const res8 = parseSearchQueryForQuickPatient("89269876543");
			assert.equal(res8.phone, "+7 (926) 987-65-43");

			const res7 = parseSearchQueryForQuickPatient("79269876543");
			assert.equal(res7.phone, "+7 (926) 987-65-43");
		});

		it("2.4. parses formatted phone string without corrupting format", () => {
			const res = parseSearchQueryForQuickPatient("+7 (999) 111-22-33");
			assert.equal(res.fullName, "");
			assert.equal(res.phone, "+7 (999) 111-22-33");
		});

		it("2.5. parses combined name and phone query into separate fields", () => {
			const res = parseSearchQueryForQuickPatient("Смирнов +7 (925) 555-44-33");
			assert.equal(res.fullName, "Смирнов");
			assert.equal(res.phone, "+7 (925) 555-44-33");
		});

		it("2.6. handles empty and whitespace-only queries gracefully", () => {
			const emptyRes = parseSearchQueryForQuickPatient("");
			assert.deepEqual(emptyRes, { fullName: "", phone: "" });

			const wsRes = parseSearchQueryForQuickPatient("   ");
			assert.deepEqual(wsRes, { fullName: "", phone: "" });
		});

		it("2.7. exports parseSearchQueryForQuickPatient and QuickPatientPrefill from engine", () => {
			assert.equal(typeof parseSearchQueryForQuickPatient, "function");
			assert.equal(engineSource.includes("export function parseSearchQueryForQuickPatient"), true);
			assert.equal(engineSource.includes("export interface QuickPatientPrefill"), true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 3: 1-Click Direct Actions from Search Results (Mandate 8e, 8n)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("3. 1-Click Direct Actions from Search Results (Mandate 8e, 8n)", () => {
		it("3.1. renders quick-book-patient, quick-wa-patient, quick-open-card for each patient", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={mockPatients}
					onClose={() => {}}
					onSelectPatientForBooking={() => {}}
					onOpenPatientCard={() => {}}
				/>,
			);

			for (const p of mockPatients) {
				assert.equal(
					html.includes(`data-testid="quick-book-patient-${p.id}"`),
					true,
					`Must render quick-book button for patient ${p.id}`,
				);
				assert.equal(
					html.includes(`data-testid="quick-wa-patient-${p.id}"`),
					true,
					`Must render WhatsApp button for patient ${p.id}`,
				);
				assert.equal(
					html.includes(`data-testid="quick-open-card-${p.id}"`),
					true,
					`Must render open-card button for patient ${p.id}`,
				);
			}
		});

		it("3.2. quick-book button contains label '+ Записать на приём'", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatients[0]!]}
					onClose={() => {}}
					onSelectPatientForBooking={() => {}}
				/>,
			);
			assert.equal(html.includes("+ Записать на приём"), true);
		});

		it("3.3. WhatsApp button is disabled when patient has no phone", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatients[2]!]} // patient-103 has phone: null
					onClose={() => {}}
				/>,
			);
			assert.equal(html.includes('data-testid="quick-wa-patient-patient-103"'), true);
			assert.equal(html.includes("Номер телефона не указан"), true);
		});

		it("3.4. searchPatientsQuick returns scored results with highlights", () => {
			const results = searchPatientsQuick(mockPatients, "Иван");
			assert.ok(results.length >= 1);
			assert.equal(results[0]?.patient.id, "patient-101");
			assert.ok(results[0]?.fullNameHighlights.some((part) => part.isMatch));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 4: Anti-Matryoshka Law, Desktop Density & Zero Emojis (Mandate 8d)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("4. Anti-Matryoshka Law, Desktop Density & Zero Emojis (Mandate 8d)", () => {
		it("4.1. Anti-Matryoshka Law: modal depth is strictly 1 (no nested dialogs or overlays)", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={mockPatients}
					onClose={() => {}}
				/>,
			);

			// Count role="dialog" elements — must be exactly 1
			const dialogMatches = html.match(/role="dialog"/g);
			assert.equal(
				dialogMatches?.length,
				1,
				`Modal depth must be strictly 1. Found ${dialogMatches?.length} dialog elements`,
			);

			// Count aria-modal="true" — must be exactly 1
			const ariaModalMatches = html.match(/aria-modal="true"/g);
			assert.equal(
				ariaModalMatches?.length,
				1,
				`Aria-modal must be strictly 1. Found ${ariaModalMatches?.length}`,
			);
		});

		it("4.2. Desktop Density: action buttons have height 32–36px and touch targets >= 44px", () => {
			// Check source classes for height standards
			assert.equal(
				modalSource.includes("h-9") || modalSource.includes("min-h-[36px]"),
				true,
				"Action buttons must adhere to 32–36px desktop density (e.g. h-9 / min-h-[36px])",
			);
			assert.equal(
				modalSource.includes("min-w-[44px]") || modalSource.includes("min-h-[44px]"),
				true,
				"Buttons must respect touch target floor (>= 44px)",
			);
		});

		it("4.3. Zero Cartoon Emojis: guarantees 0 cartoon emojis in PatientSearchModal source & HTML", () => {
			assert.equal(
				hasCartoonEmojis(modalSource),
				false,
				"PatientSearchModal.tsx source code contains forbidden cartoon emojis!",
			);

			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={mockPatients}
					onClose={() => {}}
				/>,
			);
			assert.equal(
				hasCartoonEmojis(html),
				false,
				"PatientSearchModal rendered HTML contains forbidden cartoon emojis!",
			);
		});

		it("4.4. Zero Cartoon Emojis: guarantees 0 cartoon emojis in patientSearchEngine source", () => {
			assert.equal(
				hasCartoonEmojis(engineSource),
				false,
				"patientSearchEngine.ts source code contains forbidden cartoon emojis!",
			);
		});

		it("4.5. verifies only Lucide vector icons are imported in PatientSearchModal", () => {
			const lucideImportMatch = modalSource.match(/from "lucide-react";/);
			assert.ok(lucideImportMatch, "Must import Lucide vector icons");
			assert.equal(modalSource.includes("CalendarPlus"), true);
			assert.equal(modalSource.includes("MessageSquare"), true);
			assert.equal(modalSource.includes("FileText"), true);
			assert.equal(modalSource.includes("Plus"), true);
			assert.equal(modalSource.includes("UserPlus"), true);
			assert.equal(modalSource.includes("Phone"), true);
		});
	});
});
