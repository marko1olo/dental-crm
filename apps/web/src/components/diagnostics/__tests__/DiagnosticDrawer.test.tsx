import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { useOfflineStore } from "../../../store/offlineStore.js";
import { DiagnosticDrawer } from "../DiagnosticDrawer.js";

describe("DiagnosticDrawer HUD Component", () => {
	beforeEach(() => {
		clientLogger.clearLogs();
		useOfflineStore.setState({
			pendingMutationCount: 0,
			pendingMutations: [],
			isSyncing: false,
			metrics: {
				pendingCount: 0,
				syncingCount: 0,
				failedCount: 0,
				syncedCount: 0,
				totalDrafts: 0,
			},
		});
	});

	it("renders floating trigger button when closed", () => {
		clientLogger.error("Failed to connect to database", null, { module: "Database" });

		const html = renderToString(
			<DiagnosticDrawer
				isOpen={false}
				showTriggerButton={true}
				organizationId="org-123"
				userRole="admin"
			/>,
		);

		assert.ok(html.includes("dente-diagnostic-trigger"), "Trigger button should be rendered");
		assert.ok(html.includes("Под капотом"), "Should contain label");
		assert.ok(html.includes("dente-diagnostic-badge"), "Should render error badge");
		assert.ok(html.includes("1"), "Error badge should display count 1");
	});

	it("renders full diagnostic drawer modal when open", () => {
		clientLogger.info("Server started", null, { module: "Server" });
		clientLogger.recordNetwork({
			timestamp: new Date().toISOString(),
			method: "GET",
			url: "/api/health",
			path: "/api/health",
			statusCode: 200,
			latencyMs: 15,
			correlationId: "cor_test_123",
			success: true,
		});

		const html = renderToString(
			<DiagnosticDrawer
				isOpen={true}
				showTriggerButton={true}
				organizationId="org-123"
				userRole="doctor"
			/>,
		);

		assert.ok(html.includes("dente-diagnostic-drawer"), "Drawer modal should be rendered");
		assert.ok(html.includes("Диагностика и Observability"), "Title should be present");
		assert.ok(html.includes("Консоль логов"), "Logs tab should be present");
		assert.ok(html.includes("Сетевые запросы"), "Network tab should be present");
		assert.ok(html.includes("Офлайн-очередь"), "Offline tab should be present");
		assert.ok(html.includes("Системный отчет"), "System report tab should be present");
		assert.ok(html.includes("Server started"), "Log entry should be rendered");
	});
});
