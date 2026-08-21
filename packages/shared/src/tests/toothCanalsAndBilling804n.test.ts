import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	getAnatomicalRootCanalCount,
	getEndodonticOrder804nPair,
	getOrder804nEndoProcedureForTooth,
	ORDER_804N_ENDODONTIC_PACKAGES,
	ORDER_804N_INSTRUMENTATION,
	ORDER_804N_OBTURATIONS,
} from "../toothCanalsAndBilling804n.js";

describe("toothCanalsAndBilling804n — Root Canals & Minzdrav Order 804n Billing", () => {
	test("Derives accurate anatomical root canal counts for all FDI permanent and primary teeth", () => {
		// Upper Incisors & Canines (11, 12, 13, 21, 22, 23): 1 canal
		for (const tooth of [11, 12, 13, 21, 22, 23]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} должен иметь 1 корневой канал`);
		}

		// Upper 1st Premolars (14, 24): 2 canals (Buccal + Palatal)
		for (const tooth of [14, 24]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 2, `Зуб ${tooth} (1-й премоляр) должен иметь 2 корневых канала`);
		}

		// Upper 2nd Premolars (15, 25): 1 canal
		for (const tooth of [15, 25]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} (2-й премоляр) должен иметь 1 корневой канал`);
		}

		// Upper Molars (16, 17, 18, 26, 27, 28): 3 canals (MB, DB, P)
		for (const tooth of [16, 17, 18, 26, 27, 28]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 3, `Зуб ${tooth} (верхний моляр) должен иметь 3 корневых канала`);
		}

		// Lower Incisors & Canines (31, 32, 33, 41, 42, 43): 1 canal
		for (const tooth of [31, 32, 33, 41, 42, 43]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} должен иметь 1 корневой канал`);
		}

		// Lower Premolars (34, 35, 44, 45): 1 canal
		for (const tooth of [34, 35, 44, 45]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} (нижний премоляр) должен иметь 1 корневой канал`);
		}

		// Lower Molars (36, 37, 38, 46, 47, 48): 3 canals (MB, ML, D)
		for (const tooth of [36, 37, 38, 46, 47, 48]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 3, `Зуб ${tooth} (нижний моляр) должен иметь 3 корневых канала`);
		}

		// Primary Upper Molars (54, 55, 64, 65): 3 canals
		for (const tooth of [54, 55, 64, 65]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 3, `Молочный верхний моляр ${tooth} должен иметь 3 канала`);
		}

		// Primary Lower Molars (74, 75, 84, 85): 2 canals
		for (const tooth of [74, 75, 84, 85]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 2, `Молочный нижний моляр ${tooth} должен иметь 2 канала`);
		}

		// Primary Incisors & Canines (51..53, 61..63, 71..73, 81..83): 1 canal
		for (const tooth of [51, 52, 53, 61, 62, 63, 71, 72, 73, 81, 82, 83]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Молочный передний зуб ${tooth} должен иметь 1 канал`);
		}
	});

	test("Order 804n codes strictly correspond to 1..4 canal tiers", () => {
		// Instrumentation (A16.07.030)
		assert.equal(ORDER_804N_INSTRUMENTATION[1].code, "A16.07.030.001");
		assert.equal(ORDER_804N_INSTRUMENTATION[2].code, "A16.07.030.002");
		assert.equal(ORDER_804N_INSTRUMENTATION[3].code, "A16.07.030.003");
		assert.equal(ORDER_804N_INSTRUMENTATION[4].code, "A16.07.030.004");

		// Obturation (A16.07.008)
		assert.equal(ORDER_804N_OBTURATIONS[1].code, "A16.07.008.001");
		assert.equal(ORDER_804N_OBTURATIONS[2].code, "A16.07.008.002");
		assert.equal(ORDER_804N_OBTURATIONS[3].code, "A16.07.008.003");
		assert.equal(ORDER_804N_OBTURATIONS[4].code, "A16.07.008.004");

		// Package
		assert.equal(ORDER_804N_ENDODONTIC_PACKAGES[1].code, "A16.07.008.001");
		assert.equal(ORDER_804N_ENDODONTIC_PACKAGES[2].code, "A16.07.008.002");
		assert.equal(ORDER_804N_ENDODONTIC_PACKAGES[3].code, "A16.07.008.003");
		assert.equal(ORDER_804N_ENDODONTIC_PACKAGES[4].code, "A16.07.008.004");
	});

	test("getEndodonticOrder804nPair computes combined pricing for multi-canal teeth", () => {
		const pair1 = getEndodonticOrder804nPair(1);
		assert.equal(pair1.instrumentation.code, "A16.07.030.001");
		assert.equal(pair1.obturation.code, "A16.07.008.001");
		assert.equal(pair1.combinedPrice, 3500 + 4000);

		const pair2 = getEndodonticOrder804nPair(2);
		assert.equal(pair2.instrumentation.code, "A16.07.030.002");
		assert.equal(pair2.obturation.code, "A16.07.008.002");
		assert.equal(pair2.combinedPrice, 5800 + 6700);

		const pair3 = getEndodonticOrder804nPair(3);
		assert.equal(pair3.instrumentation.code, "A16.07.030.003");
		assert.equal(pair3.obturation.code, "A16.07.008.003");
		assert.equal(pair3.combinedPrice, 8200 + 9500);

		const pair4 = getEndodonticOrder804nPair(4);
		assert.equal(pair4.instrumentation.code, "A16.07.030.004");
		assert.equal(pair4.obturation.code, "A16.07.008.004");
		assert.equal(pair4.combinedPrice, 10500 + 12000);
	});

	test("getOrder804nEndoProcedureForTooth returns correct procedure based on tooth morphology", () => {
		// Tooth 11 (Incisor): 1 canal
		const p11 = getOrder804nEndoProcedureForTooth(11);
		assert.equal(p11.canalCount, 1);
		assert.equal(p11.code, "A16.07.008.001");

		// Tooth 14 (Premolar): 2 canals
		const p14 = getOrder804nEndoProcedureForTooth(14);
		assert.equal(p14.canalCount, 2);
		assert.equal(p14.code, "A16.07.008.002");

		// Tooth 16 (Molar): 3 canals
		const p16 = getOrder804nEndoProcedureForTooth(16);
		assert.equal(p16.canalCount, 3);
		assert.equal(p16.code, "A16.07.008.003");

		// Tooth 46 (Lower Molar): 3 canals
		const p46 = getOrder804nEndoProcedureForTooth(46);
		assert.equal(p46.canalCount, 3);
		assert.equal(p46.code, "A16.07.008.003");

		// Tooth 46 with explicit 4 canals override (e.g. radix entomolaris / 2 distal canals)
		const p46_4c = getOrder804nEndoProcedureForTooth(46, 4);
		assert.equal(p46_4c.canalCount, 4);
		assert.equal(p46_4c.code, "A16.07.008.004");
	});
});
