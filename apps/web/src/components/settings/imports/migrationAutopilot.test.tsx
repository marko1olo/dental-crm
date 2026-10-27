import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
	MigrationAutopilotSectionView,
	MigrationOperatorActionButtons,
	MigrationSourcesOverview,
	MigrationOperatorLanesTable,
	MigrationCandidatePreviewCard,
	MigrationHandoffChecklistView,
} from "./migrationAutopilot";

describe("MigrationAutopilotSection Decomposed Modules (Mandate 8b <= 120 lines)", () => {
	it("renders null if migrationAutopilot is null or undefined", () => {
		const html = renderToString(React.createElement(MigrationAutopilotSectionView, { migrationAutopilot: null } as any));
		expect(html).toBe("");
	});

	it("renders exactly 1 primary CTA button and non-blocking secondary buttons", () => {
		const html = renderToString(
			React.createElement(MigrationOperatorActionButtons, {
				onRunAutopilot: () => {},
				onDiscoverSources: () => {},
				onPickBrowserSource: () => {},
				onLookupClinicProfile: () => {},
			}),
		);
		expect(html).toContain("data-testid=\"migration-run-autopilot-btn\"");
		expect(html).toContain("Запустить пробный импорт (Dry Run)");
		expect(html).toContain("data-testid=\"migration-discover-sources-btn\"");
		expect(html).toContain("Повторить поиск");
		expect(html).toContain("data-testid=\"migration-pick-folder-btn\"");
		expect(html).toContain("Выбрать папку");
	});

	it("renders operator score and status lanes correctly", () => {
		const mockPacket: any = {
			overallStatus: "ready",
			score: 0.85,
			totals: { databaseSources: 2, mediaSources: 1, tableSources: 3, smartPreviewSources: 0, workstationHints: 1, publicLookupTargets: 1 },
			firstActions: ["Проверить целостность базы"],
		};
		const mockLanes: any[] = [
			{ id: "lane-1", title: "База пациентов", owner: "admin", status: "ready", score: 0.9, detail: "Таблицы готовы", nextAction: "Импорт" },
		];
		const html = renderToString(React.createElement(MigrationOperatorLanesTable, { operatorPacket: mockPacket, lanes: mockLanes }));
		expect(html).toContain("data-testid=\"migration-operator-lanes-table\"");
		expect(html).toContain("85");
		expect(html).toContain("База пациентов");
		expect(html).toContain("Проверить целостность базы");
	});

	it("renders sources overview cards without blocking operator actions", () => {
		const mockSources: any[] = [
			{
				priority: "high",
				owner: "admin",
				score: 0.95,
				candidate: { sourceFingerprint: "fp-1", sourceKind: "database", matchedFiles: 4, displayPath: "C:/Data" },
				recommendedAction: "Запустить импорт",
				riskFlags: [],
			},
		];
		const html = renderToString(
			React.createElement(MigrationSourcesOverview, {
				sources: mockSources,
				isWorkupLoading: false,
				isProbeLoading: false,
				isSmartImportLoading: false,
				candidatePreviewReady: () => true,
				candidatePreviewHint: () => "Готов",
				onPlanCandidate: () => {},
				onProbeCandidate: () => {},
				onAddToSmartImport: () => {},
				onPreviewCandidate: () => {},
			}),
		);
		expect(html).toContain("data-testid=\"migration-sources-grid\"");
		expect(html).toContain("План переноса");
		expect(html).toContain("В разбор");
		expect(html).toContain("Предпросмотр");
	});

	it("renders dry run summary and handoff checklist with clean domain text", () => {
		const mockDryRun = {
			previewableSources: 2,
			adminBlockedSources: 0,
			doctorReviewRequiredSources: 0,
			estimatedOperatorMinutes: 5,
			estimatedClinicDowntimeMinutes: 0,
			fastestRoute: "Прямой импорт SQLite",
			nextBestAction: "Запустить пробный прогон",
		};
		const previewHtml = renderToString(
			React.createElement(MigrationCandidatePreviewCard, {
				dryRunSummary: mockDryRun,
				primaryStep: null,
				primaryCandidate: null,
				operatorActionsProps: {} as any,
			}),
		);
		expect(previewHtml).toContain("data-testid=\"migration-dry-run-summary\"");
		expect(previewHtml).toContain("Прямой импорт SQLite");

		const checklistHtml = renderToString(
			React.createElement(MigrationHandoffChecklistView, {
				checklist: [{ id: "c1", title: "Сверка пациентов", owner: "admin", phase: "verify", status: "ready", detail: "OK" } as any],
			}),
		);
		expect(checklistHtml).toContain("data-testid=\"migration-autopilot-handoff-checklist\"");
		expect(checklistHtml).toContain("Сверка пациентов");
	});
});
