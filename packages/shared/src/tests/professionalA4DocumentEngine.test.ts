import { test } from "node:test";
import assert from "node:assert/strict";
import {
	generateA4PaidContractHtml,
	generateA4CompletedWorksActHtml,
	generateA4TreatmentPlanHtml,
	generateA4MedicalCardDiaryHtml,
	generateA4InformedConsentHtml,
	generateA4PersonalDataConsentHtml,
	formatAmountInWordsRu,
	formatRubles,
	formatPassportString,
	formatAddressString,
	formatPhoneString,
	formatSnilsString,
	formatDateString,
	type A4DocumentContractData,
	type A4DocumentActData,
	type A4DocumentTreatmentPlanData,
	type A4DocumentMedicalCardData,
	type A4DocumentInformedConsentData,
	type A4DocumentPersonalDataConsentData,
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
	omsPolis: "7700 8923 1204 9512",
	cardNumber: "МК-2026/884",
};

function countA4Pages(html: string): number {
	const matches = html.match(/class="a4-page"/g);
	return matches ? matches.length : 0;
}

test("formatAmountInWordsRu produces correct Russian declensions with kopecks", () => {
	assert.equal(formatAmountInWordsRu(14850), "Четырнадцать тысяч восемьсот пятьдесят рублей 00 копеек");
	assert.equal(formatAmountInWordsRu(140000.5), "Сто сорок тысяч рублей 50 копеек");
	assert.equal(formatAmountInWordsRu(1001.21), "Одна тысяча один рубль 21 копейка");
	assert.equal(formatAmountInWordsRu(24.03), "Двадцать четыре рубля 03 копейки");
});

test("Blank line helper functions generate statutory blanks for missing database fields", () => {
	assert.ok(formatPassportString({ fullName: "Тест" }).includes("серия ______ № __________"));
	assert.ok(formatAddressString(null).includes("_______"));
	assert.ok(formatPhoneString(null).includes("+7 (____) ___-__-__"));
	assert.ok(formatSnilsString(null).includes("___-___-___ __"));
	assert.ok(formatDateString(null).includes("«___» _________ 20__ г."));
});

test("generateA4PaidContractHtml produces strictly 3 A4 sheets per Government Decree #736 and GOST", () => {
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

	// 1. Проверяем СТРОГО 3 листа A4
	assert.equal(countA4Pages(html), 3, "Contract must consist of exactly 3 A4 pages");

	// 2. Проверяем колонтитулы «Стр. 1 из 3», «Стр. 2 из 3», «Стр. 3 из 3»
	assert.ok(html.includes("Стр. 1 из 3"));
	assert.ok(html.includes("Стр. 2 из 3"));
	assert.ok(html.includes("Стр. 3 из 3"));
	assert.ok(html.includes("Лист 2"));
	assert.ok(html.includes("Лист 3"));

	// 3. Проверяем ГОСТ-типографику и стили
	assert.ok(html.includes("size: A4 portrait"));
	assert.ok(html.includes("PT Astra Serif") || html.includes("Times New Roman"));
	assert.ok(html.includes("20mm")); // Левое поле 20 мм под скоросшиватель

	// 4. Проверяем реквизиты клиники и пациента
	assert.ok(html.includes("ДОГОВОР № ДОГ-2026/884"));
	assert.ok(html.includes("Постановлением Правительства РФ от 11.05.2023 № 736"));
	assert.ok(html.includes("ООО &quot;Стоматология ДЕНТЕ Премиум&quot;"));
	assert.ok(html.includes("ЛО41-01137-77/00345678"));
	assert.ok(html.includes("Ковалёв Роман Станиславович"));
	assert.ok(html.includes("4512 № 789123"));
	assert.ok(html.includes("14 850,00"));
	assert.ok(html.includes("Четырнадцать тысяч восемьсот пятьдесят рублей 00 копеек"));

	// 5. Проверяем разделы договора
	assert.ok(html.includes("1. Предмет договора и уведомление о государственных гарантиях"));
	assert.ok(html.includes("программе государственных гарантий бесплатного оказания"));
	assert.ok(html.includes("2. Перечень и ориентировочная стоимость услуг"));
	assert.ok(html.includes("3. Условия и порядок предоставления медицинских услуг"));
	assert.ok(html.includes("4. Права и обязанности Сторон"));
	assert.ok(html.includes("опоздании Пациента более чем на 15 минут"));
	assert.ok(html.includes("Запрет на навязывание услуг"));
	assert.ok(html.includes("5. Порядок расчетов и оплаты"));
	assert.ok(html.includes("кассового чека контрольно-кассовой техники в соответствии с Федеральным законом № 54-ФЗ"));
	assert.ok(html.includes("6. Гарантийные обязательства клиники"));
	assert.ok(html.includes("12 месяцев на терапевтические"));
	assert.ok(html.includes("24 месяца на несъемные ортопедические"));
	assert.ok(html.includes("7. Ответственность Сторон, разрешение споров и форс-мажор"));
	assert.ok(html.includes("10 (десять) рабочих дней"));
	assert.ok(html.includes("8. Конфиденциальность и защита персональных данных (152-ФЗ, ЕГИСЗ)"));
	assert.ok(html.includes("9. Срок действия и порядок расторжения договора"));
	assert.ok(html.includes("10. Адреса, банковские реквизиты и подписи Сторон"));

	// 6. Подписи Сторон и печать М.П.
	assert.ok(html.includes("ИСПОЛНИТЕЛЬ"));
	assert.ok(html.includes("ЗАКАЗЧИК (ПАЦИЕНТ)"));
	assert.ok(html.includes("М.П."));
});

