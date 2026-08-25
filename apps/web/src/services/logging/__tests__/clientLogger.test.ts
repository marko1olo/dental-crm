import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { clientLogger } from "../clientLogger.js";

describe("ClientLogger & Observability Service", () => {
	beforeEach(() => {
		clientLogger.clearLogs();
	});

	it("records log entries into ring buffer with correct levels and sanitization", () => {
		clientLogger.info("User logged in successfully", { role: "doctor" }, { module: "Auth" });
		clientLogger.warn("Low memory warning", null, { module: "System" });
		clientLogger.error("Failed to save tooth", new Error("Database timeout"), { module: "Odontogram" });

		const logs = clientLogger.getLogs();
		assert.equal(logs.length, 3);

		assert.equal(logs[0]?.level, "INFO");
		assert.equal(logs[0]?.module, "Auth");
		assert.equal(logs[0]?.message, "User logged in successfully");
		assert.deepEqual(logs[0]?.data, { role: "doctor" });

		assert.equal(logs[1]?.level, "WARN");
		assert.equal(logs[1]?.module, "System");

		assert.equal(logs[2]?.level, "ERROR");
		assert.equal(logs[2]?.module, "Odontogram");
		assert.ok(logs[2]?.stack?.includes("Database timeout"));
	});

	it("sanitizes sensitive data and credentials in log payloads", () => {
		clientLogger.info("Received credentials payload", {
			login: "admin",
			password: "SuperSecretPassword123!",
			pin: "9999",
			token: "Bearer my-secret-jwt-token",
		});

		const logs = clientLogger.getLogs();
		assert.equal(logs.length, 1);

		const data = logs[0]?.data as Record<string, unknown>;
		assert.equal(data.login, "admin");
		assert.equal(data.password, "[СКРЫТО]");
		assert.equal(data.pin, "[СКРЫТО]");
		assert.equal(data.token, "[СКРЫТО]");
	});

	it("notifies log subscribers and allows unsubscribing", () => {
		const received: string[] = [];
		const unsubscribe = clientLogger.subscribeLogs((entry) => {
			received.push(entry.message);
		});

		clientLogger.debug("Message 1");
		clientLogger.info("Message 2");

		assert.deepEqual(received, ["Message 1", "Message 2"]);

		unsubscribe();
		clientLogger.warn("Message 3");

		// Should not receive Message 3
		assert.deepEqual(received, ["Message 1", "Message 2"]);
	});

	it("records network requests into network ring buffer", () => {
		clientLogger.recordNetwork({
			timestamp: new Date().toISOString(),
			method: "POST",
			url: "http://127.0.0.1:4100/api/patients",
			path: "/api/patients",
			statusCode: 201,
			latencyMs: 45.2,
			correlationId: "cor_019532d5-e234-7000-8000-000000000000",
			requestBodyPreview: JSON.stringify({ fullName: "Петров И.И." }),
			success: true,
		});

		const networkLogs = clientLogger.getNetworkLogs();
		assert.equal(networkLogs.length, 1);
		assert.equal(networkLogs[0]?.method, "POST");
		assert.equal(networkLogs[0]?.statusCode, 201);
		assert.equal(networkLogs[0]?.correlationId, "cor_019532d5-e234-7000-8000-000000000000");
		assert.equal(networkLogs[0]?.success, true);
	});

	it("generates a complete diagnostic report with system and network logs", async () => {
		clientLogger.info("Diagnostic event 1");
		clientLogger.recordNetwork({
			timestamp: new Date().toISOString(),
			method: "GET",
			url: "/api/health",
			path: "/api/health",
			statusCode: 200,
			latencyMs: 12.5,
			correlationId: "cor_test_health",
			success: true,
		});

		const report = await clientLogger.generateDiagnosticReport(
			{ organizationId: "org-test-1", userId: "user-1", userRole: "admin" },
			{ pendingCount: 2, failedCount: 0, draftsCount: 5, clockSkewMs: 12 },
		);

		assert.equal(report.appName, "DENTE Dental CRM");
		assert.equal(report.sessionContext?.organizationId, "org-test-1");
		assert.equal(report.sessionContext?.userRole, "admin");
		assert.equal(report.offlineQueueSummary?.pendingCount, 2);
		assert.equal(report.systemLogs.length, 1);
		assert.equal(report.networkLogs.length, 1);
	});
});
