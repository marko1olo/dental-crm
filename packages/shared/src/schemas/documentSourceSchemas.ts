import { type DocumentAmountSource, documentKindBaseMetadata, type DocumentKindMetadata, type DocumentKindSourceMetadata, documentSourceCheckedAt, fnsDocumentSourceCheckedAt } from "./documentMetaSchemas.js";
import { type DocumentKind, documentKindSchema } from "../documents/index.js";

export const documentKindSourceMetadata = {
	paid_medical_services_contract: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Правительство РФ",
		sourceReference: "Постановление N 736, правила платных медицинских услуг",
		sourceNote:
			"Договор DENTE является клиническим шаблоном по официальному порядку платных медуслуг; перед выдачей требует реквизиты клиники, лицензию, состав услуг, цену и подписи.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	completed_works_act: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE + правила платных медицинских услуг",
		sourceReference: "Акт к конкретному договору и фактическим оплатам",
		sourceNote:
			"Не является отдельной федеральной унифицированной формой; фиксирует реально оказанные услуги, связанный договор, фискальные чеки и претензии пациента.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	tax_deduction_certificate: {
		sourceStatus: "official_form",
		sourceAuthority: "ФНС России",
		sourceReference: "КНД 1151156, приказ ФНС от 08.11.2023 N ЕА-7-11/824@",
		sourceNote:
			"Используется для расходов с 2024 года. DENTE готовит проверяемые данные и печатный черновик, но не подменяет выпуск подписанной справки клиникой.",
		sourceCheckedAt: fnsDocumentSourceCheckedAt,
	},
	informed_consent: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Минздрав России",
		sourceReference:
			"Приказ N 1051н об ИДС и отказе от медицинского вмешательства",
		sourceNote:
			"Общая форма ИДС заполняется под конкретное стоматологическое вмешательство, риски, альтернативы и вопросы пациента.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	procedure_specific_consent_packet: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE + Минздрав N 1051н",
		sourceReference: "Процедурный стоматологический пакет к базовому ИДС",
		sourceNote:
			"Раскрывает риски анестезии, эндодонтии, хирургии, имплантации, ортопедии, ортодонтии, гигиены и отбеливания; локальную форму клиника прикладывает отдельно.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	treatment_plan: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Клинический план лечения из визита и прайс-листа",
		// Здесь стояло требование к реализации: «План должен брать услуги и суммы
		// из серверных фактов пациента/визита, а не из свободного текста браузера».
		// Это описание для разработчика, а выводится оно пользователю на экране
		// «Документы» — рядом с остальными пояснениями о том, что за документ.
		sourceNote:
			"Услуги, этапы и суммы берутся из приёма и прайс-листа клиники, а не набираются вручную: в плане будет ровно то, что записано в карточке.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	treatment_plan_acceptance: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Согласование плана, альтернатив и отказанных вариантов",
		sourceNote:
			"Фиксирует выбранный вариант, альтернативы, границы гарантии и контрольные визиты; не заменяет ИДС на вмешательство.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	anesthesia_consent_log: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE + Минздрав N 1051н",
		sourceReference: "Локальная анестезия: согласие и журнал введения",
		sourceNote:
			"Нужны метод, препарат, дозы, зона, аллергии, ограничения и подтверждение объяснения рисков.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	prescription_medication_order: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Назначение лекарств для проверки врачом",
		sourceNote:
			"Черновик назначения требует ручной проверки врача, указания дозировки, длительности, ограничений и срочных симптомов.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	personal_data_processing_consent: {
		sourceStatus: "official_workflow",
		sourceAuthority: "152-ФЗ о персональных данных",
		sourceReference: "Согласие на обработку персональных и медицинских данных",
		sourceNote:
			"Шаблон должен отдельно раскрывать цели, медицинскую тайну, передачи, отзыв согласия и срок хранения.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	minor_legal_representative_consent: {
		sourceStatus: "official_workflow",
		sourceAuthority: "323-ФЗ + Минздрав N 1051н",
		sourceReference:
			"Согласие законного представителя на конкретный визит/вмешательство",
		sourceNote:
			"Требует связь с конкретным визитом, проверку личности, полномочий и понятное объяснение процедуры представителю.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	photo_video_consent: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE + 152-ФЗ",
		sourceReference: "Фото, видео, рентген-материалы и цели использования",
		sourceNote:
			"Клиническая запись, лаборатория, консультации, обучение и маркетинг разделены; узнаваемая публикация включается отдельно.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	medical_intervention_refusal: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Минздрав России",
		sourceReference: "Приказ N 1051н, отказ от медицинского вмешательства",
		sourceNote:
			"Отказ привязан к конкретному вмешательству, объясненным последствиям, альтернативам и предложению второго мнения.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	treatment_cost_estimate: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Смета лечения по серверному плану и прайсу",
		sourceNote:
			"Черновик стоимости не должен изобретать суммы: плановая сумма берется из фактов лечения или явного плана.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	payment_invoice: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Счет на оплату медицинских услуг",
		sourceNote:
			"Счет не заменяет кассовый чек; нужен плательщик, назначение, сумма, основание и банковские реквизиты.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	payment_receipt: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE + фискальные данные клиники",
		sourceReference: "Памятка об оплате по выбранным фискальным чекам",
		sourceNote:
			"Квитанция удобна пациенту, но не заменяет кассовый чек и не должна попадать в налоговый пакет без фискального номера и даты.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	installment_payment_schedule: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "График рассрочки или этапных оплат",
		sourceNote:
			"Внутренний график сроков и сумм к договору/плану; изменения должны оформляться письменно и не заменяют чек.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	post_visit_recommendations: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference:
			"Памятки после удаления, имплантации, пломбы и других процедур",
		sourceNote:
			"Готовится как пациентская памятка и может уходить в Telegram после проверки темы, процедуры, врача и срочных симптомов.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	outpatient_medical_card_025u: {
		sourceStatus: "official_form",
		sourceAuthority: "Минздрав России",
		sourceReference:
			"Приказ Минздрава России от 13.05.2025 N 274н, приложение N 1, учетная форма N 025/у",
		sourceNote:
			"ФОРМА 025/у ЛИКВИДИРОВАНА (МАНДАТЫ 8i, 8s). В частной амбулаторной стоматологии регламентным документом является Форма 043/у Минздрава РФ. Сохраняется исключительно для совместимости с историческими записями БД.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	dental_medical_card_043u: {
		sourceStatus: "official_form",
		sourceAuthority: "Минздрав России",
		sourceReference:
			"Приказ Минздрава России от 15.12.2014 N 834н (учетные формы), форма N 043/у",
		sourceNote:
			"DENTE заполняет структуру формы 043/у из дневника приёма (visit_diaries), карточки пациента и профиля клиники. Неизвестные разделы остаются явно пустыми; юридически значимый электронный обмен требует отдельного контура УКЭП/МИС/ЕГИСЗ.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	orthodontic_medical_card_043_1u: {
		sourceStatus: "official_form",
		sourceAuthority: "Минздрав России",
		sourceReference:
			"Приказ Минздрава России / СтАР, форма N 043-1/у (ортодонтическая карта)",
		sourceNote:
			"DENTE формирует ортодонтическую карту с антропометрией, цефалометрией ТРГ, расчетом индексов Тона, Пона, Болтона и планом аппаратурного лечения.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	daily_dentist_diary_037u: {
		sourceStatus: "official_form",
		sourceAuthority: "Минздрав СССР / РФ",
		sourceReference:
			"Приказ Минздрава СССР от 25.01.1988 N 50, форма N 037/у-88",
		sourceNote:
			"DENTE формирует ежедневный листок учета принятых пациентов с автоматическим подсчетом выработанных УЕТ.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	summary_dentist_statement_039u: {
		sourceStatus: "official_form",
		sourceAuthority: "Минздрав СССР / РФ",
		sourceReference:
			"Приказ Минздрава СССР N 50-88 / Приказ Минздрава РФ N 804н",
		sourceNote:
			"DENTE автоматически агрегирует объем стоматологической помощи и выработку УЕТ за отчетный период по номенклатуре Минздрава.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	medical_record_extract: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Минздрав России",
		sourceReference:
			"Приказы N 789н и N 274н по выдаче/ведению медицинских документов",
		sourceNote:
			"DENTE формирует черновик выписки из подписанных медицинских записей; точные унифицированные формы 274н должны маппиться по полям.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	medical_record_copy_request: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Минздрав России",
		sourceReference: "Приказ N 789н, запрос копий медицинских документов",
		sourceNote:
			"Отделяет запрос пациента/представителя от фактической выдачи и требует период, формат, полномочия и канал доставки.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	medical_document_release_receipt: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Минздрав России",
		sourceReference: "Приказ N 789н, выдача копий и выписок",
		sourceNote:
			"Расписка фиксирует получателя, основание, список документов, формат, защиту передачи и проверку данных третьих лиц.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	xray_cbct_referral: {
		sourceStatus: "official_workflow",
		sourceAuthority: "Минздрав России",
		sourceReference:
			"Приказ N 560н, правила проведения рентгенологических исследований",
		sourceNote:
			"Направление DENTE фиксирует клинический вопрос, область, показание, ограничения, архив снимков/отчет и передачу результата.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	radiation_dose_sheet: {
		sourceStatus: "official_form",
		sourceAuthority: "Роспотребнадзор / Минздрав России",
		sourceReference:
			"СанПиН 2.6.1.1192-03, СанПиН 2.6.1.2523-09 (НРБ-99/2009)",
		sourceNote:
			"DENTE ведет индивидуальный радиационный паспорт пациента и рассчитывает суммарную эффективную дозу облучения с контролем безопасных порогов.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	lab_work_order: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Зуботехнический заказ-наряд",
		sourceNote:
			"Производственная форма для лаборатории: тип работы, зубы, материал, цвет, сканы/слепки, имплант-платформа и срок.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	visit_attendance_certificate: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Справка о посещении врача-стоматолога",
		sourceNote:
			"Подтверждает факт посещения без выдуманного диагноза или нетрудоспособности; диагноз раскрывается только по явному основанию.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	warranty_service_memo: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Гарантийная памятка по стоматологической работе",
		sourceNote:
			"Не изобретает гарантию: сроки, исключения и контрольные визиты должны соответствовать локальной политике клиники.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	payment_refund_correction_request: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE + фискальные данные клиники",
		sourceReference: "Заявление на возврат или коррекцию оплаты",
		sourceNote:
			"Требует исходный чек, сумму, причину, получателя, способ возврата и решение ответственного; сумма не может превышать оплаченные факты.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
	tax_deduction_application: {
		sourceStatus: "clinic_template",
		sourceAuthority: "ФНС России + DENTE",
		sourceReference: "Заявление пациента/плательщика на подготовку справки",
		sourceNote:
			"Собирает данные налогоплательщика, год, форму, доставку и контроль дублей; не является самой справкой для налоговой.",
		sourceCheckedAt: fnsDocumentSourceCheckedAt,
	},
	legacy_tax_deduction_certificate: {
		sourceStatus: "official_workflow",
		sourceAuthority: "ФНС России / Минздрав России",
		sourceReference: "Старая справка для расходов 2021-2023 до КНД 1151156",
		sourceNote:
			"Используется только для расходов 2021-2023. Для 2024+ DENTE должен вести пользователя в КНД 1151156.",
		sourceCheckedAt: fnsDocumentSourceCheckedAt,
	},
	tax_deduction_registry: {
		sourceStatus: "internal_register",
		sourceAuthority: "DENTE",
		sourceReference: "Реестр фискальных оплат для подготовки налоговой справки",
		sourceNote:
			"Внутренний контрольный реестр: группирует только выбранные оплаченные чеки нужного года и одного налогоплательщика.",
		sourceCheckedAt: fnsDocumentSourceCheckedAt,
	},
	patient_intake_questionnaire: {
		sourceStatus: "clinic_template",
		sourceAuthority: "DENTE",
		sourceReference: "Анкета пациента перед приемом",
		sourceNote:
			"Собирает жалобы, аллергии, лекарства, хронические состояния, беременность/лактацию, антикоагулянты, инфекции и экстренный контакт.",
		sourceCheckedAt: documentSourceCheckedAt,
	},
} as const satisfies Record<DocumentKind, DocumentKindSourceMetadata>;

