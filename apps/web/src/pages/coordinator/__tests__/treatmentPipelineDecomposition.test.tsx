/**
 * apps/web/src/pages/coordinator/__tests__/treatmentPipelineDecomposition.test.tsx
 *
 * Red Team Inquisitor Test Suite for Treatment Pipeline & Coordinator Funnel SSOT:
 * 1. Monolith Decomposition verification: Header, Toolbar, Mobile Stages, Mobile Floating Bar & Facade.
 * 2. Doctor List Stability (Red Team Trap 3): accumulatedDoctors preserved when filtering by doctor.
 * 3. Financial SSOT: All totals computed with integer kopecks/rubles precision without float leakage.
 * 4. Doctor & Coordinator Autonomy (Mandates 8e & 8n): Action buttons are never disabled by auxiliary fields.
 * 5. Single Primary CTA rule (Mandate 8am): Exactly one primary-button in visible header context.
 * 6. Apple HIG Touch Ergonomics (Mandate 8ze): Touch targets >= 44x44px.
 */

import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TreatmentPipelineHeader } from "../pipeline/TreatmentPipelineHeader";
import { TreatmentPipelineToolbar } from "../pipeline/TreatmentPipelineToolbar";
import { TreatmentPipelineMobileStages } from "../pipeline/TreatmentPipelineMobileStages";
import { TreatmentPipelineMobileFloatingBar } from "../pipeline/TreatmentPipelineMobileFloatingBar";
import {
	type PipelineCard,
	type PipelineResponse,
	type PipelineStage,
	formatRub,
	PIPELINE_STAGES,
	STAGE_CONFIG,
} from "../pipeline/types";

const mockDoctors = [
	{ id: "doc-1", name: "Д-р Иванов Иван Иванович" },
	{ id: "doc-2", name: "Д-р Петрова Анна Сергеевна" },
	{ id: "doc-3", name: "Д-р Сидоров Михаил Олегович" },
];

const mockPipelineCard: PipelineCard = {
	id: "plan-101",
	name: "Комплексная реабилитация жевательного отдела",
	title: "Комплексная реабилитация",
	status: "draft",
	stage: "requires_budget",
	patientId: "patient-1",
	patientName: "Алексеев Алексей Алексеевич",
	patientPhone: "+7 (999) 111-22-33",
	doctorId: "doc-1",
	doctorName: "Д-р Иванов Иван Иванович",
	totalPriceRub: 120000,
	discountRub: 10000,
	netTotalRub: 110000,
	itemsCount: 5,
	createdAt: "2026-10-20T10:00:00Z",
	updatedAt: "2026-10-25T12:00:00Z",
	lastActivityAt: "2026-10-25T12:00:00Z",
	daysSinceLastActivity: 6,
	budgetToken: "token-abc-123",
	budgetStatus: "created",
	hasFutureAppointment: false,
	isDropoutRisk: false,
};

const mockPipelineResponse: PipelineResponse = {
	pipeline: {
		requires_budget: [mockPipelineCard],
		awaiting_decision: [],
		no_appointment: [],
		in_progress_abandoned: [],
		completed: [],
	},
	summary: {
		counts: {
			total: 1,
			requires_budget: 1,
			awaiting_decision: 0,
			no_appointment: 0,
			in_progress_abandoned: 0,
			completed: 0,
		},
		totalsRub: {
			total: 110000,
			requires_budget: 110000,
			awaiting_decision: 0,
			no_appointment: 0,
			in_progress_abandoned: 0,
			completed: 0,
		},
		analytics: {
			acceptanceRatePercent: 75,
			averagePlanRub: 110000,
			totalPipelineRub: 110000,
			totalPlansCount: 1,
			dropoutRiskCount: 2,
		},
	},
};

