/**
 * cbctFinanceIntegrationBridge.test.ts — Тестовый комплекс интеграции 3D КЛКТ с финансами,
 * актом выполненных работ, планом лечения (Номенклатура 804н) и клиническими протоколами СтАР.
 *
 * Мандаты DENTE CRM:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: Doctor Autonomy (независимость хирурга, 1-клик экспорт в смету и акт).
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	STATUTORY_CBCT_804N,
	addCbctServiceToVisitFinanceAct,
	addCbctServiceToTreatmentPlan,
	addCbctToFinanceAndPlan,
	buildImplantTreatmentPlanItem,
	buildImplantDiarySoapEntry,
	loadPersistedCustomPlanItems,
	type CtImplantBridgeParams,
} from "../ctImplantIntegrationBridge";
import { useVisitStore } from "../../../store/visitStore";
import { useDocumentStore } from "../../../store/documentStore";
import { validateTreatmentPlanStarProtocols } from "../../treatment-plans/validation/starProtocolValidationEngine";
import type { TreatmentPlanStage, TreatmentPlanItem } from "../../treatment-plans/types";

const normalizeSpaces = (s: string) => (s || "").replace(/[\u00a0\u202f]/g, " ");

// Инициализация глобального окружения для браузерных CustomEvents и localStorage в Node.js
const mockStorage = new Map<string, string>();
const localStorageMock = {
	getItem: (k: string) => mockStorage.get(k) ?? null,
	setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
	removeItem: (k: string) => mockStorage.delete(k),
	clear: () => mockStorage.clear(),
};

if (!globalThis.window) {
	const win = new EventTarget() as unknown as Window & typeof globalThis;
	// biome-ignore lint/suspicious/noExplicitAny: test mock
	(win as any).localStorage = localStorageMock;
	globalThis.window = win;
}

if (!globalThis.localStorage) {
	// biome-ignore lint/suspicious/noExplicitAny: test mock
	globalThis.localStorage = localStorageMock as any;
}

describe("CBCT-Finance Bridge & Star Protocol Integration Suite", () => {
	beforeEach(() => {
		mockStorage.clear();
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			treatmentPlan: "",
		}));
		// Сброс состояния useDocumentStore
		const docState = useDocumentStore.getState();
		docState.setCompletedActServicesSummary("");
		docState.setCompletedActTotalRub("0");
		docState.setTreatmentPlanStages("");
		docState.setTreatmentPlanEstimatedTotalRub("0");
	});

	it("1. STATUTORY_CBCT_804N conforms to statutory Order 804n specifications", () => {
		assert.strictEqual(STATUTORY_CBCT_804N.code804n, "A06.07.012");
		assert.strictEqual(
			STATUTORY_CBCT_804N.statutoryTitle804n,
			"Компьютерная томография челюстно-лицевой области",
		);
		assert.strictEqual(STATUTORY_CBCT_804N.basePriceRub, 3800);
		assert.strictEqual(STATUTORY_CBCT_804N.basePriceKopecks, 380000);
		assert.strictEqual(STATUTORY_CBCT_804N.vatRate, 0);
		assert.strictEqual(STATUTORY_CBCT_804N.vatExemptionArticle, "пп. 2 п. 2 ст. 149 НК РФ");
		assert.strictEqual(STATUTORY_CBCT_804N.stageKind, "stage_1_therapy");
	});

	it("2. addCbctServiceToVisitFinanceAct updates stores and dispatches invoice event", () => {
		let capturedInvoiceEvent: CustomEvent | null = null;
		const handler = (e: Event) => {
			capturedInvoiceEvent = e as CustomEvent;
		};
		window.addEventListener("dente-add-services-to-invoice", handler);

		try {
			const res = addCbctServiceToVisitFinanceAct({
				toothFdi: 46,
				doctorName: "Д-р Иванов А.А.",
				patientId: "PAT-001",
			});

			assert.strictEqual(res.code, "A06.07.012");
			assert.ok(res.title.includes("Компьютерная томография челюстно-лицевой области"));
			assert.ok(res.title.includes("область зуба #46"));
			assert.strictEqual(res.priceRub, 3800);

			// Проверка useVisitStore
			const visitNoteForm = useVisitStore.getState().visitNoteForm;
			assert.ok(visitNoteForm.treatmentPlan.includes("A06.07.012"));
			assert.ok(normalizeSpaces(visitNoteForm.treatmentPlan).includes("3 800 ₽"));

			// Проверка useDocumentStore
			const docState = useDocumentStore.getState();
			assert.ok(docState.completedActServicesSummary.includes("A06.07.012"));
			assert.strictEqual(docState.completedActTotalRub, "3800");

			// Проверка CustomEvent
			assert.ok(capturedInvoiceEvent !== null);
			// biome-ignore lint/suspicious/noExplicitAny: event assertion
			const detail = (capturedInvoiceEvent as any).detail;
			assert.strictEqual(detail.toothNumber, 46);
			assert.strictEqual(detail.source, "cbct_studio");
			assert.strictEqual(detail.services.length, 1);
			assert.strictEqual(detail.services[0].code, "A06.07.012");
			assert.strictEqual(detail.services[0].priceRub, 3800);
		} finally {
			window.removeEventListener("dente-add-services-to-invoice", handler);
		}
	});

	it("3. addCbctServiceToVisitFinanceAct respects custom price override", () => {
		const res = addCbctServiceToVisitFinanceAct({
			toothFdi: 36,
			priceRub: 4500,
		});

		assert.strictEqual(res.priceRub, 4500);
		const docState = useDocumentStore.getState();
		assert.strictEqual(docState.completedActTotalRub, "4500");
		assert.ok(normalizeSpaces(docState.completedActServicesSummary).includes("4 500 ₽"));
	});

	it("4. addCbctServiceToTreatmentPlan updates document store, persists item and dispatches plan event", () => {
		let capturedPlanEvent: CustomEvent | null = null;
		const handler = (e: Event) => {
			capturedPlanEvent = e as CustomEvent;
		};
		window.addEventListener("dente-add-treatment-plan-item", handler);

		try {
			const item = addCbctServiceToTreatmentPlan({
				patientId: "PAT-TEST-99",
				toothFdi: 16,
			});

			assert.strictEqual(item.code804n, "A06.07.012");
			assert.strictEqual(item.phase, 1);
			assert.strictEqual(item.stageKind, "stage_1_therapy");
			assert.strictEqual(item.priceRub, 3800);
			assert.ok(item.clinicalRationale?.includes("3D-томография"));

			// Проверка сохранения в localStorage
			const persisted = loadPersistedCustomPlanItems("PAT-TEST-99");
			assert.strictEqual(persisted.length, 1);
			assert.strictEqual(persisted[0]?.code804n, "A06.07.012");

			// Проверка useDocumentStore
			const docState = useDocumentStore.getState();
			assert.ok(docState.treatmentPlanStages.includes("A06.07.012"));
			assert.strictEqual(docState.treatmentPlanEstimatedTotalRub, "3800");

			// Проверка CustomEvent
			assert.ok(capturedPlanEvent !== null);
			// biome-ignore lint/suspicious/noExplicitAny: event assertion
			const detail = (capturedPlanEvent as any).detail;
			assert.strictEqual(detail.toothNumber, 16);
			assert.strictEqual(detail.patientId, "PAT-TEST-99");
			assert.strictEqual(detail.item.code804n, "A06.07.012");
		} finally {
			window.removeEventListener("dente-add-treatment-plan-item", handler);
		}
	});

	it("5. addCbctToFinanceAndPlan performs atomic 1-click execution and shows toast", () => {
		let toastDetail: { text: string; type: string; duration?: number } | null = null;
		const toastHandler = (e: Event) => {
			toastDetail = (e as CustomEvent).detail;
		};
		window.addEventListener("dente-toast", toastHandler);

		try {
			const res = addCbctToFinanceAndPlan({
				patientId: "PAT-DUAL-01",
				toothFdi: 24,
				doctorName: "Д-р Смирнов К.С.",
			});

			assert.strictEqual(res.actService.code, "A06.07.012");
			assert.strictEqual(res.planItem.code804n, "A06.07.012");

			// Toast оповещение
			assert.ok(toastDetail !== null);
			const td = toastDetail as unknown as { text: string; type: string };
			assert.strictEqual(td.type, "success");
			assert.ok(td.text.includes("A06.07.012"));
			assert.ok(normalizeSpaces(td.text).includes("3 800 ₽"));

			// Счета и акт
			const docState = useDocumentStore.getState();
			assert.strictEqual(docState.completedActTotalRub, "3800");
			assert.strictEqual(docState.treatmentPlanEstimatedTotalRub, "3800");
		} finally {
			window.removeEventListener("dente-toast", toastHandler);
		}
	});

	it("6. Star Protocol validation: implant without CT produces defect, with A06.07.012 passes CT check", () => {
		const implantItem: TreatmentPlanItem = {
			id: "plan-implant-46",
			toothNumber: 46,
			code804n: "A16.07.054",
			name: "Внутрикостная дентальная имплантация Osstem TS III (Ø4.0 × 10.0 мм)",
			category: "Хирургия",
			priceRub: 24000,
			unitPriceRub: 24000,
			discountRub: 0,
			quantity: 1,
			phase: 2,
			stageKind: "stage_2_surgery",
			isAuto: false,
		};

		// Вариант 1: План БЕЗ КТ-диагностики
		const stageWithoutCT: TreatmentPlanStage = {
			stageNumber: 2,
			title: "Хирургический этап",
			subtitle: "Имплантация",
			clinicalGoal: "Установка дентального имплантата",
			stageKind: "stage_2_surgery",
			items: [implantItem],
			totalRub: 24000,
			totalKopecks: 2400000,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["A16.07.054"],
			status: "agreed",
		};

		const validationWithoutCT = validateTreatmentPlanStarProtocols([stageWithoutCT]);
		const missingCTCheck = validationWithoutCT.checks.find((c) => c.ruleId === "star-implant-no-ct-46");
		assert.ok(missingCTCheck !== undefined, "Должно быть предупреждение об отсутствии 3D КЛКТ");
		assert.strictEqual(missingCTCheck?.status, "warning");

		// Вариант 2: Добавляем КЛКТ услугу (A06.07.012) через наш мост
		const cbctItem = addCbctServiceToTreatmentPlan({ toothFdi: 46 });
		const stageWithCT: TreatmentPlanStage = {
			stageNumber: 1,
			title: "Диагностический этап",
			subtitle: "КЛКТ",
			clinicalGoal: "3D томография",
			stageKind: "stage_1_therapy",
			items: [cbctItem],
			totalRub: 3800,
			totalKopecks: 380000,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["A06.07.012"],
			status: "completed",
		};

		const validationWithCT = validateTreatmentPlanStarProtocols([stageWithCT, stageWithoutCT]);
		const passedCTCheck = validationWithCT.checks.find((c) => c.ruleId === "star-diag-ct-pass");
		assert.ok(passedCTCheck !== undefined, "КТ диагностика должна быть признана пройденной");
		assert.strictEqual(passedCTCheck?.status, "pass");

		// Проверяем, что дефект star-implant-no-ct-46 больше НЕ генерируется
		const residualMissingCT = validationWithCT.checks.find((c) => c.ruleId === "star-implant-no-ct-46");
		assert.strictEqual(residualMissingCT, undefined, "Предупреждение об отсутствии КТ должно быть снято");
	});

	it("7. buildImplantTreatmentPlanItem and buildImplantDiarySoapEntry generate compliant clinical records", () => {
		const bridgeParams: CtImplantBridgeParams = {
			patientId: "PAT-007",
			patientName: "Кузнецов Пётр Сергеевич",
			doctorName: "Д-р Петров В.И.",
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
			angulationDeg: 2.5,
			ridgeHeightMm: 13.5,
			ridgeWidthMm: 7.2,
			mischClass: "D2",
			meanHU: 920,
			nerveClearanceMm: 3.5,
			recommendedTorqueNcm: "35 Нсм",
			drillingProtocol: "Пилотное сверло Ø2.0 -> Сверло Ø3.0 -> Формирующее сверло Ø3.8",
		};

		const planItem = buildImplantTreatmentPlanItem(bridgeParams);
		assert.strictEqual(planItem.code804n, "A16.07.054");
		assert.strictEqual(planItem.toothNumber, 46);
		assert.strictEqual(planItem.priceRub, 24000);
		assert.ok(planItem.clinicalRationale?.includes("H=13.5 мм"));
		assert.ok(planItem.clinicalRationale?.includes("W=7.2 мм"));
		assert.ok(planItem.clinicalRationale?.includes("3.5 мм"));

		const diary = buildImplantDiarySoapEntry(bridgeParams);
		assert.strictEqual(diary.diagnosisIcd10, "K08.1");
		assert.strictEqual(diary.diagnosisTooth, "46");
		assert.ok(diary.statusLocalis.includes("высота альвеолярного гребня 13.5 мм"));
		assert.ok(diary.statusLocalis.includes("3.5 мм"));
		assert.ok(diary.treatmentDescription.includes("Osstem TS III"));
		assert.ok(diary.treatmentDescription.includes("Ø4.0"));
		assert.ok(diary.treatmentDescription.includes("L=10.0"));
	});
});
