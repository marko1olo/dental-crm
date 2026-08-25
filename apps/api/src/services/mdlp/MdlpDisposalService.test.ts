import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mdlpDisposalService, mdlpQueueService } from "./index.js";

describe("MdlpDisposalService & MdlpQueueService Tests", () => {
	const testOrgId = "org_test_mdlp_10560";

	test("mdlpQueueService manages queue, detects duplicates and computes stats", () => {
		mdlpQueueService.clearQueue(testOrgId);

		const raw1 =
			"0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const res1 = mdlpQueueService.addToQueue(testOrgId, {
			rawBarcode: raw1,
			costRub: 450,
			patientName: "Алексеев А.А.",
		});

		assert.strictEqual(res1.success, true);
		assert.strictEqual(res1.item.gtin, "03664798000016");
		assert.strictEqual(res1.stats.totalCount, 1);
		assert.strictEqual(res1.stats.totalCostRub, 450);

		// Duplicate addition should produce warning
		const dupRes = mdlpQueueService.addToQueue(testOrgId, {
			rawBarcode: raw1,
			costRub: 450,
		});
		assert(dupRes.warnings.some((w) => w.includes("уже присутствует")));

		const queue = mdlpQueueService.getQueue(testOrgId);
		assert.strictEqual(queue.items.length, 1);

		// Remove from queue
		const removeRes = mdlpQueueService.removeFromQueue(testOrgId, res1.item.id);
		assert.strictEqual(removeRes.removed, true);
		assert.strictEqual(removeRes.stats.totalCount, 0);
	});

	test("mdlpDisposalService scans and recognizes anesthetics", async () => {
		const raw =
			"010340093000001421SEPT00000001\x1d17280531\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const scanResult = await mdlpDisposalService.scanBarcode(testOrgId, raw, true);

		assert.strictEqual(scanResult.parsed.isValid, true);
		assert.strictEqual(scanResult.parsed.recognizedDrug?.id, "septanest-1-100000");
		assert.strictEqual(scanResult.isRegistered, true);
		assert.strictEqual(scanResult.status, "in_stock");
	});

	test("mdlpDisposalService writes off medication under Schema 10560", async () => {
		const raw =
			"010404671900001221UBIS00000001\x1d17280531\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const disposeRes = await mdlpDisposalService.disposeSingle(testOrgId, {
			rawBarcode: raw,
			costRub: 420,
			docNum: "DISP-001",
			docDate: "2026-08-25",
			reason: "Анестезия при лечении пульпита",
		});

		assert.strictEqual(disposeRes.success, true);
		assert.strictEqual(disposeRes.disposedCount, 1);
		assert.strictEqual(disposeRes.schema10560Document.actionId, 10560);
		assert(disposeRes.schema10560Document.xmlContent.includes('action_id="10560"'));
		assert(disposeRes.schema10560Document.xmlContent.includes("<cost>420.00</cost>"));
	});

	test("mdlpDisposalService generates Senior Nurse Disposal Act", () => {
		mdlpQueueService.clearQueue(testOrgId);
		const raw =
			"0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		mdlpQueueService.addToQueue(testOrgId, {
			rawBarcode: raw,
			costRub: 450,
			patientName: "Кузнецов П.П.",
		});

		const actRes = mdlpDisposalService.generateDisposalAct(testOrgId, {
			actNumber: "СПИС-TEST-01",
			useQueue: true,
			seniorNurseName: "Сидорова С.С.",
		});

		assert.strictEqual(actRes.actData.actNumber, "СПИС-TEST-01");
		assert.strictEqual(actRes.actData.totalQuantityCarpules, 1);
		assert.strictEqual(actRes.actData.totalCostRub, 450);
		assert(actRes.html.includes("СПИС-TEST-01"));
		assert(actRes.html.includes("Сидорова С.С."));
	});
});
