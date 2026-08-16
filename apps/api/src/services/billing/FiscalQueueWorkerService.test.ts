/**
 * FiscalQueueWorkerService.test.ts — Комплексные юнит-тесты для сервиса буфера отложенной фискализации (54-ФЗ),
 * Circuit Breaker для ККТ, экспоненциального бэкоффа и генератора QR-кодов (ФФД 1.2).
 *
 * Feature #105: Буфер отложенной фискализации (54-ФЗ), circuit breaker для ККТ и отказоустойчивая печать чеков.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AtolKktDriver,
	FiscalQueueError,
	FiscalQueueWorkerService,
	InMemoryFiscalQueueRepository,
	KktCircuitBreaker,
	ShtrihMKktDriver,
	VirtualKktDriver,
	calculateExponentialBackoff,
	formatFiscalQrTimestamp,
	generateFiscalOfdUrl,
	generateFiscalQrRawString,
	generateFiscalQrSvg,
	kopecksToMoneyRubString,
	moneyRubToKopecks,
	parseFiscalQrString,
	resolveTag1054Code,
	resolveTag1055Code,
	resolveTag1199Code,
	resolveTag1212Code,
	resolveTag1214Code,
	resolveTag2108Code,
	type FiscalReceiptPrintPayload,
} from "./FiscalQueueWorkerService.js";

describe("FiscalQueueWorkerService — 54-FZ Fiscal Buffer, Circuit Breaker & QR Generator", () => {
	// ─── 1. ДЕНЕЖНЫЕ И ТЕГОВЫЕ УТИЛИТЫ 54-ФЗ ──────────────────────────────────
	describe("1. Currency & FFD 1.2 Tag Helpers", () => {
		it("converts rubles to exact integer kopecks without float drift", () => {
			assert.equal(moneyRubToKopecks(1500), 150000);
			assert.equal(moneyRubToKopecks(0.01), 1);
			assert.equal(moneyRubToKopecks(99.99), 9999);
			assert.equal(moneyRubToKopecks("2450.50"), 245050);
		});

		it("formats kopecks into rubles string with exact 2 decimal places", () => {
			assert.equal(kopecksToMoneyRubString(150000), "1500.00");
			assert.equal(kopecksToMoneyRubString(1), "0.01");
			assert.equal(kopecksToMoneyRubString(0), "0.00");
			assert.equal(kopecksToMoneyRubString(245050), "2450.50");
		});

		it("throws on invalid ruble amounts", () => {
			assert.throws(
				() => moneyRubToKopecks(Number.NaN),
				/конечным числом/,
			);
			assert.throws(
				() => kopecksToMoneyRubString(-50),
				/неотрицательным числом/,
			);
		});

		it("correctly maps FFD 1.2 Tag 1054 (Operation type)", () => {
			assert.equal(resolveTag1054Code("income"), 1);
			assert.equal(resolveTag1054Code("income_return"), 2);
			assert.equal(resolveTag1054Code("expense"), 3);
			assert.equal(resolveTag1054Code("expense_return"), 4);
		});

		it("correctly maps FFD 1.2 Tag 1055 (Taxation system)", () => {
			assert.equal(resolveTag1055Code("osn"), 1);
			assert.equal(resolveTag1055Code("usn_income"), 2);
			assert.equal(resolveTag1055Code("usn_income_expense"), 4);
			assert.equal(resolveTag1055Code("esxn"), 8);
			assert.equal(resolveTag1055Code("psn"), 16);
		});

		it("correctly maps FFD 1.2 Tag 1212 (Payment subject)", () => {
			assert.equal(resolveTag1212Code("commodity"), 1);
			assert.equal(resolveTag1212Code("job"), 3);
			assert.equal(resolveTag1212Code("service"), 4);
			assert.equal(resolveTag1212Code("payment"), 10);
		});

		it("correctly maps FFD 1.2 Tag 1214 (Payment method)", () => {
			assert.equal(resolveTag1214Code("full_prepayment"), 1);
			assert.equal(resolveTag1214Code("prepayment"), 2);
			assert.equal(resolveTag1214Code("advance"), 3);
			assert.equal(resolveTag1214Code("full_payment"), 4);
			assert.equal(resolveTag1214Code("partial_payment_and_credit"), 5);
			assert.equal(resolveTag1214Code("credit_handover"), 6);
			assert.equal(resolveTag1214Code("credit_payment"), 7);
		});

		it("correctly maps FFD 1.2 Tag 1199 (VAT rate)", () => {
			assert.equal(resolveTag1199Code("vat_20"), 1);
			assert.equal(resolveTag1199Code("vat_10"), 2);
			assert.equal(resolveTag1199Code("vat_20_120"), 3);
			assert.equal(resolveTag1199Code("vat_10_110"), 4);
			assert.equal(resolveTag1199Code("vat_0"), 5);
			assert.equal(resolveTag1199Code("vat_none"), 6); // Без НДС
		});

		it("correctly maps FFD 1.2 Tag 2108 (Measure of quantity)", () => {
			assert.equal(resolveTag2108Code("piece"), 0);
			assert.equal(resolveTag2108Code("gram"), 10);
			assert.equal(resolveTag2108Code("kilogram"), 11);
			assert.equal(resolveTag2108Code("other"), 0);
		});
	});

	// ─── 2. ГЕНЕРАТОР QR-КОДА ФИСКАЛЬНОГО ЧЕКА (54-ФЗ / ФФД 1.2) ───────────────
	describe("2. 54-FZ & FFD 1.2 Fiscal QR Code Generation", () => {
		const testDate = new Date("2026-08-16T22:30:45.000Z");

		it("formats fiscal timestamps for QR accurately", () => {
			const formatted = formatFiscalQrTimestamp(testDate, false);
			assert.match(formatted, /^\d{8}T\d{4}$/);
			const formattedSec = formatFiscalQrTimestamp(testDate, true);
			assert.match(formattedSec, /^\d{8}T\d{6}$/);
		});

		it("generates valid 54-FZ raw QR string according to FNS specifications", () => {
			const rawQr = generateFiscalQrRawString({
				fiscalTimestamp: new Date("2026-08-16T15:30:00"),
				totalAmountRub: 3500.0,
				fn: "9999078900012345",
				fd: "12345",
				fpd: "3456789012",
				operationType: "income",
			});

			assert.ok(rawQr.startsWith("t="));
			assert.ok(rawQr.includes("&s=3500.00"));
			assert.ok(rawQr.includes("&fn=9999078900012345"));
			assert.ok(rawQr.includes("&i=12345"));
			assert.ok(rawQr.includes("&fp=3456789012"));
			assert.ok(rawQr.includes("&n=1"));
		});

		it("parses 54-FZ raw QR string back into structured attributes", () => {
			const rawQr =
				"t=20260816T1530&s=3500.00&fn=9999078900012345&i=12345&fp=3456789012&n=1";
			const parsed = parseFiscalQrString(rawQr);

			assert.equal(parsed.timestamp, "20260816T1530");
			assert.equal(parsed.amountRub, "3500.00");
			assert.equal(parsed.fn, "9999078900012345");
			assert.equal(parsed.fd, "12345");
			assert.equal(parsed.fpd, "3456789012");
			assert.equal(parsed.operationTypeCode, 1);
		});

		it("generates OFD verification links for major Russian OFD operators", () => {
			const params = {
				fiscalTimestamp: new Date("2026-08-16T15:30:00"),
				totalAmountRub: 1500.0,
				fn: "9999078900012345",
				fd: "1001",
				fpd: "9876543210",
				operationType: "income" as const,
			};

			const ofdRu = generateFiscalOfdUrl(params, "ofd_ru");
			assert.match(ofdRu, /https:\/\/ofd\.ru\/check\?fn=9999078900012345/);
			assert.match(ofdRu, /fd=1001/);
			assert.match(ofdRu, /fpd=9876543210/);

			const taxcom = generateFiscalOfdUrl(params, "taxcom");
			assert.match(taxcom, /https:\/\/taxcom\.ru\/check\?fn=9999078900012345/);

			const fns = generateFiscalOfdUrl(params, "fns");
			assert.match(
				fns,
				/https:\/\/check\.kkt\.nalog\.ru\/rec\/9999078900012345\/1001\/9876543210/,
			);
		});

		it("renders crisp pure-TypeScript SVG QR code containing valid vector paths", () => {
			const rawQr =
				"t=20260816T1530&s=1500.00&fn=9999078900012345&i=1001&fp=9876543210&n=1";
			const svg = generateFiscalQrSvg(rawQr);

			assert.ok(svg.startsWith("<svg"));
			assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
			assert.ok(svg.includes("<rect width="));
			assert.ok(svg.includes("<path fill="));
			assert.ok(svg.endsWith("</svg>"));
		});
	});

	// ─── 3. ЭКСПОНЕНЦИАЛЬНЫЙ БЭКОФФ С ДЖИТТЕРОМ ────────────────────────────────
	describe("3. Exponential Backoff with Jitter", () => {
		it("calculates increasing exponential delay for consecutive attempts", () => {
			// Deterministic RNG = 0.5 (zero jitter offset)
			const rng = () => 0.5;

			const delay1 = calculateExponentialBackoff(1, {
				baseDelayMs: 1000,
				maxDelayMs: 30000,
				jitterFactor: 0.2,
				rng,
			});
			const delay2 = calculateExponentialBackoff(2, {
				baseDelayMs: 1000,
				maxDelayMs: 30000,
				jitterFactor: 0.2,
				rng,
			});
			const delay3 = calculateExponentialBackoff(3, {
				baseDelayMs: 1000,
				maxDelayMs: 30000,
				jitterFactor: 0.2,
				rng,
			});
			const delay4 = calculateExponentialBackoff(4, {
				baseDelayMs: 1000,
				maxDelayMs: 30000,
				jitterFactor: 0.2,
				rng,
			});

			assert.equal(delay1, 1000);
			assert.equal(delay2, 2000);
			assert.equal(delay3, 4000);
			assert.equal(delay4, 8000);
		});

		it("caps maximum delay at maxDelayMs", () => {
			const rng = () => 0.5;
			const delay10 = calculateExponentialBackoff(10, {
				baseDelayMs: 1000,
				maxDelayMs: 15000,
				jitterFactor: 0.0,
				rng,
			});
			assert.equal(delay10, 15000);
		});

		it("applies randomized jitter spread across range [1 - jitter/2, 1 + jitter/2]", () => {
			const minRng = () => 0.0;
			const maxRng = () => 1.0;

			const minDelay = calculateExponentialBackoff(1, {
				baseDelayMs: 1000,
				jitterFactor: 0.4,
				rng: minRng,
			});
			const maxDelay = calculateExponentialBackoff(1, {
				baseDelayMs: 1000,
				jitterFactor: 0.4,
				rng: maxRng,
			});

			assert.equal(minDelay, 800); // 1000 * 0.8
			assert.equal(maxDelay, 1200); // 1000 * 1.2
		});
	});

	// ─── 4. CIRCUIT BREAKER ДЛЯ ККТ ──────────────────────────────────────────
	describe("4. KKT Circuit Breaker Lifecycle", () => {
		it("initializes in CLOSED state and passes normal requests", async () => {
			const cb = new KktCircuitBreaker({ failureThreshold: 3 });
			assert.equal(cb.getState(), "closed");

			const result = await cb.execute(async () => "kkt_ok");
			assert.equal(result, "kkt_ok");
			assert.equal(cb.getState(), "closed");
		});

		it("trips to OPEN state after consecutive failure threshold is reached", async () => {
			const cb = new KktCircuitBreaker({
				failureThreshold: 3,
				resetTimeoutMs: 10000,
			});

			const failAction = async () => {
				throw new Error("COM Port I/O Error");
			};

			// Attempt 1: Fail
			await assert.rejects(cb.execute(failAction), /COM Port I\/O Error/);
			assert.equal(cb.getState(), "closed");

			// Attempt 2: Fail
			await assert.rejects(cb.execute(failAction), /COM Port I\/O Error/);
			assert.equal(cb.getState(), "closed");

			// Attempt 3: Fail -> Trips Circuit Breaker to OPEN
			await assert.rejects(cb.execute(failAction), /COM Port I\/O Error/);
			assert.equal(cb.getState(), "open");

			// Attempt 4: Fast-fails immediately with KktCircuitBreakerOpen without invoking action
			let actionCalled = false;
			await assert.rejects(
				cb.execute(async () => {
					actionCalled = true;
					return "never_reached";
				}),
				(err: unknown) => {
					return (
						err instanceof FiscalQueueError &&
						err.code === "KktCircuitBreakerOpen"
					);
				},
			);
			assert.equal(actionCalled, false);
		});

		it("transitions from OPEN to HALF_OPEN after resetTimeout and resets on probe success", async () => {
			const cb = new KktCircuitBreaker({
				failureThreshold: 2,
				resetTimeoutMs: 50, // Short timeout for test
			});

			// Cause 2 failures to trip open
			await assert.rejects(
				cb.execute(async () => {
					throw new Error("KKT Offline");
				}),
			);
			await assert.rejects(
				cb.execute(async () => {
					throw new Error("KKT Offline");
				}),
			);
			assert.equal(cb.getState(), "open");

			// Wait for resetTimeoutMs to elapse
			await new Promise((r) => setTimeout(r, 60));

			// Circuit breaker should now report HALF_OPEN
			assert.equal(cb.getState(), "half_open");

			// Successful probe in HALF_OPEN resets circuit breaker to CLOSED
			const probeResult = await cb.execute(async () => "probe_success");
			assert.equal(probeResult, "probe_success");
			assert.equal(cb.getState(), "closed");
		});

		it("trips back to OPEN immediately if probe in HALF_OPEN fails", async () => {
			const cb = new KktCircuitBreaker({
				failureThreshold: 2,
				resetTimeoutMs: 50,
			});

			await assert.rejects(
				cb.execute(async () => {
					throw new Error("KKT Offline");
				}),
			);
			await assert.rejects(
				cb.execute(async () => {
					throw new Error("KKT Offline");
				}),
			);
			assert.equal(cb.getState(), "open");

			await new Promise((r) => setTimeout(r, 60));
			assert.equal(cb.getState(), "half_open");

			// Probe fails
			await assert.rejects(
				cb.execute(async () => {
					throw new Error("Still down");
				}),
			);
			assert.equal(cb.getState(), "open");
		});

		it("enforces execution call timeout on slow/hanging hardware responses", async () => {
			const cb = new KktCircuitBreaker({
				callTimeoutMs: 40,
			});

			await assert.rejects(
				cb.execute(async () => {
					await new Promise((r) => setTimeout(r, 100));
					return "too_late";
				}),
				(err: unknown) => {
					return (
						err instanceof FiscalQueueError &&
						err.code === "KktConnectionTimeout"
					);
				},
			);
		});
	});

	// ─── 5. ДРАЙВЕРЫ И АДАПТЕРЫ ККТ ──────────────────────────────────────────
	describe("5. KKT Drivers (Virtual, Atol, Shtrih-M)", () => {
		const samplePayload: FiscalReceiptPrintPayload = {
			organizationId: "org-uuid-1",
			receiptType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79991234567",
			cashierFullName: "Иванова А. С.",
			items: [
				{
					name: "Лечение кариеса (световая пломба)",
					priceKopecks: 450000,
					quantity: 1,
					amountKopecks: 450000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
			cashKopecks: 0,
			electronicCardKopecks: 450000,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			totalKopecks: 450000,
		};

		it("VirtualKktDriver successfully prints receipts with valid fiscal numbers", async () => {
			const driver = new VirtualKktDriver();
			const status = await driver.checkStatus();
			assert.equal(status.isOnline, true);
			assert.equal(status.paperPresent, true);

			const result = await driver.printReceipt(samplePayload);
			assert.equal(result.success, true);
			assert.ok(result.fiscalDocNumber);
			assert.ok(result.fiscalSign);
			assert.ok(result.fiscalDriveNumber);
			assert.ok(result.qrRawString.includes("s=4500.00"));
			assert.ok(result.qrSvg.startsWith("<svg"));
		});

		it("VirtualKktDriver throws when offline or paper out", async () => {
			const driver = new VirtualKktDriver();
			driver.setOffline(true);

			await assert.rejects(
				driver.printReceipt(samplePayload),
				(err: unknown) => {
					return (
						err instanceof FiscalQueueError &&
						err.code === "KktDeviceOffline"
					);
				},
			);

			driver.setOffline(false);
			driver.setPaperOut(true);

			await assert.rejects(
				driver.printReceipt(samplePayload),
				(err: unknown) => {
					return (
						err instanceof FiscalQueueError &&
						err.code === "KktPaperOut"
					);
				},
			);
		});

		it("Atol and Shtrih-M drivers generate compliant fiscal print outputs", async () => {
			const atol = new AtolKktDriver();
			const atolResult = await atol.printReceipt(samplePayload);
			assert.equal(atolResult.success, true);
			assert.ok(atolResult.fiscalDocNumber);
			assert.ok(atolResult.qrRawString);

			const shtrih = new ShtrihMKktDriver();
			const shtrihResult = await shtrih.printReceipt(samplePayload);
			assert.equal(shtrihResult.success, true);
			assert.ok(shtrihResult.fiscalDocNumber);
			assert.ok(shtrihResult.qrRawString);
		});
	});

	// ─── 6. СЕРВИС ОБРАБОТЧИКА ОЧЕРЕДИ (WORKER SERVICE & GRACEFUL DEGRADATION) ──
	describe("6. FiscalQueueWorkerService Lifecycle & Graceful Degradation", () => {
		const orgId = "org-test-54fz";
		const sampleReceiptPayload: FiscalReceiptPrintPayload = {
			organizationId: orgId,
			paymentId: "pay-101",
			receiptType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79001112233",
			cashierFullName: "Петрова Е. В.",
			items: [
				{
					name: "Консультация стоматолога-терапевта",
					priceKopecks: 150000,
					quantity: 1,
					amountKopecks: 150000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
			cashKopecks: 150000,
			electronicCardKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			totalKopecks: 150000,
		};

		it("enqueues and immediately prints receipt when KKT is online", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			const service = new FiscalQueueWorkerService({
				repository,
				driver,
			});

			const res = await service.enqueueReceipt(sampleReceiptPayload);
			assert.equal(res.printedImmediately, true);
			assert.equal(res.offlineBuffered, false);
			assert.equal(res.queueItem.status, "printed");
			assert.ok(res.printResult?.fiscalDocNumber);
			assert.ok(res.printResult?.qrRawString);

			const stats = await repository.getStats(orgId);
			assert.equal(stats.printed, 1);
			assert.equal(stats.pending_print, 0);
		});

		it("graceful degradation: buffers receipt as hardware_offline on KKT error without breaking transaction", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			driver.setOffline(true); // Simulate offline cash register

			const service = new FiscalQueueWorkerService({
				repository,
				driver,
			});

			const res = await service.enqueueReceipt(sampleReceiptPayload);
			assert.equal(res.printedImmediately, false);
			assert.equal(res.offlineBuffered, true);
			assert.equal(res.queueItem.status, "hardware_offline");
			assert.equal(res.queueItem.retryCount, 1);
			assert.ok(res.error);

			const stats = await repository.getStats(orgId);
			assert.equal(stats.hardware_offline, 1);
			assert.equal(stats.printed, 0);
		});

		it("retries offline buffer items and transitions to printed upon hardware recovery", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			driver.setOffline(true);

			const service = new FiscalQueueWorkerService({
				repository,
				driver,
			});

			// Enqueue while offline
			const enq = await service.enqueueReceipt(sampleReceiptPayload);
			assert.equal(enq.queueItem.status, "hardware_offline");

			// Hardware comes back online
			driver.setOffline(false);

			// Manual or worker retry
			const retryResult = await service.retryReceipt(
				enq.queueItem.id,
				orgId,
			);
			assert.equal(retryResult.success, true);
			assert.equal(retryResult.status, "printed");
			assert.ok(retryResult.printResult?.fiscalDocNumber);

			const updated = await repository.findById(enq.queueItem.id, orgId);
			assert.equal(updated?.status, "printed");
		});

		it("sends item to dead_letter when max retries (3) are exhausted", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			driver.setOffline(true);

			const service = new FiscalQueueWorkerService({
				repository,
				driver,
				maxRetries: 3,
				circuitBreakerConfig: { failureThreshold: 10 }, // Keep CB closed for retry testing
			});

			// Enqueue -> retryCount = 1, status = hardware_offline
			const enq = await service.enqueueReceipt(sampleReceiptPayload);
			assert.equal(enq.queueItem.retryCount, 1);
			assert.equal(enq.queueItem.status, "hardware_offline");

			// Retry 1 -> retryCount = 2, status = hardware_offline
			const res2 = await service.processSingleItem(enq.queueItem.id, orgId);
			assert.equal(res2.retryCount, 2);
			assert.equal(res2.status, "hardware_offline");
			assert.equal(res2.deadLettered, false);

			// Retry 2 -> retryCount = 3, status = dead_letter
			const res3 = await service.processSingleItem(enq.queueItem.id, orgId);
			assert.equal(res3.retryCount, 3);
			assert.equal(res3.status, "dead_letter");
			assert.equal(res3.deadLettered, true);

			const stats = await repository.getStats(orgId);
			assert.equal(stats.dead_letter, 1);
		});

		it("allows operator to requeue dead_letter items after resolving issue", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			const service = new FiscalQueueWorkerService({
				repository,
				driver,
			});

			// Create and send to DLQ
			const enq = await repository.create({
				organizationId: orgId,
				receiptType: "income",
				status: "dead_letter",
				payloadJson: sampleReceiptPayload as unknown as Record<
					string,
					unknown
				>,
				retryCount: 3,
				lastError: "Hardware damaged",
			});

			// Operator marks requeue
			const requeued = await service.requeueDeadLetter(enq.id, orgId);
			assert.equal(requeued.status, "pending_print");
			assert.equal(requeued.retryCount, 0);

			// Process succeeds now
			const processed = await service.processSingleItem(enq.id, orgId);
			assert.equal(processed.status, "printed");
			assert.equal(processed.success, true);
		});

		it("batch worker processes pending queue and stops gracefully if circuit breaker trips", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			const service = new FiscalQueueWorkerService({
				repository,
				driver,
				circuitBreakerConfig: { failureThreshold: 2 },
			});

			// Create 4 pending items
			for (let i = 0; i < 4; i++) {
				await repository.create({
					organizationId: orgId,
					receiptType: "income",
					status: "pending_print",
					payloadJson: {
						...sampleReceiptPayload,
						totalKopecks: 100000 * (i + 1),
					} as unknown as Record<string, unknown>,
					retryCount: 0,
				});
			}

			// First batch run with online driver -> all 4 printed
			const batch1 = await service.processPendingQueue(orgId);
			assert.equal(batch1.totalProcessed, 4);
			assert.equal(batch1.successCount, 4);

			// Now create 3 more items and make driver offline
			for (let i = 0; i < 3; i++) {
				await repository.create({
					organizationId: orgId,
					receiptType: "income",
					status: "pending_print",
					payloadJson: sampleReceiptPayload as unknown as Record<
						string,
						unknown
					>,
					retryCount: 0,
				});
			}
			driver.setOffline(true);

			const batch2 = await service.processPendingQueue(orgId);
			// 2 failures trip circuit breaker, subsequent processing halts
			assert.equal(batch2.circuitBreakerTripped, true);
			assert.ok(batch2.offlineCount >= 2);
		});

		it("provides full health report and metrics", async () => {
			const repository = new InMemoryFiscalQueueRepository();
			const driver = new VirtualKktDriver();
			const service = new FiscalQueueWorkerService({
				repository,
				driver,
			});

			await service.enqueueReceipt(sampleReceiptPayload);
			const report = await service.getHealthReport(orgId);

			assert.equal(report.driverName, "Virtual KKT 54-FZ Emulator");
			assert.equal(report.driverProtocol, "virtual_driver");
			assert.equal(report.queueStats.printed, 1);
			assert.equal(report.circuitBreaker.state, "closed");
			assert.equal(report.circuitBreaker.totalSuccesses, 1);
		});
	});
});
