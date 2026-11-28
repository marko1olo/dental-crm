import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
import { appendChipToText } from "../../components/documents/documentChipText";
import { AnesthesiaConsentLogForm } from "../../components/documents/forms/AnesthesiaConsentLogForm";
import { InformedConsentForm } from "../../components/documents/forms/InformedConsentForm";
import { MedicalInterventionRefusalForm } from "../../components/documents/forms/MedicalInterventionRefusalForm";
import { PaidServiceContractForm } from "../../components/documents/forms/PaidServiceContractForm";
import { PaymentInvoiceDocumentForm } from "../../components/documents/forms/PaymentInvoiceDocumentForm";
import { PersonalDataProcessingConsentForm } from "../../components/documents/forms/PersonalDataProcessingConsentForm";
import { PhotoVideoConsentForm } from "../../components/documents/forms/PhotoVideoConsentForm";
import { ProcedureSpecificConsentForm } from "../../components/documents/forms/ProcedureSpecificConsentForm";
import { TaxDeductionApplicationForm } from "../../components/documents/forms/TaxDeductionApplicationForm";
import { DocumentFormSwitch } from "../../components/documents/tabs/DocumentFormSwitch";
import { AppLogicProvider, type AppLogicContextType } from "../../contexts/AppLogicContext";
import { DocumentsView } from "../../DocumentsView";

function renderForm(element: ReturnType<typeof createElement>): string {
	return renderToStaticMarkup(element);
}

