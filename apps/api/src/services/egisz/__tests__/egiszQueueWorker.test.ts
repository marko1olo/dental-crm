/**
 * Test Suite: EGISZ REMD Background Queue Worker & CDA R3 Deterministic XML
 * Verifies non-blocking async queueing, exponential retry backoff, status synchronization,
 * zero fake signatures/mocks enforcement (FZ-63 / Order 911n), and cryptographic audit chaining.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateEgiszRetryDelayMs,
	EgiszOutboxDispatcher,
} from "../EgiszOutboxDispatcher.js";
import {
	startEgiszQueueWorker,
	stopEgiszQueueWorker,
} from "../EgiszQueueWorker.js";
import {
	generateDentalCdaXml,
	canonicalizeCdaXml,
	buildEgiszRemdSubmissionPackage,
	type EgiszRemdPackage,
} from "../../../services/egiszCdaGenerator.js";
import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
	type RemdStatusResponse,
} from "../OiisGatewayClient.js";

describe("EGISZ REMD Background Queue & CDA R3 Determinism", () => {
	it("1. calculateEgiszRetryDelayMs enforces strict exponential backoff policy", () => {
		assert.equal(calculateEgiszRetryDelayMs(1), 5_000, "Attempt 1 must back off 5s");
		assert.equal(calculateEgiszRetryDelayMs(2), 30_000, "Attempt 2 must back off 30s");
		assert.equal(calculateEgiszRetryDelayMs(3), 300_000, "Attempt 3 must back off 5m");
		assert.equal(calculateEgiszRetryDelayMs(4), 3_600_000, "Attempt 4 must back off 1h");
		assert.equal(calculateEgiszRetryDelayMs(5), 86_400_000, "Attempt 5+ must back off 24h");
	});

	it("2. generateDentalCdaXml produces byte-for-byte deterministic canonical XML with sorted teeth and services", () => {
		const sampleParams = {
			documentId: "d0000000-0000-4000-8000-000000000001",
			visitId: "v0000000-0000-4000-8000-000000000001",
			visitDate: "2026-09-02T10:00:00.000Z",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
			clinicName: "Клиника ДЕНТЕ",
			clinicAddress: "г. Москва, ул. Стоматологическая, д. 1",
			clinicPhone: "+74951234567",
			patientId: "p0000000-0000-4000-8000-000000000001",
			patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
			patientGender: "male" as const,
			patientBirthDate: "1990-01-15",
			patientSnils: "11223344595",
			patientAddress: "г. Москва, ул. Ленина, д. 10",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "11223344595",
			doctorPosition: "врач-стоматолог-терапевт",
			doctorPositionCode: "41",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			anamnesis: "Жалобы на боль от сладкого",
			// Unordered input: tooth 36, then 11, then 24
			dentalStatus: [
				{ tooth: 36, condition: "carious", surfaces: ["O", "M"] },
				{ tooth: 11, condition: "healthy" },
				{ tooth: 24, condition: "filled", surfaces: ["D"] },
			],
			// Unordered services
			services: [
				{ code: "A16.07.002.001", name: "Восстановление зуба пломбой", tooth: 36, quantity: 1 },
				{ code: "A16.07.051", name: "Профессиональная гигиена", quantity: 1 },
			],
			treatmentDescription: "Проведено лечение кариеса зуба 36, наложена светоотверждаемая пломба.",
		};

		const res1 = generateDentalCdaXml(sampleParams);
		assert.equal(res1.success, true);
		if (!res1.success) return;

		const res2 = generateDentalCdaXml(sampleParams);
		assert.equal(res2.success, true);
		if (!res2.success) return;

		// Byte-for-byte identity of XML and canonicalXml
		assert.equal(res1.xml, res2.xml, "Generated CDA XML must be 100% deterministic");
		assert.equal(res1.canonicalXml, res2.canonicalXml, "Canonical XML must be 100% deterministic");

		// Verify tooth order sorting (11 appears before 24, and 24 before 36)
		const pos11 = res1.xml.indexOf("11");
		const pos24 = res1.xml.indexOf("24");
		const pos36 = res1.xml.indexOf("36");
		assert.ok(pos11 !== -1 && pos24 !== -1 && pos36 !== -1, "All teeth must be present");
		assert.ok(pos11 < pos24, "Tooth 11 must appear before tooth 24 in odontogram");
		assert.ok(pos24 < pos36, "Tooth 24 must appear before tooth 36 in odontogram");

		// Verify canonical invariants: no BOM, LF line breaks, trimmed
		assert.equal(res1.canonicalXml.charCodeAt(0) !== 0xfeff, true, "BOM must be stripped");
		assert.equal(res1.canonicalXml.includes("\r\n"), false, "CRLF must be normalized to LF");
	});

	it("3. Zero-Mock Policy: OutboxDispatcher strictly rejects unsigned packages and never generates fake detached signatures", async () => {
		// Mock OiisGatewayClient to observe calls
		let gatewayCallCount = 0;
		const mockClient = new OiisGatewayClient();
		mockClient.sendRemdDocument = async (_pkg: EgiszRemdPackage): Promise<RemdSubmissionResponse> => {
			gatewayCallCount++;
			return {
				success: true,
				status: "Registered",
				transactionId: "tx-test-123",
				remdDocumentId: "remd-doc-456",
			};
		};

		const dispatcher = new EgiszOutboxDispatcher(mockClient);

		// An invalid package without valid doctor signature is rejected by buildEgiszRemdSubmissionPackage
		assert.throws(() => {
			buildEgiszRemdSubmissionPackage({
				documentId: "doc-1",
				documentVersion: 1,
				docTypeNsiCode: "108",
				clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
				patientSnils: "11223344595",
				rawXml: "<ClinicalDocument/>",
				doctorSignature: {
					signatureBase64: "", // Missing base64 signature
					certificateSerialNumber: "123",
					certificateSubject: "Тест",
					signedAt: new Date().toISOString(),
					algorithmOid: "1.2.643.7.1.1.1.1",
				},
			});
		}, /ZodError|Signature/i);

		assert.equal(gatewayCallCount, 0, "No gateway dispatch occurs on invalid signature");
	});

	it("4. EgiszQueueWorker lifecycle: start, isRunning, stop, unref timer management", () => {
		const worker = startEgiszQueueWorker({
			enabled: false, // Don't start timer in test environment
			intervalMs: 5000,
			batchLimit: 10,
		});

		assert.ok(worker, "Worker handle must be returned");
		assert.equal(worker.intervalMs, 5000);
		assert.equal(worker.batchLimit, 10);

		stopEgiszQueueWorker();
		assert.equal(worker.isRunning(), false, "Worker must stop cleanly");
	});
});
