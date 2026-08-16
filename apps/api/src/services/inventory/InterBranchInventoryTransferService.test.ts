import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	InterBranchInventoryTransferService,
	type WaybillInput,
} from "./InterBranchInventoryTransferService.js";

describe("InterBranchInventoryTransferService — Feature #130 TORG-13 Multi-Branch Logistics", () => {
	const sampleInput: WaybillInput = {
		organizationId: "org-1",
		sourceBranchId: "branch-central",
		destinationBranchId: "branch-north",
		operatorId: "storekeeper-101",
		items: [
			{
				itemId: "item-septanest",
				itemName: "Септанест 1:100 000 (уп. 50 карпул)",
				batchNumber: "LOT-2026-SEP",
				quantity: 10,
				unitPriceRub: 4500,
			},
			{
				itemId: "item-filtek",
				itemName: "Filtek Ultimate A2 (шприц 4г)",
				batchNumber: "LOT-2026-FLT",
				quantity: 5,
				unitPriceRub: 3200,
			},
		],
	};

	test("1. Creates draft waybill with TORG-13 number and total value calculation", () => {
		const waybill = InterBranchInventoryTransferService.createDraftWaybill(sampleInput, 142);
		assert.equal(waybill.waybillNumber, "TORG13-2026-00142");
		assert.equal(waybill.status, "draft");
		assert.equal(waybill.items.length, 2);
		assert.equal(waybill.totalValueRub, 10 * 4500 + 5 * 3200); // 45000 + 16000 = 61000
		assert.equal(waybill.hasDiscrepancies, false);
	});

	test("2. Rejects draft creation with identical source and destination branch", () => {
		const invalidInput = {
			...sampleInput,
			destinationBranchId: "branch-central",
		};
		assert.throws(() => {
			InterBranchInventoryTransferService.createDraftWaybill(invalidInput, 143);
		}, /не могут совпадать/);
	});

	test("3. Dispatches waybill and transitions to in_transit", () => {
		const draft = InterBranchInventoryTransferService.createDraftWaybill(sampleInput, 144);
		const dispatched = InterBranchInventoryTransferService.dispatchWaybill(draft);
		assert.equal(dispatched.status, "in_transit");
		assert.ok(dispatched.sentAt !== null);
		assert.equal(dispatched.items[0]!.sentQuantity, 10);
		assert.equal(dispatched.items[1]!.sentQuantity, 5);
	});

	test("4. Complete acceptance without discrepancies", () => {
		const draft = InterBranchInventoryTransferService.createDraftWaybill(sampleInput, 145);
		const dispatched = InterBranchInventoryTransferService.dispatchWaybill(draft);

		const receipt = [
			{ itemId: "item-septanest", receivedQuantity: 10 },
			{ itemId: "item-filtek", receivedQuantity: 5 },
		];

		const received = InterBranchInventoryTransferService.receiveWaybill(dispatched, receipt);
		assert.equal(received.status, "completed");
		assert.equal(received.hasDiscrepancies, false);
		assert.ok(received.receivedAt !== null);
	});

	test("5. Partial acceptance with damaged/missing items sets partially_received", () => {
		const draft = InterBranchInventoryTransferService.createDraftWaybill(sampleInput, 146);
		const dispatched = InterBranchInventoryTransferService.dispatchWaybill(draft);

		const receipt = [
			{ itemId: "item-septanest", receivedQuantity: 8, damagedQuantity: 2 }, // 2 damaged
			{ itemId: "item-filtek", receivedQuantity: 4 }, // 1 missing
		];

		const received = InterBranchInventoryTransferService.receiveWaybill(dispatched, receipt);
		assert.equal(received.status, "partially_received");
		assert.equal(received.hasDiscrepancies, true);
		assert.equal(received.items[0]!.damagedQuantity, 2);
		assert.equal(received.items[1]!.receivedQuantity, 4);
	});
});
