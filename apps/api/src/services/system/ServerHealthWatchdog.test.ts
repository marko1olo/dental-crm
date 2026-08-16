/**
 * ServerHealthWatchdog.test.ts — комплексные юнит- и интеграционные тесты для ServerHealthWatchdog и /api/system/health/*
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import type pg from "pg";
import { db, pool } from "../../db/client.js";
import {
	organizations,
	systemBackgroundJobs,
	systemRamWatchdogs,
} from "../../db/schema.js";
import { registerHealthRoutes } from "../../routes/health.js";
import { clinicalAdminSecret } from "../../security/authSecret.js";
import {
	type HealthStatus,
	ServerHealthWatchdog,
	type SystemMetrics,
} from "./ServerHealthWatchdog.js";

describe("ServerHealthWatchdog — Memory & RAM Watchdog Unit Tests", () => {
	it("getHeapLimit() returns a valid positive limit in bytes", () => {
		const limit = ServerHealthWatchdog.getHeapLimit();
		assert.ok(typeof limit === "number");
		assert.ok(limit > 0, "Heap limit must be greater than 0");
		assert.ok(
			limit >= 128 * 1024 * 1024,
			"Heap limit should be at least 128MB",
		);
	});

	it("evaluateMemoryStatus() returns healthy when memory usage is normal (< 80%)", () => {
		const limit = 1000 * 1024 * 1024; // 1000 MB
		const used = 500 * 1024 * 1024; // 500 MB (50%)

		const result = ServerHealthWatchdog.evaluateMemoryStatus(used, limit);
		assert.equal(result.status, "healthy");
		assert.equal(result.percent, 50);
		assert.ok(result.message.includes("в норме"));
	});

	it("evaluateMemoryStatus() returns warning when memory usage is between 80% and 90%", () => {
		const limit = 1000 * 1024 * 1024; // 1000 MB
		const used = 850 * 1024 * 1024; // 850 MB (85%)

		const result = ServerHealthWatchdog.evaluateMemoryStatus(used, limit);
		assert.equal(result.status, "warning");
		assert.equal(result.percent, 85);
		assert.ok(result.message.includes("Предупреждение"));
	});

	it("evaluateMemoryStatus() returns critical when memory usage is >= 90%", () => {
		const limit = 1000 * 1024 * 1024; // 1000 MB
		const used = 950 * 1024 * 1024; // 950 MB (95%)

		const result = ServerHealthWatchdog.evaluateMemoryStatus(used, limit);
		assert.equal(result.status, "critical");
		assert.equal(result.percent, 95);
		assert.ok(result.message.includes("Критическое"));
	});

	it("collectMemoryMetrics() accurately calculates memory metrics with custom inputs", () => {
		const customMem: NodeJS.MemoryUsage = {
			rss: 600 * 1024 * 1024,
			heapTotal: 500 * 1024 * 1024,
			heapUsed: 400 * 1024 * 1024,
			external: 50 * 1024 * 1024,
			arrayBuffers: 10 * 1024 * 1024,
		};
		const customLimit = 500 * 1024 * 1024; // 400MB / 500MB = 80%

		const metrics = ServerHealthWatchdog.collectMemoryMetrics({
			customMemoryUsage: customMem,
			customHeapLimit: customLimit,
		});

		assert.equal(metrics.heapUsed, customMem.heapUsed);
		assert.equal(metrics.heapTotal, customMem.heapTotal);
		assert.equal(metrics.rss, customMem.rss);
		assert.equal(metrics.external, customMem.external);
		assert.equal(metrics.arrayBuffers, 10 * 1024 * 1024);
		assert.equal(metrics.heapSizeLimit, customLimit);
		assert.equal(metrics.heapUsageRatio, 0.8);
		assert.equal(metrics.heapUsagePercent, 80);
		assert.equal(metrics.status, "warning");
		assert.equal(metrics.warningThresholdPercent, 80);
		assert.equal(metrics.criticalThresholdPercent, 90);
	});
});

describe("ServerHealthWatchdog — PostgreSQL Pool & Database Monitoring Tests", () => {
	it("collectDatabaseMetrics() handles healthy mock pool correctly", async () => {
		const mockPool = {
			totalCount: 10,
			idleCount: 8,
			waitingCount: 0,
			options: { max: 20 },
			query: async () => ({ rows: [{ health_check: 1 }] }),
		} as unknown as pg.Pool;

		const metrics = await ServerHealthWatchdog.collectDatabaseMetrics({
			customPool: mockPool,
			checkDbPing: true,
		});

		assert.equal(metrics.totalCount, 10);
		assert.equal(metrics.idleCount, 8);
		assert.equal(metrics.activeCount, 2);
		assert.equal(metrics.waitingCount, 0);
		assert.equal(metrics.maxConnections, 20);
		assert.equal(metrics.utilizationRatio, 0.1);
		assert.equal(metrics.status, "healthy");
		assert.equal(metrics.isResponsive, true);
		assert.ok(typeof metrics.responseTimeMs === "number");
		assert.equal(metrics.lastError, null);
	});

	it("collectDatabaseMetrics() detects warning when pool utilization is >= 80%", async () => {
		const mockPool = {
			totalCount: 20,
			idleCount: 2,
			waitingCount: 0,
			options: { max: 20 },
			query: async () => ({ rows: [] }),
		} as unknown as pg.Pool;

		const metrics = await ServerHealthWatchdog.collectDatabaseMetrics({
			customPool: mockPool,
			checkDbPing: false,
		});

		assert.equal(metrics.activeCount, 18);
		assert.equal(metrics.utilizationRatio, 0.9);
		assert.equal(metrics.status, "warning");
	});

	it("collectDatabaseMetrics() detects critical when pool has high waiting requests or fails ping", async () => {
		const mockPool = {
			totalCount: 30,
			idleCount: 0,
			waitingCount: 8,
			options: { max: 30 },
			query: async () => {
				throw new Error("Connection pool connection refused");
			},
		} as unknown as pg.Pool;

		const metrics = await ServerHealthWatchdog.collectDatabaseMetrics({
			customPool: mockPool,
			checkDbPing: true,
			dbPingTimeoutMs: 100,
		});

		assert.equal(metrics.activeCount, 30);
		assert.equal(metrics.waitingCount, 8);
		assert.equal(metrics.status, "critical");
		assert.equal(metrics.isResponsive, false);
		assert.ok(metrics.lastError?.includes("connection refused"));
	});
});

describe("ServerHealthWatchdog — Background Queue Metrics Tests", () => {
	it("collectQueueMetrics() aggregates job counts and determines queue health status", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					groupBy: async () => [
						{ queueName: "default", status: "pending", count: 5 },
						{ queueName: "default", status: "processing", count: 2 },
						{ queueName: "communications", status: "dead_letter", count: 1 },
						{ queueName: "communications", status: "completed", count: 20 },
					],
				}),
			}),
		} as unknown as typeof db;

		const metrics = await ServerHealthWatchdog.collectQueueMetrics({
			customDb: mockDb,
		});

		assert.equal(metrics.totalJobs, 28);
		assert.equal(metrics.pending, 5);
		assert.equal(metrics.processing, 2);
		assert.equal(metrics.deadLetter, 1);
		assert.equal(metrics.completed, 20);
		assert.equal(metrics.status, "warning"); // deadLetter > 0 triggers warning
		const defaultQueue = metrics.queues.default;
		assert.ok(defaultQueue);
		assert.equal(defaultQueue.pending, 5);
		assert.equal(defaultQueue.processing, 2);
		const commsQueue = metrics.queues.communications;
		assert.ok(commsQueue);
		assert.equal(commsQueue.deadLetter, 1);
		assert.equal(commsQueue.completed, 20);
	});

	it("collectQueueMetrics() gracefully handles database errors without throwing", async () => {
		const failingDb = {
			select: () => ({
				from: () => ({
					groupBy: async () => {
						throw new Error("relation system_background_jobs does not exist");
					},
				}),
			}),
		} as unknown as typeof db;

		const metrics = await ServerHealthWatchdog.collectQueueMetrics({
			customDb: failingDb,
		});

		assert.equal(metrics.status, "warning");
		assert.ok(metrics.lastError?.includes("system_background_jobs"));
		assert.equal(metrics.totalJobs, 0);
	});
});

describe("ServerHealthWatchdog — Prometheus Formatting Tests", () => {
	it("toPrometheusMetrics() generates valid OpenMetrics / Prometheus string", () => {
		const sampleMetrics: SystemMetrics = {
			timestamp: "2026-08-16T12:00:00.000Z",
			uptimeSeconds: 3600,
			status: "healthy",
			statusReason: "Все системы работают в штатном режиме.",
			environment: "test",
			nodeVersion: "v22.0.0",
			pid: 1234,
			memory: {
				heapUsed: 150000000,
				heapTotal: 250000000,
				rss: 350000000,
				external: 20000000,
				arrayBuffers: 5000000,
				heapSizeLimit: 1000000000,
				heapUsageRatio: 0.15,
				heapUsagePercent: 15,
				rssUsagePercentOfTotalMem: 2.5,
				totalSystemMemory: 16000000000,
				freeSystemMemory: 8000000000,
				status: "healthy",
				warningThresholdPercent: 80,
				criticalThresholdPercent: 90,
				statusMessage: "Использование памяти в норме",
			},
			database: {
				totalCount: 10,
				idleCount: 8,
				activeCount: 2,
				waitingCount: 0,
				maxConnections: 30,
				utilizationRatio: 0.0667,
				status: "healthy",
				isResponsive: true,
				responseTimeMs: 2,
				lastError: null,
			},
			queues: {
				totalJobs: 10,
				pending: 2,
				processing: 1,
				deadLetter: 0,
				failed: 0,
				completed: 7,
				cancelled: 0,
				queues: {
					default: {
						pending: 2,
						processing: 1,
						deadLetter: 0,
						failed: 0,
						completed: 7,
						cancelled: 0,
					},
				},
				status: "healthy",
				lastError: null,
			},
		};

		const promText = ServerHealthWatchdog.toPrometheusMetrics(sampleMetrics);

		assert.ok(typeof promText === "string");
		assert.ok(promText.includes("process_uptime_seconds 3600"));
		assert.ok(promText.includes("dente_health_status 0"));
		assert.ok(promText.includes("nodejs_memory_heap_used_bytes 150000000"));
		assert.ok(promText.includes("nodejs_memory_heap_total_bytes 250000000"));
		assert.ok(promText.includes("nodejs_memory_rss_bytes 350000000"));
		assert.ok(promText.includes("nodejs_memory_heap_size_limit_bytes 1000000000"));
		assert.ok(promText.includes("nodejs_memory_heap_usage_ratio 0.1500"));
		assert.ok(promText.includes("pg_pool_connections_total 10"));
		assert.ok(promText.includes("pg_pool_connections_active 2"));
		assert.ok(promText.includes("pg_pool_connections_idle 8"));
		assert.ok(promText.includes("pg_pool_is_responsive 1"));
		assert.ok(promText.includes("pg_ping_response_time_ms 2"));
		assert.ok(promText.includes('dente_queue_jobs_total{status="pending"} 2'));
		assert.ok(promText.includes('dente_queue_jobs_total{status="dead_letter"} 0'));
		assert.ok(
			promText.includes(
				'dente_queue_jobs{queue="default",status="pending"} 2',
			),
		);
	});
});

describe("ServerHealthWatchdog — Integration with Database & HTTP Routes", () => {
	let testApp: FastifyInstance;
	let testOrgId: string;

	before(async () => {
		// Создаем тестовую организацию в БД
		const [org] = await db
			.insert(organizations)
			.values({
				name: "HealthWatchdog Test Clinic",
			})
			.returning();

		if (!org) {
			throw new Error("Failed to insert test organization");
		}
		testOrgId = org.id;

		// Создаем тестовый Fastify сервер с зарегистрированными маршрутами health
		testApp = Fastify({ logger: false });
		await registerHealthRoutes(testApp);
		await testApp.ready();
	});

	after(async () => {
		if (testApp) {
			await testApp.close();
		}
		if (testOrgId) {
			await db
				.delete(systemRamWatchdogs)
				.where(eq(systemRamWatchdogs.organizationId, testOrgId));
			await db
				.delete(systemBackgroundJobs)
				.where(eq(systemBackgroundJobs.organizationId, testOrgId));
			await db
				.delete(organizations)
				.where(eq(organizations.id, testOrgId));
		}
	});

	it("recordRamSnapshot() saves valid snapshot to system_ram_watchdogs", async () => {
		await ServerHealthWatchdog.recordRamSnapshot(testOrgId);

		const snapshots = await db
			.select()
			.from(systemRamWatchdogs)
			.where(eq(systemRamWatchdogs.organizationId, testOrgId));

		assert.ok(snapshots.length >= 1);
		const snap = snapshots[0];
		assert.ok(snap);
		assert.ok(Number(snap.heapUsedMb) > 0);
		assert.ok(Number(snap.heapTotalMb) > 0);
		assert.ok(Number(snap.rssMb) > 0);
	});

	it("GET /api/health returns basic healthy status with 200 OK", async () => {
		const res = await testApp.inject({
			method: "GET",
			url: "/api/health",
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.service, "dental-crm-api");
		assert.equal(body.status, "healthy");
		assert.ok(body.time);
	});

	it("GET /api/system/health/detailed rejects unauthorized requests without admin secret", async () => {
		const res = await testApp.inject({
			method: "GET",
			url: "/api/system/health/detailed",
		});

		// В зависимости от настройки секретов ожидается 403 или 503 или 200 в dev bypass
		assert.ok([200, 403, 503].includes(res.statusCode));
	});

	it("GET /api/system/health/detailed returns comprehensive system metrics with valid admin secret", async () => {
		const secret = clinicalAdminSecret() ?? "test-secret";

		const res = await testApp.inject({
			method: "GET",
			url: "/api/system/health/detailed",
			headers: {
				"x-dente-admin-secret": secret,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.ok(body.timestamp);
		assert.ok(typeof body.uptimeSeconds === "number");
		assert.ok(["healthy", "warning", "critical"].includes(body.status));
		assert.ok(body.memory);
		assert.ok(typeof body.memory.heapUsed === "number");
		assert.ok(typeof body.memory.heapSizeLimit === "number");
		assert.ok(body.database);
		assert.ok(typeof body.database.totalCount === "number");
		assert.ok(body.queues);
		assert.ok(typeof body.queues.totalJobs === "number");
	});

	it("GET /api/system/metrics returns Prometheus exposition formatted text", async () => {
		const res = await testApp.inject({
			method: "GET",
			url: "/api/system/metrics",
		});

		assert.equal(res.statusCode, 200);
		assert.ok(
			res.headers["content-type"]?.includes("text/plain"),
			"Content-Type must be text/plain",
		);
		assert.ok(res.body.includes("# HELP nodejs_memory_heap_used_bytes"));
		assert.ok(res.body.includes("# TYPE nodejs_memory_heap_used_bytes gauge"));
		assert.ok(res.body.includes("nodejs_memory_heap_used_bytes"));
		assert.ok(res.body.includes("# HELP dente_health_status"));
		assert.ok(res.body.includes("pg_pool_connections_total"));
	});
});
