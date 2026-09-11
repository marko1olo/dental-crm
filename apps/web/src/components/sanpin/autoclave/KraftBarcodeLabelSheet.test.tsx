import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KraftBarcodeLabelSheet } from "./KraftBarcodeLabelSheet";
import type { SterilePackRecord } from "./autoclaveEngine";

const mockPacks: SterilePackRecord[] = [
	{
		barcode: "SANPIN-20260911-001",
		packId: "pack-001",
		autoclaveId: "MELAG-VACUKLAV-23B",
		cycleNumber: 42,
		itemCategoryRu: "Базовый смотровой набор (зеркало, зонд, пинцет)",
		packagingNameRu: "Пакет из крафт-бумаги термосвариваемый",
		itemsListRu: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет"],
		status: "sterile",
		isBreached: false,
		sterilizationDate: "2026-09-11T10:00:00.000Z",
		expirationDate: "2026-10-11T10:00:00.000Z",
		packagingType: "kraft_paper_sealed",
		operatorName: "Иванова А. С.",
	},
	{
		barcode: "SANPIN-20260911-002",
		packId: "pack-002",
		autoclaveId: "MELAG-VACUKLAV-23B",
		cycleNumber: 42,
		itemCategoryRu: "Хирургический набор элеваторов",
		packagingNameRu: "Пакет из крафт-бумаги термосвариваемый",
		itemsListRu: ["Элеватор прямой", "Элеватор штыковидный"],
		status: "sterile",
		isBreached: false,
		sterilizationDate: "2026-09-11T10:00:00.000Z",
		expirationDate: "2026-10-11T10:00:00.000Z",
		packagingType: "kraft_paper_sealed",
		operatorName: "Иванова А. С.",
	},
];

describe("KraftBarcodeLabelSheet — Mandate 8e Doctor Autonomy", () => {
	it("renders print button enabled by default when packs exist (selected all)", () => {
		const html = renderToStaticMarkup(
			createElement(KraftBarcodeLabelSheet, {
				packs: mockPacks,
				clinicName: "Стоматологическая клиника «DENTE»",
			}),
		);

		assert.ok(html.includes("Печать этикеток (2)"), "Renders button with 2 packs");
		assert.ok(!html.includes("disabled"), "Print button is NOT disabled");
		assert.ok(html.includes("SANPIN-20260911-001"), "Renders first pack barcode");
		assert.ok(html.includes("SANPIN-20260911-002"), "Renders second pack barcode");
	});

	it("disables print button only when packs list is truly empty (0 available packs)", () => {
		const html = renderToStaticMarkup(
			createElement(KraftBarcodeLabelSheet, {
				packs: [],
				clinicName: "Стоматологическая клиника «DENTE»",
			}),
		);

		assert.ok(html.includes("disabled"), "Button is disabled when no packs exist");
		assert.ok(html.includes("Нет этикеток для печати"), "Title explains zero packs available");
		assert.ok(html.includes("Нет доступных этикеток для печати"), "Empty state message is shown");
	});
});
