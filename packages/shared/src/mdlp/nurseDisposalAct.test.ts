import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	amountToRussianWords,
	carpulesQuantityToRussianWords,
	createCarpuleQueueItem,
	formatSeniorNurseDisposalActData,
	generateSeniorNurseDisposalActHtml,
} from "./index.js";

describe("Senior Nurse Medication Write-Off Act Generator & Number Speller", () => {
	test("amountToRussianWords correctly converts numeric sums to words in Russian", () => {
		assert.strictEqual(
			amountToRussianWords(1450.5),
			"Одна тысяча четыреста пятьдесят рублей 50 копеек",
		);

		assert.strictEqual(
			amountToRussianWords(420),
			"Четыреста двадцать рублей 00 копеек",
		);

		assert.strictEqual(
			amountToRussianWords(21.03),
			"Двадцать один рубль 03 копейки",
		);

		assert.strictEqual(
			amountToRussianWords(0),
			"Ноль рублей 00 копеек",
		);
	});

	test("carpulesQuantityToRussianWords correctly converts item counts to words", () => {
		assert.strictEqual(carpulesQuantityToRussianWords(1, "карпула"), "1 (Одна) карпула");
		assert.strictEqual(carpulesQuantityToRussianWords(2, "карпула"), "2 (Две) карпулы");
		assert.strictEqual(carpulesQuantityToRussianWords(5, "карпула"), "5 (Пять) карпул");
		assert.strictEqual(carpulesQuantityToRussianWords(12, "карпула"), "12 (Двенадцать) карпул");
	});

	test("formatSeniorNurseDisposalActData prepares structured data for printable medical act", () => {
		const item1 = createCarpuleQueueItem(
			"010366479800001621SN00000000001\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1",
			{ costRub: 450, patientName: "Иванов Иван" },
		);
		const item2 = createCarpuleQueueItem(
			"010340093000003821SN00000000002\x1d17270228\x1d10LOTSCAN\x1d91ABCD\x1d92SIG2",
			{ costRub: 380, patientName: "Петрова Анна" },
		);

		const actData = formatSeniorNurseDisposalActData({
			actNumber: "СПИС-2026/08-01",
			actDate: "2026-08-25",
			seniorNurseName: "Иванова Е.В.",
			chiefDoctorName: "Петров А.С.",
			dentistName: "Кузнецов М.С.",
			items: [item1, item2],
		});

		assert.strictEqual(actData.actNumber, "СПИС-2026/08-01");
		assert.strictEqual(actData.totalQuantityCarpules, 2);
		assert.strictEqual(actData.totalCostRub, 830.0);
		assert(actData.totalCostInWordsRu.includes("Восемьсот тридцать рублей"));
		assert.strictEqual(actData.commission.length, 3);
		assert.strictEqual(actData.commission[0]?.fullName, "Иванова Е.В.");
		assert.strictEqual(actData.items.length, 2);
		assert.strictEqual(actData.items[0]?.tradeName, "Ультракаин® Д-С форте");
	});

	test("generateSeniorNurseDisposalActHtml outputs clean HTML with required sections and print styles", () => {
		const item = createCarpuleQueueItem(
			"010366479800001621SN00000000001\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1",
			{ costRub: 450 },
		);
		const actData = formatSeniorNurseDisposalActData({
			actNumber: "СПИС-2026/08-99",
			actDate: "2026-08-25",
			items: [item],
		});

		const html = generateSeniorNurseDisposalActHtml(actData);

		assert(html.includes("<!DOCTYPE html>"));
		assert(html.includes("АКТ СПИСАНИЯ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ И АНЕСТЕТИКОВ"));
		assert(html.includes("СПИС-2026/08-99"));
		assert(html.includes("УТВЕРЖДАЮ"));
		assert(html.includes("Ультракаин® Д-С форте"));
		assert(html.includes("03664798000016SN00000000001"));
		assert(html.includes("Члены комиссии:"));
		assert(html.includes("@page {"));
	});

	test("formatSeniorNurseDisposalActData supports single-nurse write-off without 3-person commission", () => {
		const item = createCarpuleQueueItem(
			"010366479800001621SN00000000001\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1",
			{ costRub: 450 },
		);
		const actData = formatSeniorNurseDisposalActData({
			actNumber: "СПИС-2026/08-SINGLE",
			actDate: "2026-08-25",
			seniorNurseName: "Сидорова С.С.",
			isSingleSigner: true,
			items: [item],
		});

		assert.strictEqual(actData.commission.length, 1);
		assert.strictEqual(actData.commission[0]?.fullName, "Сидорова С.С.");
		assert.strictEqual(actData.commission[0]?.roleTitleRu, "МОЛ / Дежурная медсестра");

		const html = generateSeniorNurseDisposalActHtml(actData);
		assert(html.includes("Списание провел (МОЛ):"));
		assert(!html.includes("Члены комиссии:"));
	});
});
