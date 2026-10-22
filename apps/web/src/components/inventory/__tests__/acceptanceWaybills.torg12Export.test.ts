import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	createSampleDentalWaybill,
	exportWaybillToCsv,
	generateTorg12Html,
} from "../acceptanceWaybillsEngine.js";

describe("AcceptanceWaybills: ТОРГ-12 Form & CSV Export", () => {
	it("генерирует регламентную форму ТОРГ-12 без больничной бюрократии", () => {
		const waybill = createSampleDentalWaybill();
		const html = generateTorg12Html(waybill, { nameRu: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", inn: "7701987654" });

		assert.ok(html.includes("Унифицированная форма № ТОРГ-12"));
		assert.ok(html.includes("Госкомстата России"));
		assert.ok(html.includes(waybill.supplier.name));
		assert.ok(html.includes(waybill.supplier.inn));
		assert.ok(html.includes(waybill.waybillNumber));
		assert.ok(html.includes("Септанест") || html.includes("Filtek"));
		assert.ok(html.includes("FLTK-") || html.includes("SEPT-") || html.includes("PROT-"));

		assert.ok(!html.includes("начмед"));
		assert.ok(!html.includes("зам. главного врача"));
		assert.ok(!html.includes("наркотическ"));
	});

	it("экспортирует накладную в валидный CSV с UTF-8 BOM для Excel", () => {
		const waybill = createSampleDentalWaybill();
		const csv = exportWaybillToCsv(waybill);

		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes(";"));
		assert.ok(csv.includes("Наименование"));
		assert.ok(csv.includes("Серия_Партия"));
		assert.ok(csv.includes("Срок_годности"));
		assert.ok(csv.includes(waybill.waybillNumber) || csv.includes("FEFO_Статус"));
	});
});
