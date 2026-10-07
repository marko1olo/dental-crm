import assert from "node:assert/strict";
import test from "node:test";
import {
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	buildTemplateVariablesMap,
	formatInitials,
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
	assert.ok(
		domains.has("authorizedPerson"),
		"Must have authorizedPerson domain",
	);
	assert.ok(domains.has("doctor"), "Must have doctor domain");
	assert.ok(domains.has("clinic"), "Must have clinic domain");
	assert.ok(domains.has("appointment"), "Must have appointment domain");
	assert.ok(domains.has("date"), "Must have date domain");

	// Проверка обязательных токенов Минздрава и StomX
	const tokenSet = new Set(ALL_DOCUMENT_TEMPLATE_VARIABLES.map((v) => v.token));
	assert.ok(tokenSet.has("Пациент.ФИО"), "Token Пациент.ФИО must exist");
	assert.ok(
		tokenSet.has("Пациент.Паспорт.СерияНомер"),
		"Token Пациент.Паспорт.СерияНомер must exist",
	);
	assert.ok(tokenSet.has("Пациент.СНИЛС"), "Token Пациент.СНИЛС must exist");
	assert.ok(tokenSet.has("Пациент.Адрес"), "Token Пациент.Адрес must exist");
	assert.ok(
		tokenSet.has("Клиника.Название"),
		"Token Клиника.Название must exist",
	);
	assert.ok(
		tokenSet.has("Клиника.Лицензия.Номер"),
		"Token Клиника.Лицензия.Номер must exist",
	);
	assert.ok(
		tokenSet.has("АктивныйВрач.ФИО"),
		"Token АктивныйВрач.ФИО must exist",
	);
	assert.ok(
		tokenSet.has("Представитель.ФИО"),
		"Token Представитель.ФИО must exist",
	);
	assert.ok(
		tokenSet.has("Представитель.Основание"),
		"Token Представитель.Основание must exist",
	);
	assert.ok(tokenSet.has("ТекущаяДата"), "Token ТекущаяДата must exist");
	assert.ok(
		tokenSet.has("ТекущаяПолнаяДата"),
		"Token ТекущаяПолнаяДата must exist",
	);
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
	assert.equal(
		map["Пациент.Паспорт.КемВыдан"],
		"ТП №1 ОУФМС России по г. Москве",
	);
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
		assert.ok(
			!String(val).includes("NaN"),
			`Variable ${k} must not contain NaN: ${val}`,
		);
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
		1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15, 16, 18, 50, 51, 52, 53, 54, 55,
		56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
		75, 76, 77, 78, 79, 80, 81, 82, 83,
	];

	assert.equal(
		all49StomxIds.length,
		49,
		"Must test exactly 49 StomX templates",
	);

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
		assert.ok(
			rawHtml.includes("<!DOCTYPE html>"),
			`Template ${id} must contain doctype`,
		);
		assert.ok(
			rawHtml.includes("doc-wrapper"),
			`Template ${id} must have doc-wrapper`,
		);

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

test("formatInitials correctly handles single name, two parts (no patronymic), and extra spaces with zero undefined leaks", () => {
	assert.equal(formatInitials(""), "");
	assert.equal(formatInitials(null), "");
	assert.equal(formatInitials(undefined), "");
	assert.equal(formatInitials("Иванов"), "Иванов");
	assert.equal(formatInitials("Иванов   Иван"), "Иванов И.");
	assert.equal(formatInitials("Иванов Иван Иванович"), "Иванов И. И.");
	assert.equal(formatInitials("  Смирнов   Петр   "), "Смирнов П.");
	assert.ok(!formatInitials("Иванов Иван").includes("undefined"));
});

