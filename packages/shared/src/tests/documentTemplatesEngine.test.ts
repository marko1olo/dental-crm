import assert from "node:assert/strict";
import test from "node:test";
import {
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	buildTemplateVariablesMap,
	getDefaultTemplateContentHtml,
	renderDocumentTemplate,
	type TemplateExecutionContext,
} from "../index.js";

test("ALL_DOCUMENT_TEMPLATE_VARIABLES contains all canonical tokens and covers required domains", () => {
	assert.ok(
		ALL_DOCUMENT_TEMPLATE_VARIABLES.length >= 74,
		`Expected at least 74 variables, got ${ALL_DOCUMENT_TEMPLATE_VARIABLES.length}`,
	);

	const domains = new Set(ALL_DOCUMENT_TEMPLATE_VARIABLES.map((v) => v.domain));
	assert.ok(domains.has("patient"), "Must have patient domain");
	assert.ok(domains.has("representative"), "Must have representative domain");
	assert.ok(domains.has("authorizedPerson"), "Must have authorizedPerson domain");
	assert.ok(domains.has("doctor"), "Must have doctor domain");
	assert.ok(domains.has("clinic"), "Must have clinic domain");
	assert.ok(domains.has("appointment"), "Must have appointment domain");
	assert.ok(domains.has("date"), "Must have date domain");

	// Проверка обязательных токенов Минздрава и StomX
	const tokenSet = new Set(ALL_DOCUMENT_TEMPLATE_VARIABLES.map((v) => v.token));
	assert.ok(tokenSet.has("Пациент.ФИО"), "Token Пациент.ФИО must exist");
	assert.ok(tokenSet.has("Пациент.Паспорт.СерияНомер"), "Token Пациент.Паспорт.СерияНомер must exist");
	assert.ok(tokenSet.has("Пациент.СНИЛС"), "Token Пациент.СНИЛС must exist");
	assert.ok(tokenSet.has("Пациент.Адрес"), "Token Пациент.Адрес must exist");
	assert.ok(tokenSet.has("Клиника.Название"), "Token Клиника.Название must exist");
	assert.ok(tokenSet.has("Клиника.Лицензия.Номер"), "Token Клиника.Лицензия.Номер must exist");
	assert.ok(tokenSet.has("АктивныйВрач.ФИО"), "Token АктивныйВрач.ФИО must exist");
	assert.ok(tokenSet.has("Представитель.ФИО"), "Token Представитель.ФИО must exist");
	assert.ok(tokenSet.has("Представитель.Основание"), "Token Представитель.Основание must exist");
	assert.ok(tokenSet.has("ТекущаяДата"), "Token ТекущаяДата must exist");
	assert.ok(tokenSet.has("ТекущаяПолнаяДата"), "Token ТекущаяПолнаяДата must exist");
});

test("buildTemplateVariablesMap builds 100% complete key-value dictionary with zero undefined or NaN", () => {
	const mockContext: TemplateExecutionContext = {
		clinic: {
			name: 'ООО "Денте Премиум"',
			inn: "7701987654",
			kpp: "770101001",
			ogrn: "1207700123456",
			address: "г. Москва, Стоматологический проезд, д. 7",
			phone: "+7 (495) 999-88-77",
			licenseNumber: "ЛО41-01137-77/00345678",
			licenseIssuedDate: "15.04.2021",
			licenseValidity: "Бессрочно",
			licenseIssuer: "Департамент здравоохранения города Москвы",
		},
		patient: {
			id: "pat-12345",
			cardNumber: "К-2026/042",
			fullName: "Кузнецов Алексей Владимирович",
			birthDate: "1988-06-24",
			gender: "муж",
			address: "г. Москва, ул. Арбат, д. 10, кв. 25",
			actualAddress: "г. Москва, ул. Тверская, д. 4",
			phone: "+7 (916) 123-45-67",
			email: "kuznetsov@example.com",
			inn: "770412345678",
			snils: "123-456-789 00",
			omsPolicy: "1234567890123456",
			passport: {
				series: "4512",
				number: "987654",
				issuedDate: "10.07.2008",
				issuedBy: "ТП №1 ОУФМС России по г. Москве",
				divisionCode: "770-001",
			},
		},
		representative: {
			fullName: "Кузнецова Марина Сергеевна",
			relationType: "мать",
			phone: "+7 (916) 765-43-21",
			basis: "Свидетельство о рождении серия IV-МЮ №123456",
			passport: {
				series: "4509",
				number: "654321",
				issuedDate: "05.02.2005",
				issuedBy: "ОВД Замоскворечье г. Москвы",
				divisionCode: "770-002",
			},
		},
		doctor: {
			fullName: "Смирнова Ольга Ивановна",
			position: "Врач-стоматолог терапевт",
			specialty: "Терапевтическая стоматология",
		},
		currentDate: new Date("2026-09-03T12:00:00Z"),
		appointment: {
			date: "2026-09-03",
			time: "14:30",
		},
		document: {
			number: "ДОК-2026/99",
		},
	};

	const map = buildTemplateVariablesMap(mockContext);

	assert.equal(map["Пациент.ФИО"], "Кузнецов Алексей Владимирович");
	assert.equal(map["Пациент.Фамилия"], "Кузнецов");
	assert.equal(map["Пациент.Имя"], "Алексей");
	assert.equal(map["Пациент.Отчество"], "Владимирович");
	assert.equal(map["Пациент.ФИО.Инициалы"], "Кузнецов А. В.");
	assert.equal(map["Пациент.Паспорт.Серия"], "4512");
	assert.equal(map["Пациент.Паспорт.Номер"], "987654");
	assert.equal(map["Пациент.Паспорт.СерияНомер"], "4512 987654");
	assert.equal(map["Пациент.Паспорт.КемВыдан"], "ТП №1 ОУФМС России по г. Москве");
	assert.equal(map["Пациент.Паспорт.КодПодразделения"], "770-001");
	assert.equal(map["Пациент.СНИЛС"], "123-456-789 00");
	assert.equal(map["Пациент.ИНН"], "770412345678");
	assert.equal(map["Пациент.НомерМедкарты"], "К-2026/042");
	assert.equal(map["Клиника.Название"], 'ООО "Денте Премиум"');
	assert.equal(map["Клиника.Лицензия.Номер"], "ЛО41-01137-77/00345678");
	assert.equal(map["АктивныйВрач.ФИО"], "Смирнова Ольга Ивановна");
	assert.equal(map["Представитель.ФИО"], "Кузнецова Марина Сергеевна");
	assert.equal(map["Представитель.Родство"], "мать");

	// Проверка на отсутствие мусора (undefined / NaN / [object Object])
	for (const [k, val] of Object.entries(map)) {
		assert.notEqual(val, undefined, `Variable ${k} must not be undefined`);
		assert.ok(!String(val).includes("NaN"), `Variable ${k} must not contain NaN: ${val}`);
		assert.ok(
			!String(val).includes("[object Object]"),
			`Variable ${k} must not contain [object Object]: ${val}`,
		);
	}
});

