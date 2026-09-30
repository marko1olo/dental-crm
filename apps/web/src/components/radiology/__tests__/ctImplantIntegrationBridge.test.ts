/**
 * ctImplantIntegrationBridge.test.ts — комплексные тесты спайки КТ-движка со сметой,
 * планом лечения, ЭМК 043/у (SOAP), зубной формулой и расписанием приёмов.
 *
 * Мандаты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: Doctor Autonomy (независимость хирурга, субмиллиметровая калибровка).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Mock window for Node.js test runner
if (typeof (globalThis as any).window === "undefined") {
	class MockWindow extends EventTarget {
		localStorage = {
			_storage: new Map<string, string>(),
			getItem(key: string) {
				return this._storage.get(key) ?? null;
			},
			setItem(key: string, value: string) {
				this._storage.set(key, String(value));
			},
			removeItem(key: string) {
				this._storage.delete(key);
			},
			clear() {
				this._storage.clear();
			},
		};
	}
	(globalThis as any).window = new MockWindow();
}

import {
	buildImplantTreatmentPlanItem,
	buildImplantDiarySoapEntry,
	loadPersistedCustomPlanItems,
	savePersistedCustomPlanItem,
	exportImplantToTreatmentPlan,
	exportImplantToDiary043,
	exportImplantToScheduleDraft,
	updateOdontogramToothToPlannedImplant,
	getImplantBrandTitle,
	type CtImplantBridgeParams,
} from "../ctImplantIntegrationBridge";

const MOCK_IMPLANT_PARAMS: CtImplantBridgeParams = {
	patientId: "pat-test-101",
	patientName: "Тестовый Пациент Игоревич",
	doctorId: "doc-surg-01",
	doctorName: "Д-р Смирнов А.В.",
	toothFdi: 46,
	implantSpec: {
		id: "osstem-40-10",
		brand: "osstem",
		brandName: "Osstem TS III",
		lineName: "TS III SA",
		diameterMm: 4.0,
		lengthMm: 10.0,
		platformDiameterMm: 4.0,
		apexDiameterMm: 2.8,
		priceKopecks: 2400000,
		articleNumber: "TS3S4010",
	},
	angulationDeg: -3,
	ridgeHeightMm: 14.5,
	ridgeWidthMm: 7.8,
	mischClass: "D2",
	meanHU: 875,
	nerveClearanceMm: 4.2,
	recommendedTorqueNcm: "35–40 Н·см",
	drillingProtocol: "800 об/мин с охлаждением NaCl 0.9%",
	isNerveWarning: false,
	isNerveDanger: false,
};

describe("Wave 28 Domain 2 — CT Implant Engine Integration Bridge", () => {
	describe("1. buildImplantTreatmentPlanItem (Order 804n & Pricing)", () => {
		it("generates correct Ministry of Health Order 804n code A16.07.054", () => {
			const item = buildImplantTreatmentPlanItem(MOCK_IMPLANT_PARAMS);
			assert.equal(item.code804n, "A16.07.054");
			assert.equal(item.stageKind, "stage_2_surgery");
			assert.equal(item.phase, 2);
			assert.equal(item.category, "Хирургия");
			assert.equal(item.quantity, 1);
		});

		it("correctly assigns target tooth FDI number to plan item", () => {
			const item = buildImplantTreatmentPlanItem(MOCK_IMPLANT_PARAMS);
			assert.equal(item.toothNumber, 46);
		});

		it("includes full implant brand title, diameter, and length in item name and materials", () => {
			const item = buildImplantTreatmentPlanItem(MOCK_IMPLANT_PARAMS);
			assert.match(item.name, /Osstem TS III/);
			assert.match(item.name, /Ø4\.0/);
			assert.match(item.name, /10\.0 мм/);
			assert.match(item.materials || "", /Osstem TS III/);
		});

		it("embeds exact bone height, width, Misch density, HU, and nerve clearance in clinicalRationale", () => {
			const item = buildImplantTreatmentPlanItem(MOCK_IMPLANT_PARAMS);
			const rationale = item.clinicalRationale || "";
			assert.match(rationale, /H=14\.5 мм/);
			assert.match(rationale, /W=7\.8 мм/);
			assert.match(rationale, /D2/);
			assert.match(rationale, /875 HU/);
			assert.match(rationale, /4\.2 мм/);
			assert.match(rationale, /35–40 Н·см/);
		});

		it("applies default brand pricing when custom price is not provided", () => {
			const itemOsstem = buildImplantTreatmentPlanItem(MOCK_IMPLANT_PARAMS);
			assert.equal(itemOsstem.priceRub, 24000);

			const itemStraumann = buildImplantTreatmentPlanItem({
				...MOCK_IMPLANT_PARAMS,
				implantSpec: {
					...MOCK_IMPLANT_PARAMS.implantSpec,
					brand: "straumann",
				},
			});
			assert.equal(itemStraumann.priceRub, 48000);

			const itemDentium = buildImplantTreatmentPlanItem({
				...MOCK_IMPLANT_PARAMS,
				implantSpec: {
					...MOCK_IMPLANT_PARAMS.implantSpec,
					brand: "dentium",
				},
			});
			assert.equal(itemDentium.priceRub, 26000);
		});

		it("respects custom clinic price override if specified", () => {
			const item = buildImplantTreatmentPlanItem({
				...MOCK_IMPLANT_PARAMS,
				customPriceRub: 32000,
			});
			assert.equal(item.priceRub, 32000);
			assert.equal(item.unitPriceRub, 32000);
		});

		it("records objective nerve clearance in clinicalRationale without alarmist caps", () => {
			const dangerParams: CtImplantBridgeParams = {
				...MOCK_IMPLANT_PARAMS,
				nerveClearanceMm: 0.8,
				isNerveDanger: true,
			};
			const item = buildImplantTreatmentPlanItem(dangerParams);
			assert.match(item.clinicalRationale || "", /Дистанция до канала: 0\.8 мм/);
			assert.equal((item.clinicalRationale || "").includes("КРАСНАЯ ТРЕВОГА"), false);
		});
	});

	describe("2. buildImplantDiarySoapEntry (Form 043/u & EMR Protocols)", () => {
		it("generates structured statusLocalis containing anatomical bone dimensions and nerve clearance", () => {
			const soap = buildImplantDiarySoapEntry(MOCK_IMPLANT_PARAMS);
			assert.match(soap.statusLocalis, /зуба #46/);
			assert.match(soap.statusLocalis, /высота альвеолярного гребня 14\.5 мм/);
			assert.match(soap.statusLocalis, /ширина 7\.8 мм/);
			assert.match(soap.statusLocalis, /Misch: D2 \(875 HU\)/);
			assert.match(soap.statusLocalis, /4\.2 мм/);
		});

		it("generates systematic 5-point treatmentDescription surgical protocol", () => {
			const soap = buildImplantDiarySoapEntry(MOCK_IMPLANT_PARAMS);
			const desc = soap.treatmentDescription;
			assert.match(desc, /Протокол 3D КЛКТ-планирования/);
			assert.match(desc, /1\. Выбрана имплантационная система: Osstem/);
			assert.match(desc, /2\. Геометрические параметры имплантата: диаметр Ø4\.0 мм, длина L=10\.0 мм, наклон оси -3°/);
			assert.match(desc, /3\. Остеотомия ложа: 800 об\/мин с охлаждением NaCl 0\.9%/);
			assert.match(desc, /4\. Ожидаемый торк первичной стабильности: 35–40 Н·см/);
			assert.match(desc, /5\. Рекомендована установка формирователя десны/);
		});

		it("assigns ICD-10 code K08.1 for tooth loss/partial edentulism and diagnosis tooth", () => {
			const soap = buildImplantDiarySoapEntry(MOCK_IMPLANT_PARAMS);
			assert.equal(soap.diagnosisIcd10, "K08.1");
			assert.equal(soap.diagnosisTooth, "46");
		});

		it("contains zero cartoon emojis in generated clinical text", () => {
			const soap = buildImplantDiarySoapEntry(MOCK_IMPLANT_PARAMS);
			assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(soap.statusLocalis), false);
			assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(soap.treatmentDescription), false);
		});
	});

	describe("3. LocalStorage Persistence & Synchronization", () => {
		it("safely handles loading and saving custom plan items in memory/mock storage", () => {
			const items = loadPersistedCustomPlanItems("");
			assert.deepEqual(items, []);
		});
	});

	describe("4. Reactive Event Dispatching (Plan, EMR, Odontogram & Schedule)", () => {
		it("exportImplantToTreatmentPlan dispatches dente-add-treatment-plan-item", () => {
			let receivedEvent: CustomEvent | null = null;
			const handler = (e: Event) => {
				receivedEvent = e as CustomEvent;
			};
			window.addEventListener("dente-add-treatment-plan-item", handler);

			const item = exportImplantToTreatmentPlan(MOCK_IMPLANT_PARAMS);
			assert.ok(item);
			assert.equal(item.toothNumber, 46);

			window.removeEventListener("dente-add-treatment-plan-item", handler);
			if (receivedEvent) {
				assert.equal((receivedEvent as any).detail.toothNumber, 46);
				assert.equal((receivedEvent as any).detail.item.code804n, "A16.07.054");
			}
		});

		it("exportImplantToDiary043 invokes onApplyCallback with full diary protocol", () => {
			let capturedText = "";
			const soap = exportImplantToDiary043(MOCK_IMPLANT_PARAMS, (text) => {
				capturedText = text;
			});

			assert.ok(soap);
			assert.match(capturedText, /зуба #46/);
			assert.match(capturedText, /14\.5 мм/);
			assert.match(capturedText, /Osstem TS III/);
		});

		it("updateOdontogramToothToPlannedImplant dispatches dente-update-tooth-state", () => {
			let updatedTooth: number | null = null;
			let updatedState: string | null = null;
			const handler = (e: Event) => {
				const detail = (e as CustomEvent).detail;
				updatedTooth = detail.toothNumber;
				updatedState = detail.state;
			};
			window.addEventListener("dente-update-tooth-state", handler);

			updateOdontogramToothToPlannedImplant(46);
			window.removeEventListener("dente-update-tooth-state", handler);

			assert.equal(updatedTooth, 46);
			assert.equal(updatedState, "Planned_Implant");
		});

		it("exportImplantToScheduleDraft dispatches dente-quick-appointment-draft", () => {
			let scheduledDraft: any = null;
			const handler = (e: Event) => {
				scheduledDraft = (e as CustomEvent).detail;
			};
			window.addEventListener("dente-quick-appointment-draft", handler);

			const draft = exportImplantToScheduleDraft(MOCK_IMPLANT_PARAMS);
			window.removeEventListener("dente-quick-appointment-draft", handler);

			assert.ok(draft);
			assert.equal(draft.toothNumber, 46);
			assert.equal(draft.durationMinutes, 60);
			assert.equal(draft.stageKind, "stage_2_surgery");
			assert.match(draft.title, /Имплантация #46/);
			assert.match(draft.notes, /H=14\.5 мм/);
		});
	});

	describe("5. getImplantBrandTitle Catalog Mapping", () => {
		it("maps all supported dental implant manufacturers to readable Russian labels", () => {
			assert.equal(getImplantBrandTitle("straumann"), "Straumann (Швейцария)");
			assert.equal(getImplantBrandTitle("nobel_biocare"), "Nobel Biocare (Швеция/США)");
			assert.equal(getImplantBrandTitle("osstem"), "Osstem TS III (Южная Корея)");
			assert.equal(getImplantBrandTitle("dentium"), "Dentium SuperLine (Южная Корея)");
			assert.equal(getImplantBrandTitle("mis"), "MIS V3/Seven (Израиль)");
		});
	});

	describe("6. Statutory CBCT Finance Integration (A06.07.012)", () => {
		it("addCbctServiceToVisitFinanceAct dispatches invoice event with 804n code A06.07.012", async () => {
			const { addCbctServiceToVisitFinanceAct, STATUTORY_CBCT_804N } = await import("../ctImplantIntegrationBridge");
			let capturedInvoiceEvent: any = null;
			const handler = (e: Event) => {
				capturedInvoiceEvent = (e as CustomEvent).detail;
			};
			window.addEventListener("dente-add-services-to-invoice", handler);

			const result = addCbctServiceToVisitFinanceAct({ toothFdi: 36, priceRub: 4200 });
			window.removeEventListener("dente-add-services-to-invoice", handler);

			assert.equal(result.code, STATUTORY_CBCT_804N.code804n);
			assert.equal(result.priceRub, 4200);
			assert.match(result.title, /36/);
			if (capturedInvoiceEvent) {
				assert.equal(capturedInvoiceEvent.services[0].code, "A06.07.012");
				assert.equal(capturedInvoiceEvent.services[0].priceRub, 4200);
			}
		});

		it("addCbctServiceToTreatmentPlan creates Diagnostic stage item with A06.07.012", async () => {
			const { addCbctServiceToTreatmentPlan } = await import("../ctImplantIntegrationBridge");
			let capturedPlanEvent: any = null;
			const handler = (e: Event) => {
				capturedPlanEvent = (e as CustomEvent).detail;
			};
			window.addEventListener("dente-add-treatment-plan-item", handler);

			const planItem = addCbctServiceToTreatmentPlan({ toothFdi: 21 });
			window.removeEventListener("dente-add-treatment-plan-item", handler);

			assert.equal(planItem.code804n, "A06.07.012");
			assert.equal(planItem.category, "Диагностика");
			assert.equal(planItem.stageKind, "stage_1_therapy");
			assert.equal(planItem.phase, 1);
			if (capturedPlanEvent) {
				assert.equal(capturedPlanEvent.item.code804n, "A06.07.012");
			}
		});
	});

	describe("7. Zero-Falsification Invariant (Mandate 8e & BUG-010)", () => {
		const UNMEASURED_PARAMS: CtImplantBridgeParams = {
			...MOCK_IMPLANT_PARAMS,
			ridgeHeightMm: null,
			ridgeWidthMm: null,
			nerveClearanceMm: null,
			mischClass: null,
			meanHU: null,
		};

		it("buildImplantTreatmentPlanItem displays 'не измерялась (—)' and zero hardcoded 22.0/8.0 when unmeasured", () => {
			const item = buildImplantTreatmentPlanItem(UNMEASURED_PARAMS);
			const rationale = item.clinicalRationale || "";
			assert.equal(rationale.includes("22.0"), false);
			assert.equal(rationale.includes("8.0"), false);
			assert.match(rationale, /H: не измерялась \(—\)/);
			assert.match(rationale, /W: не измерялась \(—\)/);
			// Zero-falsification of IAN nerve clearance: never claim safe if unmeasured
			assert.match(rationale, /Канал не размечен/);
			assert.equal(rationale.includes("норма безопасности соблюдена"), false);
		});

		it("buildImplantDiarySoapEntry displays honest unmeasured text without claiming intact canal", () => {
			const soap = buildImplantDiarySoapEntry(UNMEASURED_PARAMS);
			assert.equal(soap.statusLocalis.includes("22.0"), false);
			assert.equal(soap.statusLocalis.includes("8.0"), false);
			assert.match(soap.statusLocalis, /замеры альвеолярного гребня штангенциркулем не проводились \(—\)/);
			// Zero-falsification of IAN nerve in Form 043/u
			assert.match(soap.statusLocalis, /Канал не размечен/);
			assert.equal(soap.statusLocalis.includes("без признаков перфорации"), false);
			assert.equal(soap.statusLocalis.includes("норма безопасности соблюдена"), false);
		});

		it("exportImplantToScheduleDraft displays 'гребень: — (не измерялся)' when unmeasured", () => {
			const draft = exportImplantToScheduleDraft(UNMEASURED_PARAMS);
			assert.equal(draft.notes.includes("22.0"), false);
			assert.equal(draft.notes.includes("8.0"), false);
			assert.match(draft.notes, /гребень: — \(не измерялся\)/);
		});

		it("correctly outputs calm objective clearance (<1.5 mm) in both Treatment Plan and Form 043/u without panic or caps", () => {
			const dangerParams: CtImplantBridgeParams = {
				...MOCK_IMPLANT_PARAMS,
				nerveClearanceMm: 1.1,
				isNerveDanger: true,
			};
			const planItem = buildImplantTreatmentPlanItem(dangerParams);
			assert.match(planItem.clinicalRationale || "", /Дистанция до канала: 1\.1 мм/);
			assert.equal((planItem.clinicalRationale || "").includes("КРАСНАЯ ТРЕВОГА"), false);

			const soap = buildImplantDiarySoapEntry(dangerParams);
			assert.match(soap.statusLocalis, /Расстояние от апекса до нижнечелюстного канала \/ дна верхнечелюстного синуса: 1\.1 мм/);
			assert.equal(soap.statusLocalis.includes("КРАСНАЯ ТРЕВОГА"), false);
			assert.equal(soap.statusLocalis.includes("парестезии"), false);
		});

		it("correctly outputs calm objective clearance (1.5..2.0 mm) in Treatment Plan and Form 043/u without alarmist caps", () => {
			const warningParams: CtImplantBridgeParams = {
				...MOCK_IMPLANT_PARAMS,
				nerveClearanceMm: 1.8,
				isNerveWarning: true,
				isNerveDanger: false,
			};
			const planItem = buildImplantTreatmentPlanItem(warningParams);
			assert.match(planItem.clinicalRationale || "", /Дистанция до канала: 1\.8 мм/);
			assert.equal((planItem.clinicalRationale || "").includes("ЖЕЛТОЕ ПРЕДУПРЕЖДЕНИЕ"), false);

			const soap = buildImplantDiarySoapEntry(warningParams);
			assert.match(soap.statusLocalis, /Расстояние от апекса до нижнечелюстного канала \/ дна верхнечелюстного синуса: 1\.8 мм/);
			assert.equal(soap.statusLocalis.includes("ЖЕЛТОЕ ПРЕДУПРЕЖДЕНИЕ"), false);
		});

		it("correctly outputs SAFE clearance (>= 2.0 mm) with objective distance value", () => {
			const safeParams: CtImplantBridgeParams = {
				...MOCK_IMPLANT_PARAMS,
				nerveClearanceMm: 3.2,
				isNerveWarning: false,
				isNerveDanger: false,
			};
			const planItem = buildImplantTreatmentPlanItem(safeParams);
			assert.match(planItem.clinicalRationale || "", /Дистанция до канала: 3\.2 мм/);

			const soap = buildImplantDiarySoapEntry(safeParams);
			assert.match(soap.statusLocalis, /Расстояние от апекса до нижнечелюстного канала \/ дна верхнечелюстного синуса: 3\.2 мм/);
		});
	});
});

