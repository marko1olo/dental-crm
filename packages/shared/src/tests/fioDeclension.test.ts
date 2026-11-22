import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	declineFioRu,
	declineFioGenitiveRu,
	declineFioDativeRu,
	detectGenderFromFio,
} from "../documents/declension/fioDeclension.js";
import { renderDocumentTemplate } from "../documents/templateEngine/index.js";

describe("Russian FIO Declension Engine & Template Tokens", () => {
	it("detects gender correctly from names and patronymics", () => {
		assert.equal(detectGenderFromFio("Иванов", "Иван", "Иванович"), "male");
		assert.equal(detectGenderFromFio("Иванова", "Анна", "Ивановна"), "female");
		assert.equal(detectGenderFromFio("Смирнов", "Никита", "Алексеевич"), "male");
		assert.equal(detectGenderFromFio("Шмидт", "Любовь", "Сергеевна"), "female");
		assert.equal(detectGenderFromFio("Белая", "Мария", ""), "female");
		assert.equal(detectGenderFromFio("Толстой", "Алексей", ""), "male");
	});

	it("declines male Russian full names in genitive and dative cases", () => {
		const res1 = declineFioRu("Иванов Петр Алексеевич");
		assert.equal(res1.nominative, "Иванов Петр Алексеевич");
		assert.equal(res1.genitive, "Иванова Петра Алексеевича");
		assert.equal(res1.dative, "Иванову Петру Алексеевичу");

		const res2 = declineFioRu("Кузнецов Дмитрий Сергеевич");
		assert.equal(res2.genitive, "Кузнецова Дмитрия Сергеевича");
		assert.equal(res2.dative, "Кузнецову Дмитрию Сергеевичу");

		const res3 = declineFioRu("Достоевский Илья Николаевич");
		assert.equal(res3.genitive, "Достоевского Ильи Николаевича");
		assert.equal(res3.dative, "Достоевскому Илье Николаевичу");

		const res4 = declineFioRu("Белый Андрей Михайлович");
		assert.equal(res4.genitive, "Белого Андрея Михайловича");
		assert.equal(res4.dative, "Белому Андрею Михайловичу");
	});

	it("declines female Russian full names in genitive and dative cases", () => {
		const res1 = declineFioRu("Смирнова Ольга Владимировна");
		assert.equal(res1.nominative, "Смирнова Ольга Владимировна");
		assert.equal(res1.genitive, "Смирновой Ольги Владимировны");
		assert.equal(res1.dative, "Смирновой Ольге Владимировне");

		const res2 = declineFioRu("Иванова Мария Сергеевна");
		assert.equal(res2.genitive, "Ивановой Марии Сергеевны");
		assert.equal(res2.dative, "Ивановой Марии Сергеевне");

		const res3 = declineFioRu("Достоевская Дарья Александровна");
		assert.equal(res3.genitive, "Достоевской Дарьи Александровны");
		assert.equal(res3.dative, "Достоевской Дарье Александровне");

		const res4 = declineFioRu("Шмидт Анна Сергеевна");
		assert.equal(res4.genitive, "Шмидт Анны Сергеевны");
		assert.equal(res4.dative, "Шмидт Анне Сергеевне");
	});

	it("resolves {{Пациент.ФИО_Родительный}} and {{Пациент.ФИО_Дательный}} in template engine", () => {
		const template = "Договор с пациентом {{Пациент.ФИО_Родительный}}. Выдано пациенту {{Пациент.ФИО_Дательный}}.";
		const context = {
			patient: {
				fullName: "Иванов Петр Алексеевич",
				gender: "male",
			},
		};

		const result = renderDocumentTemplate(template, context);
		assert.equal(
			result,
			"Договор с пациентом Иванова Петра Алексеевича. Выдано пациенту Иванову Петру Алексеевичу.",
		);
	});

	it("resolves female declension tokens in template engine", () => {
		const template = "Согласие от {{Пациент.ФИО_Родительный}}. Предоставлено {{Пациент.ФИО_Дательный}}.";
		const context = {
			patient: {
				fullName: "Смирнова Ольга Владимировна",
				gender: "female",
			},
		};

		const result = renderDocumentTemplate(template, context);
		assert.equal(
			result,
			"Согласие от Смирновой Ольги Владимировны. Предоставлено Смирновой Ольге Владимировне.",
		);
	});
});
