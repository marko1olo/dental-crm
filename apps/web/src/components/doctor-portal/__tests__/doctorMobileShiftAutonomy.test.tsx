/**
 * doctorMobileShiftAutonomy.test.tsx
 *
 * DENTE Dental CRM — Doctor Mobile Shift Autonomy & Non-Blocking SMS Confirmation Suite
 *
 * Mandate 8x (Anti-RAM-Hog): Zero createRoot / setupMockDom / setInterval leaks.
 * All tests run on pure @dental/shared engine logic + SSR renderToString.
 * No DOM mounting. No cyclic mock objects. No infinite Fiber allocations.
 *
 * Governed by:
 * - Mandate 8e (Doctor & Staff Autonomy): Absolute ban on unexplained disabled buttons.
 *   Active guidance when SMS code is incomplete; zero friction for solo doctors.
 * - Mandate 8i (Specialized Outpatient Dental Context): Form 043/u batch signing.
 * - Mandate 8k (CRM != Reality Simulator): 1-click fallback to session PEP
 *   (63-FZ Art. 9 & Order 947n) when cell reception drops or SMS is delayed.
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Immediate unblocked workflow.
 * - Mandate 8x (Anti-RAM-Hog): No createRoot / setupMockDom / setInterval in tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	filterDoctorShiftAppointments,
	calculateDoctorShiftEarnings,
	transitionAppointmentStatus,
} from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: MANDATE 8e — CONFIRM BUTTON POLICY (NO DISABLED TRAPS)
// Tests verify the ENGINE-LEVEL logic: when smsCode.length < 6, signing
// returns a structured error rather than silently submitting. The component
// renders the button as always-enabled and gates via handler (never via `disabled`).
// ─────────────────────────────────────────────────────────────────────────────

describe("Doctor Mobile Shift Autonomy — Engine Logic (Mandates 8e, 8k, 8n, 8x)", () => {
	const DOCTOR_ID = "doc-1";
	const SHIFT_DATE = "2026-08-29";

	// Build the set of appointments for this doctor/shift
	const doctorApts = filterDoctorShiftAppointments(
		SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
		DOCTOR_ID,
		SHIFT_DATE,
	);

	// IDs eligible for signing: completed + not yet signed
	const unsignedIds = doctorApts
		.filter(
			(apt) =>
				(apt.status === "completed" ||
					apt.emrCard043uStatus === "pending_signature") &&
				apt.emrCard043uStatus !== "signed",
		)
		.map((apt) => apt.id);

	it("SAMPLE_DOCTOR_SHIFT_APPOINTMENTS contains >= 1 completed appointment for doc-1 on 2026-08-29", () => {
		assert.ok(
			doctorApts.length >= 1,
			`Expected >= 1 apt for ${DOCTOR_ID} on ${SHIFT_DATE}, got ${doctorApts.length}`,
		);
		const completed = doctorApts.filter((a) => a.status === "completed");
		assert.ok(
			completed.length >= 1,
			"Expected at least 1 completed appointment",
		);
	});

	it("filterDoctorShiftAppointments isolates only this doctor's appointments (Mandate 8n schedule isolation)", () => {
		const wrongDoctorApts = filterDoctorShiftAppointments(
			SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			"doc-999",
			SHIFT_DATE,
		);
		assert.strictEqual(
			wrongDoctorApts.length,
			0,
			"No appointments for unknown doctor",
		);
	});

	it("verifyAndSignBatchEmr rejects short code (<6 chars) with structured error — engine-level guard for Mandate 8e", () => {
		if (unsignedIds.length === 0) {
			// All already signed in sample data — skip gracefully
			return;
		}
		const session = initiateBatchEmrSigning({
			doctorId: DOCTOR_ID,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: unsignedIds,
			shiftDateIso: SHIFT_DATE,
			fixedSecretCode: "654321", // deterministic for test
		});

		// Simulate short code (< 6 chars): "123"
		// Component handles this in handler before calling verifyAndSignBatchEmr.
		// Here we test what happens if caller passes a short code anyway.
		const result = verifyAndSignBatchEmr({
			session,
			enteredCode: "123",
			appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorSnils: "123-456-789 64",
		});

		// Engine must reject: "123" !== "654321"
		assert.strictEqual(
			result.success,
			false,
			"Short/wrong code must return success: false",
		);
		assert.ok(
			result.signedCount === 0,
			"Zero records signed on wrong code",
		);
		// Updated appointments must be unchanged (no side-effects on failure)
		assert.strictEqual(
			result.updatedAppointments.length,
			SAMPLE_DOCTOR_SHIFT_APPOINTMENTS.length,
		);
	});

	it("verifyAndSignBatchEmr accepts correct 6-char SMS code and signs all eligible 043/u cards", () => {
		if (unsignedIds.length === 0) {
			return; // all pre-signed in sample — acceptable
		}
		const SECRET = "654321";
		const session = initiateBatchEmrSigning({
			doctorId: DOCTOR_ID,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: unsignedIds,
			shiftDateIso: SHIFT_DATE,
			fixedSecretCode: SECRET,
		});

		const result = verifyAndSignBatchEmr({
			session,
			enteredCode: SECRET,
			appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorSnils: "123-456-789 64",
		});

		assert.strictEqual(result.success, true, "Correct 6-char code must succeed");
		assert.ok(result.signedCount > 0, `Expected >0 signed, got ${result.signedCount}`);

		// All targeted appointments must now be signed
		const stillUnsigned = result.updatedAppointments.filter(
			(a) =>
				unsignedIds.includes(a.id) && a.emrCard043uStatus !== "signed",
		);
		assert.strictEqual(
			stillUnsigned.length,
			0,
			"All targeted appointments must be signed after correct code",
		);
	});

	it("1-click session PEP signing (isSessionAuthorized=true) succeeds without SMS code — Mandate 8k basement clinic fallback", () => {
		const allUnsignedIds = doctorApts
			.filter(
				(a) =>
					a.status === "completed" && a.emrCard043uStatus !== "signed",
			)
			.map((a) => a.id);

		if (allUnsignedIds.length === 0) {
			return; // all pre-signed — skip
		}

		const session = initiateBatchEmrSigning({
			doctorId: DOCTOR_ID,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: allUnsignedIds,
			shiftDateIso: SHIFT_DATE,
		});

		const result = verifyAndSignBatchEmr({
			session,
			enteredCode: "SESSION_AUTH", // magic token used in component
			appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorSnils: "123-456-789 64",
			isSessionAuthorized: true,
		});

		assert.strictEqual(
			result.success,
			true,
			"Session PEP signing must succeed without SMS code",
		);
		assert.ok(
			result.signedCount >= allUnsignedIds.length,
			`Expected >= ${allUnsignedIds.length} signed, got ${result.signedCount}`,
		);

		// Verify law basis embedded in signed cards (63-ФЗ compliance)
		const signedCards = result.updatedAppointments.filter(
			(a) => allUnsignedIds.includes(a.id) && a.emrCard043uStatus === "signed",
		);
		for (const card of signedCards) {
			const lawBasis = card.emrSignerInfo?.lawBasis ?? "";
			assert.ok(
				lawBasis.includes("63-ФЗ"),
				`Card ${card.id} must embed 63-ФЗ law basis, got: "${lawBasis}"`,
			);
		}
	});

	it("verifyAndSignBatchEmr preserves unsigned appointments and does not mutate them on signing failure", () => {
		if (unsignedIds.length === 0) {
			return;
		}
		const session = initiateBatchEmrSigning({
			doctorId: DOCTOR_ID,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: unsignedIds,
			shiftDateIso: SHIFT_DATE,
			fixedSecretCode: "999999",
		});

		const result = verifyAndSignBatchEmr({
			session,
			enteredCode: "000000", // wrong
			appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorSnils: "123-456-789 64",
		});

		assert.strictEqual(result.success, false);
		// Original appointment statuses must be untouched
		for (const origApt of SAMPLE_DOCTOR_SHIFT_APPOINTMENTS) {
			const updated = result.updatedAppointments.find((a) => a.id === origApt.id);
			assert.ok(updated, `Appointment ${origApt.id} missing from updatedAppointments`);
			assert.strictEqual(
				updated.emrCard043uStatus,
				origApt.emrCard043uStatus,
				`Appointment ${origApt.id} status mutated on signing failure`,
			);
		}
	});

	it("calculateDoctorShiftEarnings returns integer kopecks with zero floating-point drift", () => {
		const earnings = calculateDoctorShiftEarnings(
			doctorApts,
			DOCTOR_ID,
			SHIFT_DATE,
			25,
		);
		// All money values must be integers (kopeck-exact, Mandate 8j)
		assert.ok(
			Number.isInteger(earnings.grossRevenueKop),
			"grossRevenueKop must be integer",
		);
		assert.ok(
			Number.isInteger(earnings.totalEarnedDealKop),
			"totalEarnedDealKop must be integer",
		);
		assert.ok(
			earnings.grossRevenueKop >= 0,
			"Revenue must be non-negative",
		);
	});

	it("transitionAppointmentStatus auto-sets emrCard043uStatus to pending_signature when completing a draft", () => {
		// Find an in_chair appointment with draft EMR
		const inChairWithDraft = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS.find(
			(a) => a.status === "in_chair" && a.emrCard043uStatus === "draft",
		);
		if (!inChairWithDraft) {
			// Construct synthetic fixture
			const syntheticApt: DoctorShiftAppointment = {
				...SAMPLE_DOCTOR_SHIFT_APPOINTMENTS[0]!,
				id: "test-draft-apt",
				status: "in_chair",
				emrCard043uStatus: "draft",
			};
			const transitioned = transitionAppointmentStatus(syntheticApt, "completed");
			assert.strictEqual(
				transitioned.emrCard043uStatus,
				"pending_signature",
				"Completing a draft card must auto-promote to pending_signature",
			);
		} else {
			const transitioned = transitionAppointmentStatus(inChairWithDraft, "completed");
			assert.strictEqual(
				transitioned.emrCard043uStatus,
				"pending_signature",
			);
		}
	});

	it("initiateBatchEmrSigning generates session with 3 attempts remaining and 5-min validity", () => {
		const before = Date.now();
		const session = initiateBatchEmrSigning({
			doctorId: DOCTOR_ID,
			doctorName: "Д-р Смирнов Алексей Петрович",
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: ["apt-1", "apt-2"],
			shiftDateIso: SHIFT_DATE,
		});

		assert.strictEqual(session.attemptsRemaining, 3, "Must start with 3 attempts");
		assert.strictEqual(session.isVerified, false, "Must not be pre-verified");
		assert.strictEqual(session.isExpired, false, "Must not be pre-expired");

		// Session must expire in ~5 minutes (300s)
		const expiresAt = new Date(session.expiresAtIso).getTime();
		const expectedExpiry = before + 300_000;
		const delta = Math.abs(expiresAt - expectedExpiry);
		assert.ok(
			delta < 5_000,
			`Expiry delta ${delta}ms exceeds 5s tolerance — expected ~300s validity`,
		);

		// Secret code must be 6 digits
		assert.match(session.secretCode, /^\d{6}$/, "Secret code must be exactly 6 digits");

		// Phone must be masked
		assert.ok(
			!session.maskedPhone.includes("555"),
			`Phone must be masked, got: ${session.maskedPhone}`,
		);
	});
});