test("IDENT parity: flat patient tokens resolve correctly and format dates/names accurately", () => {
	const ctx: TemplateExecutionContext = {
		patient: {
			fullName: "Кузнецов Алексей Владимирович",
			lastName: "Кузнецов",
			firstName: "Алексей",
			middleName: "Владимирович",
			birthDate: "1988-06-24",
			gender: "male",
			phone: "+7 (916) 123-45-67",
			mobilePhone: "+7 (916) 123-45-67",
			homePhone: "+7 (495) 765-43-21",
			email: "kuznetsov@example.com",
			address: "г. Москва, ул. Арбат, д. 10, кв. 25",
			actualAddress: "г. Москва, ул. Тверская, д. 4",
			registrationDate: "2022-03-22",
			firstVisitDate: "2022-03-22",
			inn: "770412345678",
			snils: "123-456-789 00",
			iin: "880624350123",
			workplace: "ПАО Сбербанк",
			profession: "Аналитик",
			policies: "ОМС 1234567890123456, ДМС СОГАЗ 998877",
			comment: "Пациент просит звонить после 18:00",
			cardNumber: "МК-2026/042",
			parentName: "Кузнецова Марина Сергеевна",
		},
	};

	const map = buildTemplateVariablesMap(ctx);

	assert.equal(map["ФАМИЛИЯИмяОтчество"], "КУЗНЕЦОВ Алексей Владимирович");
	assert.equal(map["ФамилияИмяОтчество"], "Кузнецов Алексей Владимирович");
	assert.equal(map["ФамилияИО"], "Кузнецов А. В.");
	assert.equal(map["Фамилия"], "Кузнецов");
	assert.equal(map["Имя"], "Алексей");
	assert.equal(map["Отчество"], "Владимирович");
	assert.equal(map["ДатаРождения"], "24 июня 1988");
	assert.equal(map["ГодРождения"], "1988");
	assert.ok(
		Number.parseInt(map["Возраст"] ?? "0", 10) >= 35,
		"Age must be calculated from birthDate",
	);
	assert.equal(map["Пол"], "Мужской");
	assert.equal(map["Телефоны"], "+7 (916) 123-45-67");
	assert.equal(map["МобТелефон"], "+7 (916) 123-45-67");
	assert.equal(map["ДомТелефон"], "+7 (495) 765-43-21");
	assert.equal(map["Email"], "kuznetsov@example.com");
	assert.equal(map["Адрес"], "г. Москва, ул. Тверская, д. 4");
	assert.equal(map["АдресРегистрации"], "г. Москва, ул. Арбат, д. 10, кв. 25");
	assert.equal(map["ИНН"], "770412345678");
	assert.equal(map["СНИЛС"], "123-456-789 00");
	assert.equal(map["ИИН"], "880624350123");
	assert.equal(map["МестоРаботы"], "ПАО Сбербанк");
	assert.equal(map["Профессия"], "Аналитик");
	assert.equal(map["Полисы"], "ОМС 1234567890123456, ДМС СОГАЗ 998877");
	assert.equal(map["Комментарий"], "Пациент просит звонить после 18:00");
	assert.equal(map["НомерКарты"], "МК-2026/042");
	assert.equal(map["НомерМедкарты"], "МК-2026/042");
	assert.equal(map["Родитель"], "Кузнецова Марина Сергеевна");
	assert.ok(map["ДатаПервогоПриема"]?.includes("2022"));
	assert.equal(map["ДатаПервогоПриемаЧислом"], "22.03.2022");
});

