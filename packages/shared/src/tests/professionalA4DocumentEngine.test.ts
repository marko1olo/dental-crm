import { test } from "node:test";
import assert from "node:assert/strict";
import {
	generateA4PaidContractHtml,
	generateA4CompletedWorksActHtml,
	generateA4TreatmentPlanHtml,
	generateA4MedicalCardDiaryHtml,
	formatAmountInWordsRu,
	formatRubles,
	type A4DocumentContractData,
	type A4DocumentActData,
	type A4DocumentTreatmentPlanData,
	type A4DocumentMedicalCardData,
} from "../documents/professionalA4DocumentEngine.js";

const sampleClinic = {
	name: "Стоматологическая клиника ДЕНТЕ Премиум",
	legalName: 'ООО "Стоматология ДЕНТЕ Премиум"',
	shortName: 'ООО "ДЕНТЕ"',
	address: "119002, г. Москва, ул. Арбат, д. 25, стр. 1",
	actualAddress: "119002, г. Москва, ул. Арбат, д. 25, стр. 1",
	inn: "7704123456",
	kpp: "770401001",
	ogrn: "1227700456789",
	licenseNumber: "ЛО41-01137-77/00345678",
	licenseDate: "15.03.2023",
	licenseIssuer: "Департамент здравоохранения города Москвы",
	phone: "+7 (495) 789-01-23",
	email: "info@dente-clinic.ru",
	website: "https://dente-clinic.ru",
	bankName: 'ПАО "Сбербанк"',
	bik: "044525225",
	checkingAccount: "40702810938000123456",
	correspondentAccount: "30101810400000000225",
	directorTitle: "Генеральный директор",
	directorFullName: "Воронов А. В.",
	city: "г. Москва",
};

const samplePatient = {
	fullName: "Ковалёв Роман Станиславович",
	birthDate: "12.04.1988",
	gender: "male" as const,
	phone: "+7 (999) 888-77-66",
	passportSeries: "4512",
	passportNumber: "789123",
	passportIssuedBy: "ГУ МВД России по г. Москве",
	passportIssuedDate: "20.05.2015",
	passportDepartmentCode: "770-025",
	address: "г. Москва, ул. Тверская, д. 4, кв. 18",
	registrationAddress: "г. Москва, ул. Тверская, д. 4, кв. 18",
	snils: "123-456-789 00",
	cardNumber: "МК-2026/884",
};

test("formatAmountInWordsRu produces correct Russian declensions with kopecks", () => {
	assert.equal(formatAmountInWordsRu(14850), "Четырнадцать тысяч восемьсот пятьдесят рублей 00 копеек");
	assert.equal(formatAmountInWordsRu(140000.5), "Сто сорок тысяч рублей 50 копеек");
	assert.equal(formatAmountInWordsRu(1001.21), "Одна тысяча один рубль 21 копейка");
	assert.equal(formatAmountInWordsRu(24.03), "Двадцать четыре рубля 03 копейки");
});

test("generateA4PaidContractHtml produces strict A4 print layout per Government Decree #736", () => {
	const contractData: A4DocumentContractData = {
		contractNumber: "ДОГ-2026/884",
		contractDate: "03.10.2026",
		clinic: sampleClinic,
		patient: samplePatient,
		estimatedTotalRub: 14850,
		doctorFullName: "Воронов Алексей Владимирович",
		clinicalReason: "Лечение кариеса дентина зуба 16 и эстетическая реставрация",
		services: [
			{
				code804n: "B01.065.001",
				name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
				toothOrArea: "—",
				quantity: 1,
				unitPriceRub: 1500,
				totalRub: 1500,
			},
			{
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой (лечение кариеса дентина композитом светового отверждения)",
				toothOrArea: "16",
				quantity: 1,
				unitPriceRub: 13350,
				totalRub: 13350,
			},
		],
	};

	const html = generateA4PaidContractHtml(contractData);

	// Проверяем формат A4 и типографику
	assert.ok(html.includes("size: A4 portrait"));
	assert.ok(html.includes("PT Astra Serif") || html.includes("Times New Roman"));
	assert.ok(html.includes("ДОГОВОР № ДОГ-2026/884"));
	assert.ok(html.includes("Постановлением Правительства РФ от 11.05.2023 № 736"));
	
	// Проверяем реквизиты обеих сторон
	assert.ok(html.includes("ООО &quot;Стоматология ДЕНТЕ Премиум&quot;"));
	assert.ok(html.includes("ЛО41-01137-77/00345678"));
	assert.ok(html.includes("Ковалёв Роман Станиславович"));
	assert.ok(html.includes("4512 № 789123"));
	assert.ok(html.includes("14 850,00"));
	assert.ok(html.includes("Четырнадцать тысяч восемьсот пятьдесят рублей 00 копеек"));

	// Проверяем юридические положения: госгарантии, 152-ФЗ, запрет на одностороннее изменение
	assert.ok(html.includes("программе государственных гарантий бесплатного оказания"));
	assert.ok(html.includes("Федеральным законом № 152-ФЗ"));
	assert.ok(html.includes("Запрет на навязывание услуг"));

	// Места для подписей и печатей
	assert.ok(html.includes("ИСПОЛНИТЕЛЬ"));
	assert.ok(html.includes("ЗАКАЗЧИК (ПАЦИЕНТ)"));
	assert.ok(html.includes("М.П."));
});

