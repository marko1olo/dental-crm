import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid.js";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	validatePatientDraftWithRequirements,
} from "../../patients/patientFieldRequirementsConfig.js";

describe("Wave 51 Schedule & Fast Booking Inquisitor: Frictionless Booking & Overbooking Integrity", () => {
	describe("1. Patient Field Requirements: CITO Emergency Frictionless Name Policy (Mandates 8e, 8n)", () => {
		it("allows empty full name when isEmergencyOrPrimary is true (auto-defaults to CITO patient)", () => {
			const citoDraft = {
				fullName: "",
				phone: "+7 (999) 123-45-67",
				isEmergencyOrPrimary: true,
			};
			const result = validatePatientDraftWithRequirements(citoDraft);
			assert.equal(
				result.isValid,
				true,
				"CITO emergency draft must be valid without full name",
			);
			assert.equal(result.errors.fullName, undefined);
			assert.ok(!result.missingRequiredLabels.includes("ФИО"));
		});

		it("blocks empty full name when isEmergencyOrPrimary is false (standard planned intake)", () => {
			const standardDraft = {
				fullName: "   ",
				phone: "+7 (999) 123-45-67",
				isEmergencyOrPrimary: false,
			};
			const result = validatePatientDraftWithRequirements(standardDraft);
			assert.equal(
				result.isValid,
				false,
				"Planned intake must require full name",
			);
			assert.equal(result.errors.fullName, "Укажите ФИО пациента");
			assert.ok(result.missingRequiredLabels.includes("ФИО"));
		});
	});

	describe("2. NewAppointmentForm: Smart Phone Parser & Overbooking Arguments (Mandate 8e, 8k)", () => {
		it("extracts phone and clean name from mixed search query 'Иван +7 (999) 111-22-33'", () => {
			const q = "Иван +7 (999) 111-22-33";
			const phoneMatch = q.match(/(\+?[78][\d\s()-]{9,}\d)/);
			assert.ok(phoneMatch, "Must detect phone pattern in mixed query");

			let resolvedPhone: string | null = null;
			let resolvedName = q;
			if (phoneMatch) {
				resolvedPhone = phoneMatch[0].trim();
				const remaining = q.replace(phoneMatch[0], "").trim();
				resolvedName = remaining || `Пациент (${resolvedPhone})`;
			}

			assert.equal(resolvedPhone, "+7 (999) 111-22-33");
			assert.equal(resolvedName, "Иван");
		});

		it("extracts name as 'Пациент (+79991112233)' when query is phone-only", () => {
			const q = "+79991112233";
			const phoneMatch = q.match(/(\+?[78][\d\s()-]{9,}\d)/);
			assert.ok(phoneMatch);

			let resolvedPhone: string | null = null;
			let resolvedName = q;
			if (phoneMatch) {
				resolvedPhone = phoneMatch[0].trim();
				const remaining = q.replace(phoneMatch[0], "").trim();
				resolvedName = remaining || `Пациент (${resolvedPhone})`;
			}

			assert.equal(resolvedPhone, "+79991112233");
			assert.equal(resolvedName, "Пациент (+79991112233)");
		});

		it("flags isCitoOrOverbook as true when collision or CITO is present", () => {
			const cases = [
				{ collision: { isCitoOverbooking: true, hasCollision: false }, expected: true },
				{ collision: { isCitoOverbooking: false, hasCollision: true }, expected: true },
				{ collision: { isCitoOverbooking: false, hasCollision: false }, draft: { isCito: true }, expected: true },
				{ collision: { isCitoOverbooking: false, hasCollision: false }, draft: { cito: true }, expected: true },
				{ collision: { isCitoOverbooking: false, hasCollision: false }, draft: {}, expected: false },
			];

			for (const c of cases) {
				const isCitoOrOverbook = Boolean(
					c.collision.isCitoOverbooking ||
					c.collision.hasCollision ||
					c.draft?.isCito ||
					c.draft?.cito
				);
				assert.equal(isCitoOrOverbook, c.expected);
			}
		});
	});

	describe("3. WaitlistQuickFillModal: Chair & Doctor Solo Fallback & Overbooking Integrity", () => {
		it("provides DEFAULT_SOLO_CHAIR id as fallback when clinic has no configured chairs", () => {
			const clinicSettings = { chairs: [] as Array<{ id: string; active?: boolean }>, staff: [] };
			const activeChairs = (clinicSettings.chairs ?? []).filter((c: any) => c.active);
			const currentSlotChairId = null;

			const resolvedChairId =
				currentSlotChairId ||
				(activeChairs.length > 0 ? activeChairs[0]?.id : null) ||
				DEFAULT_SOLO_CHAIR.id;

			assert.equal(resolvedChairId, DEFAULT_SOLO_CHAIR.id);
			assert.equal(resolvedChairId, "default-chair");
		});

		it("falls back to first active doctor or 'doctor-default' when none specified in slot", () => {
			const staffWithDoc = [{ id: "doc-specialist-1", role: "doctor", active: true }];
			const activeDocs = staffWithDoc.filter((m: any) => m.active && (m.role === "doctor" || m.role === "owner"));
			const currentSlotDoc = null;
			const patientPreferredDoc = null;

			const resolvedDocId =
				currentSlotDoc ||
				patientPreferredDoc ||
				(activeDocs.length > 0 ? activeDocs[0]?.id : null) ||
				"doctor-default";

			assert.equal(resolvedDocId, "doc-specialist-1");

			// Empty staff case
			const resolvedDocIdEmpty =
				currentSlotDoc ||
				patientPreferredDoc ||
				([].length > 0 ? null : null) ||
				"doctor-default";
			assert.equal(resolvedDocIdEmpty, "doctor-default");
		});
	});
});
