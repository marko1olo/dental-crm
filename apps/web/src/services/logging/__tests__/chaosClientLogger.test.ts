import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { useOfflineStore } from "../../../store/offlineStore.js";
import { DiagnosticDrawer } from "../../../components/diagnostic/DiagnosticDrawer.js";
import { clientLogger, MAX_NETWORK_LOGS, MAX_SYSTEM_LOGS } from "../clientLogger.js";

describe("Chaos & Stress Audit: ClientLogger & Diagnostic HUD (DoS / Memory / XSS)", () => {
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

	describe("1. Ring Buffer 100,000 Log Stress & Memory Bound Verification", () => {
		it("retains strictly MAX_SYSTEM_LOGS (500) entries after 100,000 sequential log writes", () => {
			const start = performance.now();
			const TOTAL_LOGS = 100_000;

			for (let i = 0; i < TOTAL_LOGS; i++) {
				clientLogger.info(`Stress log index ${i}`, { seq: i, timestamp: Date.now() }, { module: "StressTest" });
			}

			const elapsedMs = performance.now() - start;
			const logs = clientLogger.getLogs();

			assert.equal(logs.length, MAX_SYSTEM_LOGS, `Expected exactly ${MAX_SYSTEM_LOGS} logs, got ${logs.length}`);
			// Verify newest logs are preserved in correct sequence
			assert.equal(logs[logs.length - 1]?.message, `Stress log index ${TOTAL_LOGS - 1}`);
			assert.equal(logs[0]?.message, `Stress log index ${TOTAL_LOGS - MAX_SYSTEM_LOGS}`);

			// Throughput performance: 100,000 logs should finish in reasonable time (< 3000ms in Node)
			assert.ok(elapsedMs < 3000, `Expected 100k logs in < 3000ms, took ${elapsedMs}ms`);
		});

		it("retains strictly MAX_NETWORK_LOGS (200) entries after 50,000 sequential network events", () => {
			const TOTAL_NET = 50_000;

			for (let i = 0; i < TOTAL_NET; i++) {
				clientLogger.recordNetwork({
					timestamp: new Date().toISOString(),
					method: i % 2 === 0 ? "POST" : "GET",
					url: `/api/v1/resource/${i}`,
					path: `/api/v1/resource/${i}`,
					statusCode: 200,
					latencyMs: 12.5,
					correlationId: `cor_stress_${i}`,
					success: true,
				});
			}

			const netLogs = clientLogger.getNetworkLogs();
			assert.equal(netLogs.length, MAX_NETWORK_LOGS, `Expected exactly ${MAX_NETWORK_LOGS} network logs, got ${netLogs.length}`);
			assert.equal(netLogs[netLogs.length - 1]?.url, `/api/v1/resource/${TOTAL_NET - 1}`);
			assert.equal(netLogs[0]?.url, `/api/v1/resource/${TOTAL_NET - MAX_NETWORK_LOGS}`);
		});

		it("cleans up memory completely upon clearLogs()", () => {
			for (let i = 0; i < 1000; i++) {
				clientLogger.warn(`Warning ${i}`, { payload: "some data" });
				clientLogger.recordNetwork({
					timestamp: new Date().toISOString(),
					method: "GET",
					url: `/test/${i}`,
					path: `/test/${i}`,
					correlationId: `cor_${i}`,
					success: true,
				});
			}

			assert.equal(clientLogger.getLogs().length, MAX_SYSTEM_LOGS);
			assert.equal(clientLogger.getNetworkLogs().length, MAX_NETWORK_LOGS);

			clientLogger.clearLogs();

			assert.equal(clientLogger.getLogs().length, 0);
			assert.equal(clientLogger.getNetworkLogs().length, 0);
		});
	});

	describe("2. Circular References & Corrupted Data Ingestion", () => {
		it("safely accepts circular objects without crashing or throwing", () => {
			const circular: Record<string, unknown> = { key: "root" };
			circular.self = circular;

			const entry = clientLogger.error("Circular data logged", circular, { module: "ChaosModule" });

			assert.equal(entry.message, "Circular data logged");
			assert.ok(entry.data);
			assert.equal((entry.data as Record<string, unknown>).self, "[CIRCULAR_REFERENCE]");
			assert.doesNotThrow(() => JSON.stringify(entry));
		});

		it("safely ingests throwing property getters in log payloads", () => {
			const explosivePayload = {
				normalField: "OK",
				get bomb() {
					throw new Error("Malicious getter triggered during client log!");
				},
			};

			const entry = clientLogger.warn("Explosive payload test", explosivePayload);
			assert.equal(entry.message, "Explosive payload test");
			assert.ok(entry.data);
			assert.equal((entry.data as Record<string, unknown>).normalField, "OK");
			assert.equal((entry.data as Record<string, unknown>).bomb, "[UNREADABLE_PROPERTY]");
		});
	});

	describe("3. XSS & Markup Injection Defense in ClientLogger and DiagnosticDrawer", () => {
		it("safely logs and renders XSS scripts (<script>, <img>, javascript:) as escaped text nodes", () => {
			const xssScript = "<script>alert('XSS_ATTACK_VECTOR')</script>";
			const xssImage = "<img src=x onerror=alert('IMG_XSS') />";
			const xssLink = "javascript:void(document.cookie='hacked')";
			const xssSvg = "<svg/onload=alert('SVG_XSS')>";

			clientLogger.error(xssScript, { injection: xssImage, link: xssLink }, { module: xssSvg });
			clientLogger.recordNetwork({
				timestamp: new Date().toISOString(),
				method: "GET",
				url: `https://dente.ru/search?q=${encodeURIComponent(xssScript)}`,
				path: "/search",
				statusCode: 400,
				correlationId: xssLink,
				error: xssImage,
				success: false,
			});

			const element = React.createElement(DiagnosticDrawer, {
				isOpen: true,
				showTriggerButton: false,
				organizationId: "org-chaos-01",
				userRole: "admin",
			});

			const html = renderToString(element);

			// React must escape all HTML special characters in TextNodes
			assert.ok(!html.includes("<script>alert"), "Must not contain executable <script> tags");
			assert.ok(!html.includes("<img src=x onerror="), "Must not contain unescaped <img> onerror tags");
			assert.ok(!html.includes("<svg/onload="), "Must not contain unescaped <svg> tags");

			// HTML escaped representations must be present
			assert.ok(html.includes("&lt;script&gt;alert(&#x27;XSS_ATTACK_VECTOR&#x27;)&lt;/script&gt;"));
		});
	});

	describe("4. Listener Failure Isolation & Resilience", () => {
		it("continues logging and does not crash when an active listener throws an unhandled error", () => {
			let errorThrownCount = 0;
			const faultyListener = () => {
				errorThrownCount++;
				throw new Error("Fatal crash inside third-party HUD telemetry listener!");
			};

			const unsubscribe = clientLogger.subscribeLogs(faultyListener);

			assert.doesNotThrow(() => {
				clientLogger.info("Log with failing listener 1");
				clientLogger.error("Log with failing listener 2");
			});

			assert.equal(errorThrownCount, 2);
			assert.equal(clientLogger.getLogs().length, 2);

			unsubscribe();

			clientLogger.info("Log after listener unsubscribed");
			assert.equal(errorThrownCount, 2);
			assert.equal(clientLogger.getLogs().length, 3);
		});
	});

	describe("5. Diagnostic Report Export Resilience", () => {
		it("successfully generates and serializes a diagnostic report with complex logs", async () => {
			clientLogger.info("System startup initialized");
			clientLogger.warn("Low memory warning", { availableMb: 64 });
			clientLogger.error("Uncaught exception", new Error("Simulated failure"));

			const report = await clientLogger.generateDiagnosticReport(
				{
					organizationId: "org-111",
					userId: "user-222",
					userRole: "chief_doctor",
				},
				{
					pendingCount: 3,
					failedCount: 0,
					draftsCount: 5,
					clockSkewMs: 12,
				},
			);

			assert.equal(report.appName, "DENTE Dental CRM");
			assert.equal(report.systemLogs.length, 3);
			assert.equal(report.sessionContext?.userRole, "chief_doctor");
			assert.equal(report.offlineQueueSummary?.pendingCount, 3);

			// Must be 100% JSON-serializable without errors
			const json = JSON.stringify(report);
			assert.ok(json.length > 50);
			const parsed = JSON.parse(json);
			assert.equal(parsed.appName, "DENTE Dental CRM");
		});
	});
});
