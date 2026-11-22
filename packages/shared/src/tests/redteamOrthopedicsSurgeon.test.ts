import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateBridgeRestorationCostKopecks,
	partitionBridgeTeethFdi,
} from "../lab/labOrders.js";
import { PROSTHETICS_REMOVABLE_804N_CATALOG } from "../pricelist/order804n/prostheticsRemovableCatalog.js";
import { PROSTHETICS_FIXED_804N_CATALOG } from "../pricelist/order804n/prostheticsFixedCatalog.js";
import {
	generateExocadDentalProjectXml,
	generateExocadConstructionInfoJson,
} from "../hardware/exocadProjectGenerator.js";

describe("Domain 25 Red Team Fixer Surgeon: Ортопедия, Мосты, CAD/CAM и Окклюзия", () => {
	it("1. Дифференциация опорных коронок и понтиков в мостовидном протезе", () => {
		// Тест разделения зубов моста 14..16 на опоры (14, 16) и промежуточную часть (15)
		const bridgeTeeth = [14, 15, 16];
		const partition = partitionBridgeTeethFdi(bridgeTeeth);
		assert.deepEqual(partition.abutmentTeethFdi, [14, 16], "Опоры моста обязаны быть 14 и 16");
		assert.deepEqual(partition.ponticTeethFdi, [15], "Понтик моста обязан быть 15");

		// Тест дифференцированного расчета стоимости:
		// Опора: 25 000 руб (2 500 000 коп), Понтик: 16 000 руб (1 600 000 коп)
		const cost = calculateBridgeRestorationCostKopecks({
			abutmentPriceKopecks: 2500000,
			ponticPriceKopecks: 1600000,
			abutmentsCount: 2,
			ponticsCount: 1,
			abutmentCostKopecks: 800000,
			ponticCostKopecks: 500000,
		});

		// 2 * 25 000 + 1 * 16 000 = 66 000 руб = 6 600 000 коп
		assert.equal(cost.patientPriceKopecks, 6600000, "Общая цена для пациента должна быть строго дифференцирована");
		assert.equal(cost.abutmentsTotalPatientKopecks, 5000000);
		assert.equal(cost.ponticsTotalPatientKopecks, 1600000);

		// Себестоимость: 2 * 8 000 + 1 * 5 000 = 21 000 руб = 2 100 000 коп
		assert.equal(cost.labCostKopecks, 2100000, "Себестоимость ЗТЛ должна быть строго дифференцирована");
		assert.equal(cost.abutmentsTotalLabKopecks, 1600000);
		assert.equal(cost.ponticsTotalLabKopecks, 500000);
	});

	it("2. Канонизация кодов номенклатуры 804н (Бюгели A16.07.036/037 и Фасетки A16.07.005.003/004)", () => {
		// Бюгельные протезы не должны содержать ошибочный код A16.07.006 (импланты)
		const hasWrongImplantCode = PROSTHETICS_REMOVABLE_804N_CATALOG.some(
			(entry) => entry.code === "A16.07.006",
		);
		assert.equal(hasWrongImplantCode, false, "В съемном каталоге недопустим код A16.07.006");

		// Проверяем наличие канонических позиций бюгельных протезов:
		const claspDenture = PROSTHETICS_REMOVABLE_804N_CATALOG.find(
			(entry) => entry.code === "A16.07.036",
		);
		assert.ok(claspDenture, "Должна присутствовать позиция A16.07.036 (кламмерная фиксация)");
		assert.match(claspDenture.title, /кламмерн/i);

		const attachmentDenture = PROSTHETICS_REMOVABLE_804N_CATALOG.find(
			(entry) => entry.code === "A16.07.037",
		);
		assert.ok(attachmentDenture, "Должна присутствовать позиция A16.07.037 (замковая фиксация)");
		assert.match(attachmentDenture.title, /замков/i);

		// Проверяем фасетки мостовидного протеза в несъемном протезировании:
		const pfmPontic = PROSTHETICS_FIXED_804N_CATALOG.find(
			(entry) => entry.code === "A16.07.005.003",
		);
		assert.ok(pfmPontic, "Должна присутствовать фасетка моста МК A16.07.005.003");
		assert.match(pfmPontic.title, /металлокерамическ/i);

		const zirconiaPontic = PROSTHETICS_FIXED_804N_CATALOG.find(
			(entry) => entry.code === "A16.07.005.004",
		);
		assert.ok(zirconiaPontic, "Должна присутствовать фасетка моста цирконий A16.07.005.004");
		assert.match(zirconiaPontic.title, /циркони/i);
	});

	it("3. Экспорт параметров окклюзии и виртуального артикулятора в Exocad CAD/CAM", () => {
		const xml = generateExocadDentalProjectXml({
			projectId: "proj-ortho-001",
			patientFullName: "Иванов Иван Иванович",
			teeth: [
				{ toothFdi: 14, restorationType: "anatomic_crown" },
				{ toothFdi: 15, restorationType: "pontic" },
				{ toothFdi: 16, restorationType: "anatomic_crown" },
			],
			articulatorSettings: {
				articulatorType: "kavo_protar",
				facebow: true,
				guidanceType: "canine_guidance",
				sagittalCondylarAngleDeg: 35,
				bennettAngleDeg: 15,
			},
		});

		assert.ok(xml.includes("<ArticulatorSettings>"), "XML обязан содержать блок <ArticulatorSettings>");
		assert.ok(xml.includes("<ArticulatorType>kavo_protar</ArticulatorType>"));
		assert.ok(xml.includes("<Facebow>true</Facebow>"));
		assert.ok(xml.includes("<GuidanceType>canine_guidance</GuidanceType>"));
		assert.ok(xml.includes("<SagittalCondylarAngleDeg>35</SagittalCondylarAngleDeg>"));
		assert.ok(xml.includes("<BennettAngleDeg>15</BennettAngleDeg>"));

		// Проверяем JSON-манифест constructionInfo
		const jsonStr = generateExocadConstructionInfoJson({
			projectId: "proj-ortho-001",
			patientFullName: "Иванов Иван Иванович",
			teeth: [{ toothFdi: 14, restorationType: "anatomic_crown" }],
			articulatorSettings: {
				articulatorType: "bio_art",
				facebow: false,
				guidanceType: "group_function",
				sagittalCondylarAngleDeg: 33,
				bennettAngleDeg: 15,
			},
		});

		const parsed = JSON.parse(jsonStr);
		assert.ok(parsed.articulatorSettings, "JSON обязан содержать поле articulatorSettings");
		assert.equal(parsed.articulatorSettings.articulatorType, "bio_art");
		assert.equal(parsed.articulatorSettings.guidanceType, "group_function");
		assert.equal(parsed.articulatorSettings.sagittalCondylarAngleDeg, 33);
		assert.equal(parsed.articulatorSettings.bennettAngleDeg, 15);
	});
});
