import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PatientRecallRecord } from "../../patientRecallEngine";
import { PatientRecallsHubModal } from "../../PatientRecallsHubModal";

describe("6. UI Rendering: Table vs Kanban Views and Doctor Autonomy", () => {
	const sampleCandidate: PatientRecallRecord = {
		id: "cand-ui-01",
		patientId: "pat-ui-01",
		fullName: "Васильев Василий Васильевич",
		phone: "+7 (926) 333-22-11",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2025-11-01",
		dueDate: "2026-05-01",
		daysOverdue: 14,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorId: "doc-10",
		attendingDoctorName: "Д-р Орлова А.И.",
		historicalRevenueRub: 12000,
		visitsCount: 1,
	};

	it("renders View Mode toggle buttons (Table vs Kanban) in toolbar", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, { isOpen: true, initialCandidates: [sampleCandidate] }),
		);
		assert.ok(html.includes('data-testid="view-mode-table"'));
		assert.ok(html.includes('data-testid="view-mode-kanban"'));
	});

	it("renders Doctor and Period filter dropdowns in toolbar", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, { isOpen: true, initialCandidates: [sampleCandidate] }),
		);
		assert.ok(html.includes('data-testid="doctor-filter-select"'));
		assert.ok(html.includes('data-testid="period-filter-select"'));
		assert.ok(html.includes("Все врачи"));
		assert.ok(html.includes("Все периоды"));
	});

	it("renders 4 clinical return trigger presets in the toolbar", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, { isOpen: true, initialCandidates: [sampleCandidate] }),
		);
		assert.ok(html.includes('data-testid="preset-hygiene-6m"'));
		assert.ok(html.includes('data-testid="preset-implants-1y"'));
		assert.ok(html.includes('data-testid="preset-ortho-1m"'));
		assert.ok(html.includes('data-testid="preset-pediatric-3m"'));
	});

	it("Mandate 8e: zero disabled action buttons across all action triggers", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				initialCandidates: [sampleCandidate, { ...sampleCandidate, id: "cand-ui-02", phone: "", status: "declined" }],
			}),
		);
		const buttonMatches = html.match(/<button[^>]*>/g) || [];
		assert.ok(buttonMatches.length > 0);
		for (const btn of buttonMatches) {
			assert.equal(btn.includes("disabled"), false, `Mandate 8e Violation: Button must never be disabled: ${btn}`);
		}
	});

	it("renders 1-Click Book and WhatsApp action buttons for candidate row", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, { isOpen: true, initialCandidates: [sampleCandidate] }),
		);
		assert.ok(html.includes(`data-testid="recall-book-btn-${sampleCandidate.id}"`));
		assert.ok(html.includes(`data-testid="recall-whatsapp-btn-${sampleCandidate.id}"`));
		assert.ok(html.includes(`data-testid="recall-sms-btn-${sampleCandidate.id}"`));
	});
});
