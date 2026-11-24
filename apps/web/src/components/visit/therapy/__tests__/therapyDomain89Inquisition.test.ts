/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOMAIN 89 RED TEAM INQUISITION TEST SUITE
 * Терапевтическая стоматология, кариес I–VI по Блэку, поверхности MODBL,
 * реставрация, коффердам и каталог 804н.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	COMPOSITE_MATERIALS_CATALOG,
	ADHESIVE_SYSTEMS_CATALOG,
	FINISHING_SYSTEMS_CATALOG,
	detectBlackClass,
	resolveBlackRestorationService,
	isValidUuidV7,
	generateUuidV7,
	kopecksToRubles,
} from "@dental/shared";

import {
	isAnteriorTooth,
	mapSurfacesToCariesType,
	mapCariesTypeToSurfaces,
} from "../../../odontogram/gate0/gate0CariesMapper";
import { THERAPY_STATUTORY_PRESETS } from "../../../catalog/pricelist/presets/therapyPresets";
import { VisitTherapyProtocolWidget } from "../VisitTherapyProtocolWidget";
import { TherapySurfaceSelector } from "../modules/TherapySurfaceSelector";
import { TherapyFooterActions } from "../modules/TherapyFooterActions";
import { useVisitStore } from "../../../../store/visitStore";