test("generateA4CompletedWorksActHtml generates statutory act with 804n codes and legal acceptance wording", () => {
	const actData: A4DocumentActData = {
		actNumber: "АВР-2026/884",
		actDate: "03.10.2026",
		contractNumber: "ДОГ-2026/884",
		contractDate: "03.10.2026",
		clinic: sampleClinic,
		patient: samplePatient,
		doctorFullName: "Воронов Алексей Владимирович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		totalAmountRub: 14850,
		fiscalReceiptNumber: "ФД-45812",
		services: [
			{
				code804n: "B01.065.001",
				name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
				toothOrArea: "—",
				quantity: 1,
				unitPriceRub: 1500,
				totalRub: 1500,
			},
			{
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой светового отверждения Harmonize",
				toothOrArea: "16",
				quantity: 1,
				unitPriceRub: 13350,
				totalRub: 13350,
			},
		],
	};

	const html = generateA4CompletedWorksActHtml(actData);

	assert.ok(html.includes("АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № АВР-2026/884"));
	assert.ok(html.includes("ДОГ-2026/884"));
	assert.ok(html.includes("B01.065.001"));
	assert.ok(html.includes("A16.07.002.001"));
	assert.ok(html.includes("14 850,00"));
	assert.ok(html.includes("Четырнадцать тысяч восемьсот пятьдесят рублей 00 копеек"));

	// Проверяем обязательную юридическую формулу сдачи-приемки
	assert.ok(html.includes("Услуги оказаны в полном объеме, в установленные сроки, с надлежащим качеством"));
	assert.ok(html.includes("Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею"));

	// Подписи обеих сторон и печать
	assert.ok(html.includes("УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ)"));
	assert.ok(html.includes("УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК)"));
	assert.ok(html.includes("М.П."));
});

test("generateA4TreatmentPlanHtml produces structured stages and patient approval agreement block", () => {
	const planData: A4DocumentTreatmentPlanData = {
		planDate: "03.10.2026",
		clinic: sampleClinic,
		patient: samplePatient,
		doctorFullName: "Воронов Алексей Владимирович",
		clinicalReason: "Множественный кариес, вторичная частичная адентия",
		diagnosisSummary: "К02.1 Кариес дентина 16, 24; К04.0 Пульпит 21; К08.1 Потеря зубов 36, 46",
		stages: [
			{
				stageNumber: 1,
				stageName: "1 этап: Неотложная терапевтическая санация и эндодонтия",
				stageTiming: "1–2 недели",
				plannedServices: [
					{ name: "Эндодонтическое лечение корневых каналов зуба 21", toothOrArea: "21", timing: "Визит 1-2", priceRub: 18500 },
					{ name: "Лечение кариеса дентина зуба 16 с реставрацией", toothOrArea: "16", timing: "Визит 1", priceRub: 13350 },
				],
				stageTotalRub: 31850,
			},
			{
				stageNumber: 2,
				stageName: "2 этап: Хирургическая санация и дентальная имплантация",
				stageTiming: "2–3 месяца",
				plannedServices: [
					{ name: "Установка дентального имплантата Straumann (область 36)", toothOrArea: "36", timing: "Хирургический этап", priceRub: 55000 },
					{ name: "Установка дентального имплантата Straumann (область 46)", toothOrArea: "46", timing: "Хирургический этап", priceRub: 55000 },
				],
				stageTotalRub: 110000,
			},
			{
				stageNumber: 3,
				stageName: "3 этап: Ортопедическая реабилитация",
				stageTiming: "через 3-4 месяца после остеоинтеграции",
				plannedServices: [
					{ name: "Коронка из диоксида циркония на имплантат 36", toothOrArea: "36", timing: "Ортопедический этап", priceRub: 38000 },
					{ name: "Коронка из диоксида циркония на имплантат 46", toothOrArea: "46", timing: "Ортопедический этап", priceRub: 38000 },
				],
				stageTotalRub: 76000,
			},
		],
		totalCostWithoutDiscountRub: 217850,
		discountRub: 10000,
		totalCostWithDiscountRub: 207850,
		approvedVariantName: "Комплексный оптимальный план с имплантацией Straumann",
	};

	const html = generateA4TreatmentPlanHtml(planData);

	assert.ok(html.includes("ПЛАН КОМПЛЕКСНОГО ЛЕЧЕНИЯ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"));
	assert.ok(html.includes("1 этап: Неотложная терапевтическая санация"));
	assert.ok(html.includes("2 этап: Хирургическая санация и дентальная имплантация"));
	assert.ok(html.includes("3 этап: Ортопедическая реабилитация"));
	assert.ok(html.includes("207 850,00"));

	// Проверяем блок согласования пациентом
	assert.ok(html.includes("Блок согласования плана лечения пациентом"));
	assert.ok(html.includes("Мне понятен план, этапность, ориентировочные сроки"));
	assert.ok(html.includes("ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ)"));
	assert.ok(html.includes("Комплексный оптимальный план с имплантацией Straumann"));
});