export const paidMedicalServicesRulesSourceUrl =
	"https://publication.pravo.gov.ru/Document/View/0001202305120025?index=1&pageSize=100";

export const fnsKnd1151156OrderSourceUrl =
	"https://www.nalog.gov.ru/rn77/about_fts/docs/14112883/";

export const fnsKnd1151156FormSourceUrl =
	"https://www.nalog.gov.ru/html/sites/www.new.nalog.ru/2023/about_fts/docs_fts/pril1_14112883.pdf";

export const fnsKnd1151156XsdSourceUrl =
	"https://www.nalog.gov.ru/html/sites/www.new.nalog.ru/2023/about_fts/docs_fts/xsd/UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd";

export const fnsMedicalDeductionRulesSourceUrl =
	"https://www.nalog.gov.ru/rn77/fl/interest/tax_deduction/fl_medik/";

export const fnsKnd1151156FillingSourceUrl =
	"https://www.nalog.gov.ru/rn39/ifns/ob9/info/15134030/";

export const minzdravConsentRefusalSourceUrl =
	"https://publication.pravo.gov.ru/Document/View/0001202111250019";

export const federalHealthLawSourceUrl =
	"https://publication.pravo.gov.ru/Document/View/0001201111220007";

export const personalDataLawSourceUrl = "https://www.kremlin.ru/acts/bank/24154/print";