test("IDENT parity: money amounts in Russian words and numeric formatting", () => {
	const ctx: TemplateExecutionContext = {
		financial: {
			amountRubles: 15450.5,
			invoiceNumber: "СЧ-401",
			actNumber: "АКТ-802",
			contractNumber: "ДОГ-103",
		},
	};

	const map = buildTemplateVariablesMap(ctx);

	assert.equal(map["СуммаЧислом"], "15450.50");
	assert.ok(
		map["Сумма"]?.includes("15") && map["Сумма"]?.includes("450,50"),
		`Expected formatted sum, got: ${map["Сумма"]}`,
	);
	assert.ok(
		map["СуммаПрописью"]
			?.toLowerCase()
			.includes("пятнадцать тысяч четыреста пятьдесят рублей"),
		`Expected full money words, got: ${map["СуммаПрописью"]}`,
	);
	assert.ok(
		map["СуммаПрописью"]?.includes("50 копеек"),
		`Expected 50 kopecks, got: ${map["СуммаПрописью"]}`,
	);
	assert.equal(
		map["СуммаПрописьюРублей"],
		"пятнадцать тысяч четыреста пятьдесят",
	);
	assert.ok(
		map["Счет.Сумма"]?.includes("15") && map["Счет.Сумма"]?.includes("450,50"),
		`Expected formatted account sum, got: ${map["Счет.Сумма"]}`,
	);
	assert.equal(map["Счет.СуммаЧислом"], "15450.50");
	assert.ok(
		map["Счет.СуммаПрописью"]?.toLowerCase().includes("пятнадцать тысяч"),
	);
	assert.ok(
		map["Договор.СуммаПрописью"]?.toLowerCase().includes("пятнадцать тысяч"),
	);
	assert.ok(
		map["Акт.СуммаПрописью"]?.toLowerCase().includes("пятнадцать тысяч"),
	);
});

test("IDENT parity: dental formula transcription and individual tooth tokens", () => {
	const ctx: TemplateExecutionContext = {
		dentalFormula: {
			16: "C", // кариес
			21: "Pt", // пломбирован
			36: "R", // корень
			48: "A", // отсутствует
		},
	};

	const map = buildTemplateVariablesMap(ctx);

	assert.equal(map["16"], "C");
	assert.equal(map["16т"], "кариес");
	assert.equal(map["21"], "Pt");
	assert.equal(map["21т"], "пломбирован");
	assert.equal(map["36"], "R");
	assert.equal(map["36т"], "корень");
	assert.equal(map["48"], "A");
	assert.equal(map["48т"], "отсутствует");

	// Проверка расшифровки формулы
	const breakdown = map["ЗубнаяФормула.Расшифровка"];
	assert.ok(breakdown);
	assert.ok(
		breakdown.includes("16: кариес"),
		`Must include 16: кариес in ${breakdown}`,
	);
	assert.ok(
		breakdown.includes("21: пломбирован"),
		`Must include 21: пломбирован in ${breakdown}`,
	);
	assert.ok(
		breakdown.includes("36: корень"),
		`Must include 36: корень in ${breakdown}`,
	);
	assert.ok(
		breakdown.includes("48: отсутствует"),
		`Must include 48: отсутствует in ${breakdown}`,
	);
});

test("IDENT parity: somatic and allergy status tokens", () => {
	const ctx: TemplateExecutionContext = {
		patient: {
			somaticStatus: "Гипертоническая болезнь II ст., риск 3",
			allergyStatus: "Аллергия на пенициллины, новокаин",
			drugIntolerance: "Лидокаин (тахикардия)",
		},
	};

	const map = buildTemplateVariablesMap(ctx);

	assert.equal(
		map["Пациент.СоматическийСтатус"],
		"Гипертоническая болезнь II ст., риск 3",
	);
	assert.equal(
		map["СоматическийСтатус"],
		"Гипертоническая болезнь II ст., риск 3",
	);
	assert.equal(map["Аллергостатус"], "Аллергия на пенициллины, новокаин");
	assert.equal(map["Аллергии"], "Аллергия на пенициллины, новокаин");
	assert.equal(map["НепереносимостьПрепаратов"], "Лидокаин (тахикардия)");
});

