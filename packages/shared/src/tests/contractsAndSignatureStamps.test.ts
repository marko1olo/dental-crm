import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	paidServiceContract736PayloadSchema,
	renderPaidServiceContract736Html,
	actOfCompletedWorksPayloadSchema,
	renderActOfCompletedWorksHtml,
	renderDigitalSignatureStampHtml,
	injectVisualSignatureStampIntoHtml,
	DEFAULT_CLINIC_LICENSE_NUMBER,
} from "../index.js";

describe("Red Team Inquisitor: Patient Contracts, Medical Agreements & Digital Signature Stamps", () => {
	// ─── 1. MANDATE 8e: BLANK CONTRACT PRINTING WITHOUT ERRORS ────────────────
	describe("1. Договор на платные медицинские услуги (ПП РФ № 736) — Autonomy & Blank Printing", () => {
		it("валидирует пустой бланк договора без данных пациента (печать для стойки регистрации)", () => {
			const blankPayload = {
				contractNumber: "ДОГ-БЛАНК-2026/001",
			};

			const parsed = paidServiceContract736PayloadSchema.parse(blankPayload);
			assert.equal(parsed.contractNumber, "ДОГ-БЛАНК-2026/001");
			assert.equal(parsed.patientFullName, "");
			assert.equal(parsed.patientBirthDate, "");
			assert.equal(parsed.clinicLegalName, 'ООО "Денте Клиник"');
			assert.equal(parsed.medicalLicenseNumber, DEFAULT_CLINIC_LICENSE_NUMBER);
		});

		it("рендерит бланк договора с аккуратными линиями подчеркивания для ручного заполнения", () => {
			const html = renderPaidServiceContract736Html({
				contractNumber: "ДОГ-БЛАНК-2026/001",
				contractDate: "2026-10-03",
			});

			// Нормативные ссылки
			assert.ok(html.includes("ПП РФ № 736"), "Должен ссылаться на ПП РФ № 736");
			assert.ok(html.includes("УВЕДОМЛЕНИЕ О ГОСГАРАНТИЯХ"), "Должен содержать уведомление о программе госгарантий");
			assert.ok(html.includes("№ ДОГ-БЛАНК-2026/001"), "Должен содержать номер договора");

			// Поля с линиями подчеркивания вместо пустоты или [object Object]
			assert.ok(html.includes("_________________________________"), "Должен содержать линии подчеркивания для ФИО и паспорта");
			assert.ok(html.includes("__.__.____"), "Должен содержать шаблон даты рождения");
			assert.ok(html.includes("_______________"), "Должен содержать шаблон телефона");

			// Нулевая сумма договора при пустом бланке с прописью
			assert.ok(html.includes("0,00 руб."), "Должен отображать 0,00 руб.");
			assert.ok(html.includes("Ноль рублей 00 копеек"), "Должен отображать Ноль рублей 00 копеек");

			// Отсутствие мультяшных эмодзи (Мандат 8d п. 7)
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.ok(!emojiRegex.test(html), "Документ не должен содержать детских эмодзи");
		});

		it("корректно отображает заказчика, когда заказчик отличается от пациента (например, родитель)", () => {
			const html = renderPaidServiceContract736Html({
				contractNumber: "ДОГ-РОДИТЕЛЬ-001",
				patientFullName: "Иванов Артем Алексеевич (ребенок)",
				customerFullName: "Иванов Алексей Петрович (отец)",
				patientBirthDate: "2018-04-12",
				estimatedTotalRub: 45000,
			});

			assert.ok(html.includes("Иванов Алексей Петрович (отец)"), "Должен содержать ФИО заказчика");
			assert.ok(html.includes("действующий в пользу Пациента: Иванов Артем Алексеевич"), "Должен явно фиксировать статус законного представителя");
			assert.ok(html.includes("45 000,00 руб."), "Должен форматировать сумму");
			assert.ok(html.includes("Сорок пять тысяч рублей 00 копеек"), "Должен писать сумму прописью");
		});
	});

	// ─── 2. АКТ ВЫПОЛНЕННЫХ РАБОТ (ПРИКАЗ МЗ РФ № 804н) ───────────────────────
	describe("2. Акт выполненных работ (Номенклатура 804н) — Autonomy & Blank Printing", () => {
		it("валидирует пустой бланк акта для ручного заполнения", () => {
			const blankAct = {
				actNumber: "АКТ-БЛАНК-001",
				items: [
					{
						code804n: "A16.07.002.001",
						serviceName: "Наложение пломбы светового отверждения",
						unitPriceRub: 4500,
						totalRub: 4500,
					},
				],
				totalAmountRub: 4500,
			};

			const parsed = actOfCompletedWorksPayloadSchema.parse(blankAct);
			assert.equal(parsed.actNumber, "АКТ-БЛАНК-001");
			assert.equal(parsed.customerFullName, "");
			assert.equal(parsed.patientFullName, "");
		});

		it("рендерит бланк акта с линиями подчеркивания заказчика и врача", () => {
			const html = renderActOfCompletedWorksHtml({
				actNumber: "АКТ-БЛАНК-001",
				contractNumber: "ДОГ-БЛАНК-001",
				items: [
					{
						code804n: "A16.07.051",
						serviceName: "Профессиональная гигиена полости рта",
						quantity: 1,
						unitPriceRub: 6000,
						totalRub: 6000,
					},
				],
				totalAmountRub: 6000,
			});

			assert.ok(html.includes("АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ"), "Должен содержать заголовок акта");
			assert.ok(html.includes("A16.07.051"), "Должен содержать номенклатурный код 804н");
			assert.ok(html.includes("6 000,00 руб."), "Должен содержать форматированную сумму");
			assert.ok(html.includes("Шесть тысяч рублей 00 копеек"), "Должен содержать сумму прописью");
			assert.ok(html.includes("_________________________________"), "Должен содержать линии подчеркивания для заказчика");
			assert.ok(html.includes("М.П."), "Должен содержать место печати М.П.");
		});
	});

	// ─── 3. DIGITAL SIGNATURE STAMP (ГОСТ Р 7.0.97-2016 РАЗДЕЛ 5.23) ─────────
	describe("3. Визуальный синий штамп электронной подписи (ГОСТ Р 7.0.97-2016)", () => {
		const sampleUKEP = {
			signatureType: "ukep" as const,
			certificateSerialNumber: "00E123456789ABCDEF0123456789ABCD",
			certificateSubject: "Иванова Мария Сергеевна, Врач-стоматолог",
			certificateIssuer: 'УЦ АО "Калуга Астрал"',
			validFrom: "2026-01-15T12:00:00Z",
			validTo: "2027-04-15T12:00:00Z",
			signedAt: "2026-10-03T09:30:00Z",
			organizationName: 'ООО "Денте Клиник"',
		};

		it("рендерит официальный синий штамп УКЭП строго по ГОСТ Р 7.0.97-2016", () => {
			const stampHtml = renderDigitalSignatureStampHtml(sampleUKEP);

			assert.ok(stampHtml.includes("ДОКУМЕНТ ПОДПИСАН"), "Должен содержать текст ГОСТ: ДОКУМЕНТ ПОДПИСАН");
			assert.ok(stampHtml.includes("ЭЛЕКТРОННОЙ ПОДПИСЬЮ"), "Должен содержать текст ГОСТ: ЭЛЕКТРОННОЙ ПОДПИСЬЮ");
			assert.ok(stampHtml.includes("00E123456789ABCDEF0123456789ABCD"), "Должен содержать серийный номер сертификата");
			assert.ok(stampHtml.includes("Иванова Мария Сергеевна"), "Должен содержать владельца сертификата");
			assert.ok(stampHtml.includes("Калуга Астрал"), "Должен содержать издателя сертификата");
			assert.ok(stampHtml.includes("15.01.2026"), "Должен содержать дату начала действия");
			assert.ok(stampHtml.includes("15.04.2027"), "Должен содержать дату окончания действия");
			assert.ok(stampHtml.includes("#003399") || stampHtml.includes("rgb(0, 51, 153)") || stampHtml.includes("blue"), "Должен использовать гербовый синий цвет");
		});

		it("рендерит штамп ПЭП (простая электронная подпись) и штамп ЧЕРНОВИК", () => {
			const pepStamp = renderDigitalSignatureStampHtml({
				signatureType: "simple",
				certificateSubject: "Смирнов Алексей Викторович, Врач-стоматолог-ортопед",
				organizationName: 'ООО "Денте Клиник"',
			});
			assert.ok(pepStamp.includes("ПРОСТАЯ ЭЛЕКТРОННАЯ ПОДПИСЬ") || pepStamp.includes("ПЭП"), "Должен содержать статус ПЭП");

			const draftStamp = renderDigitalSignatureStampHtml({
				signatureType: "draft",
				certificateSubject: "Черновик документа",
			});
			assert.ok(draftStamp.includes("ЧЕРНОВИК"), "Должен содержать статус ЧЕРНОВИК");
		});

		it("инжектирует синий штамп в Договор ПП РФ № 736 вместо подписи Исполнителя", () => {
			const contractHtml = renderPaidServiceContract736Html({
				contractNumber: "ДОГ-ЭЦП-2026/001",
				doctorFullName: "Иванова М.С.",
				patientFullName: "Сидоров С.С.",
				estimatedTotalRub: 25000,
			});

			const stampHtml = renderDigitalSignatureStampHtml(sampleUKEP);
			const injected = injectVisualSignatureStampIntoHtml(contractHtml, stampHtml);

			// Штамп должен присутствовать
			assert.ok(injected.includes("BEGIN_GOST_SIGNATURE_STAMP"), "Штамп должен быть внедрен");
			assert.ok(injected.includes("Иванова Мария Сергеевна"), "Должен содержать данные подписанта");

			// Подпись заказчика (пациента) обязана остаться нетронутой!
			assert.ok(injected.includes("ЗАКАЗЧИК (ПАЦИЕНТ):"), "Блок Заказчика обязан сохраниться");
			assert.ok(injected.includes("Подпись Заказчика:"), "Линия подписи Заказчика обязана сохраниться");
			assert.ok(injected.includes("Сидоров С.С."), "ФИО Заказчика обязано сохраниться");
		});

		it("инжектирует синий штамп в Акт 804н вместо подписи Исполнителя", () => {
			const actHtml = renderActOfCompletedWorksHtml({
				actNumber: "АКТ-ЭЦП-2026/001",
				attendingDoctorFullName: "Иванова М.С.",
				customerFullName: "Сидоров С.С.",
				items: [
					{
						code804n: "A16.07.002.001",
						serviceName: "Пломбирование зуба",
						unitPriceRub: 5000,
						totalRub: 5000,
					},
				],
				totalAmountRub: 5000,
			});

			const stampHtml = renderDigitalSignatureStampHtml(sampleUKEP);
			const injected = injectVisualSignatureStampIntoHtml(actHtml, stampHtml);

			assert.ok(injected.includes("BEGIN_GOST_SIGNATURE_STAMP"), "Штамп должен быть внедрен в Акт");
			assert.ok(injected.includes("УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):"), "Блок принятия услуг Заказчиком обязан сохраниться");
			assert.ok(injected.includes("Сидоров С.С."), "ФИО Заказчика обязано сохраниться");
		});

		it("гарантирует идемпотентность: повторный вызов injectVisualSignatureStampIntoHtml не дублирует штамп", () => {
			const contractHtml = renderPaidServiceContract736Html({
				contractNumber: "ДОГ-ЭЦП-2026/002",
				patientFullName: "Петров П.П.",
			});

			const stampHtml = renderDigitalSignatureStampHtml(sampleUKEP);
			const firstPass = injectVisualSignatureStampIntoHtml(contractHtml, stampHtml);
			const secondPass = injectVisualSignatureStampIntoHtml(firstPass, stampHtml);

			// Количество вхождений маркера должно быть строго 1
			const count = (secondPass.match(/BEGIN_GOST_SIGNATURE_STAMP/g) || []).length;
			assert.equal(count, 1, "Штамп не должен дублироваться при повторном внедрении");
		});
	});
});
