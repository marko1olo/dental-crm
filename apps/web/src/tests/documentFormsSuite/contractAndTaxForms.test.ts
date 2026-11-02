import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
	taxApplicationRelationshipOptions,
} from "../../AppConstants";
import {
	normalizedTaxApplicationDeliveryChannel,
	normalizedTaxApplicationForm,
	normalizedTaxApplicationRelationshipSelect,
} from "../../AppHelpers";
import { PaidServiceContractForm } from "../../components/documents/forms/PaidServiceContractForm";
import { PaymentInvoiceDocumentForm } from "../../components/documents/forms/PaymentInvoiceDocumentForm";
import { TaxDeductionApplicationForm } from "../../components/documents/forms/TaxDeductionApplicationForm";

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..", "..");
const read = (relativePath: string) =>
	readFileSync(join(webSrc, relativePath), "utf8");

const documentsView =
	read("DocumentsView.tsx") +
	read("documentsView/DocumentsA4PrintPreview.tsx");

const documentFormSwitch =
	read("components/documents/tabs/DocumentFormSwitch.tsx") +
	read("components/documents/tabs/formSwitch/ClinicalDocumentForms.tsx") +
	read("components/documents/tabs/formSwitch/ConsentDocumentForms.tsx") +
	read("components/documents/tabs/formSwitch/FinancialDocumentForms.tsx");

const redesignCss = read("styles/dente-redesign.css");