test("renderDocumentTemplate substitutes both {{ Token }} and [Token] delimiters", () => {
	const template = `
		<div>
			Пациент: {{Пациент.ФИО}} (тел: [Пациент.Телефон])
			Клиника: {{Клиника.Название}}
			Врач: [АктивныйВрач.ФИО]
		</div>
	`;

	const ctx: TemplateExecutionContext = {
		patient: { fullName: "Петров Петр Петрович", phone: "+7 (999) 000-11-22" },
		clinic: { name: 'Стоматология "Улыбка"' },
		doctor: { fullName: "Доктор Айболит" },
	};

	const rendered = renderDocumentTemplate(template, ctx);
	assert.ok(rendered.includes("Пациент: Петров Петр Петрович"));
	assert.ok(rendered.includes("тел: +7 (999) 000-11-22"));
	assert.ok(rendered.includes('Клиника: Стоматология "Улыбка"'));
	assert.ok(rendered.includes("Врач: Доктор Айболит"));
});

test("getDefaultTemplateContentHtml provides publication-grade templates for all 49 StomX forms", () => {
	const all49StomxIds = [
		1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15, 16, 18, 50, 51, 52, 53, 54, 55, 56,
		57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
		76, 77, 78, 79, 80, 81, 82, 83,
	];

	assert.equal(all49StomxIds.length, 49, "Must test exactly 49 StomX templates");

	const sampleContext: TemplateExecutionContext = {
		patient: {
			fullName: "Соколов Дмитрий Андреевич",
			phone: "+7 (926) 555-44-33",
			birthDate: "1992-11-15",
			address: "г. Москва, ул. Ленина, д. 5",
			passport: {
				series: "4511",
				number: "112233",
				issuedDate: "20.12.2012",
				issuedBy: "УФМС г. Москвы",
			},
		},
		clinic: {
			name: 'ООО "Денте Клиник"',
			address: "г. Москва, ул. Мира, д. 1",
			licenseNumber: "ЛО-77-01-020304",
		},
		doctor: {
			fullName: "Захаров Сергей Николаевич",
			position: "Главный врач",
		},
		currentDate: new Date("2026-09-03"),
	};

	for (const id of all49StomxIds) {
		const rawHtml = getDefaultTemplateContentHtml(id);
		assert.ok(
			rawHtml && rawHtml.trim().length > 100,
			`Template stomxId=${id} must return non-empty HTML`,
		);
		assert.ok(rawHtml.includes("<!DOCTYPE html>"), `Template ${id} must contain doctype`);
		assert.ok(rawHtml.includes("doc-wrapper"), `Template ${id} must have doc-wrapper`);

		// Рендерим шаблон
		const rendered = renderDocumentTemplate(rawHtml, sampleContext);
		assert.ok(
			rendered.includes("Соколов Дмитрий Андреевич"),
			`Template ${id} must render patient name`,
		);
		assert.ok(
			rendered.includes('ООО "Денте Клиник"'),
			`Template ${id} must render clinic name`,
		);
		assert.ok(
			!rendered.includes("[object Object]"),
			`Template ${id} must not leak [object Object]`,
		);
	}
});
