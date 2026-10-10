import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ProfessionalDocumentA4Sheet,
	type ProfessionalA4DocumentTab,
} from "../ProfessionalDocumentA4Sheet.js";
import { DocumentA4PrintPreviewModal } from "../DocumentA4PrintPreviewModal.js";
import type {
	A4DocumentContractData,
	A4DocumentActData,
	A4DocumentTreatmentPlanData,
	A4DocumentInformedConsentData,
	A4DocumentPersonalDataConsentData,
	A4DocumentMedicalCardData,
} from "@dental/shared";

const mockClinic = {
	name: 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
	legalName: 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
	shortName: 'ООО "ДЕНТЕ Премиум"',
	address: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
	actualAddress: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
	inn: "7710984521",
	kpp: "771001001",
	ogrn: "1217700456123",
	licenseNumber: "ЛО41-01137-77/00645892",
	licenseDate: "15.04.2022",
	licenseIssuer: "Департамент здравоохранения города Москвы",
	phone: "+7 (495) 123-45-67",
	email: "info@dente-clinic.ru",
	bankName: 'ПАО "Сбербанк"',
	bik: "044525225",
	checkingAccount: "40702810938000123456",
	correspondentAccount: "30101810400000000225",
	directorTitle: "Генеральный директор",
	directorFullName: "Воронов Алексей Владимирович",
	city: "г. Москва",
};

const mockPatient = {
	fullName: "Ковалёв Роман Станиславович",
	birthDate: "12.04.1988",
	gender: "male" as const,
	phone: "+7 (999) 888-77-66",
	passportSeries: "4515",
	passportNumber: "892341",
	passportIssuedBy: "ОВД Тверского района города Москвы",
	passportIssuedDate: "20.05.2012",
	passportDepartmentCode: "770-015",
	address: "г. Москва, ул. Новослободская, д. 14, кв. 82",
	registrationAddress: "г. Москва, ул. Новослободская, д. 14, кв. 82",
	snils: "154-892-301 92",
	omsPolis: "7700 8923 1204 9512",
	cardNumber: "МК-2026/0418",
};

const mockContractData: A4DocumentContractData = {
	clinic: mockClinic,
	patient: mockPatient,
	contractNumber: "Д-2026/418",
	contractDate: "03 октября 2026",
	estimatedTotalRub: 18500,
	services: [
		{
			code804n: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			toothOrArea: "Полость рта",
			quantity: 1,
			unitPriceRub: 2500,
			totalRub: 2500,
		},
		{
			code804n: "A16.07.002",
			name: "Восстановление зуба пломбой (лечение кариеса дентина, световой композит)",
			toothOrArea: "16",
			quantity: 1,
			unitPriceRub: 9500,
			totalRub: 9500,
		},
	],
	clinicalReason: "Лечение кариеса дентина зуба 16",
	doctorFullName: "Воронов Алексей Владимирович",
};

const mockActData: A4DocumentActData = {
	clinic: mockClinic,
	patient: mockPatient,
	actNumber: "А-2026/418",
	actDate: "03 октября 2026",
	contractNumber: "Д-2026/418",
	contractDate: "03 октября 2026",
	doctorFullName: "Воронов Алексей Владимирович",
	doctorSpecialty: "Врач-стоматолог-терапевт",
	services: [
		{
			code804n: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			toothOrArea: "Полость рта",
			quantity: 1,
			unitPriceRub: 2500,
			discountRub: 0,
			totalRub: 2500,
		},
	],
	totalAmountRub: 2500,
	warrantyTermsText: "12 месяцев на терапевтические реставрации",
	fiscalReceiptNumber: "ФД-78412",
};

const mockTreatmentPlanData: A4DocumentTreatmentPlanData = {
	clinic: mockClinic,
	patient: mockPatient,
	planDate: "03 октября 2026",
	doctorFullName: "Воронов Алексей Владимирович",
	diagnosisSummary: "K02.1 Кариес дентина 16 зуба",
	stages: [
		{
			stageNumber: 1,
			stageName: "Этап I. Терапевтическая санация",
			stageTiming: "1–3 дня",
			plannedServices: [
				{
					name: "Лечение кариеса дентина зуба 16",
					toothOrArea: "16",
					timing: "1-й визит",
					priceRub: 9500,
				},
			],
			stageTotalRub: 9500,
		},
		{
			stageNumber: 2,
			stageName: "Этап II. Профессиональная гигиена",
			stageTiming: "через 5 дней",
			plannedServices: [
				{
					name: "Ультразвуковая чистка",
					toothOrArea: "11-48",
					timing: "2-й визит",
					priceRub: 6000,
				},
			],
			stageTotalRub: 6000,
		},
	],
	totalCostWithoutDiscountRub: 15500,
	discountRub: 0,
	totalCostWithDiscountRub: 15500,
	approvedVariantName: "Вариант «Стандарт»",
};

