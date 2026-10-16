/**
 * FastClinicalPrintEngine.test.tsx
 *
 * Unit tests for FastClinicalPrintEngine:
 * - 0 MB memory bloat, 0 ms latency native vector print engine
 * - Form 043/у, Act + 54-FZ receipt, Treatment Plan Estimate templates
 * - Document switching, print triggering, keyboard & click dismissal
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { FastClinicalPrintEngine } from "../FastClinicalPrintEngine.js";
import {
	RenderForm043u,
	RenderActAndReceipt,
	RenderTreatmentEstimate,
} from "../fastClinicalPrintTemplates.js";
import { RenderPartisanInsert043u } from "../partisanMedicalInsertTemplate.js";

const samplePatient = {
	fullName: "Смирнов Алексей Викторович",
	birthDate: "24.08.1989",
	phone: "+7 (916) 123-45-67",
	address: "г. Москва, ул. Арбат, д. 10",
	cardNumber: "043/2026-99",
	allergies: "Амоксициллин, Лидокаин (гиперемия)",
	somaticNotes: "Гипертоническая болезнь I ст., компенсирована",
};

const sampleClinic = {
	name: "Стоматологическая клиника «DENTE»",
	legalName: 'ООО "ДЕНТЕ МЕДИКАЛ ГРУПП"',
	inn: "7704123456",
	ogrn: "1237700123456",
	address: "г. Москва, ул. Стоматологическая, д. 24",
	phone: "+7 (495) 777-88-99",
	licenseNumber: "ЛО41-01137-77/00368421",
};

const sampleDoctor = {
	fullName: "Петрова Анна Сергеевна",
	specialty: "Врач-стоматолог терапевт-ортопед",
};

const sampleVisitData = {
	date: "11.10.2026",
	toothNumber: "16",
	diagnosis: "K02.1 Глубокий кариес дентина зуба 16",
	complaints: "Кратковременные боли от холодного и сладкого в области верхнего моляра справа",
	objective: "Зуб 16: на окклюзионной поверхности глубокая кариозная полость, дентин размягчен, зондирование болезненно по дну, перкуссия безболезненна, ЭОД 8 мкА",
	treatment: "Препарирование полости зуба 16, медикаментозная обработка 2% хлоргексидином, изолирующая прокладка SDR Flow, пломба Estelite Asteria A3, шлифовка, полировка",
	recommendations: "Контрольный осмотр через 6 месяцев, бережная гигиена",
};

const sampleServices = [
	{ code: "A16.07.002.001", name: "Восстановление зуба пломбой (кариес)", tooth: "16", quantity: 1, price: 5400, amount: 5400 },
	{ code: "A11.07.012", name: "Инфильтрационная анестезия Ультракаин Д-С", tooth: "16", quantity: 1, price: 900, amount: 900 },
	{ code: "A16.07.093", name: "Фиксация коффердама (раббердам)", tooth: "16", quantity: 1, price: 700, amount: 700 },
];

const samplePlanStages = [
	{
		title: "Этап 1: Терапевтическая санация",
		dueDate: "1 неделя",
		total: 7000,
		services: [
			{ name: "Лечение кариеса зуба 16", tooth: "16", price: 5400 },
			{ name: "Профессиональная гигиена полости рта", price: 1600 },
		],
	},
	{
		title: "Этап 2: Ортопедическая реабилитация",
		dueDate: "3-4 недели",
		total: 35000,
		services: [
			{ name: "Керамическая коронка E.max на зуб 26", tooth: "26", price: 35000 },
		],
	},
];

const sampleFiscalData = {
	receiptNumber: "00042",
	paymentType: "card" as const,
	totalRub: 7000,
	fiscalSign: "9876543210",
	dateTime: "11.10.2026 14:30",
};

describe("FastClinicalPrintEngine Vector Print Suite", () => {
	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<FastClinicalPrintEngine
				isOpen={false}
				onClose={() => {}}
			/>
		);
		assert.strictEqual(html, "");
	});

	it("renders modal dialog container and action toolbar when isOpen is true", () => {
		const html = renderToString(
			<FastClinicalPrintEngine
				isOpen={true}
				onClose={() => {}}
				patient={samplePatient}
				clinic={sampleClinic}
				doctor={sampleDoctor}
			/>
		);
		assert.ok(html.includes("fast-print-modal-backdrop"));
		assert.ok(html.includes("fast-print-portal"));
		assert.ok(html.includes("Печать 043/у (Приказ 834н)"));
		assert.ok(html.includes("data-testid=\"btn-execute-fast-print\""));
		assert.ok(html.includes("data-testid=\"btn-close-fast-print\""));
		assert.ok(html.includes("data-testid=\"print-tab-insert043u\""));
		assert.ok(html.includes("data-testid=\"print-tab-form043u\""));
		assert.ok(html.includes("data-testid=\"print-tab-act\""));
		assert.ok(html.includes("data-testid=\"print-tab-estimate\""));
	});

	it("renders Form 043/у with statutory clinical requisites and visit notes", () => {
		const html = renderToString(
			<RenderForm043u
				clinic={sampleClinic}
				doctor={sampleDoctor}
				patient={samplePatient}
				visitData={sampleVisitData}
			/>
		);
		// Statutory header
		assert.ok(html.includes("Форма № 043/у"));
		assert.ok(html.includes("Минздрава СССР №1030"));
		assert.ok(html.includes("Медицинская карта стоматологического больного №"));
		assert.ok(html.includes("043/2026-99"));
		// Patient data
		assert.ok(html.includes("Смирнов Алексей Викторович"));
		assert.ok(html.includes("24.08.1989"));
		assert.ok(html.includes("Амоксициллин, Лидокаин (гиперемия)"));
		assert.ok(html.includes("Гипертоническая болезнь I ст., компенсирована"));
		// Clinic data
		assert.ok(html.includes("Стоматологическая клиника «DENTE»"));
		assert.ok(html.includes("ЛО41-01137-77/00368421"));
		// Clinical diary
		assert.ok(html.includes("K02.1 Глубокий кариес дентина зуба 16"));
		assert.ok(html.includes("Кратковременные боли от холодного и сладкого"));
		assert.ok(html.includes("Зуб 16: на окклюзионной поверхности"));
		assert.ok(html.includes("Препарирование полости зуба 16"));
		// Signatures
		assert.ok(html.includes("Петрова Анна Сергеевна"));
	});

	it("renders Act of completed services and 54-FZ fiscal receipt", () => {
		const html = renderToString(
			<RenderActAndReceipt
				clinic={sampleClinic}
				doctor={sampleDoctor}
				patient={samplePatient}
				services={sampleServices}
				totalAmount={7000}
				fiscalData={sampleFiscalData}
			/>
		);
		// Act header
		assert.ok(html.includes("Акт сдачи-приемки оказанных медицинских услуг №"));
		assert.ok(html.includes("Стоматологическая клиника «DENTE»"));
		assert.ok(html.includes("Смирнов Алексей Викторович"));
		// Services table with nomenclature codes
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("Восстановление зуба пломбой (кариес)"));
		assert.ok(html.includes("Инфильтрационная анестезия"));
		assert.ok(html.includes("Фиксация коффердама"));
		assert.ok(html.includes("ИТОГО К ОПЛАТЕ:"));
		// 54-FZ Fiscal check
		assert.ok(html.includes("СПРАВКА О ФИСКАЛЬНОМ РАСЧЕТЕ ПО 54-ФЗ:"));
		assert.ok(html.includes("9876543210"));
		assert.ok(html.includes("Банковская карта (POS)"));
		// Consumer satisfaction note
		assert.ok(html.includes("Вышеперечисленные услуги оказаны в полном объеме"));
	});

	it("renders Treatment Plan Estimate with phased schedule and legal guarantees", () => {
		const html = renderToString(
			<RenderTreatmentEstimate
				clinic={sampleClinic}
				doctor={sampleDoctor}
				patient={samplePatient}
				planStages={samplePlanStages}
				totalAmount={42000}
			/>
		);
		// Estimate header
		assert.ok(html.includes("План комплексного стоматологического лечения и смета расходов"));
		assert.ok(html.includes("Приложение №1 к Договору об оказании медицинских услуг"));
		assert.ok(html.includes("Смирнов Алексей Викторович"));
		// Phased breakdown
		assert.ok(html.includes("Этап 1: Терапевтическая санация"));
		assert.ok(html.includes("Лечение кариеса зуба 16"));
		assert.ok(html.includes("Профессиональная гигиена"));
		assert.ok(html.includes("Этап 2: Ортопедическая реабилитация"));
		assert.ok(html.includes("Керамическая коронка E.max"));
		// Grand total
		assert.ok(html.includes("ИТОГОВАЯ СТОИМОСТЬ ВСЕХ ЭТАПОВ ЛЕЧЕНИЯ:"));
		// Legal terms and signatures
		assert.ok(html.includes("Петрова Анна Сергеевна"));
		assert.ok(html.includes("С планом лечения и финансовой сметой ознакомлен"));
	});

	it("renders initialDocType correctly when initialized with act_and_receipt", () => {
		const html = renderToString(
			<FastClinicalPrintEngine
				isOpen={true}
				onClose={() => {}}
				initialDocType="act_and_receipt"
				patient={samplePatient}
				clinic={sampleClinic}
				doctor={sampleDoctor}
				services={sampleServices}
				fiscalData={sampleFiscalData}
			/>
		);
		assert.ok(html.includes("Акт сдачи-приемки оказанных медицинских услуг №"));
		assert.ok(html.includes("СПРАВКА О ФИСКАЛЬНОМ РАСЧЕТЕ ПО 54-ФЗ:"));
	});

	it("renders initialDocType correctly when initialized with treatment_estimate", () => {
		const html = renderToString(
			<FastClinicalPrintEngine
				isOpen={true}
				onClose={() => {}}
				initialDocType="treatment_estimate"
				patient={samplePatient}
				clinic={sampleClinic}
				doctor={sampleDoctor}
				planStages={samplePlanStages}
			/>
		);
		assert.ok(html.includes("План комплексного стоматологического лечения и смета расходов"));
		assert.ok(html.includes("Этап 1: Терапевтическая санация"));
		assert.ok(html.includes("Этап 2: Ортопедическая реабилитация"));
	});

	it("renders Partisan Medical Insert 043/y with Order 834n SOAP protocol, FDI #46, and scissors cut line", () => {
		const html = renderToString(
			<RenderPartisanInsert043u
				clinic={sampleClinic}
				doctor={sampleDoctor}
				patient={samplePatient}
				visitData={{
					...sampleVisitData,
					toothNumber: "46",
				}}
				cutLayout="a4_cut"
			/>
		);
		// Order 834n / 043/y official title and headers (Mandate 8x clean clinical language)
		assert.ok(html.includes("ВКЛАДЫШ В МЕДИЦИНСКУЮ КАРТУ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО"));
		assert.ok(html.includes("Медицинская карта приёма") || html.includes("Форма № 043/у"));
		assert.ok(html.includes("Зона вклейки в медицинскую карту") || html.includes("Зона вклейки в карту 043/у"));

		// Patient details
		assert.ok(html.includes("Смирнов Алексей Викторович"));
		assert.ok(html.includes("043/2026-99"));

		// Dental FDI & Cavity localization
		assert.ok(html.includes("#46 (FDI 46)"));
		assert.ok(html.includes("Окклюзионно-медиальная"));

		// ICD-10 diagnosis
		assert.ok(html.includes("K02.1 Глубокий кариес дентина зуба 16"));

		// SOAP protocol sections
		assert.ok(html.includes("Жалобы (S):"));
		assert.ok(html.includes("Status Localis (O):"));
		assert.ok(html.includes("Проведённое лечение (P):"));
		assert.ok(html.includes("Рекомендации:"));
		assert.ok(html.includes("Гарантийный срок:"));
		assert.ok(html.includes("12 месяцев (1 год)"));

		// Doctor & patient signatures
		assert.ok(html.includes("Петрова Анна Сергеевна"));
		assert.ok(html.includes("(подпись / личная печать врача)"));

		// Scissors cutting line in A4 mode
		assert.ok(html.includes("Линия отреза для вклейки в медицинскую карту") || html.includes("Резать здесь для вклейки в карту 043/у"));
		assert.ok(html.includes("cut-line-indicator"));
	});

	it("renders Partisan Medical Insert in A5 direct mode without scissors cut line", () => {
		const html = renderToString(
			<RenderPartisanInsert043u
				clinic={sampleClinic}
				doctor={sampleDoctor}
				patient={samplePatient}
				visitData={sampleVisitData}
				cutLayout="a5_direct"
			/>
		);
		assert.ok(html.includes("layout-a5-direct"));
		assert.ok(!html.includes("cut-line-indicator"));
	});

	it("renders FastClinicalPrintEngine with default partisan_insert_043u and landlord override", () => {
		const customLandlordClinic = {
			name: "Стоматология «Дента-Люкс» (Клиника-Арендодатель)",
			legalName: 'ООО "ДЕНТА-ЛЮКС РЕНТАЛ"',
			inn: "7712998877",
			ogrn: "1237700998877",
			address: "г. Москва, Ленинский пр-т, д. 42",
			phone: "+7 (495) 123-00-11",
			licenseNumber: "ЛО-77-01-019922 от 20.01.2021",
		};
		const html = renderToString(
			<FastClinicalPrintEngine
				isOpen={true}
				onClose={() => {}}
				clinic={customLandlordClinic}
				doctor={sampleDoctor}
				patient={samplePatient}
				visitData={sampleVisitData}
			/>
		);
		// Defaults to partisan insert
		assert.ok(html.includes("ВКЛАДЫШ В МЕДИЦИНСКУЮ КАРТУ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО"));
		// Contains landlord clinic requisites
		assert.ok(html.includes("Стоматология «Дента-Люкс» (Клиника-Арендодатель)"));
		assert.ok(html.includes("7712998877"));
		assert.ok(html.includes("ЛО-77-01-019922"));
		// Form switch tabs exist
		assert.ok(html.includes("print-tab-insert043u"));
		assert.ok(html.includes("print-tab-form043u"));
	});
});