/** Вынесенные формы и то, как их подключает DocumentFormSwitch. */
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
		name: "PaidServiceContractForm",
		file: "components/documents/forms/PaidServiceContractForm.tsx",
	},
	{
		name: "PaymentInvoiceDocumentForm",
		file: "components/documents/forms/PaymentInvoiceDocumentForm.tsx",
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

function renderForm(element: ReturnType<typeof createElement>): string {
	return renderToStaticMarkup(element);
}

describe("вынесенные формы подключены, а не лежат мёртвым файлом", () => {
	it("DocumentsView подключает DocumentFormSwitch", () => {
		assert.match(
			documentsView,
			/import \{ DocumentFormSwitch \} from "(?:\.\/|\.\.\/)components\/documents\/tabs\/DocumentFormSwitch"/,
			"DocumentsView.tsx не импортирует DocumentFormSwitch",
		);
		assert.match(
			documentsView,
			/<DocumentFormSwitch\b/,
			"DocumentsView.tsx не монтирует DocumentFormSwitch",
		);
	});

	for (const form of extractedForms) {
		it(`${form.name}: есть определение и есть применение в DocumentFormSwitch`, () => {
			const source = read(form.file);
			assert.match(
				source,
				new RegExp(`export (?:function|const) ${form.name}\\b`),
				`${form.file}: пропало объявление компонента`,
			);
			assert.match(
				documentFormSwitch,
				new RegExp(
					`import \\{ ${form.name} \\} from "(?:\\.\\./|\\.\\./\\.\\./)forms/${form.name}"`,
				),
				`DocumentFormSwitch не импортирует ${form.name}`,
			);
			assert.match(
				documentFormSwitch,
				new RegExp(`<${form.name}[\\s/>]`),
				`DocumentFormSwitch импортирует ${form.name}, но не рисует его — это мёртвый файл`,
			);
		});
	}

	it("копия заявления на налоговую справку из DocumentsView.tsx убрана", () => {
		assert.ok(
			!documentsView.includes("Заявитель / налогоплательщик"),
			"в DocumentsView.tsx осталась вторая копия формы заявления: правка в одной из копий не дойдёт до пациента",
		);
		assert.ok(
			!documentFormSwitch.includes("Заявитель / налогоплательщик"),
			"в DocumentFormSwitch.tsx осталась вторая копия формы заявления: правка в одной из копий не дойдёт до пациента",
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
			7,
			`общую карточку используют ${users.length} форм из 7 ожидаемых`,
		);

		const refusal =
			read("components/documents/forms/MedicalInterventionRefusalForm.tsx") +
			read("components/documents/forms/refusalForm/RefusalFieldsSection.tsx");
		assert.match(
			refusal,
			/import \{ QuickChipsRow \} from "(?:\.\/|\.\.\/|\.\.\/\.\.\/)QuickChipsRow"/,
		);
		assert.equal(
			refusal.match(/<QuickChipsRow /g)?.length,
			4,
			"в форме отказа было четыре ряда кнопок-подсказок",
		);
		assert.match(
			refusal,
			/import \{ appendChipToText \} from "(?:\.\/|\.\.\/|\.\.\/\.\.\/)documentChipText"/,
		);
	});
});

describe("формы договоров, счетов и налоговых вычетов рисуются и сохранили текст", () => {
	it("договор платных услуг: заголовок, реквизиты, суммы и 4 подтверждения", () => {
		const html = renderForm(
			createElement(PaidServiceContractForm, {
				documentPatientFullName: "Петров Пётр Петрович",
				activeDoctorFullName: "Иванова Мария Сергеевна",
				activeVisitComplaint: "кариес 36",
				activeVisitTreatmentPlan: "пломба",
				totalRubValue: 15000,
				totalRubFormatted: "15 000 ₽",
			}),
		);
		assert.ok(
			html.includes("Договор оказания медицинских услуг") ||
				html.includes("Договор платных медицинских услуг"),
		);
		assert.ok(html.includes("Номер договора"));
		assert.ok(html.includes("Дата договора"));
		assert.ok(html.includes("Начало оказания"));
		assert.ok(html.includes("Завершение"));
		assert.ok(html.includes("Заказчик"));
		assert.ok(html.includes("Петров Пётр Петрович"));
		assert.ok(html.includes("Иванова Мария Сергеевна"));
		assert.ok(html.includes("Сумма договора"));
		assert.ok(html.includes("15 000 ₽"));
		assert.ok(html.includes("Порядок оплаты"));
		assert.ok(html.includes("Изменение цены и объема"));
		assert.ok(html.includes("Уведомление о бесплатной помощи"));
		assert.ok(html.includes("Предупреждение о рекомендациях врача"));
		assert.ok(html.includes("Отказ и возврат"));
		assert.ok(html.includes("Гарантия и претензии"));
		assert.ok(
			html.includes("Пациент получил сведения о клинике, лицензии и исполнителе"),
		);
		assert.ok(
			html.includes("Перечень услуг и стоимость переданы пациенту до подписания"),
		);
		assert.ok(html.includes("Пациент понимает платную основу оказания услуг"));
		assert.ok(
			html.includes("Изменения состава или стоимости оформляются письменно"),
		);
	});

	it("счет на оплату: заголовок, реквизиты, плательщик, банк и QR", () => {
		const html = renderForm(
			createElement(PaymentInvoiceDocumentForm, {
				documentPatientFullName: "Петров Пётр Петрович",
				documentPatientPhone: "+7 999 123-45-67",
				documentPatientEmail: "petrov@example.com",
				clinicBankDetails: "АО ТИНЬКОФФ БАНК, БИК 044525974",
				totalRubFormatted: "12 500 ₽",
				serviceLinesCount: 3,
			}),
		);
		assert.ok(html.includes("Счет на оплату"));
		assert.ok(html.includes("Номер счета"));
		assert.ok(html.includes("Дата счета"));
		assert.ok(html.includes("Плательщик"));
		assert.ok(html.includes("Петров Пётр Петрович"));
		assert.ok(html.includes("+7 999 123-45-67"));
		assert.ok(html.includes("petrov@example.com"));
		assert.ok(html.includes("Срок оплаты"));
		assert.ok(html.includes("Назначение платежа"));
		assert.ok(html.includes("Условия оплаты"));
		assert.ok(html.includes("Реквизиты клиники"));
		assert.ok(html.includes("АО ТИНЬКОФФ БАНК, БИК 044525974"));
		assert.ok(html.includes("QR/платежная строка"));
		assert.ok(html.includes("Сумма из плана лечения: 12 500 ₽. Строк услуг: 3."));
		assert.ok(html.includes("Безналичная оплата разрешена"));
		assert.ok(html.includes("Оплата в кассе разрешена"));
		assert.ok(html.includes("Реквизиты клиники проверены"));
		assert.ok(
			html.includes("Состав услуг соответствует плану или договору"),
		);
		assert.ok(
			html.includes("Плательщик предупрежден: счет не является кассовым чеком"),
		);
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
});

describe("оформление карточки не потерялось вместе с inline-стилями", () => {
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
});