export const minzdravMedicalDocumentReleaseSourceUrl =
	"https://publication.pravo.gov.ru/Document/View/0001202009240027";

export const minzdravAmbulatoryFormsSourceUrl =
	"https://publication.pravo.gov.ru/document/0001202505300033";

export const minzdravRadiologyRulesSourceUrl =
	"https://publication.pravo.gov.ru/Document/View/0001202009140035";

export const documentKindSourceUrls = {
	paid_medical_services_contract: [paidMedicalServicesRulesSourceUrl],
	completed_works_act: [paidMedicalServicesRulesSourceUrl],
	tax_deduction_certificate: [
		fnsKnd1151156OrderSourceUrl,
		fnsKnd1151156FormSourceUrl,
		fnsKnd1151156XsdSourceUrl,
		fnsMedicalDeductionRulesSourceUrl,
		fnsKnd1151156FillingSourceUrl,
	],
	informed_consent: [
		minzdravConsentRefusalSourceUrl,
		federalHealthLawSourceUrl,
	],
	procedure_specific_consent_packet: [
		minzdravConsentRefusalSourceUrl,
		federalHealthLawSourceUrl,
	],
	treatment_plan: [],
	treatment_plan_acceptance: [minzdravConsentRefusalSourceUrl],
	anesthesia_consent_log: [minzdravConsentRefusalSourceUrl],
	prescription_medication_order: [],
	personal_data_processing_consent: [personalDataLawSourceUrl],
	minor_legal_representative_consent: [
		federalHealthLawSourceUrl,
		minzdravConsentRefusalSourceUrl,
	],
	photo_video_consent: [personalDataLawSourceUrl],
	medical_intervention_refusal: [
		minzdravConsentRefusalSourceUrl,
		federalHealthLawSourceUrl,
	],
	treatment_cost_estimate: [],
	payment_invoice: [],
	payment_receipt: [],
	installment_payment_schedule: [],
	post_visit_recommendations: [],
	outpatient_medical_card_025u: [minzdravAmbulatoryFormsSourceUrl],
	dental_medical_card_043u: [minzdravAmbulatoryFormsSourceUrl],
	orthodontic_medical_card_043_1u: [minzdravAmbulatoryFormsSourceUrl],
	daily_dentist_diary_037u: [minzdravAmbulatoryFormsSourceUrl],
	summary_dentist_statement_039u: [minzdravAmbulatoryFormsSourceUrl],
	medical_record_extract: [
		minzdravMedicalDocumentReleaseSourceUrl,
		minzdravAmbulatoryFormsSourceUrl,
	],
	medical_record_copy_request: [minzdravMedicalDocumentReleaseSourceUrl],
	medical_document_release_receipt: [minzdravMedicalDocumentReleaseSourceUrl],
	xray_cbct_referral: [minzdravRadiologyRulesSourceUrl],
	radiation_dose_sheet: [minzdravRadiologyRulesSourceUrl],
	lab_work_order: [],
	visit_attendance_certificate: [],
	warranty_service_memo: [],
	payment_refund_correction_request: [],
	tax_deduction_application: [
		fnsKnd1151156OrderSourceUrl,
		fnsMedicalDeductionRulesSourceUrl,
		fnsKnd1151156FillingSourceUrl,
	],
	legacy_tax_deduction_certificate: [fnsMedicalDeductionRulesSourceUrl],
	tax_deduction_registry: [
		fnsKnd1151156OrderSourceUrl,
		fnsKnd1151156FillingSourceUrl,
	],
	patient_intake_questionnaire: [],
} as const satisfies Record<DocumentKind, readonly string[]>;

