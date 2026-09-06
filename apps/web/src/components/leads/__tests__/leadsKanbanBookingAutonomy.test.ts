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

import { describe, it, expect } from "vitest";
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
} from "../LeadsKanbanView.js";

describe("Leads Kanban Booking Autonomy — Solo Doctor & Zero Dead-Ends (Mandates 8e, 8n, 8k)", () => {
	describe("1. resolveLeadBookingStaff — Fallback Doctor Autonomy", () => {
		it("returns FALLBACK_SOLO_DOCTOR when staff array is empty ([])", () => {
			const emptyStaff: BookableDoctor[] = [];
			const result = resolveLeadBookingStaff(emptyStaff);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(FALLBACK_SOLO_DOCTOR);
			expect(result[0]?.id).toBe("default-doctor");
			expect(result[0]?.fullName).toBe("Дежурный врач (соло-практика)");
			expect(result[0]?.role).toBe("doctor");
			expect(result[0]?.active).toBe(true);
		});

		it("returns FALLBACK_SOLO_DOCTOR when staff is null or undefined", () => {
			expect(resolveLeadBookingStaff(null)[0]?.id).toBe("default-doctor");
			expect(resolveLeadBookingStaff(undefined)[0]?.id).toBe("default-doctor");
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
			expect(result).toHaveLength(2);
			expect(result[0]?.id).toBe("doc-1");
			expect(result[1]?.id).toBe("doc-2");
		});
	});

	describe("2. resolveLeadBookingChairs — Fallback Chair Autonomy", () => {
		it("returns FALLBACK_DEFAULT_CHAIR when chairs array is empty ([])", () => {
			const emptyChairs: BookableChair[] = [];
			const result = resolveLeadBookingChairs(emptyChairs);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(FALLBACK_DEFAULT_CHAIR);
			expect(result[0]?.id).toBe("default-chair");
			expect(result[0]?.name).toBe("Кресло №1 (Основное)");
		});

		it("returns FALLBACK_DEFAULT_CHAIR when chairs is null or undefined", () => {
			expect(resolveLeadBookingChairs(null)[0]?.id).toBe("default-chair");
			expect(resolveLeadBookingChairs(undefined)[0]?.id).toBe("default-chair");
		});

		it("preserves real chairs when configured in clinic settings", () => {
			const realChairs: BookableChair[] = [
				{ id: "chair-alpha", name: "Кабинет 1 — Castellini" },
				{ id: "chair-beta", name: "Кабинет 2 — Stern Weber" },
			];

			const result = resolveLeadBookingChairs(realChairs);
			expect(result).toHaveLength(2);
			expect(result[0]?.id).toBe("chair-alpha");
			expect(result[1]?.id).toBe("chair-beta");
		});
	});

	describe("3. resolveLeadVisitMinutes — Default Duration Autonomy", () => {
		it("returns DEFAULT_LEAD_VISIT_MINUTES (30) when clinic settings are not yet loaded (null)", () => {
			expect(resolveLeadVisitMinutes(null)).toBe(30);
			expect(DEFAULT_LEAD_VISIT_MINUTES).toBe(30);
		});

		it("returns DEFAULT_LEAD_VISIT_MINUTES (30) when visitMinutes is undefined or 0", () => {
			expect(resolveLeadVisitMinutes(undefined)).toBe(30);
			expect(resolveLeadVisitMinutes(0)).toBe(30);
		});

		it("preserves custom clinic defaultVisitMinutes when configured", () => {
			expect(resolveLeadVisitMinutes(45)).toBe(45);
			expect(resolveLeadVisitMinutes(60)).toBe(60);
			expect(resolveLeadVisitMinutes(120)).toBe(120);
		});
	});

	describe("4. isLeadBookingDisabled — Non-Blocking Submit Autonomy (Mandate 8e)", () => {
		it("submit button is NOT disabled when isBooking is false", () => {
			expect(isLeadBookingDisabled(false)).toBe(false);
		});

		it("submit button is disabled ONLY during active in-flight booking request (isBooking = true)", () => {
			expect(isLeadBookingDisabled(true)).toBe(true);
		});

		it("truth table: unconfigured clinic never disables the submit button", () => {
			// Simulating unconfigured clinic states
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

				expect(effectiveStaff.length > 0).toBe(true);
				expect(effectiveChairs.length > 0).toBe(true);
				expect(effectiveMins > 0).toBe(true);
				expect(disabled).toBe(false);
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

			expect(finalDoctorId).toBe("default-doctor");
			expect(finalChairId).toBe("default-chair");
			expect(duration).toBe(30);

			const appointmentDate = "2026-09-07";
			const appointmentTime = "14:00";
			const startDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
			const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

			expect(endDateTime.getTime() - startDateTime.getTime()).toBe(30 * 60000);
			expect(Number.isNaN(startDateTime.getTime())).toBe(false);
			expect(Number.isNaN(endDateTime.getTime())).toBe(false);
		});
	});
});
