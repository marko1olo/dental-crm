/**
 * inventoryFifoTracking.test.ts — Unit tests for Transparent Consumable FIFO & Strict Lot/MDLP Tracking.
 *
 * MANDATE (Wave 11):
 * 1. General consumables (composites: Filtek/Gradia/Estelite, adhesives: Single Bond Universal,
 *    etching gels, cotton rolls, gloves, masks, saliva ejectors, polishing discs, paper points,
 *    gutta-percha) are deducted via direct transparent FIFO WITHOUT requiring manual syringe scanning.
 * 2. Strict lot tracking and Честный ЗНАК / MDLP serialized tracking remain MANDATORY ONLY for:
 *    - Anesthesia (carpules: Articaine / Ultracain / Septanest / Scandonest)
 *    - Implants (Titanium implants, healing abutments, cover screws)
 *    - Bone graft & barrier membrane materials (Geistlich Bio-Oss, Bio-Gide).
 * 3. Multi-batch FIFO deduction sorts by chronological receipt/expiry and balances fractional/exact costs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	deductBatchStockFifo,
	deductBatchStockWithSoftOverdraft,
	type GenericStockBatch,
	isChestnyZnakMdlpRequired,
	isStrictLotTrackingRequired,
} from "../inventory/consumables.js";
import { parseKopecks } from "../money.js";

describe("Transparent Consumable FIFO & Strict Lot/MDLP Tracking Policy", () => {
	it("1. isStrictLotTrackingRequired returns false for all standard dental consumables (Direct FIFO)", () => {
		// Composites
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_filtek_ultimate",
				nameRu: "Нанокомпозит Filtek Ultimate",
				category: "composite",
			}),
			false,
			"Filtek composite must NOT require strict lot tracking",
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_gradia_direct",
				nameRu: "Композит Gradia Direct",
				category: "composite",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_estelite_asteria",
				nameRu: "Нанокомпозит Estelite Asteria",
				category: "composite",
			}),
			false,
		);

		// Adhesives & Etching Gel
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_single_bond_universal",
				nameRu: "Адгезив Single Bond Universal",
				category: "adhesive",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_phosphoric_acid_37",
				nameRu: "Протравочный гель 37%",
				category: "adhesive",
			}),
			false,
		);

		// PPE & SanPin Consumables
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_cotton_rolls",
				nameRu: "Ватные валики №2",
				category: "ppe",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_nitrile_gloves",
				nameRu: "Перчатки нитриловые",
				category: "ppe",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_surgical_mask",
				nameRu: "Маска медицинская 3-слойная",
				category: "ppe",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_saliva_ejector",
				nameRu: "Слюноотсос одноразовый",
				category: "ppe",
			}),
			false,
		);

		// Endodontics & Hygiene consumables
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_gutta_percha_points",
				nameRu: "Гуттаперчевые штифты",
				category: "endo",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_sealer_ah_plus",
				nameRu: "Силер AH Plus",
				category: "endo",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_hypochlorite_na_3",
				nameRu: "Раствор натрия гипохлорита 3%",
				category: "endo",
			}),
			false,
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_air_flow_powder",
				nameRu: "Порошок Air-Flow Clinpro",
				category: "hygiene",
			}),
			false,
		);
	});

	it("2. isStrictLotTrackingRequired returns true ONLY for Anesthesia, Implants, and Bone Grafts", () => {
		// Anesthesia carpules
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_articaine_ultracain",
				nameRu: "Ультракаин Д-С 1:100000",
				category: "anesthesia",
			}),
			true,
			"Anesthesia carpules MUST require strict lot tracking",
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_articaine_1_200000",
				nameRu: "Ультракаин Д-С 1:200000",
				category: "anesthesia",
			}),
			true,
		);

		// Implants & components
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_implant_osstem_ts3",
				nameRu: "Дентальный имплантат Osstem TS III",
				category: "implant",
			}),
			true,
			"Dental implants MUST require strict lot tracking",
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_healing_abutment",
				nameRu: "Формирователь десны титановый",
				category: "implant",
			}),
			true,
		);

		// Bone graft & barrier membranes
		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_bio_oss_graft",
				nameRu: "Костнозамещающий графт Geistlich Bio-Oss",
				category: "surgery",
			}),
			true,
			"Bio-Oss bone graft MUST require strict lot tracking",
		);

		assert.equal(
			isStrictLotTrackingRequired({
				id: "mat_bio_gide_membrane",
				nameRu: "Барьерная мембрана Geistlich Bio-Gide",
				category: "surgery",
			}),
			true,
			"Bio-Gide membrane MUST require strict lot tracking",
		);
	});

	it("3. isChestnyZnakMdlpRequired flags serialized tracking strictly for Anesthesia, Implants, and Bone Grafts", () => {
		// Implants (UDI serial)
		assert.equal(
			isChestnyZnakMdlpRequired({
				id: "mat_implant_osstem_ts3",
				nameRu: "Имплантат Osstem",
				category: "implant",
			}),
			true,
		);

		// Bone graft (Bio-Oss)
		assert.equal(
			isChestnyZnakMdlpRequired({
				id: "mat_bio_oss_graft",
				nameRu: "Графт Geistlich Bio-Oss",
				category: "surgery",
			}),
			true,
		);

		// Anesthesia carpule (MDLP DataMatrix)
		assert.equal(
			isChestnyZnakMdlpRequired({
				id: "mat_articaine_ultracain",
				nameRu: "Анестетик Ультракаин",
				category: "anesthesia",
			}),
			true,
		);

		// Regular needles and gels do NOT require MDLP
		assert.equal(
			isChestnyZnakMdlpRequired({
				id: "mat_dental_needle_30g",
				nameRu: "Игла карпульная 30G",
				category: "anesthesia",
			}),
			false,
		);

		// Regular composites do NOT require MDLP
		assert.equal(
			isChestnyZnakMdlpRequired({
				id: "mat_filtek_ultimate",
				nameRu: "Filtek Ultimate",
				category: "composite",
			}),
			false,
		);
	});

	it("4. deductBatchStockFifo executes transparent chronological FIFO across batches", () => {
		const batches: GenericStockBatch[] = [
			{
				batchId: "batch_3_latest",
				quantityAvailable: 10,
				receiptDate: "2026-08-01",
				expirationDate: "2028-12-31",
				unitCostKopecks: 140000,
				lotNumber: "LOT-2026-08",
			},
			{
				batchId: "batch_1_earliest",
				quantityAvailable: 2,
				receiptDate: "2026-01-15",
				expirationDate: "2027-06-30",
				unitCostKopecks: 130000,
				lotNumber: "LOT-2026-01",
			},
			{
				batchId: "batch_2_middle",
				quantityAvailable: 5,
				receiptDate: "2026-04-10",
				expirationDate: "2027-12-31",
				unitCostKopecks: 135000,
				lotNumber: "LOT-2026-04",
			},
		];

		// We need to deduct 4.5 units of composite across batches:
		// Batch 1: 2 units @ 130,000 kop = 260,000 kop
		// Batch 2: 2.5 units @ 135,000 kop = 337,500 kop
		// Total: 4.5 units, cost = 597,500 kop (5,975.00 ₽)
		const result = deductBatchStockFifo(batches, 4.5);

		assert.equal(result.fullyCovered, true);
		assert.equal(result.totalDeductedQuantity, 4.5);
		assert.equal(result.remainingQuantityNeeded, 0);
		assert.equal(result.deductions.length, 2);

		assert.equal(result.deductions[0]?.batch.batchId, "batch_1_earliest");
		assert.equal(result.deductions[0]?.deductedQuantity, 2);
		assert.equal(result.deductions[0]?.costKopecks, 260000);

		assert.equal(result.deductions[1]?.batch.batchId, "batch_2_middle");
		assert.equal(result.deductions[1]?.deductedQuantity, 2.5);
		assert.equal(result.deductions[1]?.costKopecks, 337500);

		assert.equal(result.totalCostKopecks, 597500);
	});

	it("5. deductBatchStockFifo handles stock shortage gracefully", () => {
		const batches: GenericStockBatch[] = [
			{
				batchId: "batch_single",
				quantityAvailable: 3,
				receiptDate: "2026-05-01",
				unitCostKopecks: 100000,
			},
		];

		// Request 5 units when only 3 are available
		const result = deductBatchStockFifo(batches, 5);

		assert.equal(result.fullyCovered, false);
		assert.equal(result.totalDeductedQuantity, 3);
		assert.equal(result.remainingQuantityNeeded, 2);
		assert.equal(result.totalCostKopecks, 300000);
	});

	it("6. deductBatchStockWithSoftOverdraft covers stock cleanly when quantity is sufficient", () => {
		const batches: GenericStockBatch[] = [
			{
				batchId: "batch_sufficient",
				quantityAvailable: 10,
				receiptDate: "2026-06-01",
				unitCostKopecks: 50000,
			},
		];

		const result = deductBatchStockWithSoftOverdraft(batches, 4);
		assert.equal(result.isOverdraft, false);
		assert.equal(result.overdraftQuantity, 0);
		assert.equal(result.fullyCovered, true);
		assert.equal(result.totalDeductedQuantity, 4);
		assert.equal(result.remainingQuantityNeeded, 0);
		assert.equal(result.totalCostKopecks, 200000);
		assert.equal(result.warning, undefined);
	});

	it("7. deductBatchStockWithSoftOverdraft allows soft overdraft without throwing or blocking operations (Mandates 8e, 8k, 8n)", () => {
		const batches: GenericStockBatch[] = [
			{
				batchId: "batch_partial",
				quantityAvailable: 2,
				receiptDate: "2026-05-01",
				unitCostKopecks: 60000,
			},
		];

		// Require 5 units when only 2 are in stock: 3 units deficit
		const result = deductBatchStockWithSoftOverdraft(batches, 5, {
			itemId: "item_composite_a2",
			itemName: "Композит Filtek Ultimate A2",
			defaultUnitCostKopecks: 60000,
		});

		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftQuantity, 3);
		assert.equal(result.fullyCovered, true);
		assert.equal(result.totalDeductedQuantity, 5);
		assert.equal(result.remainingQuantityNeeded, 0);
		assert.equal(result.deductions.length, 2);

		// First deduction from physical batch
		assert.equal(result.deductions[0]?.batch.batchId, "batch_partial");
		assert.equal(result.deductions[0]?.deductedQuantity, 2);

		// Second deduction from overdraft virtual batch
		assert.equal(result.deductions[1]?.isOverdraftBatch, true);
		assert.equal(result.deductions[1]?.deductedQuantity, 3);
		assert.equal(result.deductions[1]?.batch.quantityAvailable, -3);

		// Total cost: 2*60000 + 3*60000 = 300,000 kop
		assert.equal(result.totalCostKopecks, 300000);

		// Soft warning emitted
		assert.ok(result.warning);
		assert.equal(result.warning?.type, "out_of_stock");
		assert.ok(result.warning?.message.includes("Мягкий овердрафт"));
	});
});
