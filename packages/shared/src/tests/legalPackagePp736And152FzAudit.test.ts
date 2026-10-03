import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ALL_DEFAULT_TEMPLATES_BY_ALIAS,
	SHARED_DOCUMENT_CSS,
} from "../documents/templates/index.js";
import {
	renderPaidServiceContract736Html,
	paidServiceContract736PayloadSchema,
} from "../documents/formsContractAndConsents.js";

describe("Red Team Legal Audit: ПП РФ № 736, 152-ФЗ, ст. 54 323-ФЗ и ГОСТ Р 7.0.97-2016", () => {
	it("1. Договор на платные медуслуги содержит обязательные реквизиты ПП РФ № 736 и ГОСТ-поле печати", () => {
		const contractHtml = ALL_DEFAULT_TEMPLATES_BY_ALIAS["dogovor_na_okazanie_med_uslug"];
		assert.ok(contractHtml, "Шаблон dogovor_na_okazanie_med_uslug обязан существовать в реестре");

		// Проверка ссылки на ПП РФ № 736
		assert.match(
			contractHtml,
			/Постановлени[ея]\s+Правительства\s+РФ\s+от\s+11\.05\.2023\s+№\s*736/i,
			"Договор обязан ссылаться на действующее ПП РФ № 736",
		);

		// Письменное уведомление о бесплатной помощи по ОМС (п. 16 ПП РФ № 736)
		assert.match(
			contractHtml,
			/программ[аы]\s+государственных\s+гарантий|ОМС|бесплатной\s+медицинской\s+помощи/i,
			"Договор обязан содержать уведомление о возможности получения бесплатной медпомощи по ОМС",
		);

		// Указание сайта органа лицензирования Росздравнадзора (п. 17 ПП РФ № 736)
		assert.match(
			contractHtml,
			/roszdravnadzor\.gov\.ru/i,
			"Договор обязан содержать сайт лицензирующего органа roszdravnadzor.gov.ru",
		);

		// Отсутствие жесткого хардкода г. Москва в теле договора
		assert.match(
			contractHtml,
			/\{\{Клиника\.Город\}\}/,
			"Город в договоре обязан быть динамической переменной {{Клиника.Город}}, а не хардкодом",
		);

		// Проверка ГОСТ Р 7.0.97-2016 в общих стилях печати: левое поле не менее 20 мм
		assert.match(
			SHARED_DOCUMENT_CSS,
			/margin:\s*15mm\s+10mm\s+15mm\s+20mm/i,
			"Печатные стили документов обязаны иметь левое поле 20 мм по ГОСТ Р 7.0.97-2016",
		);
	});

	it("2. Договор на несовершеннолетнего (ст. 54 323-ФЗ, СК РФ) является полноценным правовым документом", () => {
		const minorContractHtml = ALL_DEFAULT_TEMPLATES_BY_ALIAS["dogovor_na_okazanie_med_uslug_nesovershennoletnego"];
		assert.ok(
			minorContractHtml,
			"Шаблон dogovor_na_okazanie_med_uslug_nesovershennoletnego обязан существовать в реестре",
		);

		// Проверка объема и ссылок на законы
		assert.ok(
			minorContractHtml.length > 1500,
			"Договор на ребенка обязан быть развернутым юридическим документом, а не 3-строчной заглушкой",
		);
		assert.match(
			minorContractHtml,
			/Семейного\s+кодекса\s+РФ/i,
			"Договор обязан ссылаться на Семейный кодекс РФ",
		);
		assert.match(
			minorContractHtml,
			/ст\.\s*54|323-ФЗ/i,
			"Договор обязан содержать ссылку на ст. 54 ФЗ № 323-ФЗ",
		);
		assert.match(
			minorContractHtml,
			/ст\.\s*185\s+ГК\s+РФ|доверенност/i,
			"Договор обязан регулировать сопровождение родственниками по доверенности",
		);
	});

	it("3. Наличие официального бланка доверенности на сопровождение ребенка (ст. 185 ГК РФ)", () => {
		const proxyHtml = ALL_DEFAULT_TEMPLATES_BY_ALIAS["doverennost_na_soprovozhdenie_rebenka"];
		assert.ok(
			proxyHtml,
			"Шаблон doverennost_na_soprovozhdenie_rebenka обязан быть зарегистрирован в реестре",
		);
		assert.match(
			proxyHtml,
			/185|185\.1\s+ГК\s+РФ/i,
			"Бланк доверенности обязан ссылаться на ст. 185, 185.1 Гражданского кодекса РФ",
		);
		assert.match(
			proxyHtml,
			/ст\.\s*54.*323-ФЗ/i,
			"Бланк доверенности обязан ссылаться на ст. 54 ФЗ № 323-ФЗ",
		);
		assert.match(
			proxyHtml,
			/амбулаторной\s+картой|информированные?\s+добровольные?\s+согласи/i,
			"Доверенность обязана давать полномочия на сопровождение и ознакомление с меддокументацией",
		);
	});

	it("4. Согласие на обработку персональных данных содержит биометрию (ст. 11 152-ФЗ) и передачу в ЕГИСЗ", () => {
		const pdConsentHtml = ALL_DEFAULT_TEMPLATES_BY_ALIAS["soglasie_na_obrabku_pd"];
		assert.ok(pdConsentHtml, "Шаблон soglasie_na_obrabku_pd обязан существовать в реестре");

		// Биометрические персональные данные (дентальный фотопротокол, КЛКТ, рентген)
		assert.match(
			pdConsentHtml,
			/Биометрические\s+персональные\s+данные|ст\.\s*11\s+152-ФЗ/i,
			"Согласие 152-ФЗ обязано выделять биометрические персональные данные по ст. 11 152-ФЗ",
		);
		assert.match(
			pdConsentHtml,
			/фотопротокол|рентгенограмм|томографи|КЛКТ/i,
			"Согласие 152-ФЗ обязано прямо указывать дентальный фотопротокол и рентгенологические исследования",
		);

		// Передача в ЕГИСЗ Минздрава РФ и Госуслуги
		assert.match(
			pdConsentHtml,
			/ЕГИСЗ|РЭМД|ФРЭМД/i,
			"Согласие 152-ФЗ обязано фиксировать передачу в ЕГИСЗ (РЭМД/ФРЭМД)",
		);
		assert.match(
			pdConsentHtml,
			/Госуслуг|Мое\s+здоровье/i,
			"Согласие 152-ФЗ обязано упоминать Госуслуги (раздел «Мое здоровье»)",
		);

		// Срок хранения документации (25 лет)
		assert.match(
			pdConsentHtml,
			/25\s+лет/i,
			"Согласие 152-ФЗ обязано указывать срок хранения медкарты 25 лет",
		);
	});

	it("5. renderPaidServiceContract736Html генерирует договор с динамическим городом, ОМС-уведомлением и ГОСТ-полями", () => {
		const payload = paidServiceContract736PayloadSchema.parse({
			contractNumber: "Д-2026-99",
			contractDate: "2026-10-03",
			clinicCity: "г. Санкт-Петербург",
			clinicLegalName: "ООО Стоматология Север",
			clinicAddress: "г. Санкт-Петербург, Невский пр., 100",
			clinicInn: "7801234567",
			clinicOgrn: "1027800000000",
			medicalLicenseNumber: "ЛО-78-01-000000",
			patientFullName: "Иванов Иван Иванович",
			patientPassport: "серия 4000 № 123456",
			patientAddress: "г. Санкт-Петербург, Садовая ул., 5",
			patientPhone: "+7 (812) 000-00-00",
		});

		const html = renderPaidServiceContract736Html(payload);

		// ГОСТ левое поле 20 мм под скоросшиватель карты 043/у
		assert.match(
			html,
			/margin:\s*(?:12|15)mm\s+10mm\s+(?:12|15)mm\s+20mm/i,
			"Печатные поля обязаны иметь левое поле 20 мм по ГОСТ Р 7.0.97-2016",
		);

		// Динамический город вместо хардкодной Москвы
		assert.match(
			html,
			/г\.\s*Санкт-Петербург/i,
			"Город в договоре обязан быть из переданного clinicCity",
		);
		assert.doesNotMatch(
			html,
			/г\.\s*Москва\s*·/i,
			"В шапке договора для СПб не должно быть хардкода г. Москва",
		);

		// Сайт Росздравнадзора
		assert.match(
			html,
			/roszdravnadzor\.gov\.ru/i,
			"Договор обязан содержать сайт лицензирующего органа roszdravnadzor.gov.ru",
		);

		// Письменное уведомление об ОМС
		assert.match(
			html,
			/бесплатной\s+медицинской\s+помощи\s+в\s+рамках\s+программы\s+государственных\s+гарантий|ОМС/i,
			"Договор обязан содержать уведомление о гарантиях бесплатной медпомощи",
		);
	});
});
