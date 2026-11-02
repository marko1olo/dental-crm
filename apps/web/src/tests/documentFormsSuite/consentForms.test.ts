import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	photoVideoMaterialOptions,
	procedureSpecificConsentProcedureOptions,
} from "../../AppConstants";
import { normalizedProcedureSpecificConsentProcedure } from "../../AppHelpers";
import { appendChipToText } from "../../components/documents/documentChipText";
import { AnesthesiaConsentLogForm } from "../../components/documents/forms/AnesthesiaConsentLogForm";
import { InformedConsentForm } from "../../components/documents/forms/InformedConsentForm";
import { MedicalInterventionRefusalForm } from "../../components/documents/forms/MedicalInterventionRefusalForm";
import { PersonalDataProcessingConsentForm } from "../../components/documents/forms/PersonalDataProcessingConsentForm";
import { PhotoVideoConsentForm } from "../../components/documents/forms/PhotoVideoConsentForm";
import { ProcedureSpecificConsentForm } from "../../components/documents/forms/ProcedureSpecificConsentForm";

/** Сводка складного блока — одна на все карточки документов. */
const MANUAL_OVERRIDE_SUMMARY = "Ручная корректировка полей (развернуть)";

/** Реквизиты оператора ПДн: их форма только показывает, править нельзя. */
const clinicProfileDraft = {
	legalName: "ООО «Дента-Плюс»",
	clinicName: "Стоматология на Ленина",
	inn: "7701234567",
	address: "г. Казань, ул. Ленина, д. 14, помещение 3",
};

function renderForm(element: ReturnType<typeof createElement>): string {
	return renderToStaticMarkup(element);
}

describe("дописывание формулировки кнопкой-подсказкой", () => {
	it("в пустое поле формулировка попадает как есть — с большой буквы", () => {
		assert.equal(appendChipToText("", "Потеря зуба"), "Потеря зуба");
	});

	it("к набранному тексту формулировка дописывается через запятую в нижнем регистре", () => {
		assert.equal(
			appendChipToText("Обострение воспаления", "Потеря зуба"),
			"Обострение воспаления, потеря зуба",
		);
	});

	it("пробелы и переводы строк по краям не дают «текст , формулировка»", () => {
		assert.equal(
			appendChipToText("  Отек десны  ", "Гнойные выделения"),
			"Отек десны, гнойные выделения",
		);
		assert.equal(appendChipToText("\n\t", "Наблюдение"), "Наблюдение");
	});

	it("три нажатия подряд собирают перечисление, а не затирают предыдущее", () => {
		let value = "";
		for (const chip of [
			"Страх перед процедурой",
			"Нехватка времени",
			"Финансовые причины",
		]) {
			value = appendChipToText(value, chip);
		}
		assert.equal(
			value,
			"Страх перед процедурой, нехватка времени, финансовые причины",
		);
	});
});

