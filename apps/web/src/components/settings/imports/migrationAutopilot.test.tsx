import React from "react";
import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
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
		assert.equal(html, "");
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
		assert.ok(html.includes("data-testid=\"migration-run-autopilot-btn\""));
		assert.ok(html.includes("Запустить пробный импорт (Dry Run)"));
		assert.ok(html.includes("data-testid=\"migration-discover-sources-btn\""));
		assert.ok(html.includes("Повторить поиск"));
		assert.ok(html.includes("data-testid=\"migration-pick-folder-btn\""));
		assert.ok(html.includes("Выбрать папку"));
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
		assert.ok(html.includes("data-testid=\"migration-operator-lanes-table\""));
		assert.ok(html.includes("85"));
		assert.ok(html.includes("База пациентов"));
		assert.ok(html.includes("Проверить целостность базы"));
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
		assert.ok(html.includes("data-testid=\"migration-sources-grid\""));
		assert.ok(html.includes("План переноса"));
		assert.ok(html.includes("В разбор"));
		assert.ok(html.includes("Предпросмотр"));
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
		assert.ok(previewHtml.includes("data-testid=\"migration-dry-run-summary\""));
		assert.ok(previewHtml.includes("Прямой импорт SQLite"));

		const checklistHtml = renderToString(
			React.createElement(MigrationHandoffChecklistView, {
				checklist: [{ id: "c1", title: "Сверка пациентов", owner: "admin", phase: "verify", status: "ready", detail: "OK" } as any],
			}),
		);
		assert.ok(checklistHtml.includes("data-testid=\"migration-autopilot-handoff-checklist\""));
		assert.ok(checklistHtml.includes("Сверка пациентов"));
	});
});