test("IDENT parity: clinical examination and diary tokens", () => {
	const ctx: TemplateExecutionContext = {
		clinicalExamination: {
			examinationDate: "2026-10-03",
			doctorFullName: "Иванов Иван Иванович",
			diagnosis: "К02.1 Кариес дентина зуба 16",
			complaints: "Кратковременные боли от холодного и сладкого",
			anamnesis: "Боли появились около 2 недель назад",
			pastDiseases: "ОРВИ, детские инфекции",
			diseaseHistory: "Ранее зуб 16 не лечен",
			externalExam: "Лицо симметрично, лимфоузлы не увеличены",
			bite: "Ортогнатический прикус",
			mucousCondition: "Слизистая бледно-розовая, умеренно увлажнена",
			xray: "На прицельной рентгенограмме 16 дефект в пределах дентина",
			objective: "Зондирование дна полости болезненно, перкуссия безболезненна",
			treatment: "Препарирование, медобработка, пломба Filtek Z250",
			recommendations: "Гигиена полости рта, осмотр через 6 месяцев",
		},
	};

	const map = buildTemplateVariablesMap(ctx);

	assert.equal(map["ФамилияИОВрача"], "Иванов И. И.");
	assert.equal(map["Диагноз"], "К02.1 Кариес дентина зуба 16");
	assert.equal(map["Жалобы"], "Кратковременные боли от холодного и сладкого");
	assert.equal(map["Анамнез"], "Боли появились около 2 недель назад");
	assert.equal(map["ПеренесенныеЗаболевания"], "ОРВИ, детские инфекции");
	assert.equal(map["РазвитиеЗаболевания"], "Ранее зуб 16 не лечен");
	assert.equal(
		map["ВнешнийОсмотр"],
		"Лицо симметрично, лимфоузлы не увеличены",
	);
	assert.equal(map["Прикус"], "Ортогнатический прикус");
	assert.equal(
		map["СостояниеСлизистой"],
		"Слизистая бледно-розовая, умеренно увлажнена",
	);
	assert.equal(
		map["Рентген"],
		"На прицельной рентгенограмме 16 дефект в пределах дентина",
	);
	assert.equal(
		map["Объективно"],
		"Зондирование дна полости болезненно, перкуссия безболезненна",
	);
	assert.equal(
		map["Лечение"],
		"Препарирование, медобработка, пломба Filtek Z250",
	);
	assert.equal(
		map["Рекомендации"],
		"Гигиена полости рта, осмотр через 6 месяцев",
	);
});

test("IDENT parity: conditional exclamation mark ! line/block stripping", () => {
	const templateWithEmptyFields = `
		<table>
			<tr><td>Пациент:</td><td>{ФамилияИмяОтчество}</td></tr>
			<tr><td>Диагноз:</td><td>{!Диагноз}</td></tr>
			<tr><td>Жалобы:</td><td>{!Жалобы}</td></tr>
		</table>
		<p>Лечение: {!Лечение}</p>
		<p>Рекомендации: {Рекомендации}</p>
	`;

	const emptyCtx: TemplateExecutionContext = {
		patient: { fullName: "Сидоров Сидор Сидорович" },
		clinicalExamination: {
			diagnosis: "", // empty -> should strip tr
			complaints: undefined, // empty -> should strip tr
			treatment: "Проведена анестезия", // filled -> should keep p
			recommendations: "", // no exclamation mark -> keep empty
		},
	};

	const rendered = renderDocumentTemplate(templateWithEmptyFields, emptyCtx);

	// Table row with {!Диагноз} should be completely stripped
	assert.ok(
		!rendered.includes("Диагноз:"),
		"Empty {!Диагноз} row must be stripped",
	);
	assert.ok(
		!rendered.includes("Жалобы:"),
		"Empty {!Жалобы} row must be stripped",
	);

	// Filled {!Лечение} should render without !
	assert.ok(
		rendered.includes("Лечение: Проведена анестезия"),
		"Filled {!Лечение} must render",
	);
	assert.ok(
		!rendered.includes("!Лечение"),
		"Exclamation mark must be stripped",
	);

	// Field without ! remains in template
	assert.ok(
		rendered.includes("Рекомендации:"),
		"Field without ! must not strip container",
	);
	assert.ok(rendered.includes("Сидоров Сидор Сидорович"));
});

