import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type WarehouseDiscrepancyAct,
	type WarehouseTransferDocument,
	exportTransferJournalToCsv,
	generateDiscrepancyAct,
	generateTorg13Html,
	generateTorg2Html,
} from "../warehouseTransferEngine.js";
import { WarehouseTransferModal } from "../WarehouseTransferModal.js";

describe("TORG-13 & TORG-2 Document Generation", () => {
	const sampleDoc: WarehouseTransferDocument = {
		id: "doc-torg-01",
		documentNumber: "ТОРГ-13-2026/08-044",
		documentDate: "2026-08-22",
		sourceBranchId: "central_hub",
		targetBranchId: "branch_center",
		status: "discrepancy",
		dispatchedByFullName: "Васильев О.П.",
		dispatchedByPosition: "Заведующий складом",
		receivedByFullName: "Смирнова А.В.",
		receivedByPosition: "Главная медсестра",
		items: [
			{
				itemId: "mat_ultracain_forte",
				sku: "AN-ULTRA-01",
				nameRu: "Ультракаин Д-С Форте",
				unitRu: "упак",
				okeiCode: "778",
				batchNumber: "LOT-2026A44",
				expiryDate: "2027-12-31",
				requestedQuantity: 10,
				dispatchedQuantity: 10,
				receivedQuantity: 10,
				unitCostKopecks: 650000,
				discrepancyType: "none",
			},
			{
				itemId: "mat_impl_osstem_40_10",
				sku: "IMP-OSST-4010",
				nameRu: "Имплантат Osstem TS III SA Ø4.0 x 10 мм",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-OS-5541",
				expiryDate: "2029-06-30",
				requestedQuantity: 5,
				dispatchedQuantity: 5,
				receivedQuantity: 4,
				unitCostKopecks: 1250000,
				discrepancyType: "shortage",
				discrepancyQuantity: 1,
			},
		],
	};

	it("generateTorg13Html генерирует официальную форму ТОРГ-13 (ОКУД 0330213)", () => {
		const html = generateTorg13Html(sampleDoc);
		assert.ok(html.includes("0330213"), "Форма по ОКУД 0330213 обязана присутствовать");
		assert.ok(html.includes("ТОРГ-13"));
		assert.ok(html.includes("НАКЛАДНАЯ НА ВНУТРЕННЕЕ ПЕРЕМЕЩЕНИЕ"));
		assert.ok(html.includes("Ультракаин Д-С Форте"));
		assert.ok(html.includes("127500.00"));
		assert.ok(html.includes("Васильев О.П."));
		assert.ok(html.includes("Смирнова А.В."));
	});

	it("generateDiscrepancyAct и generateTorg2Html формируют Акт расхождений ТОРГ-2", () => {
		const act: WarehouseDiscrepancyAct = generateDiscrepancyAct(sampleDoc);
		assert.equal(act.totalDiscrepantItemsCount, 1);
		assert.equal(act.totalFinancialDamageRubles, 12500);
		assert.ok(act.commissionMembers.length >= 2);

		const html = generateTorg2Html(act);
		assert.ok(html.includes("АКТ ОБ УСТАНОВЛЕННОМ РАСХОЖДЕНИИ"));
		assert.ok(html.includes("12500.00"));
		assert.ok(html.includes("Osstem TS III"));
		assert.ok(html.includes("Недостача"));
	});

	it("exportTransferJournalToCsv формирует CSV-реестр перемещений с UTF-8 BOM", () => {
		const csv = exportTransferJournalToCsv([sampleDoc]);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("ТОРГ-13-2026/08-044"));
		assert.ok(csv.includes("127500.00"));
		assert.ok(csv.includes("12500.00"));
	});

	it("Рендерит модальное окно перемещений в статический HTML", () => {
		const html = renderToStaticMarkup(
			createElement(WarehouseTransferModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("Межфилиальное перемещение материалов"));
		assert.ok(html.includes("Перемещение материалов"));
		assert.ok(html.includes("Склад-отправитель"));
		assert.ok(html.includes("Склад-получатель"));
		assert.ok(html.includes("Накладная на перемещение"));
	});
});