export const documentKindMetadata = documentKindSchema.options.reduce(
	(metadataByKind, kind) => {
		metadataByKind[kind] = {
			...documentKindBaseMetadata[kind],
			...documentKindSourceMetadata[kind],
			sourceUrls: documentKindSourceUrls[kind],
		};
		return metadataByKind;
	},
	{} as Record<DocumentKind, DocumentKindMetadata>,
);

export const documentFactoryGroups = [
	{
		title: "Прием",
		kinds: [
			"patient_intake_questionnaire",
			"informed_consent",
			"procedure_specific_consent_packet",
			"treatment_plan",
			"treatment_plan_acceptance",
			"anesthesia_consent_log",
			"prescription_medication_order",
			"post_visit_recommendations",
			"visit_attendance_certificate",
		],
	},
	{
		title: "Оплата",
		kinds: [
			"paid_medical_services_contract",
			"treatment_cost_estimate",
			"payment_invoice",
			"payment_receipt",
			"installment_payment_schedule",
			"completed_works_act",
			"payment_refund_correction_request",
		],
	},
	{
		title: "Налоговая",
		kinds: [
			"tax_deduction_application",
			"tax_deduction_certificate",
			"legacy_tax_deduction_certificate",
			"tax_deduction_registry",
		],
	},
	{
		title: "Юр. и медкарта",
		kinds: [
			"personal_data_processing_consent",
			"minor_legal_representative_consent",
			"photo_video_consent",
			"medical_intervention_refusal",
			"dental_medical_card_043u",
			"orthodontic_medical_card_043_1u",
			"daily_dentist_diary_037u",
			"summary_dentist_statement_039u",
			"medical_record_extract",
			"medical_record_copy_request",
			"medical_document_release_receipt",
			"xray_cbct_referral",
			"radiation_dose_sheet",
			"warranty_service_memo",
		],
	},
	{
		title: "Лаборатория",
		kinds: ["lab_work_order"],
	},
] as const satisfies ReadonlyArray<{
	title: string;
	kinds: readonly DocumentKind[];
}>;

export function documentAmountSource(kind: DocumentKind): DocumentAmountSource {
	return documentKindMetadata[kind].amountSource;
}

export function documentRequiresPaidRecord(kind: DocumentKind): boolean {
	return documentKindMetadata[kind]?.requiresPaidRecord ?? false;
}
