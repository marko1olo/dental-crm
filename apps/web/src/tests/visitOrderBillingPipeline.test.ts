/**
 * apps/web/src/tests/visitOrderBillingPipeline.test.ts
 *
 * DENTE Dental CRM — End-to-End Visit Order & Billing Pipeline Integration Test
 * Mandates: 8b (Exact kopecks), 8e (Doctor Autonomy), 8n (Zero-Deadlock EMR/Billing Handshake).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	completeClinicalVisitAndAssembleEstimate,
	extractProceduresFromDiary,
} from "../components/visit/clinicalVisitWorkflow.js";
import {
	synthesize1ClickSoapDiary,
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
} from "../components/emr/templates/clinicalDiaryTemplatesEngine.js";
import {
	formatCompletedServiceLine,
	parseCompletedServiceLine,
} from "../components/visit/completedServicesPlan.js";
import {
	DEFAULT_CHAIRSIDE_SERVICES,
	type VisitBillingServiceItem,
} from "../components/visit/visitBillingTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("End-to-End Visit Order & Billing Pipeline (Subagent 12 Audit)", () => {
	it("1. Caries K02.1 statutory template synthesizes 3 exact services totaling 4 800 ₽ (480 000 kopecks)", () => {
		const cariesTemplate = CLINICAL_1CLICK_TEMPLATES_CATALOG.find(
			(t) => t.id === "caries_medium_k02_1",
		);
		assert.ok(cariesTemplate, "Caries template caries_medium_k02_1 must exist in statutory catalog");

		const result = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 16,
			doctorFullName: "Д-р Смирнов А.В.",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			patientFullName: "Иванова Мария Сергеевна",
		});

		assert.equal(result.order804nServices.length, 3, "Caries template must define exactly 3 804n services");
		assert.equal(result.order804nServices[0]?.code, "A16.07.002.001");
		assert.equal(result.order804nServices[0]?.priceKopecks, 350000); // 3 500 ₽

		assert.equal(result.order804nServices[1]?.code, "A16.07.031");
		assert.equal(result.order804nServices[1]?.priceKopecks, 80000); // 800 ₽

		assert.equal(result.order804nServices[2]?.code, "A11.07.012");
		assert.equal(result.order804nServices[2]?.priceKopecks, 50000); // 500 ₽

		const totalKopecks = result.order804nServices.reduce(
			(sum, s) => sum + (s.priceKopecks || 0),
			0,
		);
		assert.equal(totalKopecks, 480000, "Total must match 480 000 kopecks (4 800 ₽) down to the kopeck");
		assert.equal(result.totalEstimatedKopecks, 480000);
	});

	it("2. extractProceduresFromDiary parses structured 804n services directly without guessing regexes", () => {
		const cariesTemplate = CLINICAL_1CLICK_TEMPLATES_CATALOG.find(
			(t) => t.id === "caries_medium_k02_1",
		)!;

		const synthesized = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 16,
			doctorFullName: "Д-р Смирнов А.В.",
		});

		// 2.1 Direct order804nServices array in diary input
		const itemsFromStructured = extractProceduresFromDiary({
			anamnesis: synthesized.anamnesisMorbi,
			statusLocalis: synthesized.objectiveStatusLocalis,
			diagnosisIcd10: synthesized.assessmentIcd10Code,
			diagnosisTooth: "16",
			treatmentDescription: synthesized.unifiedSoapText,
			order804nServices: synthesized.order804nServices,
		});

		assert.equal(itemsFromStructured.length, 3);
		assert.equal(itemsFromStructured[0]?.code, "A16.07.002.001");
		assert.equal(itemsFromStructured[0]?.priceRub, 3500);
		assert.equal(itemsFromStructured[0]?.totalRub, 3500);
		assert.equal(itemsFromStructured[1]?.code, "A16.07.031");
		assert.equal(itemsFromStructured[1]?.priceRub, 800);
		assert.equal(itemsFromStructured[2]?.code, "A11.07.012");
		assert.equal(itemsFromStructured[2]?.priceRub, 500);

		const total = itemsFromStructured.reduce((acc, it) => acc + it.totalRub, 0);
		assert.equal(total, 4800, "Sum of extracted services must equal 4 800 ₽");
	});

	it("3. extractProceduresFromDiary parses bullet lines • Code Name — Price ₽ from treatmentDescription", () => {
		const treatmentText = `Проведено препарирование и пломбирование кариозной полости зуба 16.
Оказанные услуги (804н):
• A16.07.002.001 Восстановление зуба пломбой (светокомпозит) — 3 500 ₽
• A16.07.031 Запечатывание фиссуры зуба герметиком — 800 ₽
• A11.07.012 Введение лекарственных препаратов в область перидонта — 500 ₽`;

		const itemsFromBullets = extractProceduresFromDiary({
			diagnosisTooth: "16",
			treatmentDescription: treatmentText,
		});

		assert.equal(itemsFromBullets.length, 3, "Must parse 3 bullet items");
		assert.equal(itemsFromBullets[0]?.code, "A16.07.002.001");
		assert.equal(itemsFromBullets[0]?.priceRub, 3500);
		assert.equal(itemsFromBullets[1]?.code, "A16.07.031");
		assert.equal(itemsFromBullets[1]?.priceRub, 800);
		assert.equal(itemsFromBullets[2]?.code, "A11.07.012");
		assert.equal(itemsFromBullets[2]?.priceRub, 500);

		const total = itemsFromBullets.reduce((acc, it) => acc + it.totalRub, 0);
		assert.equal(total, 4800);
	});

	it("4. completeClinicalVisitAndAssembleEstimate outputs 3 itemized estimate rows totaling 4 800 ₽ / 480 000 kop and SBP QR", () => {
		const cariesTemplate = CLINICAL_1CLICK_TEMPLATES_CATALOG.find(
			(t) => t.id === "caries_medium_k02_1",
		)!;

		const synthesized = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 26,
			doctorFullName: "Д-р Кузнецова Е.А.",
			patientFullName: "Соколов Дмитрий Андреевич",
		});

		const completionResult = completeClinicalVisitAndAssembleEstimate({
			visitId: "visit-caries-e2e",
			patientId: "pat-sokolov",
			patientName: "Соколов Дмитрий Андреевич",
			doctorName: "Д-р Кузнецова Е.А.",
			diary: {
				anamnesis: synthesized.anamnesisMorbi,
				statusLocalis: synthesized.objectiveStatusLocalis,
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "26",
				treatmentDescription: synthesized.unifiedSoapText,
				order804nServices: synthesized.order804nServices,
			},
		});

		assert.equal(completionResult.status, "ready_for_payment");
		assert.equal(completionResult.totalGrossRub, 4800, "totalGrossRub must be exactly 4 800 ₽");
		assert.equal(completionResult.totalDiscountRub, 0);
		assert.equal(completionResult.totalNetRub, 4800, "totalNetRub must be exactly 4 800 ₽");
		assert.equal(completionResult.totalNetKop, 480000, "totalNetKop must be exactly 480 000 kop (Mandate 8b)");
		assert.equal(completionResult.items.length, 3);
		assert.ok(completionResult.sbpQrUrl.includes("sum=480000"), "SBP QR code must encode exact sum in kopecks 480000");
		assert.ok(/4[\s\u00A0\u202F]800/.test(completionResult.statusBannerText), "Status banner must display 4 800 ₽");
	});

	it("5. completeClinicalVisitAndAssembleEstimate with 10% doctor discount preserves integer kopeck math", () => {
		const completionResult = completeClinicalVisitAndAssembleEstimate({
			visitId: "visit-discount-10",
			patientId: "pat-regular",
			patientName: "Регулярный Пациент",
			doctorName: "Д-р Иванов А.С.",
			diary: {
				treatmentDescription: `• A16.07.002.001 Восстановление зуба пломбой — 3 500 ₽
• A16.07.031 Запечатывание фиссуры — 800 ₽
• A11.07.012 Анестезия инфильтрационная — 500 ₽`,
			},
			discountPercent: 10,
		});

		// 4 800 - 10% (480) = 4 320 ₽
		assert.equal(completionResult.totalGrossRub, 4800);
		assert.equal(completionResult.totalDiscountRub, 480);
		assert.equal(completionResult.totalNetRub, 4320);
		assert.equal(completionResult.totalNetKop, 432000);
		assert.ok(completionResult.sbpQrUrl.includes("sum=432000"));
	});

	it("6. VisitServiceBillingWidget and clinicalVisitWorkflow strict file bounds (Mandate 8b <= 800 lines)", () => {
		const billingWidgetPath = path.resolve(__dirname, "../components/visit/VisitServiceBillingWidget.tsx");
		const workflowPath = path.resolve(__dirname, "../components/visit/clinicalVisitWorkflow.ts");

		const billingLines = fs.readFileSync(billingWidgetPath, "utf8").split(/\r?\n/).length;
		const workflowLines = fs.readFileSync(workflowPath, "utf8").split(/\r?\n/).length;

		assert.ok(
			billingLines <= 800,
			`VisitServiceBillingWidget.tsx must be <= 800 lines (Mandate 8b), got ${billingLines}`,
		);
		assert.ok(
			workflowLines <= 800,
			`clinicalVisitWorkflow.ts must be <= 800 lines (Mandate 8b), got ${workflowLines}`,
		);
	});

	it("7. Zero cartoon emojis across visit billing and clinical workflow files (Mandate 8d)", () => {
		const billingWidgetPath = path.resolve(__dirname, "../components/visit/VisitServiceBillingWidget.tsx");
		const workflowPath = path.resolve(__dirname, "../components/visit/clinicalVisitWorkflow.ts");

		const billingContent = fs.readFileSync(billingWidgetPath, "utf8");
		const workflowContent = fs.readFileSync(workflowPath, "utf8");

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(billingContent), false, "VisitServiceBillingWidget must contain 0 cartoon emojis");
		assert.equal(emojiRegex.test(workflowContent), false, "clinicalVisitWorkflow must contain 0 cartoon emojis");
	});

	it("8. dente-add-services-to-invoice CustomEvent contract transfers structured Caries protocol payload", () => {
		const synthesized = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 16,
		});

		const billableItems = synthesized.order804nServices.map((s, idx) => ({
			id: `protocol-${s.code}-${Date.now()}-${idx}`,
			code: s.code,
			code804n: s.code,
			title: s.nameRu,
			quantity: s.defaultQuantity || 1,
			priceRub: (s.priceKopecks || 0) / 100,
			unitPriceRub: (s.priceKopecks || 0) / 100,
			priceKopecks: s.priceKopecks,
			toothNumber: 16,
		}));

		let receivedDetail: any = null;
		const handler = (e: Event) => {
			receivedDetail = (e as CustomEvent).detail;
		};

		const bus = new EventTarget();
		bus.addEventListener("dente-add-services-to-invoice", handler as EventListener);

		bus.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					services: billableItems,
					toothNumber: 16,
					replaceExisting: true,
					source: "clinical_diary_protocol",
				},
			}),
		);

		bus.removeEventListener("dente-add-services-to-invoice", handler as EventListener);

		assert.ok(receivedDetail, "Event detail must be received");
		assert.equal(receivedDetail.replaceExisting, true);
		assert.equal(receivedDetail.services.length, 3);
		const totalReceivedRub = receivedDetail.services.reduce(
			(sum: number, it: any) => sum + it.unitPriceRub * it.quantity,
			0,
		);
		assert.equal(totalReceivedRub, 4800, "Event payload must carry exactly 4 800 ₽ of billable services");
	});
});
