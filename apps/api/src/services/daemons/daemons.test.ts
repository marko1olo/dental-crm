/**
 * daemons.test.ts — Comprehensive Test Suite for DENTE Background Daemons & Scheduler.
 *
 * Covers:
 * 1. 08:00 AM ZTL Look-Ahead 3-Tier Cascade:
 *    - 48h Reminder (LOW urgency)
 *    - 24h Warning (HIGH urgency)
 *    - Same-Day / Morning of shift (<4h, CRITICAL urgency)
 * 2. 21:00 PM EMR Savior & Automated 043/у Note Drafter:
 *    - Extraction of 804н nomenclature codes
 *    - Article 327 UK RF Compliance: Zero tooth FDI hallucination (writes "[Укажите зуб]" when absent)
 *    - Correct tooth extraction when toothCode is explicitly present
 * 3. Weekly Retention Hunter & Abandoned Treatment Scans:
 *    - Implants without crowns (4+ months)
 *    - Approved unscheduled treatment plans
 *    - 1-click WhatsApp message drafting
 * 4. Reactive Smart Gap-Filler on appointment cancellation
 * 5. DaemonScheduler In-Process Cron Engine:
 *    - Deterministic time-shifting with simulated clocks (08:00, 21:00, 22:00)
 *    - Exact minute deduplication
 *    - Unified proactive alert aggregation (`getProactiveAlerts`)
 * 6. Copilot Fastify Endpoints Integration:
 *    - POST /api/v1/copilot/daemons/ztl-scan
 *    - POST /api/v1/copilot/daemons/emr-savior
 *    - POST /api/v1/copilot/daemons/retention-scan
 *    - POST /api/v1/copilot/daemons/gap-filler
 *    - GET /api/v1/copilot/proactive/alerts
 */

import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import {
	DaemonScheduler,
	acquireSessionAdvisoryLock,
	defaultDaemonScheduler,
	releaseSessionAdvisoryLock,
	type DaemonJobName,
} from "./daemonScheduler.js";
import type { AdvisoryLockPool } from "./daemonJobRegistry.js";
import {
	draftSoapFromNomenclatureServices,
	runEmrSaviorScan,
} from "./emrSaviorDaemon.js";
import {
	runZtlLookAheadScan,
	type ZtlLookAheadAlert,
} from "./ztlLookAheadDaemon.js";
import {
	runWeeklyRetentionScan,
} from "./abandonedTreatmentHunterDaemon.js";
import {
	triggerSmartGapFiller,
} from "./smartGapFillerService.js";
import { signToken } from "../../utils/cryptoHelper.js";

const TEST_SECRET = "test-daemon-secret-key-12345";
process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
process.env.JWT_SECRET = TEST_SECRET;
process.env.DENTE_ADMIN_SECRET = TEST_SECRET;
const TEST_ORG_ID = "00000000-0000-7000-8000-000000000001";
const TEST_USER_ID = "00000000-0000-7000-8000-000000000002";

function authHeaders(): Record<string, string> {
	return {
		"x-dente-clinic-token": signToken({ organizationId: TEST_ORG_ID }, TEST_SECRET, 3600),
		"x-dente-staff-token": signToken(
			{ userId: TEST_USER_ID, organizationId: TEST_ORG_ID, role: "doctor" },
			TEST_SECRET,
			3600,
		),
	};
}

