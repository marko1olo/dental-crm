import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PatientRecallsHubModal } from "../../PatientRecallsHubModal";
import type { PatientRecallRecord } from "../../patientRecallEngine";

describe("1. Doctor Autonomy & Solo Sovereignty (Mandates 8e, 8s)", () => {
	const mockCandidateWithPhone: PatientRecallRecord = {
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

	const mockCandidateWithoutPhone: PatientRecallRecord = {
		id: "cand-implant-02",
		patientId: "pat-102",
		fullName: "Соколов Андрей Владимирович",
		phone: "",
		cycleType: "implant_monitoring",
		lastVisitDate: "2025-09-10",
		dueDate: "2026-09-10",
		daysOverdue: 15,
		urgencyStatus: "overdue_30",
		status: "due_now",
		attendingDoctorName: "Д-р Смирнов А.В.",
		historicalRevenueRub: 145000,
		visitsCount: 4,
	};

	it("ensures zero disabled action buttons across all candidates in rendered markup", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [mockCandidateWithPhone, mockCandidateWithoutPhone],
			}),
		);

		const buttonMatches = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
		assert.ok(buttonMatches.length > 0, "Buttons must be present in hub modal");

		for (const btn of buttonMatches) {
			assert.ok(
				!btn.includes(" disabled") && !btn.includes('disabled=""'),
				`Mandate 8e violation: found disabled button in Hub: ${btn.slice(0, 100)}`,
			);
		}
	});

	it("provides 1-Click fast presets for routine hygiene (6m) and implant review (1y)", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [mockCandidateWithPhone, mockCandidateWithoutPhone],
			}),
		);

		assert.ok(html.includes('data-testid="preset-hygiene-6m"'));
		assert.ok(html.includes('data-testid="preset-implants-1y"'));
		assert.ok(html.includes('data-testid="preset-all-urgent"'));
	});
});
