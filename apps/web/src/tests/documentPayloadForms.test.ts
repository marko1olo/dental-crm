import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	photoVideoMaterialOptions,
	procedureSpecificConsentProcedureOptions,
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
	taxApplicationRelationshipOptions,
} from "../AppConstants";
import {
	normalizedProcedureSpecificConsentProcedure,
	normalizedTaxApplicationDeliveryChannel,
	normalizedTaxApplicationForm,
	normalizedTaxApplicationRelationshipSelect,
} from "../AppHelpers";
import { appendChipToText } from "../components/documents/documentChipText";
import { AnesthesiaConsentLogForm } from "../components/documents/forms/AnesthesiaConsentLogForm";
import { InformedConsentForm } from "../components/documents/forms/InformedConsentForm";
import { MedicalInterventionRefusalForm } from "../components/documents/forms/MedicalInterventionRefusalForm";
import { PersonalDataProcessingConsentForm } from "../components/documents/forms/PersonalDataProcessingConsentForm";
import { PhotoVideoConsentForm } from "../components/documents/forms/PhotoVideoConsentForm";
import { ProcedureSpecificConsentForm } from "../components/documents/forms/ProcedureSpecificConsentForm";
import { TaxDeductionApplicationForm } from "../components/documents/forms/TaxDeductionApplicationForm";

/**
 * СЕМЬ ФОРМ ДОКУМЕНТОВ ВЫНЕСЕНЫ ИЗ DocumentsView.tsx — И ДОЛЖНЫ РИСОВАТЬСЯ.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/tests/documentPayloadForms.test.ts
 * (tsx берёт jsx-настройку из apps/web/tsconfig.json, поэтому рабочий каталог
 * важен: из корня репозитория JSX собирается старым способом и падает на
 * «React is not defined».)
 *
 * Проверяется ровно то, чем этот перенос может навредить:
 *  1. вынесенный файл никто не подключил — ровно так уже случилось с
 *     forms/TaxDeductionApplicationForm.tsx: он лежал мёртвым, а экран рисовал
 *     копию внутри DocumentsView.tsx;
 *  2. при переносе потерялась подпись поля или галочка — формы рисуются
 *     по-настоящему, и текст сверяется с тем, что видел врач;
 *  3. вместе с inline-стилями пропало оформление. Оно не пропало: в
 *     dente-redesign.css те же свойства объявлены с `!important`, то есть
 *     сильнее атрибута style, и рисовало карточку всегда CSS. Проверка ниже
 *     упадёт, если `!important` из CSS уберут — тогда inline-стили придётся
 *     вернуть;
 *  4. у формы отказа оболочка своя (наведение на сводке, фокус-обводка на
 *     кнопках-подсказках). Её нельзя молча заменить общей карточкой.
 */

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");
const read = (relativePath: string) =>
	readFileSync(join(webSrc, relativePath), "utf8");

const documentsView = read("DocumentsView.tsx");
const redesignCss = read("styles/dente-redesign.css");

/** Сводка складного блока — одна на все карточки документов. */
const MANUAL_OVERRIDE_SUMMARY = "✏️ Ручная корректировка полей (развернуть)";

/** Вынесенные формы и то, как их подключает DocumentsView.tsx. */
const extractedForms = [
	{
		name: "AnesthesiaConsentLogForm",
		file: "components/documents/forms/AnesthesiaConsentLogForm.tsx",
	},
	{
		name: "InformedConsentForm",
		file: "components/documents/forms/InformedConsentForm.tsx",
	},
	{
		name: "MedicalInterventionRefusalForm",
		file: "components/documents/forms/MedicalInterventionRefusalForm.tsx",
	},
	{
		name: "PersonalDataProcessingConsentForm",
		file: "components/documents/forms/PersonalDataProcessingConsentForm.tsx",
	},
	{
		name: "PhotoVideoConsentForm",
		file: "components/documents/forms/PhotoVideoConsentForm.tsx",
	},
	{
		name: "ProcedureSpecificConsentForm",
		file: "components/documents/forms/ProcedureSpecificConsentForm.tsx",
	},
	{
		name: "TaxDeductionApplicationForm",
		file: "components/documents/forms/TaxDeductionApplicationForm.tsx",
	},
] as const;

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

