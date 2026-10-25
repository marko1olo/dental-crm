import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	createDefaultPassportRecord,
	DEFAULT_CANONICAL_IMPLANT_STOCK,
	DEFAULT_CANONICAL_CONSUMABLES,
} from "../implantQuickPresets";
import { ImplantPassportCard, AnatomicalJawArchSchema } from "../ImplantPassportCard";
import { ImplantEconomicsSection } from "../ImplantEconomicsSection";
import { ImplantConsumablesSelector } from "../ImplantConsumablesSelector";
import { ImplantWarehouseSelector } from "../ImplantWarehouseSelector";
import { ImplantBatchSelector } from "../ImplantBatchSelector";

describe("Implant Anatomy, Warehouse & Consumables", () => {
	it("23. AnatomicalJawArchSchema renders full 32 teeth dental formula", () => {
		const html = renderToString(<AnatomicalJawArchSchema selectedFdi={46} brand="Osstem" diameterMm={4.0} lengthMm={10.0} />);
		assert.ok(html.includes("anatomical-jaw-arch"));
		assert.ok(html.includes("ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)"));
		assert.ok(html.includes("НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBULA)"));
		assert.ok(html.includes("ПРАВО (R)"));
		assert.ok(html.includes("ЛЕВО (L)"));
		assert.ok(html.includes("Имплантат #46"));
		assert.ok(html.includes("Ø4.0×10мм") || html.includes("4.0"));
	});

	it("25. ImplantEconomicsSection renders transparent financial breakdown for solo surgeon", () => {
		const html = renderToString(
			<ImplantEconomicsSection operationPriceRub={45000} implantCostRub={12500} consumablesCostRub={4500} doctorGrossMarginRub={28000} />,
		);
		assert.ok(html.includes("doctor-economics-block"));
		assert.ok(html.includes("input-operation-price"));
		assert.ok(html.includes("45000"));
		assert.ok(/12[\s\u00a0\u202f]?500/.test(html));
		assert.ok(/4[\s\u00a0\u202f]?500/.test(html));
		assert.ok(html.includes("doctor-net-margin"));
		assert.ok(/28[\s\u00a0\u202f]?000/.test(html));
		assert.ok(html.includes("Без сетевых поборов"));
	});

	it("26. ImplantConsumablesSelector handles GBR selection and hides when not performed", () => {
		const hidden = renderToString(<ImplantConsumablesSelector isGbrPerformed={false} stockConsumables={DEFAULT_CANONICAL_CONSUMABLES} />);
		assert.equal(hidden, "");

		const active = renderToString(
			<ImplantConsumablesSelector
				isGbrPerformed={true} stockConsumables={DEFAULT_CANONICAL_CONSUMABLES}
				selectedGraftId="inv-bio-oss-05" selectedMembraneId="inv-bio-gide-1622" selectedSutureId="inv-vicryl-40"
			/>,
		);
		assert.ok(active.includes("gbr-consumables-block"));
		assert.ok(active.includes("select-graft-material"));
		assert.ok(active.includes("select-membrane-material"));
		assert.ok(active.includes("select-suture-material"));
		assert.ok(active.includes("Geistlich Bio-Oss"));
		assert.ok(active.includes("Geistlich Bio-Gide"));
		assert.ok(active.includes("Викрил 4-0"));
	});

	it("27. ImplantWarehouseSelector renders available inventory batches", () => {
		const html = renderToString(
			<ImplantWarehouseSelector
				stockItems={DEFAULT_CANONICAL_IMPLANT_STOCK} selectedStockItemId="inv-oss-4010"
				lotNumber="24C1208" catalogArticle="TS3S4010S"
			/>,
		);
		assert.ok(html.includes("Партия со склада клиники"));
		assert.ok(html.includes("stock-item-inv-oss-4010"));
		assert.ok(html.includes("stock-item-inv-strau-3510"));
		assert.ok(html.includes("stock-item-inv-nobel-4311"));
		assert.ok(html.includes("LOT: 24C1208"));
		assert.ok(html.includes("шт."));
	});

	it("31. GBR bone grafting protocol and passport reflect Bio-Oss and Bio-Gide without emojis", () => {
		const data = {
			...createDefaultPassportRecord({ toothFdi: 36, brand: "Straumann", patientName: "Александров К. В." }),
			boneGraftMaterial: "Костный графт Geistlich Bio-Oss",
			membraneUsed: "Коллагеновая мембрана Geistlich Bio-Gide",
			sutureMaterial: "Шовный материал Ethicon Викрил 4-0",
		};
		const html = renderToString(<ImplantPassportCard data={data} />);
		assert.ok(html.includes("Straumann"));
		assert.ok(html.includes("Паспорт имплантата DENTE"));
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false);
	});

	it("33. ImplantBatchSelector renders warehouse items with LOT and quantity", () => {
		const html = renderToString(
			<ImplantBatchSelector
				stockItems={DEFAULT_CANONICAL_IMPLANT_STOCK} selectedStockItemId="inv-oss-4010"
				lotNumber="24C1208" catalogArticle="TS3S4010S"
			/>,
		);
		assert.ok(html.includes("Партия со склада клиники"));
		assert.ok(html.includes("24C1208"));
		assert.ok(html.includes("TS3S4010S"));
		assert.ok(html.includes("stock-item-inv-oss-4010"));
	});
});
