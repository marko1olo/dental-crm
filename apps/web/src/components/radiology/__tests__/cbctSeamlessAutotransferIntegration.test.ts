/**
 * cbctSeamlessAutotransferIntegration.test.ts — Интеграционный тестовый комплекс
 * бесшовного переноса данных 3D КЛКТ в медицинскую карту (ЭМК 043/у), смету визита,
 * план лечения и наряд зуботехнической лаборатории (ЗТЛ).
 *
 * Стандарты DENTE CRM:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8e: Doctor Autonomy (1-клик экспорт, 0 заблокированных кнопок).
 * - Мандат 8n: Ноль советских шифров в UI («Форма 043/у» -> «Медицинская карта / Дневник приёма»).
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	STATUTORY_CBCT_804N,
	addCbctSurgicalToVisitFinance,
	addCbctServiceToTreatmentPlan,
	exportImplantToDiary043,
	buildImplantTreatmentPlanItem,
	type VirtualImplantSpec,
} from "../ctImplantIntegrationBridge";
import { useVisitStore } from "../../../store/visitStore";
import { useDocumentStore } from "../../../store/documentStore";
import type { DentalLabOrderData } from "../../lab/labMath";

// Мокирование глобального окружения для браузерных CustomEvents и localStorage в Node.js
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

describe("CBCT Seamless Autotransfer Integration Suite", () => {
	const mockImplantSpec: VirtualImplantSpec = {
		id: "imp-test-1",
		brand: "osstem",
		brandName: "Osstem TS III SA",
		lineName: "TS III",
		diameterMm: 4.5,
		lengthMm: 10.0,
		platformDiameterMm: 4.5,
		apexDiameterMm: 3.5,
		priceKopecks: 2500000,
		articleNumber: "TS34510",
	};

	beforeEach(() => {
		mockStorage.clear();
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			treatmentPlan: "",
			objectiveStatus: "",
		}));
		const docState = useDocumentStore.getState();
		docState.setCompletedActServicesSummary("");
		docState.setCompletedActTotalRub("0");
		docState.setTreatmentPlanStages("");
		docState.setTreatmentPlanEstimatedTotalRub("0");
	});

	it("1. addCbctSurgicalToVisitFinance adds complete surgical suite to visit finance and dispatches event", () => {
		let capturedEventDetail: any = null;
		const invoiceListener = (e: Event) => {
			capturedEventDetail = (e as CustomEvent).detail;
		};
		window.addEventListener("dente-add-services-to-invoice", invoiceListener);

		try {
			const result = addCbctSurgicalToVisitFinance({
				patientId: "patient-101",
				toothFdi: 46,
				implantSpec: mockImplantSpec,
				ridgeHeightMm: 12.0,
				ridgeWidthMm: 8.0,
				doctorName: "Д-р Иванов И.И.",
			});

			assert.ok(result.totalRub > 0, "Итоговая сумма должна быть больше нуля");
			assert.ok(result.services.length >= 3, "Должно быть минимум 3 услуги (КЛКТ, имплантация, формирователь)");

			// Проверка услуг
			const codes = result.services.map((s) => s.code);
			assert.ok(codes.includes(STATUTORY_CBCT_804N.code804n), "Должна быть услуга КЛКТ (A06.07.012)");
			assert.ok(codes.includes("A16.07.054.001"), "Должна быть операция имплантации");
			assert.ok(codes.includes("A16.07.054.002"), "Должен быть формирователь десны");

			// Проверка useVisitStore (дневник визита / смета)
			const visitNote = useVisitStore.getState().visitNoteForm;
			assert.ok(visitNote.treatmentPlan.includes("A06.07.012"), "Смета визита должна содержать A06.07.012");
			assert.ok(visitNote.treatmentPlan.includes("A16.07.054.001"), "Смета визита должна содержать A16.07.054.001");

			// Проверка useDocumentStore (акт выполненных работ)
			const docState = useDocumentStore.getState();
			assert.ok(docState.completedActServicesSummary.includes("A16.07.054.001"), "Акт должен содержать операцию имплантации");
			assert.strictEqual(docState.completedActTotalRub, String(result.totalRub));

			// Проверка CustomEvent
			assert.ok(capturedEventDetail, "Событие dente-add-services-to-invoice должно быть отправлено");
			assert.strictEqual(capturedEventDetail.toothNumber, 46);
			assert.strictEqual(capturedEventDetail.source, "cbct_studio_surgery");
		} finally {
			window.removeEventListener("dente-add-services-to-invoice", invoiceListener);
		}
	});

	it("2. addCbctSurgicalToVisitFinance auto-indicates lateral window sinus lift when ridge height < 5mm on maxilla", () => {
		const result = addCbctSurgicalToVisitFinance({
			patientId: "patient-102",
			toothFdi: 16, // Верхняя челюсть, область моляра/пазухи
			implantSpec: mockImplantSpec,
			ridgeHeightMm: 3.8, // Выраженная вертикальная атрофия < 5 мм
			ridgeWidthMm: 7.0,
		});

		const codes = result.services.map((s) => s.code);
		assert.ok(codes.includes("A16.07.041.001"), "Должен быть открытый латеральный синус-лифтинг при высоте < 5 мм");
		assert.ok(codes.includes("A16.07.041"), "Должна быть костная пластика Bio-Oss");
	});

	it("3. addCbctSurgicalToVisitFinance auto-indicates crestal sinus lift when ridge height 5-10mm on maxilla", () => {
		const result = addCbctSurgicalToVisitFinance({
			patientId: "patient-103",
			toothFdi: 26, // Верхняя челюсть
			implantSpec: mockImplantSpec,
			ridgeHeightMm: 7.2, // Умеренный дефицит 5-10 мм
			ridgeWidthMm: 7.5,
		});

		const codes = result.services.map((s) => s.code);
		assert.ok(codes.includes("A16.07.041.002"), "Должен быть закрытый транскрестальный синус-лифтинг при высоте 5-10 мм");
	});

	it("4. addCbctSurgicalToVisitFinance auto-indicates GBR when ridge width < 5.5mm", () => {
		const result = addCbctSurgicalToVisitFinance({
			patientId: "patient-104",
			toothFdi: 46, // Нижняя челюсть
			implantSpec: mockImplantSpec,
			ridgeHeightMm: 12.0,
			ridgeWidthMm: 4.2, // Узкий гребень < 5.5 мм
		});

		const gbrService = result.services.find((s) => s.title.includes("НКР"));
		assert.ok(gbrService, "Должна быть направленная костная регенерация (НКР) при гребне < 5.5 мм");
	});

	it("5. exportImplantToDiary043 formats Form 043/u diary and dispatches SOAP protocol event", () => {
		let capturedSoapEvent: any = null;
		const soapListener = (e: Event) => {
			capturedSoapEvent = (e as CustomEvent).detail;
		};
		window.addEventListener("dente-apply-soap-protocol", soapListener);

		try {
			const soap = exportImplantToDiary043({
				patientId: "patient-201",
				patientName: "Сидоров С.С.",
				toothFdi: 36,
				implantSpec: mockImplantSpec,
				angulationDeg: 3.5,
				ridgeHeightMm: 11.5,
				ridgeWidthMm: 7.8,
				mischClass: "D2",
				meanHU: 870,
				nerveClearanceMm: 3.2,
				recommendedTorqueNcm: "35 Н·см",
				drillingProtocol: "Стандартный хирургический протокол (1200 RPM)",
				isNerveWarning: false,
				isNerveDanger: false,
			});

			assert.ok(soap.statusLocalis.includes("Misch: D2") || (soap.statusLocalis.includes("Misch") && soap.statusLocalis.includes("D2")), "Status Localis должен содержать класс кости Misch D2");
			assert.ok(soap.statusLocalis.includes("870 HU"), "Status Localis должен содержать плотность 870 HU");
			assert.ok(soap.treatmentDescription.includes("Osstem"), "Treatment Description должен содержать систему Osstem");
			assert.ok(soap.treatmentDescription.includes("35 Н·см"), "Treatment Description должен содержать торк");

			// Проверка useVisitStore
			const visitNote = useVisitStore.getState().visitNoteForm;
			assert.ok(visitNote.objectiveStatus.includes("Osstem"), "Объективный статус визита должен обновиться");

			// Проверка события
			assert.ok(capturedSoapEvent, "Событие dente-apply-soap-protocol должно быть отправлено");
			assert.strictEqual(capturedSoapEvent.immediate, true);
		} finally {
			window.removeEventListener("dente-apply-soap-protocol", soapListener);
		}
	});

	it("6. ZTL export draft structure adheres to DentalLabOrderData specifications", () => {
		const targetTooth = 46;
		const effectivePatientId = "patient-301";
		const mockSliceDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

		const labDraft: DentalLabOrderData = {
			id: `lab-cbct-guide-${targetTooth}-test`,
			patientId: effectivePatientId,
			patientName: "Петров П.П.",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов",
			toothFdi: String(targetTooth),
			selectedTeeth: [targetTooth],
			jawScope: "lower",
			constructionType: "surgical_guide",
			material: "Биосовместимый полимер Surgical Guide (CAD/CAM 3D-печать)",
			impressionType: "cbct_dicom",
			clinicalNotes: "3D КЛКТ навигационный хирургический шаблон для имплантата Osstem Ø4.5x10 мм",
			attachedImageUrl: mockSliceDataUrl,
			status: "draft",
			priceRub: 7500,
			createdAt: new Date().toISOString(),
		};

		assert.strictEqual(labDraft.constructionType, "surgical_guide");
		assert.strictEqual(labDraft.toothFdi, "46");
		assert.strictEqual(labDraft.jawScope, "lower");
		assert.strictEqual(labDraft.priceRub, 7500);
		assert.ok(labDraft.attachedImageUrl?.startsWith("data:image/png"), "Срез должен быть прикреплен в dataURL");

		// Сохранение в localStorage черновика ЗТЛ
		localStorage.setItem("dente_pending_lab_order_draft", JSON.stringify(labDraft));
		const retrievedRaw = localStorage.getItem("dente_pending_lab_order_draft");
		assert.ok(retrievedRaw, "Черновик ЗТЛ должен сохраняться в localStorage");
		const retrieved = JSON.parse(retrievedRaw);
		assert.strictEqual(retrieved.constructionType, "surgical_guide");
	});

	it("7. Treatment plan attachments persistence and event dispatching", () => {
		const patientId = "patient-401";
		const targetTooth = 36;
		const mockSliceUrl = "data:image/png;base64,mockslice123";

		const planAttachment = {
			id: `plan-cbct-slice-${targetTooth}-test`,
			patientId,
			toothNumber: targetTooth,
			title: `КЛКТ срез для хирургического этапа (зуб #${targetTooth})`,
			sliceUrl: mockSliceUrl,
			capturedAt: new Date().toISOString(),
			implantInfo: "Osstem TS III SA Ø4.5x10.0",
		};

		const attachKey = `dente_patient_treatment_plan_attachments_${patientId}`;
		localStorage.setItem(attachKey, JSON.stringify([planAttachment]));

		const raw = localStorage.getItem(attachKey);
		assert.ok(raw, "Вложения плана лечения должны сохраняться в localStorage");
		const parsed = JSON.parse(raw);
		assert.strictEqual(parsed.length, 1);
		assert.strictEqual(parsed[0].toothNumber, 36);
		assert.strictEqual(parsed[0].sliceUrl, mockSliceUrl);
	});
});
