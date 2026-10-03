import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePrimaryIntakePackageHtml } from "../components/documents/primaryIntakePackagePrintEngine.js";
import { generateMinorConsentPrintHtml } from "../components/consents/templates/adultAndMinorPrint.js";

describe("Audit: Primary Intake Package & Minor Legal Consent (ПП РФ № 736, 152-ФЗ, ст. 54 323-ФЗ, ГОСТ)", () => {
	it("1. generatePrimaryIntakePackageHtml формирует все 4 бланка с ГОСТ-полями и динамическим городом", () => {
		const html = generatePrimaryIntakePackageHtml({
			patient: {
				fullName: "Калинин Артем Сергеевич",
				birthDate: "1995-04-12",
				phone: "+7 (999) 111-22-33",
				passportSeries: "4512",
				passportNumber: "654321",
				passportIssuedBy: "ОВД Раменки г. Москвы",
				passportIssuedDate: "2015-05-10",
				passportDepartmentCode: "770-055",
				snils: "123-456-789 00",
				registrationAddress: "г. Екатеринбург, пр. Ленина, д. 25, кв. 10",
				cardNumber: "4022",
			},
			clinic: {
				clinicName: "Клиника ДЕНТЕ Екатеринбург",
				legalName: "ООО Стоматология Урала",
				inn: "6671000000",
				ogrn: "1126600000000",
				licenseNumber: "ЛО-66-01-009988",
				city: "г. Екатеринбург",
				address: "г. Екатеринбург, ул. Малышева, д. 15",
				website: "dente-ekb.ru",
				directorTitle: "Главный врач",
				directorFullName: "Петров П.П.",
			},
			doctorFullName: "Смирнова Елена Александровна",
			intakeNormApplied: true,
		});

		// Проверка ГОСТ-полей печати (левое поле 20 мм под скоросшиватель медкарты 043/у)
		assert.match(
			html,
			/margin:\s*12mm\s+10mm\s+12mm\s+20mm/i,
			"Печатные стили обязаны иметь левое поле 20 мм по ГОСТ Р 7.0.97-2016",
		);

		// Проверка динамического города клиники
		assert.match(
			html,
			/г\.\s*Екатеринбург/i,
			"В шапке договора обязан отображаться динамический город клиники",
		);

		// Проверка сайта клиники и лицензирующего органа (Росздравнадзор) по п. 17 ПП РФ № 736
		assert.match(
			html,
			/roszdravnadzor\.gov\.ru/i,
			"Договор обязан содержать сайт органа лицензирования roszdravnadzor.gov.ru",
		);
		assert.match(
			html,
			/dente-ekb\.ru/i,
			"Договор обязан отображать сайт клиники",
		);

		// Письменное уведомление об ОМС (п. 16 ПП РФ № 736)
		assert.match(
			html,
			/программы\s+государственных\s+гарантий.*ОМС/i,
			"Договор обязан содержать уведомление о возможности получения бесплатной помощи по ОМС",
		);

		// Биометрические персональные данные (ст. 11 152-ФЗ)
		assert.match(
			html,
			/Биометрические\s+персональные\s+данные.*ст\.\s*11\s+152-ФЗ/i,
			"Согласие на ПДн обязано выделять биометрические персональные данные (ст. 11 152-ФЗ)",
		);
		assert.match(
			html,
			/фотопротокол.*рентгенограмм.*томографи.*сканирование/i,
			"Согласие на ПДн обязано перечислять дентальный фотопротокол, рентген и 3D КЛКТ",
		);

		// Передача в ЕГИСЗ (РЭМД по Постановлению Правительства № 140) и Госуслуги
		assert.match(
			html,
			/ЕГИСЗ\s+Минздрава\s+РФ.*РЭМД\/ФРЭМД/i,
			"Согласие на ПДн обязано содержать передачу в ЕГИСЗ (РЭМД)",
		);
		assert.match(
			html,
			/Мое\s+здоровье.*Госуслуги/i,
			"Согласие на ПДн обязано упоминать раздел «Мое здоровье» на Госуслугах",
		);
	});

	it("2. generatePrimaryIntakePackageHtml для чистого бланка выводит подчеркивания «________» без ошибок (Мандат 8e)", () => {
		const blankHtml = generatePrimaryIntakePackageHtml({
			patient: null,
			clinic: {
				clinicName: "ООО ДЕНТЕ",
				city: "г. Казань",
			},
			intakeNormApplied: false,
		});

		assert.ok(blankHtml.length > 5000, "Чистый пакет документов обязан генерироваться полностью");
		assert.match(
			blankHtml,
			/_{8,}/,
			"Чистый бланк обязан содержать подчеркивания для заполнения ручкой",
		);
		assert.match(
			blankHtml,
			/г\.\s*Казань/i,
			"Город Казань обязан подставляться даже при чистом бланке пациента",
		);
	});

	it("3. generateMinorConsentPrintHtml формирует документ ребенка, основание представителя и доверенность", () => {
		const html = generateMinorConsentPrintHtml({
			representativeName: "Сидорова Анна Владимировна",
			representativeRelation: "Мать",
			representativeDocument: "паспорт 4015 № 654321 выдан ОВД г. Санкт-Петербурга",
			representativePhone: "+7 (911) 222-33-44",
			childName: "Сидоров Михаил Андреевич",
			childBirthDate: "2018-06-15",
			childDocument: "Свидетельство о рождении серия II-АГ № 123456",
			representativeBasis: "ст. 64 СК РФ (мать)",
			accompanyingPerson: "Бабушка Сидорова Валентина Ильинична (по доверенности от 01.09.2026)",
			doctorName: "Детский врач-стоматолог Зубова О.В.",
			clinicName: "Клиника ДЕНТЕ Дети",
		});

		// Проверка ГОСТ-полей печати (левое поле 20 мм)
		assert.match(
			html,
			/margin:\s*12mm\s+10mm\s+12mm\s+20mm/i,
			"Печатные поля согласия законного представителя обязаны иметь 20 мм слева по ГОСТ",
		);

		// Проверка документа ребенка и основания полномочий
		assert.match(
			html,
			/Свидетельство\s+о\s+рождении\s+серия\s+II-АГ\s+№\s*123456/i,
			"ИДС ребенка обязано содержать реквизиты свидетельства о рождении",
		);
		assert.match(
			html,
			/ст\.\s*64\s+СК\s+РФ/i,
			"ИДС ребенка обязано содержать основание полномочий представителя",
		);

		// Проверка сопровождающего лица по доверенности (ст. 185 ГК РФ)
		assert.match(
			html,
			/сопровождающее\s+лицо\s+\(по\s+доверенности\s+ст\.\s*185\s+ГК\s+РФ\):.*Бабушка\s+Сидорова/i,
			"ИДС обязано отражать сопровождающее лицо по доверенности ст. 185 ГК РФ",
		);
	});

	it("4. generateMinorConsentPrintHtml чистого бланка формирует линии «________» (Мандат 8e)", () => {
		const blankHtml = generateMinorConsentPrintHtml({
			isBlank: true,
		});

		assert.match(
			blankHtml,
			/_{10,}/,
			"Чистый бланк ИДС ребенка обязан содержать подчеркивания «________»",
		);
		assert.match(
			blankHtml,
			/свидетельство\s+о\s+рождении\s*\/\s*паспорт/i,
			"Чистый бланк обязан предусматривать выбор документа ребенка",
		);
	});
});