describe("вынесенные формы подключены, а не лежат мёртвым файлом", () => {
	for (const form of extractedForms) {
		it(`${form.name}: есть определение и есть применение в DocumentsView.tsx`, () => {
			const source = read(form.file);
			assert.match(
				source,
				new RegExp(`export function ${form.name}\\(`),
				`${form.file}: пропало объявление компонента`,
			);
			assert.match(
				documentsView,
				new RegExp(
					`import \\{ ${form.name} \\} from "\\./components/documents/forms/${form.name}"`,
				),
				`DocumentsView.tsx не импортирует ${form.name}`,
			);
			assert.match(
				documentsView,
				new RegExp(`<${form.name}[\\s/>]`),
				`DocumentsView.tsx импортирует ${form.name}, но не рисует его — это мёртвый файл`,
			);
		});
	}

	it("копия заявления на налоговую справку из DocumentsView.tsx убрана", () => {
		assert.ok(
			!documentsView.includes("Заявитель / налогоплательщик"),
			"в DocumentsView.tsx осталась вторая копия формы заявления: правка в одной из копий не дойдёт до пациента",
		);
	});

	it("общая карточка и ряд кнопок-подсказок тоже подключены", () => {
		const card = read("components/documents/DocumentPayloadCard.tsx");
		assert.match(card, /export function DocumentPayloadCard\(/);
		const users = extractedForms.filter((form) =>
			read(form.file).includes('from "../DocumentPayloadCard"'),
		);
		assert.equal(
			users.length,
			6,
			`общую карточку используют ${users.length} форм из 6 ожидаемых`,
		);

		const refusal = read(
			"components/documents/forms/MedicalInterventionRefusalForm.tsx",
		);
		assert.match(
			refusal,
			/import \{ QuickChipsRow \} from "\.\.\/QuickChipsRow"/,
		);
		assert.equal(
			refusal.match(/<QuickChipsRow /g)?.length,
			4,
			"в форме отказа было четыре ряда кнопок-подсказок",
		);
		assert.match(
			refusal,
			/import \{ appendChipToText \} from "\.\.\/documentChipText"/,
		);
	});
});

describe("формы рисуются и сохранили текст, который видел врач", () => {
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
		// Подсказки приходят из активного визита, а не подставляются заглушкой.
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
		assert.ok(html.includes("Согласие на ПДн"));
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

	it("заявление на налоговую справку: справочники настоящие, а не подставные", () => {
		const html = renderForm(
			createElement(TaxDeductionApplicationForm, {
				relationshipOptions: taxApplicationRelationshipOptions,
				formOptions: taxApplicationFormOptions,
				deliveryChannelOptions: taxApplicationDeliveryChannelOptions,
				normalizeRelationship: normalizedTaxApplicationRelationshipSelect,
				normalizeForm: normalizedTaxApplicationForm,
				normalizeDeliveryChannel: normalizedTaxApplicationDeliveryChannel,
			}),
		);
		assert.ok(html.includes("Заявление на налоговую справку"));
		assert.ok(html.includes("Заявитель / налогоплательщик"));
		for (const option of [
			...taxApplicationRelationshipOptions,
			...taxApplicationFormOptions,
			...taxApplicationDeliveryChannelOptions,
		]) {
			assert.ok(
				html.includes(option.label),
				`в заявлении нет варианта «${option.label}»`,
			);
		}
		assert.ok(
			html.includes("Перед выдачей будет проверен дубль по тем же расходам"),
		);
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

describe("оформление карточки не потерялось вместе с inline-стилями", () => {
	/**
	 * Свойства, которые раньше стояли в `style={{ … }}` каждой из 28 копий, и
	 * селектор, который перекрывает их с `!important`. Пока это правда, разметка
	 * без inline-стилей рисуется ровно так же, как рисовалась с ними.
	 */
	const cssGuarantees = [
		{
			selector: ".document-manual-override",
			properties: [
				"background",
				"padding",
				"border-radius",
				"border",
				"margin-top",
			],
		},
		{
			selector: ".document-manual-override > summary",
			properties: ["cursor", "font-weight", "color", "user-select"],
		},
		{
			selector: ".document-payload-collapsed-content",
			properties: ["margin-top", "display", "flex-direction", "gap"],
		},
	];

	for (const guarantee of cssGuarantees) {
		it(`${guarantee.selector}: свойства объявлены с !important`, () => {
			const start = redesignCss.indexOf(`\n${guarantee.selector} {`);
			assert.ok(
				start > 0,
				`в dente-redesign.css нет правила ${guarantee.selector}`,
			);
			const block = redesignCss.slice(start, redesignCss.indexOf("}", start));
			for (const property of guarantee.properties) {
				assert.match(
					block,
					new RegExp(`${property}\\s*:[^;]*!important`),
					`${guarantee.selector}: свойство ${property} больше не !important — inline-стили карточек придётся вернуть`,
				);
			}
		});
	}

	it("общая карточка рисуется без атрибута style", () => {
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