const mockConsentData: A4DocumentInformedConsentData = {
	consentNumber: "ИДС-2026/418",
	consentDate: "03 октября 2026",
	clinic: mockClinic,
	patient: mockPatient,
	doctorFullName: "Воронов Алексей Владимирович",
	doctorSpecialty: "Врач-стоматолог-терапевт",
	interventionName: "Лечение кариеса зуба 16 и местная анестезия",
	toothOrArea: "16",
	diagnosisSummary: "K02.1 Кариес дентина",
	contractNumber: "Д-2026/418",
	contractDate: "03 октября 2026",
	patientQuestionsAnswered: true,
};

const mockPersonalDataConsent: A4DocumentPersonalDataConsentData = {
	consentNumber: "ПД-2026/418",
	consentDate: "03 октября 2026",
	clinic: mockClinic,
	patient: mockPatient,
	thirdPartyTransfersAllowed: true,
	egiszTransferAllowed: true,
};

const mockMedicalCardData: A4DocumentMedicalCardData = {
	clinic: mockClinic,
	patient: mockPatient,
	cardNumber: "МК-2026/0418",
	visitDate: "03 октября 2026",
	doctorFullName: "Воронов Алексей Владимирович",
	doctorSpecialty: "Врач-стоматолог-терапевт",
	allergyStatus: "Не отягощен",
	somaticStatus: "Соматически здоров",
	complaints: "Жалобы на боли от сладкого",
	anamnesisMorbi: "Боли около 2 недель",
	statusLocalis: "Кариозная полость на 16 зубе",
	teethFormulaSummary: "16 — C (кариес)",
	teethFormulaMap: {
		16: { state: "C", label: "Кариес" },
	},
	diagnosisIcd10: "K02.1",
	diagnosisDescription: "Кариес дентина",
	diagnosisTooth: "16",
	treatmentProtocol: "Препарирование, медикаментозная обработка, пломба световой композит.",
	materialsUsed: "Harmonize A3, OptiBond FL",
	recommendations: "Контрольный осмотр через 6 месяцев.",
};

function countA4PageSheets(html: string): number {
	const matches = html.match(/class="[^"]*pro-a4-page-sheet[^"]*"/g);
	return matches ? matches.length : 0;
}

