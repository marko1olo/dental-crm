export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import { postVisitCarePresets } from "../../postVisitCareData";
import { loadUiPreferences } from "../../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences();

/*
 * Памятка после приёма берётся из ТОЙ ЖЕ темы, что стоит в селекте.
 *
 * Тема бралась из сохранённых настроек оператора
 * (initialUiPreferences.postVisitCareTopic), а девять полей текста были жёстко
 * прибиты к пресету filling_restoration. Если в настройках сохранена другая тема
 * — удаление, имплантация, гигиена — врач получал памятку, где тема одна, а
 * текст от другого вмешательства: процедура «Пломба / композитная реставрация»,
 * ограничения, питание и тревожные признаки от пломбы. В документ уходит и тема
 * (careTopic), и текст, а весь блок памятки свёрнут в <details>, поэтому
 * расхождение не видно, пока его не раскроют.
 *
 * Единственный писатель этих девяти полей — applyPostVisitCarePreset в
 * useAppLogic.tsx, и он берёт ровно postVisitCarePresets[тема]. Начальное
 * состояние теперь делает то же самое: один источник правды.
 *
 * Индексация безопасна: loadUiPreferences проверяет тему по списку допустимых
 * значений и при мусоре возвращает filling_restoration, а postVisitCarePresets
 * объявлен как Record<PostVisitCareTopic, …>, то есть покрывает все темы.
 */