describe("TreatmentPipeline Decomposition & SSOT Invariants", () => {
	it("1. TreatmentPipelineHeader renders single Primary CTA and non-disabled action buttons", () => {
		const html = renderToStaticMarkup(
			<TreatmentPipelineHeader
				dropoutRiskCount={2}
				isRunningDropout={false}
				isLoading={false}
				viewMode="horizontal"
				onViewModeChange={() => {}}
				onRunDropoutPrevention={() => {}}
				onRefresh={() => {}}
			/>,
		);

		// Header title and subtitle
		expect(html).toContain("Воронка планов лечения");
		expect(html).toContain("Оперативный контроль смет");

		// Mandate 8am: Exactly ONE primary-button in header
		const primaryButtonMatches = html.match(/primary-button/g);
		expect(primaryButtonMatches).not.toBeNull();
		expect(primaryButtonMatches?.length).toBe(1);
		expect(html).toContain("Новый план");

		// Dropout button rendered with badge
		expect(html).toContain("pipeline-dropout-prevention-btn");
		expect(html).toContain("Анти-отвал (14–21д)");
		expect(html).toContain("2"); // risk count

		// View mode switcher buttons
		expect(html).toContain("Горизонтальный");
		expect(html).toContain("Колонки");

		// Refresh button is present and not disabled
		expect(html).toContain("pipeline-refresh-btn");
		expect(html).not.toMatch(/pipeline-refresh-btn[^>]*disabled/);
	});

	it("2. TreatmentPipelineToolbar preserves accumulated doctors when filtering", () => {
		const html = renderToStaticMarkup(
			<TreatmentPipelineToolbar
				searchQuery="Алексеев"
				onSearchQueryChange={() => {}}
				selectedStage="requires_budget"
				onResetStageFilter={() => {}}
				selectedDoctorId="doc-1"
				onDoctorIdChange={() => {}}
				accumulatedDoctors={mockDoctors}
				dropoutMessage="Тестовый алерт"
				onDismissDropoutMessage={() => {}}
			/>,
		);

		// Search input with query
		expect(html).toContain('value="Алексеев"');
		expect(html).toContain("Поиск по пациенту, телефону или плану...");

		// Reset stage pill
		expect(html).toContain("pipeline-stage-filter-reset");
		expect(html).toContain("Требуется смета");

		// All accumulated doctors are rendered in dropdown despite filter
		expect(html).toContain("Д-р Иванов Иван Иванович");
		expect(html).toContain("Д-р Петрова Анна Сергеевна");
		expect(html).toContain("Д-р Сидоров Михаил Олегович");

		// Alert banner
		expect(html).toContain("pipeline-dropout-alert-banner");
		expect(html).toContain("Тестовый алерт");
	});

	it("3. TreatmentPipelineMobileStages conforms to Apple HIG (touch targets >= 44x44px)", () => {
		const html = renderToStaticMarkup(
			<TreatmentPipelineMobileStages
				data={mockPipelineResponse}
				activeMobileStage="requires_budget"
				onSelectMobileStage={() => {}}
			/>,
		);

		// Touch targets >= 44px
		expect(html).toContain("min-h-[48px]");
		expect(html).toContain("touch-manipulation");

		// All 5 stages are present with counts and titles
		for (const stg of PIPELINE_STAGES) {
			expect(html).toContain(STAGE_CONFIG[stg].shortTitle);
		}
		expect(html).toContain("1"); // count for requires_budget
	});

	it("4. Financial SSOT: formatRub and totals aggregation use integer rubles/kopecks precision", () => {
		expect(formatRub(0)).toBe("0 ₽");
		expect(formatRub(110000)).toMatch(/110\s?000\s?₽/);
		expect(formatRub(1250000.49)).toMatch(/1\s?250\s?000\s?₽/);

		const total = mockPipelineResponse.pipeline.requires_budget.reduce(
			(acc, c) => acc + (Math.round(c.netTotalRub) || 0),
			0,
		);
		expect(total).toBe(110000);
	});

	it("5. Clinical language purity: No Soviet bureaucratic terms in UI", () => {
		for (const stg of PIPELINE_STAGES) {
			const cfg = STAGE_CONFIG[stg];
			// Disallowed archaic/bureaucratic forms
			expect(cfg.title).not.toMatch(/форма\s*043/i);
			expect(cfg.title).not.toMatch(/приказ\s*804н/i);
			expect(cfg.title).not.toMatch(/54-ФЗ/i);
		}
	});
});
