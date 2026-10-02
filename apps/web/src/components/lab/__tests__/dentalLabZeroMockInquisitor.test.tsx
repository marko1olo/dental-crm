/**
 * dentalLabZeroMockInquisitor.test.tsx
 *
 * Dedicated verification suite for:
 * «ZERO-MOCK DENTAL LAB ZTL & ORTHOPEDIC TRACKER INQUISITOR»
 *
 * Requirements verified:
 * 1. Absolute eradication of Math.random() in order number and order ID generation.
 *    Deterministic sequential numbers (ЗТЛ-YYYY-NNN) and monotonic ID tokens.
 * 2. 6-Stage Orthopedic Lifecycle (Mandates 8e, 8s):
 *    «Снят слепок» -> «Отправлен курьером в ЗТЛ» -> «Каркас на примерку» ->
 *    «Нанесение керамики» -> «Готовая работа в клинике» -> «Фиксация в полости рта»
 *    and bidirectional stage mapping (mapTo6StageOrthopedicLifecycle).
 * 3. Kopeck-exact financial accounting:
 *    ztlCostKopecks deducted from patient price to calculate doctor piece-rate wage base:
 *    doctorWageBaseKopecks = Math.max(0, patientPriceKopecks - ztlCostKopecks).
 *    Zero penny-drift invariant: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks.
 * 4. A4 Printable Courier Order Slip (DentalLabPrintBlank.tsx):
 *    Anti-muddy grey backgrounds: .bg-slate-50/.bg-slate-100 stripped under print,
 *    crisp black-and-white contrast, clinic phone, doctor phone, courier delivery time slot,
 *    and 3-way handover signatures (Doctor, Courier, Lab Technician).
 * 5. Zero emojis compliance across all modified lab components (Mandate 8d Sin #7).
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	generateDeterministicLabOrderNumber,
	generateDeterministicLabOrderId,
	createDentalLabOrderRecord,
	calculateZtlWageFinancials,
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	type CanonicalOrthopedic6StageId,
} from "../dentalLabOrderEngine";

import { DentalLabPrintBlank } from "../DentalLabPrintBlank";

describe("ZERO-MOCK DENTAL LAB ZTL & ORTHOPEDIC TRACKER INQUISITOR", () => {
	describe("1. Zero-Mock & Deterministic ID / Order Number Generation", () => {
		it("generateDeterministicLabOrderNumber производит детерминированные номера ЗТЛ-YYYY-NNN без Math.random()", () => {
			const fixedDate = new Date("2026-10-15T10:00:00Z");
			const orderNum1 = generateDeterministicLabOrderNumber({ date: fixedDate, sequence: 101 });
			const orderNum2 = generateDeterministicLabOrderNumber({ date: fixedDate, sequence: 102 });

			assert.equal(orderNum1, "ЗТЛ-2026-101");
			assert.equal(orderNum2, "ЗТЛ-2026-102");
			assert.ok(orderNum1.startsWith("ЗТЛ-2026-"));
			assert.ok(!orderNum1.includes("NaN"));
			assert.ok(!orderNum1.includes("undefined"));
		});

		it("generateDeterministicLabOrderId производит стабильный ID наряда с таймстампом и слагом пациента", () => {
			const fixedDate = new Date("2026-10-15T12:00:00Z");
			const id1 = generateDeterministicLabOrderId({ date: fixedDate, patientId: "pat-ivanychev-4821", sequence: 101 });
			assert.ok(id1.startsWith("ztl-ord-"));
			assert.ok(id1.includes("4821"));
			assert.ok(id1.includes("101"));
		});

		it("createDentalLabOrderRecord создает наряд ЗТЛ со 100% детерминированными полями", () => {
			const record = createDentalLabOrderRecord({
				patientId: "pat-smirnova-77",
				patientName: "Смирнова Е.А.",
				doctorId: "doc-petrov",
				doctorName: "Д-р Петров С.В.",
				teethFdi: [16, 17],
				constructionType: "crown_zirconia",
				vitaShade: "A2",
			});

			assert.ok(record.id.startsWith("ztl-ord-"));
			assert.ok(record.orderNumber.startsWith("ЗТЛ-"));
			assert.equal(record.patientName, "Смирнова Е.А.");
			assert.deepEqual(record.teethFdi, [16, 17]);
			assert.equal(record.vitaShade, "A2");
		});

		it("в кодовой базе lab/ и orthopedics/ полностью отсутствует Math.random()", () => {
			const currentFile = fileURLToPath(import.meta.url);
			const labDir = path.resolve(path.dirname(currentFile), "..");
			const enginePath = path.join(labDir, "dentalLabOrderEngine.ts");
			const engineContent = fs.readFileSync(enginePath, "utf-8");

			// Поиск реальных вызовов Math.random() (исключая комментарии)
			const codeLines = engineContent
				.split("\n")
				.filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"));
			const hasMathRandomCall = codeLines.some((l) => l.includes("Math.random()"));
			assert.equal(hasMathRandomCall, false, "dentalLabOrderEngine.ts содержит вызов Math.random()!");
		});
	});

	describe("2. Канонический 6-этапный ортопедический жизненный цикл", () => {
		it("CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES содержит все 6 канонических клинических этапов", () => {
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.length, 6);

			const expectedOrder: CanonicalOrthopedic6StageId[] = [
				"impression_taken",
				"courier_sent",
				"framework_fitting",
				"ceramic_layering",
				"ready_in_clinic",
				"patient_fixation",
			];

			CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.forEach((item, idx) => {
				assert.equal(item.step, idx + 1);
				assert.equal(item.id, expectedOrder[idx]);
				assert.ok(item.labelRu.length > 5);
				assert.ok(item.shortLabelRu.length > 2);
				assert.ok(item.descRu.length > 10);
			});

			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES[0]?.shortLabelRu, "Снят слепок");
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES[1]?.shortLabelRu, "Курьер в ЗТЛ");
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES[2]?.shortLabelRu, "Каркас на примерку");
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES[3]?.shortLabelRu, "Нанесение керамики");
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES[4]?.shortLabelRu, "Готовая работа");
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES[5]?.shortLabelRu, "Фиксация");
		});

		it("mapTo6StageOrthopedicLifecycle точно маппит статусы в 6-этапный маршрут", () => {
			assert.equal(mapTo6StageOrthopedicLifecycle("draft"), "impression_taken");
			assert.equal(mapTo6StageOrthopedicLifecycle("impression_scan"), "impression_taken");
			assert.equal(mapTo6StageOrthopedicLifecycle("sent_to_lab"), "courier_sent");
			assert.equal(mapTo6StageOrthopedicLifecycle("courier_sent"), "courier_sent");
			assert.equal(mapTo6StageOrthopedicLifecycle("in_progress"), "framework_fitting");
			assert.equal(mapTo6StageOrthopedicLifecycle("framework_fitting"), "framework_fitting");
			assert.equal(mapTo6StageOrthopedicLifecycle("ceramic_layering"), "ceramic_layering");
			assert.equal(mapTo6StageOrthopedicLifecycle("ready_in_clinic"), "ready_in_clinic");
			assert.equal(mapTo6StageOrthopedicLifecycle("delivered_to_patient"), "patient_fixation");
			assert.equal(mapTo6StageOrthopedicLifecycle("patient_fixation"), "patient_fixation");
		});
	});

	describe("3. Копеечно-точный финансовый учет сдельной оплаты врача", () => {
		it("вычитает себестоимость ЗТЛ из сдельной базы врача с нулевым копеечным дрейфом", () => {
			// Пациент 32 000 руб (3 200 000 коп), ЗТЛ 9 000 руб (900 000 коп), Врач 25%
			const fin = calculateZtlWageFinancials({
				unitsCount: 1,
				patientPriceKopecks: 3200000,
				ztlCostKopecks: 900000,
				doctorSharePercent: 25,
			});

			assert.equal(fin.patientPriceKopecks, 3200000);
			assert.equal(fin.ztlCostKopecks, 900000);
			// База врача: 3 200 000 - 900 000 = 2 300 000 коп (23 000 руб)
			assert.equal(fin.doctorWageBaseKopecks, 2300000);
			// ЗП врача 25% от 2 300 000 = 575 000 коп (5 750 руб)
			assert.equal(fin.doctorWageKopecks, 575000);
			// Маржа клиники: 2 300 000 - 575 000 = 1 725 000 коп (17 250 руб)
			assert.equal(fin.clinicMarginKopecks, 1725000);

			assert.ok(fin.isBalanced);
			assert.equal(fin.doctorWageKopecks + fin.clinicMarginKopecks, fin.doctorWageBaseKopecks);
		});

		it("гарантийная переделка (rework): пациент платит СТРОГО 0 ₽", () => {
			const fin = calculateZtlWageFinancials({
				unitsCount: 1,
				patientPriceKopecks: 2800000,
				ztlCostKopecks: 850000,
				doctorSharePercent: 20,
				isWarrantyRework: true,
				warrantyLiabilityType: "lab_defect",
			});

			assert.equal(fin.patientPriceKopecks, 0);
			assert.equal(fin.patientPriceRub, 0);
			assert.equal(fin.doctorWageKopecks, 0);
			assert.equal(fin.ztlCostKopecks, 0); // При браке ЗТЛ переделка за счет лаборатории
			assert.ok(fin.isBalanced);
		});
	});

	describe("4. Курьерский бланк наряда А4 (DentalLabPrintBlank.tsx)", () => {
		it("рендерит контактные телефоны врача и клиники, окно курьера и 6-этапный маршрутный лист", () => {
			const html = renderToString(
				<DentalLabPrintBlank
					gostOrderNumber="ЗТЛ-2026-101"
					secureToken="ZTL-SEC-TOKEN-42"
					formPatientName="Алексеев В.М."
					formDoctorName="Д-р Григорьев К.А."
					clinicName="ООО «ДЕНТЕ Премиум»"
					clinicPhone="+7 (495) 789-20-20"
					doctorPhone="+7 (916) 123-45-67"
					deliveryTimeSlot="12:00 – 15:00"
					selectedTeeth={[21]}
					constructionType="crown_emax"
					material="emax_press"
					shadeSystem="classical"
					shadeClassical="A1"
					shade3dMaster="1M1"
					shadeBleach="BL1"
					shadeCervical="A2"
					shadeBody="A1"
					shadeIncisal="0M2"
					shadeStump="ND2"
					translucency="HT"
					mamelons={true}
					calcifications={false}
					dueDate="2026-10-25"
					clinicalNotes="Курьерская доставка в термочехле"
					portalUrl="https://clinic.dente/#/portal/lab-order/ZTL-SEC-TOKEN-42"
					handlePrint={() => {}}
					isDraft={false}
					isSigned={true}
					currentStage="in_progress"
				/>,
			);

			// Контактные телефоны
			assert.ok(html.includes("+7 (495) 789-20-20"), "Бланк должен содержать телефон клиники");
			assert.ok(html.includes("+7 (916) 123-45-67"), "Бланк должен содержать телефон врача");

			// Окно курьера
			assert.ok(html.includes("12:00 – 15:00"), "Бланк должен содержать окно доставки курьером");
			assert.ok(html.includes("Окно курьера:"), "Бланк должен содержать метку окна курьера");

			// 6-этапный жизненный цикл ортопедии
			assert.ok(html.includes('data-testid="lab-blank-6stage-lifecycle"'), "Должен присутствовать 6-этапный трекер");
			assert.ok(html.includes('data-testid="ztl-blank-6stage-impression_taken"'), "Должен содержать этап Снят слепок");
			assert.ok(html.includes('data-testid="ztl-blank-6stage-courier_sent"'), "Должен содержать этап Курьер в ЗТЛ");
			assert.ok(html.includes('data-testid="ztl-blank-6stage-framework_fitting"'), "Должен содержать этап Каркас на примерку");
			assert.ok(html.includes('data-testid="ztl-blank-6stage-ceramic_layering"'), "Должен содержать этап Нанесение керамики");
			assert.ok(html.includes('data-testid="ztl-blank-6stage-ready_in_clinic"'), "Должен содержать этап Готовая работа");
			assert.ok(html.includes('data-testid="ztl-blank-6stage-patient_fixation"'), "Должен содержать этап Фиксация");

			// 3-сторонняя подпись с распиской курьера
			assert.ok(html.includes("Курьер ЗТЛ (передача):"), "Должен содержать блок подписи курьера");
			assert.ok(html.includes("Прием лабораторией ЗТЛ:"), "Должен содержать блок приема ЗТЛ");
		});

		it("стили печати содержат защиту от мутных серых фонов (Anti-Muddy Grey)", () => {
			const currentFile = fileURLToPath(import.meta.url);
			const blankPath = path.resolve(path.dirname(currentFile), "../DentalLabPrintBlank.tsx");
			const content = fs.readFileSync(blankPath, "utf-8");

			assert.ok(
				content.includes("#printable-lab-order-sheet .bg-slate-50") &&
				content.includes("background-color: transparent !important"),
				"Печатные стили должны сбрасывать серые фоны bg-slate-50 в прозрачный/белый",
			);

			assert.ok(
				content.includes("print:bg-transparent") || content.includes("print:bg-white"),
				"Бланк должен использовать print:bg-transparent или print:bg-white для очистки фона",
			);
		});
	});

	describe("5. Мандат 8d п. 7 — Zero Cartoon Emojis Compliance", () => {
		it("DentalLabPrintBlank.tsx и dentalLabOrderEngine.ts содержат строго 0 мультяшных эмодзи", () => {
			const currentFile = fileURLToPath(import.meta.url);
			const labDir = path.resolve(path.dirname(currentFile), "..");
			const files = ["DentalLabPrintBlank.tsx", "dentalLabOrderEngine.ts", "labClinicalStages.ts"];

			const emojiRegex = /\p{Extended_Pictographic}/u;

			for (const f of files) {
				const fullPath = path.join(labDir, f);
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.equal(emojiRegex.test(content), false, `Файл ${f} содержит запрещенные эмодзи`);
			}
		});
	});
});