const _initialPostVisitCarePreset =
	postVisitCarePresets[initialUiPreferences.postVisitCareTopic];

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function createSetter(set: any, key: string) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	return (val: any) =>
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		set((state: any) => ({
			[key]: typeof val === "function" ? val(state[key]) : val,
		}));
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createFinancialSlice = (set: any) => ({
	paidContractNumber: "",
	setPaidContractNumber: createSetter(set, "paidContractNumber"),
	paidContractDate: "",
	setPaidContractDate: createSetter(set, "paidContractDate"),
	paidContractServiceStart: "",
	setPaidContractServiceStart: createSetter(set, "paidContractServiceStart"),
	paidContractServiceEnd:
		"до полного оказания согласованных услуг или подписания акта",
	setPaidContractServiceEnd: createSetter(set, "paidContractServiceEnd"),
	paidContractCustomerFullName: "",
	setPaidContractCustomerFullName: createSetter(
		set,
		"paidContractCustomerFullName",
	),
	paidContractRepresentativeFullName: "",
	setPaidContractRepresentativeFullName: createSetter(
		set,
		"paidContractRepresentativeFullName",
	),
	paidContractCareReason: "",
	setPaidContractCareReason: createSetter(set, "paidContractCareReason"),
	paidContractServiceScope: "",
	setPaidContractServiceScope: createSetter(set, "paidContractServiceScope"),
	paidContractTotalRub: "",
	setPaidContractTotalRub: createSetter(set, "paidContractTotalRub"),
	paidContractPaymentTerms:
		"оплата до или в день оказания услуги с выдачей кассового чека",
	setPaidContractPaymentTerms: createSetter(set, "paidContractPaymentTerms"),
	paidContractPriceChangeRules:
		"изменение объема, состава или стоимости платных услуг оформляется до оказания дополнительным соглашением или новым договором",
	setPaidContractPriceChangeRules: createSetter(
		set,
		"paidContractPriceChangeRules",
	),
	paidContractFreeCareNotice:
		"пациенту разъяснена возможность получения медицинской помощи в рамках программы государственных гарантий при наличии оснований и маршрутизации",
	setPaidContractFreeCareNotice: createSetter(
		set,
		"paidContractFreeCareNotice",
	),
	paidContractRecommendationWarning:
		"несоблюдение назначений, режима лечения и рекомендаций врача может снизить качество услуги, изменить сроки лечения или отрицательно сказаться на состоянии здоровья",
	setPaidContractRecommendationWarning: createSetter(
		set,
		"paidContractRecommendationWarning",
	),
	paidContractRefundTerms:
		"при отказе пациента от услуг оплачиваются фактически понесенные исполнителем расходы и фактически оказанные услуги; возврат оформляется по кассовым и бухгалтерским правилам клиники",
	setPaidContractRefundTerms: createSetter(set, "paidContractRefundTerms"),
	paidContractWarrantyTerms:
		"гарантийные и претензионные условия действуют по локальным правилам клиники, медицинским показаниям и при соблюдении рекомендаций врача",
	setPaidContractWarrantyTerms: createSetter(set, "paidContractWarrantyTerms"),
	paidContractDoctorFullName: "",
	setPaidContractDoctorFullName: createSetter(
		set,
		"paidContractDoctorFullName",
	),
	paidContractSignedAt: "",
	setPaidContractSignedAt: createSetter(set, "paidContractSignedAt"),
	paidContractClinicInfoConfirmed: false,
	setPaidContractClinicInfoConfirmed: createSetter(
		set,
		"paidContractClinicInfoConfirmed",
	),
	paidContractServiceListConfirmed: false,
	setPaidContractServiceListConfirmed: createSetter(
		set,
		"paidContractServiceListConfirmed",
	),
	paidContractPaidBasisConfirmed: false,
	setPaidContractPaidBasisConfirmed: createSetter(
		set,
		"paidContractPaidBasisConfirmed",
	),
	paidContractWrittenChangesConfirmed: false,
	setPaidContractWrittenChangesConfirmed: createSetter(
		set,
		"paidContractWrittenChangesConfirmed",
	),
	paymentInvoiceNumber: "",
	setPaymentInvoiceNumber: createSetter(set, "paymentInvoiceNumber"),
	paymentInvoiceDate: "",
	setPaymentInvoiceDate: createSetter(set, "paymentInvoiceDate"),
	paymentInvoicePayerFullName: "",
	setPaymentInvoicePayerFullName: createSetter(
		set,
		"paymentInvoicePayerFullName",
	),
	paymentInvoicePayerPhone: "",
	setPaymentInvoicePayerPhone: createSetter(set, "paymentInvoicePayerPhone"),
	paymentInvoicePayerEmail: "",
	setPaymentInvoicePayerEmail: createSetter(set, "paymentInvoicePayerEmail"),
	paymentInvoicePurpose:
		"оплата стоматологических услуг по согласованному плану лечения",
	setPaymentInvoicePurpose: createSetter(set, "paymentInvoicePurpose"),
	/*
	 * Срок оплаты счёта вписывает человек.
	 *
	 * Стояло (() => dateInputValuePlusDays(7))() — обёртка ничего не отложила, это
	 * тот же немедленный вызов, и дата считалась ОДИН раз при загрузке модуля.
	 * Значит срок оплаты равнялся «седьмой день от момента открытия вкладки» и
	 * больше не обновлялся: вкладку держат открытой сутками, а счёт уносил
	 * позавчерашний расчёт. В выданный счёт значение попадало как есть
	 * (documentLogic.ts, dueDate: paymentInvoiceDueDate.trim()), фолбэка нет.
	 *
	 * Вид тоже был не тот: dateInputValuePlusDays отдаёт ISO «2026-08-04», а поле
	 * рядом — обычный текстовый input с подсказкой «например: до 25.05.2026».
	 *
	 * Соседнее поле «Дата счета» пусто, и человек его заполняет; предзаполненный
	 * срок внимания не привлекал. Теперь пусто, и validatePaymentInvoice не даёт
	 * создать счёт: «Заполните поле: счет, срок оплаты.».
	 */
	paymentInvoiceDueDate: "",
	setPaymentInvoiceDueDate: createSetter(set, "paymentInvoiceDueDate"),
	paymentInvoicePaymentTerms:
		"оплата до или в день оказания услуги; после оплаты выдается кассовый чек",
	setPaymentInvoicePaymentTerms: createSetter(
		set,
		"paymentInvoicePaymentTerms",
	),
	paymentInvoiceBankDetails: "",
	setPaymentInvoiceBankDetails: createSetter(set, "paymentInvoiceBankDetails"),
	paymentInvoiceQrPayload: "",
	setPaymentInvoiceQrPayload: createSetter(set, "paymentInvoiceQrPayload"),
	paymentInvoiceCashlessAllowed: true,
	setPaymentInvoiceCashlessAllowed: createSetter(
		set,
		"paymentInvoiceCashlessAllowed",
	),
	paymentInvoiceCashDeskAllowed: true,
	setPaymentInvoiceCashDeskAllowed: createSetter(
		set,
		"paymentInvoiceCashDeskAllowed",
	),
	paymentInvoiceRequisitesVerified: false,
	setPaymentInvoiceRequisitesVerified: createSetter(
		set,
		"paymentInvoiceRequisitesVerified",
	),
	paymentInvoiceServiceScopeConfirmed: false,
	setPaymentInvoiceServiceScopeConfirmed: createSetter(
		set,
		"paymentInvoiceServiceScopeConfirmed",
	),
	paymentInvoiceFiscalNoticeConfirmed: false,
	setPaymentInvoiceFiscalNoticeConfirmed: createSetter(
		set,
		"paymentInvoiceFiscalNoticeConfirmed",
	),
	paymentReceiptNumber: "",
	setPaymentReceiptNumber: createSetter(set, "paymentReceiptNumber"),
	paymentReceiptDate: "",
	setPaymentReceiptDate: createSetter(set, "paymentReceiptDate"),
	paymentReceiptPayerFullName: "",
	setPaymentReceiptPayerFullName: createSetter(
		set,
		"paymentReceiptPayerFullName",
	),
	paymentReceiptPayerBirthDate: "",
	setPaymentReceiptPayerBirthDate: createSetter(
		set,
		"paymentReceiptPayerBirthDate",
	),
	paymentReceiptPayerInn: "",
	setPaymentReceiptPayerInn: createSetter(set, "paymentReceiptPayerInn"),
	paymentReceiptPayerIdentityDocument: "",
	setPaymentReceiptPayerIdentityDocument: createSetter(
		set,
		"paymentReceiptPayerIdentityDocument",
	),
	paymentReceiptPayerRelationship: "",
	setPaymentReceiptPayerRelationship: createSetter(
		set,
		"paymentReceiptPayerRelationship",
	),
	paymentReceiptTaxSupportRequested:
		initialUiPreferences.paymentReceiptTaxSupportRequested,
	setPaymentReceiptTaxSupportRequested: createSetter(
		set,
		"paymentReceiptTaxSupportRequested",
	),
	paymentReceiptPurpose:
		"оплата стоматологических услуг по выбранным фискальным чекам",
	setPaymentReceiptPurpose: createSetter(set, "paymentReceiptPurpose"),
	paymentReceiptIssuedBy: "",
	setPaymentReceiptIssuedBy: createSetter(set, "paymentReceiptIssuedBy"),
	paymentReceiptPaymentsVerified: false,
	setPaymentReceiptPaymentsVerified: createSetter(
		set,
		"paymentReceiptPaymentsVerified",
	),
	paymentReceiptPayerVerified: false,
	setPaymentReceiptPayerVerified: createSetter(
		set,
		"paymentReceiptPayerVerified",
	),
	paymentReceiptFiscalNoticeConfirmed: false,
	setPaymentReceiptFiscalNoticeConfirmed: createSetter(
		set,
		"paymentReceiptFiscalNoticeConfirmed",
	),
	installmentScheduleNumber: "",
	setInstallmentScheduleNumber: createSetter(set, "installmentScheduleNumber"),
	installmentScheduleDate: "",
	setInstallmentScheduleDate: createSetter(set, "installmentScheduleDate"),
	installmentScheduleBaseDocumentTitle: "",
	setInstallmentScheduleBaseDocumentTitle: createSetter(
		set,
		"installmentScheduleBaseDocumentTitle",
	),
	installmentSchedulePayerFullName: "",
	setInstallmentSchedulePayerFullName: createSetter(
		set,
		"installmentSchedulePayerFullName",
	),
	installmentScheduleTotalRub: "",
	setInstallmentScheduleTotalRub: createSetter(
		set,
		"installmentScheduleTotalRub",
	),
	installmentSchedulePrepaidRub: "",
	setInstallmentSchedulePrepaidRub: createSetter(
		set,
		"installmentSchedulePrepaidRub",
	),
	/*
	 * График рассрочки начинается пустым.
	 *
	 * Стояли две готовые строки: «Первый платеж | <дата+7> | 0 | запланировано» и
	 * «Финальный платеж | <дата+21> | 0 | запланировано». Обе даты считались ОДИН
	 * раз при загрузке модуля (обёртка (() => …)() ничего не откладывает), то есть
	 * замирали на моменте открытия вкладки, и обе суммы были нулями.
	 *
	 * Разборщик installmentScheduleInstallmentRows (useAppLogic.tsx) строки с
	 * нулевой суммой ВЫБРАСЫВАЕТ и, если платежей с суммой нет, сам делит остаток
	 * на два платежа со свежими датами. Значит подставленные строки в документ и
	 * не попадали — они только вводили администратора в заблуждение: он видел
	 * график из двух платежей с конкретными датами, а в графике оказывались
	 * другие. Хуже: стоило дописать сумму в ОДНУ строку, как вторая (с нулём)
	 * молча исчезала из документа.
	 *
	 * Теперь пусто: либо администратор пишет реальные платежи (формат подсказан
	 * под полем в DocumentsView.tsx), либо остаток делится автоматически, либо
	 * валидатор просит «Добавьте платежи графика или укажите остаток к оплате.».
	 */
	installmentScheduleRows: "",
	setInstallmentScheduleRows: createSetter(set, "installmentScheduleRows"),
	installmentScheduleLatePolicy:
		"при переносе срока администратор фиксирует контакт с пациентом, новый срок и основание переноса до наступления просрочки",
	setInstallmentScheduleLatePolicy: createSetter(
		set,
		"installmentScheduleLatePolicy",
	),
	installmentSchedulePaymentMethodNotes:
		"оплата в кассе клиники, по ссылке или безналично с выдачей кассового чека после оплаты",
	setInstallmentSchedulePaymentMethodNotes: createSetter(
		set,
		"installmentSchedulePaymentMethodNotes",
	),
	installmentScheduleResponsibleFullName: "",
	setInstallmentScheduleResponsibleFullName: createSetter(
		set,
		"installmentScheduleResponsibleFullName",
	),
	installmentScheduleAccepted: false,
	setInstallmentScheduleAccepted: createSetter(
		set,
		"installmentScheduleAccepted",
	),
	installmentScheduleFiscalNoticeConfirmed: false,
	setInstallmentScheduleFiscalNoticeConfirmed: createSetter(
		set,
		"installmentScheduleFiscalNoticeConfirmed",
	),
	installmentScheduleWrittenChangesConfirmed: false,
	setInstallmentScheduleWrittenChangesConfirmed: createSetter(
		set,
		"installmentScheduleWrittenChangesConfirmed",
	),
	warrantyServiceOrWorkName: "",
	setWarrantyServiceOrWorkName: createSetter(set, "warrantyServiceOrWorkName"),
	warrantyCompletedAt: "",
	setWarrantyCompletedAt: createSetter(set, "warrantyCompletedAt"),
	warrantyTeethOrArea: "",
	setWarrantyTeethOrArea: createSetter(set, "warrantyTeethOrArea"),
	warrantyMaterialsOrSystems: "",
	setWarrantyMaterialsOrSystems: createSetter(
		set,
		"warrantyMaterialsOrSystems",
	),
	warrantyPeriod:
		"по локальному гарантийному положению клиники и виду выполненной работы",
	setWarrantyPeriod: createSetter(set, "warrantyPeriod"),
	warrantyControlVisitSchedule:
		"контрольный осмотр по назначению врача; профессиональная гигиена по индивидуальному графику",
	setWarrantyControlVisitSchedule: createSetter(
		set,
		"warrantyControlVisitSchedule",
	),
	warrantyPatientObligations:
		"соблюдать рекомендации врача и режим после лечения\nприходить на контрольные визиты в согласованные сроки\nподдерживать домашнюю гигиену и профессиональную гигиену\nне выполнять самостоятельную коррекцию конструкции или реставрации",
	setWarrantyPatientObligations: createSetter(
		set,
		"warrantyPatientObligations",
	),
	warrantyExcludedRiskFactors:
		"травма, перегрузка, бруксизм или вредные привычки\nновые заболевания или отказ от рекомендованного лечения\nнарушение графика контрольных визитов\nсамостоятельное вмешательство или лечение в другой клинике без согласования",
	setWarrantyExcludedRiskFactors: createSetter(
		set,
		"warrantyExcludedRiskFactors",
	),
	warrantyUrgentContactReasons:
		"острая боль или нарастающий отек\nподвижность, скол или выпадение конструкции\nкровотечение, температура или аллергическая реакция\nнарушение прикуса или невозможность пользоваться конструкцией",
	setWarrantyUrgentContactReasons: createSetter(
		set,
		"warrantyUrgentContactReasons",
	),
	warrantyLinkedActOrContract: "",
	setWarrantyLinkedActOrContract: createSetter(
		set,
		"warrantyLinkedActOrContract",
	),
	warrantyDoctorFullName: "",
	setWarrantyDoctorFullName: createSetter(set, "warrantyDoctorFullName"),
	warrantyIssuedAt: "",
	setWarrantyIssuedAt: createSetter(set, "warrantyIssuedAt"),
	warrantyPolicyApplied: false,
	setWarrantyPolicyApplied: createSetter(set, "warrantyPolicyApplied"),
	warrantyAftercareReceived: false,
	setWarrantyAftercareReceived: createSetter(set, "warrantyAftercareReceived"),
	warrantyControlVisitsUnderstood: false,
	setWarrantyControlVisitsUnderstood: createSetter(
		set,
		"warrantyControlVisitsUnderstood",
	),
	refundAction: "partial_refund",
	setRefundAction: createSetter(set, "refundAction"),
	/*
	 * ДЕНЕЖНЫЕ ПОЛЯ НАЧИНАЮТСЯ ПУСТЫМИ.
	 *
	 * Здесь стояло "3800" — остаток от демонстрационных данных, попавший в
	 * начальное состояние. На экране «Оплаты» касса открывалась с уже введённой
	 * суммой 3800 ₽ при нулевом остатке по пациенту, а форма возврата — с
	 * готовым возвратом на 3800 ₽. Кассир, не заметив подставленного числа,
	 * принимает или возвращает сумму, которой никто не называл.
	 *
	 * Сумму денег программа предлагать не должна: её вводит человек осознанно.
	 */
	refundAmountRub: "",
	setRefundAmountRub: createSetter(set, "refundAmountRub"),
	refundReason: "",
	setRefundReason: createSetter(set, "refundReason"),
	refundMethod: "card",
	setRefundMethod: createSetter(set, "refundMethod"),
	refundRecipientFullName: "",
	setRefundRecipientFullName: createSetter(set, "refundRecipientFullName"),
	refundRecipientIdentityDocument: "",
	setRefundRecipientIdentityDocument: createSetter(
		set,
		"refundRecipientIdentityDocument",
	),
	refundBankDetails: "",
	setRefundBankDetails: createSetter(set, "refundBankDetails"),
	refundSelectedPaymentId: "",
	setRefundSelectedPaymentId: createSetter(set, "refundSelectedPaymentId"),
	refundOriginalFiscalReceiptNumber: "",
	setRefundOriginalFiscalReceiptNumber: createSetter(
		set,
		"refundOriginalFiscalReceiptNumber",
	),
	refundCorrectionFiscalReceiptNumber: "",
	setRefundCorrectionFiscalReceiptNumber: createSetter(
		set,
		"refundCorrectionFiscalReceiptNumber",
	),
	refundAccountantDecision: "",
	setRefundAccountantDecision: createSetter(set, "refundAccountantDecision"),
	/* Пустое поле суммы: см. пояснение у refundAmountRub выше. */
	paymentAmount: "",
	setPaymentAmount: createSetter(set, "paymentAmount"),
	paymentMethod: initialUiPreferences.paymentMethod,
	setPaymentMethod: createSetter(set, "paymentMethod"),
	paymentFiscalReceiptNumber: "",
	setPaymentFiscalReceiptNumber: createSetter(
		set,
		"paymentFiscalReceiptNumber",
	),
	paymentFiscalReceiptIssuedAt: "",
	setPaymentFiscalReceiptIssuedAt: createSetter(
		set,
		"paymentFiscalReceiptIssuedAt",
	),
	paymentFiscalFn: "",
	setPaymentFiscalFn: createSetter(set, "paymentFiscalFn"),
	paymentFiscalFd: "",
	setPaymentFiscalFd: createSetter(set, "paymentFiscalFd"),
	paymentFiscalFpd: "",
	setPaymentFiscalFpd: createSetter(set, "paymentFiscalFpd"),
	paymentFiscalCashierName: "",
	setPaymentFiscalCashierName: createSetter(set, "paymentFiscalCashierName"),
	paymentFiscalReceiptUrl: "",
	setPaymentFiscalReceiptUrl: createSetter(set, "paymentFiscalReceiptUrl"),
	paymentPayerFullName: "",
	setPaymentPayerFullName: createSetter(set, "paymentPayerFullName"),
	paymentPayerInn: "",
	setPaymentPayerInn: createSetter(set, "paymentPayerInn"),
	paymentPayerBirthDate: "",
	setPaymentPayerBirthDate: createSetter(set, "paymentPayerBirthDate"),
	paymentPayerIdentityDocument: "",
	setPaymentPayerIdentityDocument: createSetter(
		set,
		"paymentPayerIdentityDocument",
	),
	/*
	 * Родство плательщика — не наше предположение.
	 *
	 * Стояло «пациент». Это не безобидная подпись: renderDocument.ts приводит
	 * «пациент» к "self", и справка КНД 1151156 печатает «Налогоплательщик и
	 * пациент являются одним лицом: 1 - да» плюс «Родство с пациентом: пациент»
	 * рядом с ФИО матери, которая на самом деле платила. Справка становится
	 * внутренне противоречивой, а вычет по ней получает не тот человек.
	 *
	 * Из-за непустого умолчания обе проверки на пустоту были недостижимы:
	 * подсказка «для вычета укажите родство плательщика» в PaymentCapture.tsx и
	 * список недостающих налоговых полей при отправке оплаты. Теперь пусто, и
	 * при запросе вычета касса требует родство явно.
	 *
	 * Долг (чужие файлы): после каждой оплаты поле снова получает «пациент» —
	 * DEFAULT_PAYER_RELATIONSHIP в components/finance/paymentComposerReset.ts и
	 * setPaymentPayerRelationship("пациент") в useAppLogic.tsx. Там же остаётся
	 * фолбэк «пациент» для оплат без вычета. Здесь исправлено только начальное
	 * состояние.
	 */
	paymentPayerRelationship: "",
	setPaymentPayerRelationship: createSetter(set, "paymentPayerRelationship"),
	paymentTaxDeductionCode: "",
	setPaymentTaxDeductionCode: createSetter(set, "paymentTaxDeductionCode"),
	paymentFeedback: "",
	setPaymentFeedback: createSetter(set, "paymentFeedback"),
});

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