test("Single braces {Token} syntax works seamlessly and does NOT corrupt CSS styles", () => {
	const htmlWithCss = `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial; font-size: 11pt; color: #222; }
				.patient-card { padding: 10px; border: 1px solid #ccc; }
				table { width: 100%; border-collapse: collapse; }
				td { padding: 4px; }
			</style>
		</head>
		<body>
			<div class="patient-card">
				<h2>{Клиника.Название}</h2>
				<p>Пациент: {ФамилияИмяОтчество} ({ДатаРождения})</p>
				<p>Итого к оплате: {СуммаПрописью}</p>
			</div>
		</body>
		</html>
	`;

	const ctx: TemplateExecutionContext = {
		clinic: { name: 'Клиника "Мастердент"' },
		patient: {
			fullName: "Васильев Василий Васильевич",
			birthDate: "1995-04-12",
		},
		financial: {
			amountRubles: 7500,
		},
	};

	const rendered = renderDocumentTemplate(htmlWithCss, ctx);

	// CSS rules must be 100% intact
	assert.ok(
		rendered.includes(
			"body { font-family: Arial; font-size: 11pt; color: #222; }",
		),
	);
	assert.ok(
		rendered.includes(
			".patient-card { padding: 10px; border: 1px solid #ccc; }",
		),
	);
	assert.ok(
		rendered.includes("table { width: 100%; border-collapse: collapse; }"),
	);

	// Tokens must be replaced
	assert.ok(rendered.includes('<h2>Клиника "Мастердент"</h2>'));
	assert.ok(
		rendered.includes("Пациент: Васильев Василий Васильевич (12 апреля 1995)"),
	);
	assert.ok(
		rendered.includes("Итого к оплате: Семь тысяч пятьсот рублей 00 копеек"),
	);
});

test("StomX maturity: fns-payment-certificate renders authentic two-part form with stub, scissor cut line, and Code 1/2", () => {
	const rawTemplate = getDefaultTemplateContentHtml(7); // fns-payment-certificate
	assert.ok(
		rawTemplate.includes("Линия отрыва"),
		"Template must contain scissor cut line",
	);
	assert.ok(
		rawTemplate.includes("КОРЕШОК К СПРАВКЕ"),
		"Template must contain clinic stub",
	);
	assert.ok(
		rawTemplate.includes("КНД 1151156"),
		"Template must cite КНД 1151156",
	);

	const ctx: TemplateExecutionContext = {
		clinic: {
			name: 'ООО "Денте Премиум"',
			inn: "7701987654",
			kpp: "770101001",
			address: "г. Москва, Стоматологический проезд, д. 7",
			phone: "+7 (495) 999-88-77",
			licenseNumber: "ЛО41-01137-77/00345678",
			licenseIssuedDate: "15.04.2021",
			licenseIssuer: "Департамент здравоохранения города Москвы",
		},
		patient: {
			fullName: "Иванов Петр Алексеевич",
			cardNumber: "МК-2026/778",
			birthDate: "1990-05-14",
		},
		taxpayer: {
			fullName: "Иванов Петр Алексеевич",
			inn: "123456789012",
		},
		fnsServiceCode: "1",
		financial: {
			amountRubles: 1425,
			actNumber: "АКТ-2026-99",
			actDate: "20.12.2020",
		},
		currentUser: {
			fullName: "Сидорова Анна Николаевна",
			position: "Главный бухгалтер",
		},
		currentDate: new Date("2026-09-10"),
	};

	const rendered = renderDocumentTemplate(rawTemplate, ctx);
	assert.ok(
		rendered.includes("Иванов Петр Алексеевич"),
		"Must render taxpayer and patient name",
	);
	assert.ok(rendered.includes("123456789012"), "Must render taxpayer INN");
	assert.ok(rendered.includes("1 425,00 руб."), "Must render amount");
	assert.ok(
		rendered.includes("Одна тысяча четыреста двадцать пять рублей 00 копеек"),
		"Must render amount in words",
	);
	assert.ok(
		rendered.includes('ООО "Денте Премиум"'),
		"Must render clinic name",
	);
	assert.ok(rendered.includes("7701987654"), "Must render clinic INN");
	assert.ok(
		rendered.includes("ЛО41-01137-77/00345678"),
		"Must render license number",
	);
	assert.ok(
		rendered.includes("Линия отрыва"),
		"Must preserve scissor line in output",
	);
	assert.ok(rendered.includes("3 года"), "Must state 3-year archive retention");
});