test("generateA4InformedConsentHtml generates strictly 2 A4 sheets per Order 1051n and art. 20 323-FZ", () => {
	const consentData: A4DocumentInformedConsentData = {
		consentNumber: "ИДС-2026/884",
		consentDate: "03.10.2026",
		clinic: sampleClinic,
		patient: samplePatient,
		doctorFullName: "Воронов Алексей Владимирович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		interventionName: "Терапевтическое эндодонтическое лечение и реставрация зуба 16",
		toothOrArea: "16",
		diagnosisSummary: "К02.1 Кариес дентина, глубокий кариозный дефект зуба 16",
		plannedInterventionsList: [
			"Проводниковая и инфильтрационная местная анестезия (Артикаин 4%)",
			"Препарирование твердых тканей зуба 16 под водяным охлаждением",
			"Изоляция рабочего поля системой коффердам",
			"Реставрация коронковой части зуба нанокомпозитным материалом",
		],
		possibleComplicationsText: "Анатомическая кривизна каналов, временная парестезия при проводниковой анестезии",
	};

	const html = generateA4InformedConsentHtml(consentData);

	// 1. Проверяем СТРОГО 2 листа A4
	assert.equal(countA4Pages(html), 2, "Informed consent must consist of exactly 2 A4 pages");

	// 2. Колонтитулы «Стр. 1 из 2», «Стр. 2 из 2»
	assert.ok(html.includes("Стр. 1 из 2"));
	assert.ok(html.includes("Стр. 2 из 2"));
	assert.ok(html.includes("Лист 2"));

	// 3. Законодательные основания
	assert.ok(html.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
	assert.ok(html.includes("ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ"));
	assert.ok(html.includes("Приказом Министерства здравоохранения Российской Федерации от 12.11.2021 № 1051н"));

	// 4. Разделы
	assert.ok(html.includes("1. Характер и цели медицинского вмешательства"));
	assert.ok(html.includes("2. Методы оказания медицинской помощи и сопутствующие риски"));
	assert.ok(html.includes("3. Альтернативные методы лечения и последствия отказа"));
	assert.ok(html.includes("4. Возможные осложнения и сопутствующие реакции при стоматологическом лечении"));
	assert.ok(html.includes("Местная анестезия:"));
	assert.ok(html.includes("парестезии"));
	assert.ok(html.includes("Терапевтическое и эндодонтическое лечение:"));
	assert.ok(html.includes("5. Право на отказ от медицинского вмешательства"));
	assert.ok(html.includes("6. Подтверждение добровольности и полноты разъяснений врача"));

	// 5. Подписи и М.П.
	assert.ok(html.includes("ВРАЧ, ПРОВЕДШИЙ БЕСЕДУ"));
	assert.ok(html.includes("ПАЦИЕНТ (ЗАКАЗЧИК)"));
	assert.ok(html.includes("М.П."));
});

test("generateA4PersonalDataConsentHtml generates statutory 152-FZ consent with EGISZ and 25-year storage", () => {
	const consentData: A4DocumentPersonalDataConsentData = {
		consentDate: "03.10.2026",
		clinic: sampleClinic,
		patient: samplePatient,
		egiszTransferAllowed: true,
	};

	const html = generateA4PersonalDataConsentHtml(consentData);

	assert.equal(countA4Pages(html), 1, "Personal data consent is rendered as 1 structured A4 page");
	assert.ok(html.includes("Федеральным законом от 27.07.2006 № 152-ФЗ"));
	assert.ok(html.includes("Постановлением Правительства РФ от 09.02.2022 № 140 (ЕГИСЗ)"));
	assert.ok(html.includes("Специальные категории данных (ст. 10 152-ФЗ)"));
	assert.ok(html.includes("Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ / РЭМД)"));
	assert.ok(html.includes("25 лет")); // Срок хранения по Минздраву РФ
	assert.ok(html.includes("ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ"));
	assert.ok(html.includes("СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ"));
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

	assert.equal(countA4Pages(html), 1);
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

test("generateA4TreatmentPlanHtml produces strictly 2 A4 sheets with stages and patient agreement", () => {
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

	// 1. Проверяем СТРОГО 2 листа A4
	assert.equal(countA4Pages(html), 2, "Treatment plan must consist of exactly 2 A4 pages");
	assert.ok(html.includes("Стр. 1 из 2"));
	assert.ok(html.includes("Стр. 2 из 2"));
	assert.ok(html.includes("Лист 2"));

	assert.ok(html.includes("ПЛАН КОМПЛЕКСНОГО СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ И СМЕТА"));
	assert.ok(html.includes("1 этап: Неотложная терапевтическая санация"));
	assert.ok(html.includes("2 этап: Хирургическая санация"));
	assert.ok(html.includes("3 этап: Ортопедическая реабилитация"));
	assert.ok(html.includes("207 850,00"));

	// Проверяем блок согласования пациентом
	assert.ok(html.includes("Блок информированного согласования плана лечения пациентом"));
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

	// Строго 2 листа A4 и колонтитулы
	assert.equal(countA4Pages(html), 2, "Medical card diary must consist of exactly 2 A4 pages");
	assert.ok(html.includes("Стр. 1 из 2"));
	assert.ok(html.includes("Стр. 2 из 2"));
	assert.ok(html.includes("Лист 2"));

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

test("Blank Line Invariant: unpopulated patient profile produces zero undefined or null leaks", () => {
	const blankPatient = {
		fullName: "Сидорова Анна Петровна",
	};
	const blankClinic = {
		name: "Клиника Стоматологии",
		address: "",
		inn: "",
		ogrn: "",
		licenseNumber: "",
		phone: "",
	};

	const contractHtml = generateA4PaidContractHtml({
		contractNumber: "ДОГ-БЛАНК",
		contractDate: "03.10.2026",
		clinic: blankClinic,
		patient: blankPatient,
		estimatedTotalRub: 0,
	});

	// Проверяем отсутствие утечек
	assert.ok(!contractHtml.includes("undefined"));
	assert.ok(!contractHtml.includes("null"));
	assert.ok(!contractHtml.includes("[object Object]"));
	assert.ok(!contractHtml.includes("NaN"));

	// Проверяем наличие канцелярских строк
	assert.ok(contractHtml.includes("серия ______ № __________"));
	assert.ok(contractHtml.includes("«___» _________ _____ г.") || contractHtml.includes("«___» _________ 20__ г."));
});
