import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	getZakharovRidgeMeasurement,
	buildZakharov043SoapProtocol,
	exportZakharovRidgeTo043Emr,
	ZAKHAROV_EDENTULOUS_PROFILES,
} from "../zakharovRidgeAutomation";

describe("Zakharov Edentulous Ridge Automation & Form 043/u Protocol", () => {
	it("1. Anatomical W2/W6/H measurements strictly match clinical realities for tooth 26", () => {
		const m26 = getZakharovRidgeMeasurement(26);
		assert.equal(m26.toothFdi, 26);
		assert.equal(m26.crestHeightH_Mm, 5.8);
		assert.equal(m26.crestWidthW2_Mm, 6.4);
		assert.equal(m26.basalWidthW6_Mm, 8.2);
		assert.equal(m26.mischBoneClass, "D3");
		assert.equal(m26.meanHU, 385);
		assert.equal(m26.sinusLiftRecommendation.required, true);
		assert.equal(m26.sinusLiftRecommendation.technique, "closed_crestal_summers");
	});

	it("2. Anatomical W2/W6/H measurements strictly match clinical realities for tooth 27", () => {
		const m27 = getZakharovRidgeMeasurement(27);
		assert.equal(m27.toothFdi, 27);
		assert.equal(m27.crestHeightH_Mm, 5.2);
		assert.equal(m27.crestWidthW2_Mm, 6.1);
		assert.equal(m27.basalWidthW6_Mm, 7.8);
		assert.equal(m27.mischBoneClass, "D4");
		assert.equal(m27.meanHU, 210);
		assert.equal(m27.sinusLiftRecommendation.required, true);
		assert.equal(m27.sinusLiftRecommendation.technique, "open_lateral_window");
	});

	it("3. Form 043/u protocol includes complete anatomical W2, W6, H, HU and sinus lift justification", () => {
		const m26 = getZakharovRidgeMeasurement(26);
		const soap = buildZakharov043SoapProtocol(m26, "Захаров Иван Дмитриевич");

		assert.equal(soap.diagnosisIcd10, "K08.1");
		assert.equal(soap.diagnosisTooth, "26");
		assert.match(soap.statusLocalis, /H \(остаточная высота до кортикальной пластинки дна верхнечелюстного синуса\): 5\.8 мм/);
		assert.match(soap.statusLocalis, /W2 \(ширина гребня на 2 мм апикальнее вершины\): 6\.4 мм/);
		assert.match(soap.statusLocalis, /W6 \(базальная ширина гребня на 6 мм апикальнее вершины\): 8\.2 мм/);
		assert.match(soap.statusLocalis, /D3 \(средняя плотность: 385 HU\)/);
		assert.match(soap.treatmentDescription, /Закрытый трансальвеолярный синус-лифтинг \(метод Саммерса\)/);
		assert.match(soap.treatmentDescription, /Bio-Oss \/ Cerabone/);
		assert.match(soap.treatmentDescription, /Bio-Gide/);
	});

	it("4. Form 043/u protocol for tooth 27 indicates lateral window sinus lift and staged placement", () => {
		const m27 = getZakharovRidgeMeasurement(27);
		const soap = buildZakharov043SoapProtocol(m27, "Захаров Иван Дмитриевич");

		assert.equal(soap.diagnosisIcd10, "K08.1");
		assert.equal(soap.diagnosisTooth, "27");
		assert.match(soap.statusLocalis, /H \(остаточная высота до кортикальной пластинки дна верхнечелюстного синуса\): 5\.2 мм/);
		assert.match(soap.treatmentDescription, /Открытый синус-лифтинг \(латеральное окно по Tatum\)/);
		assert.match(soap.treatmentDescription, /Комбинированный графт/);
	});

	it("5. exportZakharovRidgeTo043Emr triggers callback and updates records cleanly", () => {
		let capturedText = "";
		const m26 = getZakharovRidgeMeasurement(26);
		exportZakharovRidgeTo043Emr(m26, "Захаров Иван Дмитриевич", (text) => {
			capturedText = text;
		});

		assert.ok(capturedText.length > 100);
		assert.match(capturedText, /КЛКТ-диагностика/);
		assert.match(capturedText, /План хирургического лечения/);
	});
});