describe("формы информированных согласий и отказа рисуются и сохранили текст", () => {
	it("информированное согласие: заголовок, поля и три галочки", () => {
		const html = renderForm(
			createElement(InformedConsentForm, {
				activeDoctorFullName: "Соколова Марина Львовна",
				activeVisitComplaint: "боль при накусывании на зуб 36",
				inferredTreatmentArea: "зуб 36",
			}),
		);
		assert.ok(html.includes("Информированное согласие"));
		assert.ok(html.includes("Планируемое вмешательство"));
		assert.ok(html.includes("Кому можно сообщать медицинские сведения"));
		assert.ok(html.includes("Пациент понял риски, ограничения и прогноз"));
		assert.ok(
			html.includes("Пациенту объяснено право отказаться до вмешательства"),
		);
		assert.ok(html.includes(MANUAL_OVERRIDE_SUMMARY));
		assert.ok(html.includes("Соколова Марина Львовна"));
		assert.ok(html.includes("боль при накусывании на зуб 36"));
		assert.ok(html.includes("зуб 36"));
	});

	it("процедурное согласие: список блоков процедур настоящий, редактор строк зубов вызван", () => {
		const html = renderForm(
			createElement(ProcedureSpecificConsentForm, {
				activeDoctorFullName: "Соколова Марина Львовна",
				procedureOptions: procedureSpecificConsentProcedureOptions,
				normalizeProcedure: normalizedProcedureSpecificConsentProcedure,
				renderToothRowsEditor: () =>
					createElement("div", null, "строки зубов приёма"),
			}),
		);
		assert.ok(html.includes("Процедурное согласие"));
		assert.ok(html.includes("Блок процедуры"));
		assert.ok(procedureSpecificConsentProcedureOptions.length > 1);
		for (const option of procedureSpecificConsentProcedureOptions) {
			assert.ok(
				html.includes(option.label),
				`в списке блоков процедур нет «${option.label}»`,
			);
		}
		assert.ok(
			html.includes("строки зубов приёма"),
			"редактор строк зубов не отрисован",
		);
		assert.ok(html.includes("Персональные факторы риска пациента"));
		assert.ok(
			html.includes("Опрошен, значимых факторов нет"),
			"кнопка отрицательного ответа пропала",
		);
	});

	it("журнал анестезии: подпись зоны берёт зону лечения приёма", () => {
		const html = renderForm(
			createElement(AnesthesiaConsentLogForm, {
				inferredTreatmentArea: "зуб 46",
			}),
		);
		assert.ok(html.includes("Журнал анестезии"));
		assert.ok(html.includes("Вазоконстриктор"));
		assert.ok(html.includes("Аллергоанамнез"));
		assert.ok(html.includes("зуб 46"));
		assert.ok(
			html.includes("Аллергии, лекарства и ограничения проверены до введения"),
		);
	});

	it("фото и видео: каждый вид материала показан отдельной галочкой", () => {
		const html = renderForm(
			createElement(PhotoVideoConsentForm, {
				materialOptions: photoVideoMaterialOptions,
				toggleMaterial: () => undefined,
			}),
		);
		assert.ok(html.includes("Фото, видео и снимки"));
		assert.ok(photoVideoMaterialOptions.length > 1);
		for (const option of photoVideoMaterialOptions) {
			assert.ok(
				html.includes(option.label),
				`нет галочки материала «${option.label}»`,
			);
		}
		assert.ok(html.includes("Разрешена узнаваемая публикация лица или улыбки"));
	});

	it("согласие на ПДн: оператор, ИНН и адрес только показываются", () => {
		const html = renderForm(
			createElement(PersonalDataProcessingConsentForm, { clinicProfileDraft }),
		);
		assert.ok(
			html.includes("Согласие на обработку персональных данных") ||
				html.includes("Согласие на ПДн"),
		);
		assert.ok(html.includes(clinicProfileDraft.legalName));
		assert.ok(html.includes(clinicProfileDraft.inn));
		assert.ok(html.includes(clinicProfileDraft.address));
		assert.equal(
			html.match(/readOnly=""/g)?.length,
			3,
			"поля оператора перестали быть только для чтения",
		);
		assert.ok(html.includes("Разрешена трансграничная передача"));
	});

	it("отказ от вмешательства: четыре ряда готовых формулировок целиком", () => {
		const html = renderForm(
			createElement(MedicalInterventionRefusalForm, {
				activeDoctorFullName: "Соколова Марина Львовна",
				activeVisitComplaint: "острая боль",
				inferredTreatmentArea: "зуб 48",
			}),
		);
		assert.ok(html.includes("Отказ от вмешательства"));
		assert.ok(html.includes("например: лечение или удаление зуб 48"));
		for (const chip of [
			"Страх перед процедурой",
			"Нехватка времени",
			"Финансовые причины",
			"Желание получить второе мнение",
			"Обострение воспаления",
			"Потеря зуба",
			"Развитие абсцесса",
			"Распространение инфекции",
			"Удаление зуба",
			"Отсроченное лечение",
			"Консультация другого специалиста",
			"Наблюдение",
			"Острая пульсирующая боль",
			"Отек десны или щеки",
			"Повышение температуры тела",
			"Гнойные выделения",
		]) {
			assert.ok(html.includes(chip), `пропала готовая формулировка «${chip}»`);
		}
		assert.equal(
			html.match(/quick-chip quick-chip--sm/g)?.length,
			16,
			"кнопок-подсказок должно остаться 16",
		);
		assert.ok(
			html.includes("Пациенту объяснено, когда нужна экстренная помощь"),
		);
	});
});

describe("стилизация карточек согласий и формы отказа", () => {
	it("общая карточка согласия рисуется без атрибута style", () => {
		const html = renderForm(
			createElement(AnesthesiaConsentLogForm, {
				inferredTreatmentArea: "зуб 46",
			}),
		);
		assert.ok(
			!/ style=/.test(html),
			"в разметке карточки снова появились inline-стили",
		);
		assert.ok(html.includes('class="document-manual-override"'));
		assert.ok(html.includes('class="document-payload-collapsed-content"'));
	});

	it("у формы отказа оболочка своя: наведение и фокус-обводка на месте", () => {
		const html = renderForm(createElement(MedicalInterventionRefusalForm, {}));
		assert.ok(
			html.includes("hover:opacity-80"),
			"у сводки формы отказа пропало наведение",
		);
		assert.ok(
			html.includes("focus:ring-2"),
			"у кнопок-подсказок пропала фокус-обводка",
		);
		assert.ok(html.includes("hover:scale-[1.02]"));
	});
});