describe("Professional A4 Document Sheet & Preview Modal (SSR Safe Tests)", () => {
	it("renders Tab 1 (Contract) with exactly 3 discrete A4 sheets, PP 736 and stamp box", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="contract"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.equal(countA4PageSheets(html), 3, "Contract must render strictly 3 A4 sheets");
		assert.ok(html.includes("ДОГОВОР № Д-2026/418"));
		assert.ok(html.includes("Постановлением Правительства РФ от 11.05.2023 № 736"));
		assert.ok(html.includes("Ковалёв Роман Станиславович"));
		assert.ok(html.includes("М.П."));
		assert.ok(html.includes("a4-table"));
		assert.ok(html.includes("B01.065.001"));
		assert.ok(html.includes("Лист 1 из 3"));
		assert.ok(html.includes("Лист 2 из 3"));
		assert.ok(html.includes("Лист 3 из 3"));
	});

	it("renders Tab 2 (Act of Completed Works) with exactly 1 discrete A4 sheet and 804n", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="act"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.equal(countA4PageSheets(html), 1, "Act must render strictly 1 A4 sheet");
		assert.ok(html.includes("АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ"));
		assert.ok(html.includes("Номенклатура МЗ РФ № 804н"));
		assert.ok(html.includes("Услуги оказаны в полном объеме"));
		assert.ok(html.includes("Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею"));
		assert.ok(html.includes("УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ)"));
		assert.ok(html.includes("УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК)"));
		assert.ok(html.includes("Лист 1 из 1"));
	});

	it("renders Tab 3 (Treatment Plan) with exactly 2 discrete A4 sheets, stages and patient approval", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="treatment_plan"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.equal(countA4PageSheets(html), 2, "Treatment plan must render strictly 2 A4 sheets");
		assert.ok(html.includes("ПЛАН КОМПЛЕКСНОГО СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ И СМЕТА"));
		assert.ok(html.includes("Этап I. Терапевтическая санация"));
		assert.ok(html.includes("Блок информированного согласования плана лечения пациентом"));
		assert.ok(html.includes("ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ)"));
		assert.ok(html.includes("с планом, сроками и стоимостью согласен"));
		assert.ok(html.includes("Лист 1 из 2"));
		assert.ok(html.includes("Лист 2 из 2"));
	});

	it("renders Tab 4 (Informed Consent 1051n) with exactly 2 discrete A4 sheets and art. 20 323-FZ", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="consent_1051n"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.equal(countA4PageSheets(html), 2, "Informed consent must render strictly 2 A4 sheets");
		assert.ok(html.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
		assert.ok(html.includes("Приказом Министерства здравоохранения Российской Федерации от 12.11.2021 № 1051н"));
		assert.ok(html.includes("Характер и цели медицинского вмешательства"));
		assert.ok(html.includes("ВРАЧ, ПРОВЕДШИЙ БЕСЕДУ"));
		assert.ok(html.includes("ПАЦИЕНТ (ЗАКАЗЧИК)"));
		assert.ok(html.includes("М.П."));
		assert.ok(html.includes("Лист 1 из 2"));
		assert.ok(html.includes("Лист 2 из 2"));
	});

	it("renders Tab 5 (Personal Data Consent 152-FZ) with exactly 1 discrete A4 sheet and 25-year storage", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="personal_data"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.equal(countA4PageSheets(html), 1, "Personal data consent must render strictly 1 A4 sheet");
		assert.ok(html.includes("СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ"));
		assert.ok(html.includes("Федеральным законом от 27.07.2006 № 152-ФЗ"));
		assert.ok(html.includes("Постановлением Правительства РФ от 09.02.2022 № 140 (ЕГИСЗ)"));
		assert.ok(html.includes("25 лет"));
		assert.ok(html.includes("ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ"));
		assert.ok(html.includes("СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ"));
		assert.ok(html.includes("Лист 1 из 1"));
	});

	it("renders Tab 6 (Medical Card / Diary) with exactly 2 discrete A4 sheets, FDI chart and NO 043u in title", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="medical_card"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.equal(countA4PageSheets(html), 2, "Medical card must render strictly 2 A4 sheets");
		assert.ok(html.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА"));
		// Invariant: strictly ZERO "043у" in titles or headings!
		assert.ok(!html.includes("Форма № 043/у"));
		assert.ok(!html.includes("Форма 043/у"));
		assert.ok(html.includes("Зубная формула (FDI World Dental Federation)"));
		assert.ok(html.includes("K02.1"));
		assert.ok(html.includes("Кариес дентина"));
		assert.ok(html.includes("Лист 1 из 2"));
		assert.ok(html.includes("Лист 2 из 2"));
	});

	it("renders 1-line ergonomic toolbar with 6 tabs, zoom controls and print button", () => {
		const html = renderToString(
			<ProfessionalDocumentA4Sheet
				activeTab="contract"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.ok(html.includes("pro-a4-toolbar"));
		assert.ok(html.includes("a4-tab-contract"));
		assert.ok(html.includes("a4-tab-act"));
		assert.ok(html.includes("a4-tab-treatment-plan"));
		assert.ok(html.includes("a4-tab-consent-1051n"));
		assert.ok(html.includes("a4-tab-personal-data"));
		assert.ok(html.includes("a4-tab-medical-card"));
		assert.ok(html.includes("zoom-80"));
		assert.ok(html.includes("zoom-100"));
		assert.ok(html.includes("zoom-fit"));
		assert.ok(html.includes("btn-print-a4-document"));
		assert.ok(html.includes("Формат A4 · 210 × 297 мм · ГОСТ"));
	});

	it("renders DocumentA4PrintPreviewModal without crashing when open and supports all tabs", () => {
		const html = renderToString(
			<DocumentA4PrintPreviewModal
				isOpen={true}
				onClose={() => {}}
				initialTab="contract"
				contractData={mockContractData}
				actData={mockActData}
				treatmentPlanData={mockTreatmentPlanData}
				consentData={mockConsentData}
				personalDataConsent={mockPersonalDataConsent}
				medicalCardData={mockMedicalCardData}
			/>,
		);

		assert.ok(html.includes("modal-a4-document-preview"));
		assert.ok(html.includes("Официальный документооборот клиники · Стандарт A4"));
		assert.ok(html.includes("ДОГОВОР № Д-2026/418"));
	});
});