describe("вынесенные формы подключены через DocumentFormSwitch и DocumentsView", () => {
	it("DocumentsView подключает рабочий контур документов и DocumentFormSwitch", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const html = renderToStaticMarkup(
				createElement(
					AppLogicProvider,
					{
						value: {
							dashboard: { patients: [], staff: [], appointments: [], payments: [] },
							activePatient: { id: "p-1", fullName: "Петров Пётр Петрович", balanceRub: 0 },
							activeDoctor: { id: "d-1", fullName: "Иванова Мария Сергеевна" },
							activeDocuments: [],
							activeUsableDocuments: [],
							auth: {
								currentUser: { name: "Иванова М.С." },
								denteClinicalReadHeaders: () => ({}),
								denteClinicalMutationHeaders: () => ({}),
							},
						} as unknown as AppLogicContextType,
					},
					createElement(DocumentsView, {
						activePatient: { id: "p-1", fullName: "Петров Пётр Петрович" } as never,
						activeDoctor: { id: "d-1", fullName: "Иванова Мария Сергеевна" },
						activeDocuments: [],
					}),
				),
			);
			assert.ok(html.includes('id="documents"'));
			assert.ok(html.includes("desktop-documents-experience"));
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	it("все 9 вынесенных форм рендерятся через DocumentFormSwitch без дублей", () => {
		const commonProps = {
			activePatient: { id: "p-1", fullName: "Петров Пётр Петрович", birthDate: "1990-01-01" } as never,
			activeDoctor: { id: "d-1", fullName: "Иванова Мария Сергеевна" } as never,
			paidContractTotalRubValue: () => 15000,
			paymentInvoiceTotalRubValue: () => 15000,
			money: (v: number | null | undefined) => `${v ?? 0} ₽`,
			taxApplicationRelationshipOptions,
			taxApplicationFormOptions,
			taxApplicationDeliveryChannelOptions,
			normalizedTaxApplicationRelationshipSelect,
			normalizedTaxApplicationForm,
			normalizedTaxApplicationDeliveryChannel,
		};

		const switchPairs: Array<[string, ReturnType<typeof createElement>, string]> = [
			["anesthesia_consent_log", createElement(AnesthesiaConsentLogForm, {}), "document-payload-card"],
			["informed_consent", createElement(InformedConsentForm, { activeDoctorFullName: "Иванова М.С." }), "document-payload-card"],
			["medical_intervention_refusal", createElement(MedicalInterventionRefusalForm, { activeDoctorFullName: "Иванова М.С." }), "document-payload-card"],
			["paid_service_contract", createElement(PaidServiceContractForm, { documentPatientFullName: "Петров Пётр Петрович", totalRubValue: 15000, totalRubFormatted: "15 000 ₽" }), "document-payload-card"],
			["payment_invoice", createElement(PaymentInvoiceDocumentForm, { documentPatientFullName: "Петров Пётр Петрович", totalRubFormatted: "15 000 ₽" }), "document-payload-card"],
			["personal_data_processing_consent", createElement(PersonalDataProcessingConsentForm, {}), "document-payload-card"],
			["photo_video_consent", createElement(PhotoVideoConsentForm, { materialOptions: [], toggleMaterial: () => {} }), "document-payload-card"],
			["procedure_specific_consent", createElement(ProcedureSpecificConsentForm, { procedureOptions: [], normalizeProcedure: (v) => v as never, renderToothRowsEditor: () => null }), "document-payload-card"],
			[
				"tax_deduction_application",
				createElement(TaxDeductionApplicationForm, {
					relationshipOptions: taxApplicationRelationshipOptions,
					formOptions: taxApplicationFormOptions,
					deliveryChannelOptions: taxApplicationDeliveryChannelOptions,
					normalizeRelationship: normalizedTaxApplicationRelationshipSelect,
					normalizeForm: normalizedTaxApplicationForm,
					normalizeDeliveryChannel: normalizedTaxApplicationDeliveryChannel,
					patientName: "Петров Пётр Петрович",
				}),
				"Заявитель / налогоплательщик",
			],
		];

		for (const [kind, directEl, expectedMarker] of switchPairs) {
			const switchHtml = renderForm(
				createElement(DocumentFormSwitch, {
					...commonProps,
					selectedDocumentKind: kind as never,
				}),
			);
			const directHtml = renderForm(directEl);
			assert.ok(switchHtml.includes(expectedMarker), `${kind} should render through DocumentFormSwitch`);
			assert.ok(directHtml.includes(expectedMarker), `${kind} should render directly`);
			const taxCount = (switchHtml.match(/Заявитель \/ налогоплательщик/g) ?? []).length;
			if (kind === "tax_deduction_application") {
				assert.ok(taxCount >= 1, "TaxDeductionApplicationForm should render its applicant block");
			} else {
				assert.equal(taxCount, 0, `${kind} must not leak TaxDeductionApplicationForm markup`);
			}
		}
	});

	it("общая карточка и 4 ряда кнопок-подсказок работают в форме отказа", () => {
		const refusalHtml = renderForm(
			createElement(MedicalInterventionRefusalForm, {
				activeDoctorFullName: "Иванова Мария Сергеевна",
				activeVisitComplaint: "боль в зубе 36",
			}),
		);
		const chipGroups = refusalHtml.match(/class="quick-chips-row/g) ?? [];
		assert.equal(chipGroups.length, 4, "в форме отказа рендерятся 4 ряда кнопок-подсказок");
		assert.equal(appendChipToText("Кариес", "Пульпит"), "Кариес, пульпит");
		assert.equal(appendChipToText("", "Пульпит"), "Пульпит");
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

describe("оформление раскрывающихся блоков и свёрнутого контента в живом DOM", () => {
	it("формы рендерят семантические классы document-payload-card и document-manual-override без сломанной обёртки", () => {
		const contractHtml = renderForm(
			createElement(PaidServiceContractForm, {
				documentPatientFullName: "Петров Пётр Петрович",
				activeDoctorFullName: "Иванова Мария Сергеевна",
				totalRubValue: 15000,
				totalRubFormatted: "15 000 ₽",
			}),
		);
		assert.ok(contractHtml.includes("document-payload-card"));
		assert.ok(contractHtml.includes("document-manual-override") || contractHtml.includes("document-payload-collapsed-content"));

		const taxHtml = renderForm(
			createElement(TaxDeductionApplicationForm, {
				relationshipOptions: taxApplicationRelationshipOptions,
				formOptions: taxApplicationFormOptions,
				deliveryChannelOptions: taxApplicationDeliveryChannelOptions,
				normalizeRelationship: normalizedTaxApplicationRelationshipSelect,
				normalizeForm: normalizedTaxApplicationForm,
				normalizeDeliveryChannel: normalizedTaxApplicationDeliveryChannel,
				patientName: "Петров Пётр Петрович",
			}),
		);
		assert.ok(taxHtml.includes("document-payload-card"));
	});
});