test("StomX maturity: dental-work-order renders clinic, lab, patient, tooth table, VITA shade, and 3D STL link", () => {
	const rawTemplate = getDefaultTemplateContentHtml(4); // dental-work-order
	assert.ok(
		rawTemplate.includes("ЗАКАЗ-НАРЯД В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ"),
		"Must have work order title",
	);

	const ctx: TemplateExecutionContext = {
		clinic: {
			name: 'ООО "Денте Клиник"',
			inn: "7701987654",
			address: "г. Москва, Зубной бульвар, д. 1",
			phone: "+7 (495) 123-45-67",
		},
		doctor: {
			fullName: "Смирнов Андрей Викторович",
			position: "Врач-стоматолог ортопед",
		},
		patient: {
			fullName: "Кузнецов Алексей Владимирович",
			cardNumber: "МК-2026/042",
			gender: "муж",
			birthDate: "1988-06-24",
		},
		dentalLab: {
			name: 'ЗТЛ "Дентал-Мастер"',
			technicianFullName: "Волков Сергей Дмитриевич",
			colorVita: "A2 / Bleach",
			stlUrl: "https://cadcam.dente.local/cases/case-994.stl",
			fittingDate: "15.10.2026",
			comments: "Индивидуализация режущего края, прозрачность эмали тип III",
		},
		document: {
			number: "ЗН-2026/104",
			endDate: "22.10.2026",
		},
		financial: {
			amountRubles: 102000,
		},
		currentDate: new Date("2026-10-06"),
	};

	const rendered = renderDocumentTemplate(rawTemplate, ctx);
	assert.ok(rendered.includes('ООО "Денте Клиник"'), "Must render clinic name");
	assert.ok(
		rendered.includes('ЗТЛ "Дентал-Мастер"'),
		"Must render dental lab name",
	);
	assert.ok(
		rendered.includes("Волков Сергей Дмитриевич"),
		"Must render technician name",
	);
	assert.ok(
		rendered.includes("Смирнов Андрей Викторович"),
		"Must render doctor name",
	);
	assert.ok(
		rendered.includes("Кузнецов Алексей Владимирович"),
		"Must render patient name",
	);
	assert.ok(rendered.includes("A2 / Bleach"), "Must render VITA shade");
	assert.ok(
		rendered.includes("https://cadcam.dente.local/cases/case-994.stl"),
		"Must render STL scan link",
	);
	assert.ok(rendered.includes("15.10.2026"), "Must render fitting date");
	assert.ok(rendered.includes("22.10.2026"), "Must render due date");
	assert.ok(
		rendered.includes("Сто две тысячи рублей 00 копеек"),
		"Must render amount in words",
	);
});

test("StomX maturity: invoice-act and medplan-agg-tooth contain legal compliance warranties and 30-day terms", () => {
	const actTemplate = getDefaultTemplateContentHtml(1); // invoice-act
	assert.ok(
		actTemplate.includes("Постановлением Правительства РФ от 11.05.2023 № 736"),
		"Act must cite PP RF 736",
	);
	assert.ok(
		actTemplate.includes("ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА"),
		"Act must contain warranty section",
	);

	const planTemplate = getDefaultTemplateContentHtml(51); // medplan-agg-tooth
	assert.ok(
		planTemplate.includes("ПЛАН ЛЕЧЕНИЯ С АГРЕГАЦИЕЙ"),
		"Must have tooth aggregation plan title",
	);
	assert.ok(
		planTemplate.includes("30 календарных дней"),
		"Must specify 30-day plan validity disclaimer",
	);
});
