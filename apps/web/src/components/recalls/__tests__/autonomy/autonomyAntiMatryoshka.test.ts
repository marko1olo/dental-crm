import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PatientRecallsHubModal } from "../../PatientRecallsHubModal";
import type { PatientRecallRecord } from "../../patientRecallEngine";

describe("3. Anti-Matryoshka Law (Mandate 8d pt 6: Modal Depth <= 1)", () => {
	const mockCandidate: PatientRecallRecord = {
		id: "cand-hygiene-01",
		patientId: "pat-101",
		fullName: "Волкова Мария Сергеевна",
		phone: "+7 (916) 123-45-67",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01",
		daysOverdue: 24,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		historicalRevenueRub: 18500,
		visitsCount: 2,
	};

	it("enforces single dialog boundary with zero nested popup dialogs or modals", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [mockCandidate],
			}),
		);

		const dialogRoleMatches = html.match(/role="dialog"/gi) || [];
		assert.strictEqual(
			dialogRoleMatches.length,
			1,
			`Mandate 8d pt 6 violation: exactly 1 role="dialog" expected, found ${dialogRoleMatches.length}`,
		);

		assert.ok(!html.includes("<dialog"), "No nested <dialog> tags permitted");
		assert.ok(html.includes('data-testid="patient-recalls-hub-modal"'));
	});
});
