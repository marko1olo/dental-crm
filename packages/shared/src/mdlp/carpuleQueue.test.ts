import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	buildDisposalParamsFromQueue,
	calculateQueueStats,
	createCarpuleQueueItem,
	groupQueueByBatch,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "./index.js";

describe("MDLP Carpule Queue Engine & Batch Control", () => {
	const fixedRef = new Date("2026-08-25T12:00:00Z");

	test("createCarpuleQueueItem creates item with parsed barcode and FEFO dates", () => {
		const raw =
			"0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92qwe+rtyu1234567890abcdefghijklmnopqrstuvwxyz12";
		const item = createCarpuleQueueItem(raw, {
			costRub: 450,
			patientName: "Иванов И.И.",
			referenceDate: fixedRef,
		});

		assert.strictEqual(item.gtin, "03664798000016");
		assert.strictEqual(item.serialNumber, "1A2B3C4D5E6F7");
		assert.strictEqual(item.sgtin, "036647980000161A2B3C4D5E6F7");
		assert.strictEqual(item.series, "LOT2026");
		assert.strictEqual(item.expirationDate, "2028-05-31");
		assert.strictEqual(item.isExpired, false);
		assert.strictEqual(item.costRub, 450);
		assert.strictEqual(item.patientName, "Иванов И.И.");
		assert.strictEqual(item.drugInfo?.id, "ultracain-ds-forte");
	});

	test("sortQueueByFefo sorts earliest expiring items first", () => {
		const item1 = createCarpuleQueueItem(
			"010366479800001621SN00000000001\x1d17281231\x1d91ABCD\x1d92SIG1",
			{ referenceDate: fixedRef },
		); // 2028-12-31
		const item2 = createCarpuleQueueItem(
			"010366479800001621SN00000000002\x1d17270331\x1d91ABCD\x1d92SIG2",
			{ referenceDate: fixedRef },
		); // 2027-03-31
		const item3 = createCarpuleQueueItem(
			"010366479800001621SN00000000003\x1d17260930\x1d91ABCD\x1d92SIG3",
			{ referenceDate: fixedRef },
		); // 2026-09-30

		const sorted = sortQueueByFefo([item1, item2, item3]);

		assert.strictEqual(sorted[0]?.expirationDate, "2026-09-30");
		assert.strictEqual(sorted[1]?.expirationDate, "2027-03-31");
		assert.strictEqual(sorted[2]?.expirationDate, "2028-12-31");
	});

	test("groupQueueByBatch groups carpules by drug and series", () => {
		const item1 = createCarpuleQueueItem(
			"010366479800001621SN1\x1d10LOT_A\x1d91ABCD\x1d92SIG1",
		);
		const item2 = createCarpuleQueueItem(
			"010366479800001621SN2\x1d10LOT_A\x1d91ABCD\x1d92SIG2",
		);
		const item3 = createCarpuleQueueItem(
			"010340093000003821SN3\x1d10LOT_B\x1d91ABCD\x1d92SIG3",
		);

		const batches = groupQueueByBatch([item1, item2, item3]);

		assert.strictEqual(batches.length, 2);
		const batchA = batches.find((b) => b.series === "LOT_A");
		assert.strictEqual(batchA?.count, 2);
		assert.strictEqual(batchA?.drugId, "ultracain-ds-forte");
	});

	test("calculateQueueStats calculates counts, cost, and alerts accurately", () => {
		const validItem = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17280531\x1d91ABCD\x1d92SIG1",
			{ costRub: 450, referenceDate: fixedRef },
		);
		const expiringItem = createCarpuleQueueItem(
			"010366479800001621SN2\x1d17260930\x1d91ABCD\x1d92SIG2",
			{ costRub: 450, referenceDate: fixedRef },
		);
		const expiredItem = createCarpuleQueueItem(
			"010366479800001621SN3\x1d17250101\x1d91ABCD\x1d92SIG3",
			{ costRub: 450, referenceDate: fixedRef },
		);

		const stats = calculateQueueStats([validItem, expiringItem, expiredItem]);

		assert.strictEqual(stats.totalCount, 3);
		assert.strictEqual(stats.totalCostRub, 1350);
		assert.strictEqual(stats.expiredCount, 1);
		assert.strictEqual(stats.expiringSoonCount, 1);
		assert.strictEqual(stats.validCount, 2);
	});

	test("validateQueueForDisposal detects duplicate SGTINs and expired items", () => {
		const item = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17280531\x1d91ABCD\x1d92SIG1",
		);
		const duplicate = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17280531\x1d91ABCD\x1d92SIG1",
		);

		const res = validateQueueForDisposal([item, duplicate]);
		assert.strictEqual(res.isValid, false);
		assert(res.errors.some((e) => e.includes("дубликат SGTIN")));
	});

	test("buildDisposalParamsFromQueue builds complete Schema 10560 parameters", () => {
		const item = createCarpuleQueueItem(
			"010366479800001621SN12345678901\x1d17280531\x1d10LOT1\x1d91ABCD\x1d92SIG1",
			{ costRub: 450 },
		);
		const params = buildDisposalParamsFromQueue({
			subjectId: "ORG-1",
			docNum: "DOC-100",
			docDate: "2026-08-25",
			items: [item],
		});

		assert.strictEqual(params.subjectId, "ORG-1");
		assert.strictEqual(params.docNum, "DOC-100");
		assert.strictEqual(params.items.length, 1);
		assert.strictEqual(params.items[0]?.sgtin, item.sgtin);
		assert.strictEqual(params.items[0]?.costRub, 450);
	});
});