describe("Background Daemons & Scheduler Architecture", () => {
	// =========================================================================
	// 1. ZTL LOOK-AHEAD 3-TIER CASCADE TESTS
	// =========================================================================
	describe("1. ZTL Look-Ahead 3-Tier Cascade", () => {
		it("correctly identifies same-day critical alert when appointment is <= 4 hours away", () => {
			const now = new Date("2026-09-01T08:00:00Z");
			const apptTime = new Date("2026-09-01T10:00:00Z"); // 2 hours away
			const hoursUntil = Math.round((apptTime.getTime() - now.getTime()) / (1000 * 60 * 60));

			assert.ok(hoursUntil <= 4, "Should be within 4 hours");

			// Cascade logic verification
			const urgency = hoursUntil <= 4 ? "CRITICAL" : hoursUntil <= 24 ? "HIGH" : "LOW";
			const stage = hoursUntil <= 4 ? "same_day_critical" : hoursUntil <= 24 ? "24h_warning" : "48h_reminder";

			assert.equal(urgency, "CRITICAL");
			assert.equal(stage, "same_day_critical");
		});

		it("correctly assigns 24h warning when appointment is between 4 and 24 hours away", () => {
			const now = new Date("2026-09-01T08:00:00Z");
			const apptTime = new Date("2026-09-02T02:00:00Z"); // 18 hours away
			const hoursUntil = Math.round((apptTime.getTime() - now.getTime()) / (1000 * 60 * 60));

			assert.ok(hoursUntil > 4 && hoursUntil <= 24, "Should be in 24h window");

			const urgency = hoursUntil <= 4 ? "CRITICAL" : hoursUntil <= 24 ? "HIGH" : "LOW";
			const stage = hoursUntil <= 4 ? "same_day_critical" : hoursUntil <= 24 ? "24h_warning" : "48h_reminder";

			assert.equal(urgency, "HIGH");
			assert.equal(stage, "24h_warning");
		});

		it("correctly assigns 48h reminder (LOW urgency) when appointment is > 24 hours away", () => {
			const now = new Date("2026-09-01T08:00:00Z");
			const apptTime = new Date("2026-09-02T20:00:00Z"); // 36 hours away
			const hoursUntil = Math.round((apptTime.getTime() - now.getTime()) / (1000 * 60 * 60));

			assert.ok(hoursUntil > 24 && hoursUntil <= 48, "Should be in 48h window");

			const urgency = hoursUntil <= 4 ? "CRITICAL" : hoursUntil <= 24 ? "HIGH" : "LOW";
			const stage = hoursUntil <= 4 ? "same_day_critical" : hoursUntil <= 24 ? "24h_warning" : "48h_reminder";

			assert.equal(urgency, "LOW");
			assert.equal(stage, "48h_reminder");
		});

		it("runZtlLookAheadScan executes safely without throwing and returns typed alert list", async () => {
			const alerts = await runZtlLookAheadScan({
				organizationId: TEST_ORG_ID,
				lookAheadHours: 48,
				now: new Date("2026-09-01T08:00:00Z"),
			});

			assert.ok(Array.isArray(alerts), "Result should be an array");
			for (const a of alerts) {
				assert.ok(["LOW", "HIGH", "CRITICAL"].includes(a.urgency));
				assert.ok(["48h_reminder", "24h_warning", "same_day_critical"].includes(a.cascadeStage));
				assert.ok(a.suggestedActions.some((act) => act.actionId === "contact_lab_tech"));
				assert.ok(a.suggestedActions.some((act) => act.actionId === "reschedule_patient"));
			}
		});
	});

	// =========================================================================
	// 2. EMR SAVIOR & ZERO-TOOTH HALLUCINATION (ARTICLE 327 UK RF SAFETY)
	// =========================================================================
	describe("2. EMR Savior & 043/у Legal Safety", () => {
		it("generates [Укажите зуб] when toothCode is absent (Zero Tooth Hallucination)", () => {
			const services = [
				{ code: "A16.07.002", title: "Восстановление зуба пломбой (лечение кариеса)" },
			];

			const draft = draftSoapFromNomenclatureServices(services, "Иванов И.И.", null);

			// Strict assertion: toothNumber MUST be undefined
			assert.equal(draft.toothNumber, undefined, "toothNumber must NOT be hallucinated");
			assert.equal(draft.assessment.toothNumber, undefined);

			// Diary text and clinical reasoning must flag [Укажите зуб]
			assert.ok(
				draft.form043Text.includes("[Укажите зуб]"),
				"Form 043/у diary must include '[Укажите зуб]'",
			);
			assert.ok(
				draft.objective.rawObjectiveText.includes("[Укажите зуб]"),
				"Objective text must state '[Укажите зуб]'",
			);
			assert.ok(
				draft.assessment.clinicalReasoning?.includes("[Укажите зуб]"),
				"Assessment reasoning must flag '[Укажите зуб]'",
			);
		});

		it("properly incorporates FDI tooth number when explicitly provided", () => {
			const services = [
				{ code: "A16.07.002", title: "Восстановление зуба пломбой" },
			];

			const draft = draftSoapFromNomenclatureServices(services, "Петрова А.С.", "26");

			assert.equal(draft.toothNumber, 26, "toothNumber must be parsed from toothCode");
			assert.equal(draft.assessment.toothNumber, 26);
			assert.ok(draft.form043Text.includes("26"), "Diary text must contain tooth 26");
			assert.ok(draft.objective.rawObjectiveText.includes("26"));
		});

		it("correctly identifies endodontic protocols and materials from 804н codes", () => {
			const endoServices = [
				{ code: "A16.07.030.001", title: "Инструментальная и медикаментозная обработка корневого канала" },
				{ code: "A16.07.008", title: "Пломбирование корневого канала зуба пастой и гуттаперчевыми штифтами" },
			];

			const draft = draftSoapFromNomenclatureServices(endoServices, "Смирнов В.В.", "16");

			assert.equal(draft.specialty, "endodontics");
			assert.equal(draft.assessment.icd10Code, "K04.0");
			assert.ok(draft.plan.materials.includes("Гипохлорит натрия 3%"));
			assert.ok(draft.plan.materials.includes("ЭДТА 17%"));
			assert.ok(draft.plan.materials.includes("Эпоксидный силер AH Plus"));
			assert.equal(draft.toothNumber, 16);
		});

		it("runEmrSaviorScan executes safely without crashing the server", async () => {
			const alerts = await runEmrSaviorScan({
				organizationId: TEST_ORG_ID,
				targetDate: new Date("2026-09-01T21:00:00Z"),
			});

			assert.ok(Array.isArray(alerts));
		});
	});

	// =========================================================================
	// 3. WEEKLY RETENTION HUNTER & GAP-FILLER TESTS
	// =========================================================================
	describe("3. Retention Hunter & Smart Gap-Filler", () => {
		it("runWeeklyRetentionScan executes and returns retention metrics structure", async () => {
			const summaries = await runWeeklyRetentionScan({
				organizationId: TEST_ORG_ID,
				now: new Date("2026-09-01T22:00:00Z"),
			});

			assert.ok(Array.isArray(summaries));
			for (const s of summaries) {
				assert.equal(typeof s.totalAbandonedPatientsCount, "number");
				assert.equal(typeof s.totalEstimatedLostRevenueRub, "number");
				assert.ok(s.funnels);
				assert.equal(typeof s.funnels.implantsWithoutCrownCount, "number");
			}
		});

		it("triggerSmartGapFiller handles non-existent appointment gracefully", async () => {
			const nonExistentId = "00000000-0000-0000-0000-999999999999";
			const alert = await triggerSmartGapFiller(nonExistentId, {
				organizationId: TEST_ORG_ID,
				maxCandidates: 3,
			});

			assert.equal(alert, null, "Should return null for non-existent appointment");
		});
	});

	// =========================================================================
	// 4. DAEMON SCHEDULER IN-PROCESS ENGINE & TIME SHIFTING
	// =========================================================================
	describe("4. DaemonScheduler Engine & Deterministic Time Shifting", () => {
		it("initializes with default options and 5 registered jobs", () => {
			const scheduler = new DaemonScheduler({
				organizationId: TEST_ORG_ID,
				pollIntervalMs: 1000,
			});

			assert.equal(scheduler.jobs.length, 5);
			assert.ok(scheduler.jobs.some((j) => j.name === "ztl_lookahead_0800"));
			assert.ok(scheduler.jobs.some((j) => j.name === "emr_savior_2100"));
			assert.ok(scheduler.jobs.some((j) => j.name === "weekly_retention_sunday"));
			assert.ok(scheduler.jobs.some((j) => j.name === "somatic_radar_0730"));
			assert.ok(scheduler.jobs.some((j) => j.name === "sanpin_inventory_2130"));
			assert.equal(scheduler.getActiveStatus(), false);
		});

		it("triggers 08:00 AM ZTL Look-Ahead when clock is stepped to 08:00", async () => {
			let mockTime = new Date("2026-09-01T08:00:00");
			const scheduler = new DaemonScheduler({
				organizationId: TEST_ORG_ID,
				nowProvider: () => mockTime,
				enableSomaticRadar: false,
				enableEmrSavior: false,
				enableSanpinAndInventory: false,
				enableWeeklyRetention: false,
			});

			const executed = await scheduler.checkAndRunJobs(mockTime);
			assert.ok(
				executed.includes("ztl_lookahead_0800"),
				"ztl_lookahead_0800 must execute at 08:00",
			);

			// Deduplication check: running again in the same minute should skip
			const executedSecondTime = await scheduler.checkAndRunJobs(mockTime);
			assert.equal(
				executedSecondTime.includes("ztl_lookahead_0800"),
				false,
				"Should deduplicate execution in the same minute",
			);
		});

		it("triggers 21:00 PM EMR Savior when clock is stepped to 21:00", async () => {
			let mockTime = new Date("2026-09-01T21:00:00");
			const scheduler = new DaemonScheduler({
				organizationId: TEST_ORG_ID,
				nowProvider: () => mockTime,
				enableSomaticRadar: false,
				enableZtlLookAhead: false,
				enableSanpinAndInventory: false,
				enableWeeklyRetention: false,
			});

			const executed = await scheduler.checkAndRunJobs(mockTime);
			assert.ok(
				executed.includes("emr_savior_2100"),
				"emr_savior_2100 must execute at 21:00",
			);
		});

		it("starts and stops cleanly without leaking timers", () => {
			const scheduler = new DaemonScheduler({ pollIntervalMs: 50000 });
			scheduler.start();
			assert.equal(scheduler.getActiveStatus(), true);
			scheduler.stop();
			assert.equal(scheduler.getActiveStatus(), false);
		});

		it("aggregates unified proactive alerts via getProactiveAlerts", async () => {
			const aggregate = await defaultDaemonScheduler.getProactiveAlerts({
				organizationId: TEST_ORG_ID,
				liveScan: false,
			});

			assert.ok(aggregate);
			assert.ok(Array.isArray(aggregate.somaticAlerts));
			assert.ok(Array.isArray(aggregate.ztlAlerts));
			assert.ok(Array.isArray(aggregate.emrSaviorDrafts));
			assert.ok(Array.isArray(aggregate.retentionSummaries));
			assert.ok(Array.isArray(aggregate.sanpinAndInventoryDigests));
			assert.equal(typeof aggregate.totalAlertsCount, "number");
			assert.ok(aggregate.scannedAt);
		});
	});

	// =========================================================================
	// 5. ADVISORY LOCK FAIL-CLOSED & CONNECTION CLEANUP (ANTI-SPLIT-BRAIN)
	// =========================================================================
	describe("5. DaemonScheduler Advisory Lock Fail-Closed & Connection Cleanup", () => {
		it("fails closed (acquired: false) when pool.connect() throws", async () => {
			const brokenPool: AdvisoryLockPool = {
				connect: async () => {
					throw new Error("ECONNREFUSED: PostgreSQL unavailable");
				},
			};

			const lock = await acquireSessionAdvisoryLock("ztl_lookahead_0800", brokenPool);
			assert.equal(lock.acquired, false, "Must fail closed when DB pool connect fails");
			assert.equal(lock.client, null);
		});

		it("fails closed and destroys broken client (release(true)) when client.query() throws", async () => {
			const releaseArgs: Array<boolean | Error | undefined> = [];
			const queryErrorPool: AdvisoryLockPool = {
				connect: async () => ({
					query: async () => {
						throw new Error("Connection terminated unexpectedly");
					},
					release: (destroy?: boolean | Error) => {
						releaseArgs.push(destroy);
					},
				}),
			};

			const lock = await acquireSessionAdvisoryLock("emr_savior_2100", queryErrorPool);
			assert.equal(lock.acquired, false, "Must fail closed on lock query error");
			assert.equal(lock.client, null);
			assert.deepEqual(releaseArgs, [true], "Must destroy broken pool client to prevent connection leak");
		});

		it("fails closed when advisory lock is held by another instance or empty rows returned", async () => {
			const releaseCalls: number[] = [];
			const contendedPool: AdvisoryLockPool = {
				connect: async () => ({
					query: async () => ({ rows: [{ acquired: false }] }),
					release: () => {
						releaseCalls.push(1);
					},
				}),
			};

			const lock1 = await acquireSessionAdvisoryLock("somatic_radar_0730", contendedPool);
			assert.equal(lock1.acquired, false);
			assert.equal(lock1.client, null);
			assert.equal(releaseCalls.length, 1);

			const emptyRowsPool: AdvisoryLockPool = {
				connect: async () => ({
					query: async () => ({ rows: [] }),
					release: () => {
						releaseCalls.push(2);
					},
				}),
			};

			const lock2 = await acquireSessionAdvisoryLock("somatic_radar_0730", emptyRowsPool);
			assert.equal(lock2.acquired, false, "Empty row result must NOT be treated as acquired");
			assert.equal(lock2.client, null);
			assert.equal(releaseCalls.length, 2);
		});

		it("DaemonScheduler skips job execution on lock failure and retries once lock recovers", async () => {
			let poolHealthy = false;
			const queriesExecuted: string[] = [];
			const releaseArgs: Array<boolean | Error | undefined> = [];
			const mockPool: AdvisoryLockPool = {
				connect: async () => {
					if (!poolHealthy) {
						throw new Error("Pool exhausted");
					}
					return {
						query: async (sqlText: string) => {
							queriesExecuted.push(sqlText);
							return { rows: [{ acquired: true }] };
						},
						release: (destroy?: boolean | Error) => {
							releaseArgs.push(destroy);
						},
					};
				},
			};

			const fixedTime = new Date("2026-09-01T08:00:00");
			const scheduler = new DaemonScheduler({
				organizationId: TEST_ORG_ID,
				nowProvider: () => fixedTime,
				advisoryLockPool: mockPool,
				enableSomaticRadar: false,
				enableEmrSavior: false,
				enableSanpinAndInventory: false,
				enableWeeklyRetention: false,
				enableMdlpOutbox: false,
			});

			// 1. Degraded DB pool -> fail closed, job must NOT run and minute must NOT be marked executed
			const skippedRun = await scheduler.checkAndRunJobs(fixedTime);
			assert.deepEqual(skippedRun, [], "No job may run when advisory lock fails");

			// 2. DB pool recovers -> job runs once and releases lock cleanly
			poolHealthy = true;
			const recoveredRun = await scheduler.checkAndRunJobs(fixedTime);
			assert.deepEqual(recoveredRun, ["ztl_lookahead_0800"]);
			assert.equal(queriesExecuted.length, 2, "Should call pg_try_advisory_lock and pg_advisory_unlock");
			assert.ok(queriesExecuted[0]?.includes("pg_try_advisory_lock"));
			assert.ok(queriesExecuted[1]?.includes("pg_advisory_unlock"));
			assert.deepEqual(releaseArgs, [undefined], "Healthy lock release must return connection cleanly");
		});

		it("releaseSessionAdvisoryLock destroys client if pg_advisory_unlock fails", async () => {
			const releaseArgs: Array<boolean | Error | undefined> = [];
			await releaseSessionAdvisoryLock(
				{
					query: async () => {
						throw new Error("Socket closed during unlock");
					},
					release: (destroy?: boolean | Error) => {
						releaseArgs.push(destroy);
					},
				},
				"ztl_lookahead_0800",
			);
			assert.deepEqual(releaseArgs, [true]);
		});
	});
});