describe("Domain 89: Red Team Inquisitions & Clinical Precision", () => {
	it("[SEV-1.1] Eliminates commercial brands from clinical restoration catalog and presets", () => {
		const forbiddenBrands = [
			"Filtek Ultimate (3M",
			"Estelite Asteria (Tokuyama",
			"Harmonize (Kerr",
			"SDR Plus Flowable (Dentsply",
			"OptiBond FL (Kerr",
			"Single Bond 2 / Scotchbond",
			"Clearfil SE Bond (Kuraray",
			"OptiBond Universal (Kerr",
			"3M Sof-Lex",
			"Dentsply Enhance",
		];

		// Проверка каталога композитов
		for (const comp of Object.values(COMPOSITE_MATERIALS_CATALOG)) {
			for (const brand of forbiddenBrands) {
				assert.ok(
					!comp.tradeNameRu.includes(brand),
					`COMPOSITE_MATERIALS_CATALOG must not contain brand: ${brand}`,
				);
			}
		}

		// Проверка каталога адгезивов
		for (const adh of Object.values(ADHESIVE_SYSTEMS_CATALOG)) {
			for (const brand of forbiddenBrands) {
				assert.ok(
					!adh.tradeNameRu.includes(brand),
					`ADHESIVE_SYSTEMS_CATALOG must not contain brand: ${brand}`,
				);
			}
		}

		// Проверка каталога полировки
		for (const fin of FINISHING_SYSTEMS_CATALOG) {
			assert.ok(!fin.nameRu.includes("3M Sof-Lex"));
			assert.ok(!fin.nameRu.includes("Dentsply Enhance"));
			assert.ok(!fin.nameRu.includes("Prisma Gloss"));
		}

		// Рендер виджета — отсутствие брендов в пресетах
		const html = renderToStaticMarkup(createElement(VisitTherapyProtocolWidget, { activeTooth: 16 }));
		assert.ok(!html.includes("OptiBond FL + Filtek"));
		assert.ok(!html.includes("Clearfil SE + SDR"));
		assert.ok(!html.includes("Снятие + Harmonize"));
		assert.ok(html.includes("Тотальное травление + Нанокомпозит"));
		assert.ok(html.includes("Самопротравливание + Bulk-fill"));
	});

	it("[SEV-1.2] Supports incisal edge 'I' for anterior teeth in gate0CariesMapper and selector", () => {
		// Проверка детектора фронтальных зубов
		assert.equal(isAnteriorTooth(11), true);
		assert.equal(isAnteriorTooth(12), true);
		assert.equal(isAnteriorTooth(13), true);
		assert.equal(isAnteriorTooth(21), true);
		assert.equal(isAnteriorTooth(31), true);
		assert.equal(isAnteriorTooth(43), true);
		assert.equal(isAnteriorTooth(16), false);
		assert.equal(isAnteriorTooth(46), false);

		// Нормализация поверхности I в gate0CariesMapper
		const typeIncisalOnly = mapSurfacesToCariesType(11, ["I"]);
		assert.equal(typeIncisalOnly, "class4"); // Режущий край резца -> class4 / VI

		const typeMid = mapSurfacesToCariesType(21, ["M", "I", "D"]);
		assert.equal(typeMid, "class4");

		const typeMi = mapSurfacesToCariesType(11, ["M", "I"]);
		assert.equal(typeMi, "class4");

		const typeMolarMod = mapSurfacesToCariesType(16, ["M", "O", "D"]);
		assert.equal(typeMolarMod, "class2_mod");

		// mapCariesTypeToSurfaces с учетом фронтального зуба
		assert.deepEqual(mapCariesTypeToSurfaces("class1", 11), ["I"]);
		assert.deepEqual(mapCariesTypeToSurfaces("class1", 16), ["O"]);
		assert.deepEqual(mapCariesTypeToSurfaces("class4", 11), ["M", "I"]);

		// Рендер TherapySurfaceSelector для фронтального зуба 11
		const htmlAnterior = renderToStaticMarkup(
			createElement(TherapySurfaceSelector, {
				selectedSurfaces: ["M", "I", "D"],
				onApplySurfacePreset: () => {},
				onToggleSurface: () => {},
				isAnterior: true,
			}),
		);
		assert.ok(htmlAnterior.includes("[MID]"), "Anterior selector displays [MID] preset");
		assert.ok(htmlAnterior.includes("[MI]"), "Anterior selector displays [MI] preset");
		assert.ok(htmlAnterior.includes("[ID]"), "Anterior selector displays [ID] preset");
		assert.ok(htmlAnterior.includes("[I]"), "Anterior selector displays [I] preset");
		assert.ok(!htmlAnterior.includes("[MOD]"), "Anterior selector does not display occlusal [MOD]");
	});

	it("[SEV-1.3] Event Bus correctly receives surfaces array without loss", () => {
		// Проверка структуры записи зуба в сторе
		const toothNum = 11;
		const surfaces = ["M", "I", "D"];

		useVisitStore.getState().setVisitToothRecord(String(toothNum), {
			toothNumber: toothNum,
			state: "done",
			diagnosis: "K02.1",
			surfaces,
			cavity: "MID",
		});

		const saved = useVisitStore.getState().visitToothRecordsByCode[String(toothNum)];
		assert.ok(saved);
		assert.deepEqual(saved.surfaces, ["M", "I", "D"]);
		assert.equal(saved.cavity, "MID");
	});

	it("[SEV-2.1] Resolves statutory prices in kopecks and generates RFC 9562 UUIDv7", () => {
		// Резолвер услуг реставрации по Блэку
		const resolutionClass1 = resolveBlackRestorationService(["O"]);
		assert.equal(resolutionClass1.serviceCode, "A16.07.002.001");
		assert.equal(resolutionClass1.priceKopecks, 450_000); // 4500 руб
		assert.equal(kopecksToRubles(resolutionClass1.priceKopecks), 4500);

		const resolutionClass2 = resolveBlackRestorationService(["M", "O", "D"]);
		assert.equal(resolutionClass2.serviceCode, "A16.07.002.002");
		assert.equal(resolutionClass2.priceKopecks, 550_000); // 5500 руб
		assert.equal(kopecksToRubles(resolutionClass2.priceKopecks), 5500);

		// Валидация UUIDv7
		const uuid = generateUuidV7();
		assert.ok(isValidUuidV7(uuid), `Generated key ${uuid} must be a valid RFC 9562 UUIDv7`);
	});

	it("[SEV-2.2] Eliminates Order 804n code collision for rubber dam isolation", () => {
		const rubberDam = THERAPY_STATUTORY_PRESETS.find((p) => p.id === "srv-a16-07-002-009");
		assert.ok(rubberDam, "Rubber dam statutory preset must exist with canonical ID");
		assert.equal(rubberDam.code804n, "A16.07.002.009");
		assert.equal(rubberDam.statutoryTitle804n, "Наложение коффердама (раббердама)");

		const wedgeDefect = THERAPY_STATUTORY_PRESETS.find((p) => p.id === "srv-a16-07-002-005");
		assert.ok(wedgeDefect, "Wedge defect statutory preset must exist");
		assert.equal(wedgeDefect.code804n, "A16.07.002.005");

		// Проверка отсутствия дублирующихся кодов среди пресетов терапии
		const rubberDamMatches = THERAPY_STATUTORY_PRESETS.filter((p) => p.code804n === "A16.07.002.009");
		assert.equal(rubberDamMatches.length, 1, "Exactly one rubber dam item with code A16.07.002.009");

		const wedgeMatches = THERAPY_STATUTORY_PRESETS.filter((p) => p.code804n === "A16.07.002.005");
		assert.equal(wedgeMatches.length, 1, "Exactly one wedge defect item with code A16.07.002.005");
	});

	it("[SEV-3.1] Desktop footer actions follow canonical h-9 geometry with >=44px mobile touch", () => {
		const html = renderToStaticMarkup(
			createElement(TherapyFooterActions, {
				onInsertToClinicalDiary: () => {},
				onAddServicesToInvoice: () => {},
				servicesCount: 3,
				diagnosisIcd10: "K02.1",
				blackClass: "class_II",
			}),
		);

		// Desktop: sm:h-9 sm:min-h-0
		assert.ok(html.includes("sm:h-9"), "Footer buttons must have desktop sm:h-9 standard");
		assert.ok(html.includes("sm:min-h-0"), "Footer buttons must have desktop sm:min-h-0 reset");

		// Mobile touch: min-h-[44px] h-11
		assert.ok(html.includes("min-h-[44px]"), "Footer buttons must have mobile min-h-[44px] touch target");
		assert.ok(html.includes("h-11"), "Footer buttons must have mobile h-11 height");

		// Zero text-primary on icons inside secondary button
		assert.ok(!html.includes("text-[var(--primary)] shrink-0"), "Icon inside button must inherit currentColor");
	});
});