test("generateA4MedicalCardDiaryHtml contains ZERO 043u in title and full clinical FDI formula", () => {
	const cardData: A4DocumentMedicalCardData = {
		cardNumber: "МК-2026/884",
		visitDate: "03.10.2026",
		clinic: sampleClinic,
		patient: samplePatient,
		doctorFullName: "Воронов Алексей Владимирович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		complaints: "Жалобы на кратковременные боли от сладкого и холодного в области зуба 16",
		anamnesisMorbi: "Боли появились около 2 недель назад, усиливаются при приеме сладкой пищи.",
		anamnesisVitae: "Соматический анамнез не отягощен. Туберкулез, гепатит, ВИЧ отрицает.",
		allergyStatus: "Лидокаин (анамнестически крапивница). Переносит Артикаин 4% без осложнений.",
		somaticStatus: "Соматически здоров, АД 120/80 мм рт. ст., пульс 72 уд/мин.",
		statusLocalis: "На окклюзионно-медиальной поверхности зуба 16 глубокая кариозная полость, зондирование болезненно по эмалево-дентинной границе.",
		diagnosisIcd10: "K02.1",
		diagnosisDescription: "Кариес дентина зуба 16 (глубокий кариес)",
		diagnosisTooth: "16",
		teethFormulaMap: {
			16: { state: "C", label: "кариес" },
			21: { state: "П", label: "пломба" },
			24: { state: "C", label: "кариес" },
			36: { state: "0", label: "отсутствует" },
			46: { state: "0", label: "отсутствует" },
		},
		teethFormulaSummary: "16: кариес; 21: пломба; 24: кариес; 36: отсутствует; 46: отсутствует; остальные зубы интактны",
		treatmentProtocol: "Инфильтрационная анестезия Артикаин 4% 1:200000 1.7 мл. Препарирование кариозной полости зуба 16, медикаментозная обработка 2% хлоргексидином. Адгезивный протокол OptiBond FL. Восстановление композитом Harmonize A3/A2. Шлифовка, полировка.",
		materialsUsed: "Артикаин 4% (1.7 мл), OptiBond FL, Harmonize A3, A2, Enhance, Prisma Gloss",
		recommendations: "Воздержаться от приема красящей пищи в течение 24 часов. Контрольный осмотр через 6 месяцев.",
		nextVisitDate: "10.10.2026",
	};

	const html = generateA4MedicalCardDiaryHtml(cardData);

	// Строгий запрет на "043у" в заголовках!
	assert.ok(html.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА"));
	assert.ok(!html.includes("<h1>Форма № 043/у</h1>"));
	assert.ok(!html.includes("Форма 043/у ("));

	// Проверяем разделы
	assert.ok(html.includes("1. Паспортная часть и соматический статус"));
	assert.ok(html.includes("2. Протокол клинического осмотра и статус полости рта"));
	assert.ok(html.includes("3. Зубная формула (FDI World Dental Federation)"));
	assert.ok(html.includes("4. Клинический диагноз (МКБ-10)"));
	assert.ok(html.includes("5. Дневник приёма и протокол проведённого лечения"));
	assert.ok(html.includes("K02.1"));
	assert.ok(html.includes("Harmonize A3/A2"));
	assert.ok(html.includes("ЛЕЧАЩИЙ ВРАЧ"));
	assert.ok(html.includes("М.П."));
});
