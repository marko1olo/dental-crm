/**
 * apps/web/src/components/leads/__tests__/leadsKanbanBookingAutonomy.test.ts
 *
 * DENTE Dental CRM — Leads Kanban Booking Autonomy
 *
 * Governed by:
 * - Mandate 8e (Doctor & Staff Autonomy): No blocked disabled buttons without reason.
 *   Admins and solo practitioners must never be prevented from booking a patient because
 *   chairs or staff are not yet configured.
 * - Mandate 8n (Solo Doctor & Small Clinic Scale Sovereignty, Zero Dead-Ends):
 *   A solo practitioner operating with 1 chair or starting out must have instant fallback defaults
 *   (default-doctor, default-chair, 30 min duration) rather than encountering system dead-ends.
 * - Mandate 8k (CRM != Reality Simulator & Friction-Killer Law):
 *   Zero friction on the hot path: lead conversion must work smoothly with sensible defaults.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_LEAD_VISIT_MINUTES,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	isLeadBookingDisabled,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
	type BookableChair,
	type BookableDoctor,
} from "../leadsKanbanTypes.js";

describe("Leads Kanban Booking Autonomy — Solo Doctor & Zero Dead-Ends (Mandates 8e, 8n, 8k)", () => {
	describe("1. resolveLeadBookingStaff — Fallback Doctor Autonomy", () => {
		it("returns FALLBACK_SOLO_DOCTOR when staff array is empty ([])", () => {
			const emptyStaff: BookableDoctor[] = [];
			const result = resolveLeadBookingStaff(emptyStaff);

			assert.equal(result.length, 1);
			assert.deepEqual(result[0], FALLBACK_SOLO_DOCTOR);
			assert.equal(result[0]?.id, "default-doctor");
			assert.equal(result[0]?.fullName, "Дежурный врач (соло-практика)");
			assert.equal(result[0]?.role, "doctor");
			assert.equal(result[0]?.active, true);
		});

		it("returns FALLBACK_SOLO_DOCTOR when staff is null or undefined", () => {
			assert.equal(resolveLeadBookingStaff(null)[0]?.id, "default-doctor");
			assert.equal(resolveLeadBookingStaff(undefined)[0]?.id, "default-doctor");
		});

		it("preserves real staff when active doctors are present in clinic settings", () => {
			const realStaff: BookableDoctor[] = [
				{
					id: "doc-1",
					fullName: "Барабаш С.В.",
					name: "Барабаш С.В.",
					role: "doctor",
					active: true,
				},
				{
					id: "doc-2",
					fullName: "Смирнова Е.А.",
					name: "Смирнова Е.А.",
					role: "doctor",
					active: true,
				},
			];

			const result = resolveLeadBookingStaff(realStaff);
			assert.equal(result.length, 2);
			assert.equal(result[0]?.id, "doc-1");
			assert.equal(result[1]?.id, "doc-2");
		});
	});

	describe("2. resolveLeadBookingChairs — Fallback Chair Autonomy", () => {
		it("returns FALLBACK_DEFAULT_CHAIR when chairs array is empty ([])", () => {
			const emptyChairs: BookableChair[] = [];
			const result = resolveLeadBookingChairs(emptyChairs);

			assert.equal(result.length, 1);
			assert.deepEqual(result[0], FALLBACK_DEFAULT_CHAIR);
			assert.equal(result[0]?.id, "default-chair");
			assert.equal(result[0]?.name, "Кресло №1 (Основное)");
		});

		it("returns FALLBACK_DEFAULT_CHAIR when chairs is null or undefined", () => {
			assert.equal(resolveLeadBookingChairs(null)[0]?.id, "default-chair");
			assert.equal(resolveLeadBookingChairs(undefined)[0]?.id, "default-chair");
		});

		it("preserves real chairs when configured in clinic settings", () => {
			const realChairs: BookableChair[] = [
				{ id: "chair-alpha", name: "Кабинет 1 — Castellini" },
				{ id: "chair-beta", name: "Кабинет 2 — Stern Weber" },
			];

			const result = resolveLeadBookingChairs(realChairs);
			assert.equal(result.length, 2);
			assert.equal(result[0]?.id, "chair-alpha");
			assert.equal(result[1]?.id, "chair-beta");
		});
	});

	describe("3. resolveLeadVisitMinutes — Default Duration Autonomy", () => {
		it("returns DEFAULT_LEAD_VISIT_MINUTES (30) when clinic settings are not yet loaded (null)", () => {
			assert.equal(resolveLeadVisitMinutes(null), 30);
			assert.equal(DEFAULT_LEAD_VISIT_MINUTES, 30);
		});

		it("returns DEFAULT_LEAD_VISIT_MINUTES (30) when visitMinutes is undefined or 0", () => {
			assert.equal(resolveLeadVisitMinutes(undefined), 30);
			assert.equal(resolveLeadVisitMinutes(0), 30);
		});

		it("preserves custom clinic defaultVisitMinutes when configured", () => {
			assert.equal(resolveLeadVisitMinutes(45), 45);
			assert.equal(resolveLeadVisitMinutes(60), 60);
			assert.equal(resolveLeadVisitMinutes(120), 120);
		});
	});

	describe("4. isLeadBookingDisabled — Non-Blocking Submit Autonomy (Mandate 8e)", () => {
		it("submit button is NOT disabled when isBooking is false", () => {
			assert.equal(isLeadBookingDisabled(false), false);
		});

		it("submit button is disabled ONLY during active in-flight booking request (isBooking = true)", () => {
			assert.equal(isLeadBookingDisabled(true), true);
		});

		it("truth table: unconfigured clinic never disables the submit button", () => {
			const unconfiguredStates = [
				{ staffCount: 0, chairCount: 0, visitMinutes: null, isBooking: false },
				{ staffCount: 0, chairCount: 1, visitMinutes: 30, isBooking: false },
				{ staffCount: 1, chairCount: 0, visitMinutes: 30, isBooking: false },
				{ staffCount: 0, chairCount: 0, visitMinutes: 60, isBooking: false },
			];

			for (const state of unconfiguredStates) {
				const effectiveStaff = resolveLeadBookingStaff(state.staffCount === 0 ? [] : [FALLBACK_SOLO_DOCTOR]);
				const effectiveChairs = resolveLeadBookingChairs(state.chairCount === 0 ? [] : [FALLBACK_DEFAULT_CHAIR]);
				const effectiveMins = resolveLeadVisitMinutes(state.visitMinutes);
				const disabled = isLeadBookingDisabled(state.isBooking);

				assert.equal(effectiveStaff.length > 0, true);
				assert.equal(effectiveChairs.length > 0, true);
				assert.equal(effectiveMins > 0, true);
				assert.equal(disabled, false);
			}
		});
	});

	describe("5. End-to-End Booking Payload Computation with Fallback Defaults", () => {
		it("correctly computes start, end and resource IDs for a solo doctor with zero configured staff/chairs", () => {
			const staffList: BookableDoctor[] = [];
			const chairsList: BookableChair[] = [];
			const visitMinutesSetting = null;

			const effectiveStaff = resolveLeadBookingStaff(staffList);
			const effectiveChairs = resolveLeadBookingChairs(chairsList);
			const duration = resolveLeadVisitMinutes(visitMinutesSetting);

			const selectedDoctorId = "";
			const selectedChairId = "";

			const finalDoctorId = selectedDoctorId || effectiveStaff[0]?.id || FALLBACK_SOLO_DOCTOR.id;
			const finalChairId = selectedChairId || effectiveChairs[0]?.id || FALLBACK_DEFAULT_CHAIR.id;

			assert.equal(finalDoctorId, "default-doctor");
			assert.equal(finalChairId, "default-chair");
			assert.equal(duration, 30);

			const appointmentDate = "2026-09-07";
			const appointmentTime = "14:00";
			const startDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
			const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

			assert.equal(endDateTime.getTime() - startDateTime.getTime(), 30 * 60000);
			assert.equal(Number.isNaN(startDateTime.getTime()), false);
			assert.equal(Number.isNaN(endDateTime.getTime()), false);
		});
	});
});
