import { z } from "zod";

export const patientStatusSchema = z.enum(["active", "archived"]);
export type PatientStatus = z.infer<typeof patientStatusSchema>;

export const appointmentStatusSchema = z.enum([
  "planned",
  "confirmed",
  "arrived",
  "in_treatment",
  "completed",
  "cancelled",
  "no_show"
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const visitStatusSchema = z.enum(["draft", "signed", "voided"]);
export type VisitStatus = z.infer<typeof visitStatusSchema>;

export const documentKindSchema = z.enum([
  "paid_medical_services_contract",
  "completed_works_act",
  "tax_deduction_certificate",
  "informed_consent",
  "procedure_specific_consent_packet",
  "treatment_plan",
  "treatment_plan_acceptance",
  "anesthesia_consent_log",
  "prescription_medication_order",
  "personal_data_processing_consent",
  "minor_legal_representative_consent",
  "photo_video_consent",
  "medical_intervention_refusal",
  "treatment_cost_estimate",
  "payment_invoice",
  "payment_receipt",
  "installment_payment_schedule",
  "post_visit_recommendations",
  "outpatient_medical_card_025u",
  "medical_record_extract",
  "medical_record_copy_request",
  "medical_document_release_receipt",
  "xray_cbct_referral",
  "lab_work_order",
  "visit_attendance_certificate",
  "warranty_service_memo",
  "payment_refund_correction_request",
  "tax_deduction_application",
  "legacy_tax_deduction_certificate",
  "tax_deduction_registry",
  "patient_intake_questionnaire"
]);
export type DocumentKind = z.infer<typeof documentKindSchema>;

export const legacyTaxDeductionCertificateMinYear = 2021;
export const legacyTaxDeductionCertificateMaxYear = 2023;
export const taxDeductionCertificateMinYear = 2024;

export type DocumentKindGroup = "visit" | "payment" | "tax" | "legal" | "workflow";
export type DocumentAmountSource = "none" | "planned" | "paid";
export const documentSourceStatusSchema = z.enum(["official_form", "official_workflow", "clinic_template", "internal_register"]);
export type DocumentSourceStatus = z.infer<typeof documentSourceStatusSchema>;

type DocumentKindBaseMetadata = {
  title: string;
  label: string;
  actionLabel: string;
  group: DocumentKindGroup;
  amountSource: DocumentAmountSource;
  requiresVisit: boolean;
  requiresPaidRecord: boolean;
};

export type DocumentKindSourceMetadata = {
  sourceStatus: DocumentSourceStatus;
  sourceAuthority: string;
  sourceReference: string;
  sourceNote: string;
  sourceCheckedAt: string;
};

export type DocumentKindMetadata = DocumentKindBaseMetadata &
  DocumentKindSourceMetadata & {
    sourceUrls: readonly string[];
  };

export const documentSourceStatusLabels: Record<DocumentSourceStatus, string> = {
  official_form: "Официальная форма",
  official_workflow: "Официальный порядок",
  clinic_template: "Шаблон клиники",
  internal_register: "Внутренний реестр"
};

const documentKindBaseMetadata = {
  paid_medical_services_contract: {
    title: "Договор платных медицинских услуг",
    label: "Договор",
    actionLabel: "Подготовить договор",
    group: "payment",
    amountSource: "planned",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  completed_works_act: {
    title: "Акт выполненных работ",
    label: "Акт",
    actionLabel: "Закрыть акт",
    group: "payment",
    amountSource: "paid",
    requiresVisit: true,
    requiresPaidRecord: true
  },
  tax_deduction_certificate: {
    title: "Черновик данных для справки КНД 1151156",
    label: "Данные КНД",
    actionLabel: "Данные для КНД",
    group: "tax",
    amountSource: "paid",
    requiresVisit: false,
    requiresPaidRecord: true
  },
  informed_consent: {
    title: "Информированное добровольное согласие",
    label: "Согласие",
    actionLabel: "Согласие",
    group: "visit",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  procedure_specific_consent_packet: {
    title: "Согласие на стоматологическое вмешательство по процедуре",
    label: "Спец. согласие",
    actionLabel: "Согласие по процедуре",
    group: "visit",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  treatment_plan: {
    title: "План лечения",
    label: "План",
    actionLabel: "План лечения",
    group: "visit",
    amountSource: "planned",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  treatment_plan_acceptance: {
    title: "Согласование плана лечения и альтернатив",
    label: "Согласование",
    actionLabel: "Согласование плана",
    group: "visit",
    amountSource: "planned",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  anesthesia_consent_log: {
    title: "Согласие и журнал местной анестезии",
    label: "Анестезия",
    actionLabel: "Анестезия/журнал",
    group: "visit",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  prescription_medication_order: {
    title: "Назначение лекарственных препаратов",
    label: "Назначения",
    actionLabel: "Назначения",
    group: "visit",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  personal_data_processing_consent: {
    title: "Согласие на обработку персональных данных",
    label: "ПДн",
    actionLabel: "Согласие на ПДн",
    group: "legal",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  minor_legal_representative_consent: {
    title: "Согласие законного представителя несовершеннолетнего",
    label: "Представитель",
    actionLabel: "Согласие представителя",
    group: "legal",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  photo_video_consent: {
    title: "Согласие на фото-, видео- и рентген-материалы",
    label: "Фото/видео",
    actionLabel: "Фото/видео согласие",
    group: "legal",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  medical_intervention_refusal: {
    title: "Отказ от медицинского вмешательства",
    label: "Отказ",
    actionLabel: "Отказ от вмешательства",
    group: "legal",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  treatment_cost_estimate: {
    title: "Смета лечения",
    label: "Смета",
    actionLabel: "Смета лечения",
    group: "payment",
    amountSource: "planned",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  payment_invoice: {
    title: "Счет на оплату",
    label: "Счет",
    actionLabel: "Счет на оплату",
    group: "payment",
    amountSource: "planned",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  payment_receipt: {
    title: "Квитанция/памятка об оплате",
    label: "Квитанция",
    actionLabel: "Квитанция/памятка",
    group: "payment",
    amountSource: "paid",
    requiresVisit: false,
    requiresPaidRecord: true
  },
  installment_payment_schedule: {
    title: "График рассрочки и оплат",
    label: "Рассрочка",
    actionLabel: "График оплат",
    group: "payment",
    amountSource: "planned",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  post_visit_recommendations: {
    title: "Рекомендации после приема",
    label: "Рекомендации",
    actionLabel: "Рекомендации",
    group: "visit",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  outpatient_medical_card_025u: {
    title: "Медицинская карта пациента, получающего медицинскую помощь в амбулаторных условиях (форма N 025/у)",
    label: "Карта 025/у",
    actionLabel: "Карта 025/у",
    group: "legal",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  medical_record_extract: {
    title: "Выписка из медицинской карты",
    label: "Выписка",
    actionLabel: "Выписка из карты",
    group: "legal",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  medical_record_copy_request: {
    title: "Запрос на копии медицинской документации",
    label: "Копии карты",
    actionLabel: "Запрос копий карты",
    group: "legal",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  medical_document_release_receipt: {
    title: "Расписка о выдаче медицинской документации",
    label: "Выдача копий",
    actionLabel: "Расписка выдачи",
    group: "legal",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  xray_cbct_referral: {
    title: "Направление на рентген/КЛКТ",
    label: "Снимок",
    actionLabel: "Направление на снимок",
    group: "legal",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  lab_work_order: {
    title: "Зуботехнический заказ-наряд",
    label: "Лаборатория",
    actionLabel: "Заказ в лабораторию",
    group: "workflow",
    amountSource: "planned",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  visit_attendance_certificate: {
    title: "Справка о посещении врача-стоматолога",
    label: "Справка о визите",
    actionLabel: "Справка о посещении",
    group: "legal",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  warranty_service_memo: {
    title: "Гарантийная памятка по стоматологической работе",
    label: "Гарантия",
    actionLabel: "Гарантийная памятка",
    group: "legal",
    amountSource: "none",
    requiresVisit: true,
    requiresPaidRecord: false
  },
  payment_refund_correction_request: {
    title: "Заявление на возврат или коррекцию оплаты",
    label: "Возврат оплаты",
    actionLabel: "Возврат/коррекция",
    group: "payment",
    amountSource: "paid",
    requiresVisit: true,
    requiresPaidRecord: true
  },
  tax_deduction_application: {
    title: "Заявление на справку для налогового вычета",
    label: "Заявление",
    actionLabel: "Заявление на вычет",
    group: "tax",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  },
  legacy_tax_deduction_certificate: {
    title: "Справка об оплате медицинских услуг для налоговой до 2024 года",
    label: "Старая справка",
    actionLabel: "Справка до 2024",
    group: "tax",
    amountSource: "paid",
    requiresVisit: false,
    requiresPaidRecord: true
  },
  tax_deduction_registry: {
    title: "Реестр оплат для налоговой справки",
    label: "Реестр",
    actionLabel: "Реестр для вычета",
    group: "tax",
    amountSource: "paid",
    requiresVisit: false,
    requiresPaidRecord: true
  },
  patient_intake_questionnaire: {
    title: "Анкета пациента",
    label: "Анкета",
    actionLabel: "Анкета пациента",
    group: "visit",
    amountSource: "none",
    requiresVisit: false,
    requiresPaidRecord: false
  }
} as const satisfies Record<DocumentKind, DocumentKindBaseMetadata>;

const documentSourceCheckedAt = "2026-05-24";
const fnsDocumentSourceCheckedAt = "2026-05-25";

export const documentKindSourceMetadata = {
  paid_medical_services_contract: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Правительство РФ",
    sourceReference: "Постановление N 736, правила платных медицинских услуг",
    sourceNote: "Договор DENTE является клиническим шаблоном по официальному порядку платных медуслуг; перед выдачей требует реквизиты клиники, лицензию, состав услуг, цену и подписи.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  completed_works_act: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE + правила платных медицинских услуг",
    sourceReference: "Акт к конкретному договору и фактическим оплатам",
    sourceNote: "Не является отдельной федеральной унифицированной формой; фиксирует реально оказанные услуги, связанный договор, фискальные чеки и претензии пациента.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  tax_deduction_certificate: {
    sourceStatus: "official_form",
    sourceAuthority: "ФНС России",
    sourceReference: "КНД 1151156, приказ ФНС от 08.11.2023 N ЕА-7-11/824@",
    sourceNote: "Используется для расходов с 2024 года. DENTE готовит проверяемые данные и печатный черновик, но не подменяет выпуск подписанной справки клиникой.",
    sourceCheckedAt: fnsDocumentSourceCheckedAt
  },
  informed_consent: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказ N 1051н об ИДС и отказе от медицинского вмешательства",
    sourceNote: "Общая форма ИДС заполняется под конкретное стоматологическое вмешательство, риски, альтернативы и вопросы пациента.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  procedure_specific_consent_packet: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE + Минздрав N 1051н",
    sourceReference: "Процедурный стоматологический пакет к базовому ИДС",
    sourceNote: "Раскрывает риски анестезии, эндодонтии, хирургии, имплантации, ортопедии, ортодонтии, гигиены и отбеливания; локальную форму клиника прикладывает отдельно.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  treatment_plan: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Клинический план лечения из визита и прайс-листа",
    sourceNote: "План должен брать услуги и суммы из серверных фактов пациента/визита, а не из свободного текста браузера.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  treatment_plan_acceptance: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Согласование плана, альтернатив и отказанных вариантов",
    sourceNote: "Фиксирует выбранный вариант, альтернативы, границы гарантии и контрольные визиты; не заменяет ИДС на вмешательство.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  anesthesia_consent_log: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE + Минздрав N 1051н",
    sourceReference: "Локальная анестезия: согласие и журнал введения",
    sourceNote: "Нужны метод, препарат, дозы, зона, аллергии, ограничения и подтверждение объяснения рисков.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  prescription_medication_order: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Назначение лекарств для проверки врачом",
    sourceNote: "Черновик назначения требует ручной проверки врача, указания дозировки, длительности, ограничений и срочных симптомов.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  personal_data_processing_consent: {
    sourceStatus: "official_workflow",
    sourceAuthority: "152-ФЗ о персональных данных",
    sourceReference: "Согласие на обработку персональных и медицинских данных",
    sourceNote: "Шаблон должен отдельно раскрывать цели, медицинскую тайну, передачи, отзыв согласия и срок хранения.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  minor_legal_representative_consent: {
    sourceStatus: "official_workflow",
    sourceAuthority: "323-ФЗ + Минздрав N 1051н",
    sourceReference: "Согласие законного представителя на конкретный визит/вмешательство",
    sourceNote: "Требует связь с конкретным визитом, проверку личности, полномочий и понятное объяснение процедуры представителю.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  photo_video_consent: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE + 152-ФЗ",
    sourceReference: "Фото, видео, рентген-материалы и цели использования",
    sourceNote: "Клиническая запись, лаборатория, консультации, обучение и маркетинг разделены; узнаваемая публикация включается отдельно.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  medical_intervention_refusal: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказ N 1051н, отказ от медицинского вмешательства",
    sourceNote: "Отказ привязан к конкретному вмешательству, объясненным последствиям, альтернативам и предложению второго мнения.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  treatment_cost_estimate: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Смета лечения по серверному плану и прайсу",
    sourceNote: "Черновик стоимости не должен изобретать суммы: плановая сумма берется из фактов лечения или явного плана.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  payment_invoice: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Счет на оплату медицинских услуг",
    sourceNote: "Счет не заменяет кассовый чек; нужен плательщик, назначение, сумма, основание и банковские реквизиты.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  payment_receipt: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE + фискальные данные клиники",
    sourceReference: "Памятка об оплате по выбранным фискальным чекам",
    sourceNote: "Квитанция удобна пациенту, но не заменяет кассовый чек и не должна попадать в налоговый пакет без фискального номера и даты.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  installment_payment_schedule: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "График рассрочки или этапных оплат",
    sourceNote: "Внутренний график сроков и сумм к договору/плану; изменения должны оформляться письменно и не заменяют чек.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  post_visit_recommendations: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Памятки после удаления, имплантации, пломбы и других процедур",
    sourceNote: "Готовится как пациентская памятка и может уходить в Telegram после проверки темы, процедуры, врача и срочных симптомов.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  outpatient_medical_card_025u: {
    sourceStatus: "official_form",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказ Минздрава России от 13.05.2025 N 274н, приложение N 1, учетная форма N 025/у",
    sourceNote:
      "DENTE заполняет структуру формы 025/у только из карточки пациента, профиля клиники и подписанных визитов. Неизвестные разделы остаются явно пустыми; юридически значимый электронный обмен требует отдельного контура УКЭП/МИС/ЕГИСЗ.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  medical_record_extract: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказы N 789н и N 274н по выдаче/ведению медицинских документов",
    sourceNote: "DENTE формирует черновик выписки из подписанных медицинских записей; точные унифицированные формы 274н должны маппиться по полям.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  medical_record_copy_request: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказ N 789н, запрос копий медицинских документов",
    sourceNote: "Отделяет запрос пациента/представителя от фактической выдачи и требует период, формат, полномочия и канал доставки.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  medical_document_release_receipt: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказ N 789н, выдача копий и выписок",
    sourceNote: "Расписка фиксирует получателя, основание, список документов, формат, защиту передачи и проверку данных третьих лиц.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  xray_cbct_referral: {
    sourceStatus: "official_workflow",
    sourceAuthority: "Минздрав России",
    sourceReference: "Приказ N 560н, правила проведения рентгенологических исследований",
    sourceNote: "Направление DENTE фиксирует клинический вопрос, область, показание, ограничения, архив снимков/отчет и передачу результата.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  lab_work_order: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Зуботехнический заказ-наряд",
    sourceNote: "Производственная форма для лаборатории: тип работы, зубы, материал, цвет, сканы/слепки, имплант-платформа и срок.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  visit_attendance_certificate: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Справка о посещении врача-стоматолога",
    sourceNote: "Подтверждает факт посещения без выдуманного диагноза или нетрудоспособности; диагноз раскрывается только по явному основанию.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  warranty_service_memo: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Гарантийная памятка по стоматологической работе",
    sourceNote: "Не изобретает гарантию: сроки, исключения и контрольные визиты должны соответствовать локальной политике клиники.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  payment_refund_correction_request: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE + фискальные данные клиники",
    sourceReference: "Заявление на возврат или коррекцию оплаты",
    sourceNote: "Требует исходный чек, сумму, причину, получателя, способ возврата и решение ответственного; сумма не может превышать оплаченные факты.",
    sourceCheckedAt: documentSourceCheckedAt
  },
  tax_deduction_application: {
    sourceStatus: "clinic_template",
    sourceAuthority: "ФНС России + DENTE",
    sourceReference: "Заявление пациента/плательщика на подготовку справки",
    sourceNote: "Собирает данные налогоплательщика, год, форму, доставку и контроль дублей; не является самой справкой для налоговой.",
    sourceCheckedAt: fnsDocumentSourceCheckedAt
  },
  legacy_tax_deduction_certificate: {
    sourceStatus: "official_workflow",
    sourceAuthority: "ФНС России / Минздрав России",
    sourceReference: "Старая справка для расходов 2021-2023 до КНД 1151156",
    sourceNote: "Используется только для расходов 2021-2023. Для 2024+ DENTE должен вести пользователя в КНД 1151156.",
    sourceCheckedAt: fnsDocumentSourceCheckedAt
  },
  tax_deduction_registry: {
    sourceStatus: "internal_register",
    sourceAuthority: "DENTE",
    sourceReference: "Реестр фискальных оплат для подготовки налоговой справки",
    sourceNote: "Внутренний контрольный реестр: группирует только выбранные оплаченные чеки нужного года и одного налогоплательщика.",
    sourceCheckedAt: fnsDocumentSourceCheckedAt
  },
  patient_intake_questionnaire: {
    sourceStatus: "clinic_template",
    sourceAuthority: "DENTE",
    sourceReference: "Анкета пациента перед приемом",
    sourceNote: "Собирает жалобы, аллергии, лекарства, хронические состояния, беременность/лактацию, антикоагулянты, инфекции и экстренный контакт.",
    sourceCheckedAt: documentSourceCheckedAt
  }
} as const satisfies Record<DocumentKind, DocumentKindSourceMetadata>;

const paidMedicalServicesRulesSourceUrl =
  "https://publication.pravo.gov.ru/Document/View/0001202305120025?index=1&pageSize=100";
const fnsKnd1151156OrderSourceUrl = "https://www.nalog.gov.ru/rn77/about_fts/docs/14112883/";
const fnsKnd1151156FormSourceUrl =
  "https://www.nalog.gov.ru/html/sites/www.new.nalog.ru/2023/about_fts/docs_fts/pril1_14112883.pdf";
const fnsKnd1151156XsdSourceUrl =
  "https://www.nalog.gov.ru/html/sites/www.new.nalog.ru/2023/about_fts/docs_fts/xsd/UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd";
const fnsMedicalDeductionRulesSourceUrl = "https://www.nalog.gov.ru/rn77/fl/interest/tax_deduction/fl_medik/";
const fnsKnd1151156FillingSourceUrl = "https://www.nalog.gov.ru/rn39/ifns/ob9/info/15134030/";
const minzdravConsentRefusalSourceUrl = "https://publication.pravo.gov.ru/Document/View/0001202111250019";
const federalHealthLawSourceUrl = "https://publication.pravo.gov.ru/Document/View/0001201111220007";
const personalDataLawSourceUrl = "https://www.kremlin.ru/acts/bank/24154/print";
const minzdravMedicalDocumentReleaseSourceUrl = "https://publication.pravo.gov.ru/Document/View/0001202009240027";
const minzdravAmbulatoryFormsSourceUrl = "https://publication.pravo.gov.ru/document/0001202505300033";
const minzdravRadiologyRulesSourceUrl = "https://publication.pravo.gov.ru/Document/View/0001202009140035";

export const documentKindSourceUrls = {
  paid_medical_services_contract: [paidMedicalServicesRulesSourceUrl],
  completed_works_act: [paidMedicalServicesRulesSourceUrl],
  tax_deduction_certificate: [
    fnsKnd1151156OrderSourceUrl,
    fnsKnd1151156FormSourceUrl,
    fnsKnd1151156XsdSourceUrl,
    fnsMedicalDeductionRulesSourceUrl,
    fnsKnd1151156FillingSourceUrl
  ],
  informed_consent: [minzdravConsentRefusalSourceUrl, federalHealthLawSourceUrl],
  procedure_specific_consent_packet: [minzdravConsentRefusalSourceUrl, federalHealthLawSourceUrl],
  treatment_plan: [],
  treatment_plan_acceptance: [minzdravConsentRefusalSourceUrl],
  anesthesia_consent_log: [minzdravConsentRefusalSourceUrl],
  prescription_medication_order: [],
  personal_data_processing_consent: [personalDataLawSourceUrl],
  minor_legal_representative_consent: [federalHealthLawSourceUrl, minzdravConsentRefusalSourceUrl],
  photo_video_consent: [personalDataLawSourceUrl],
  medical_intervention_refusal: [minzdravConsentRefusalSourceUrl, federalHealthLawSourceUrl],
  treatment_cost_estimate: [],
  payment_invoice: [],
  payment_receipt: [],
  installment_payment_schedule: [],
  post_visit_recommendations: [],
  outpatient_medical_card_025u: [minzdravAmbulatoryFormsSourceUrl],
  medical_record_extract: [minzdravMedicalDocumentReleaseSourceUrl, minzdravAmbulatoryFormsSourceUrl],
  medical_record_copy_request: [minzdravMedicalDocumentReleaseSourceUrl],
  medical_document_release_receipt: [minzdravMedicalDocumentReleaseSourceUrl],
  xray_cbct_referral: [minzdravRadiologyRulesSourceUrl],
  lab_work_order: [],
  visit_attendance_certificate: [],
  warranty_service_memo: [],
  payment_refund_correction_request: [],
  tax_deduction_application: [
    fnsKnd1151156OrderSourceUrl,
    fnsMedicalDeductionRulesSourceUrl,
    fnsKnd1151156FillingSourceUrl
  ],
  legacy_tax_deduction_certificate: [fnsMedicalDeductionRulesSourceUrl],
  tax_deduction_registry: [fnsKnd1151156OrderSourceUrl, fnsKnd1151156FillingSourceUrl],
  patient_intake_questionnaire: []
} as const satisfies Record<DocumentKind, readonly string[]>;

export const documentKindMetadata = documentKindSchema.options.reduce(
  (metadataByKind, kind) => {
    metadataByKind[kind] = {
      ...documentKindBaseMetadata[kind],
      ...documentKindSourceMetadata[kind],
      sourceUrls: documentKindSourceUrls[kind]
    };
    return metadataByKind;
  },
  {} as Record<DocumentKind, DocumentKindMetadata>
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
      "visit_attendance_certificate"
    ]
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
      "payment_refund_correction_request"
    ]
  },
  {
    title: "Налоговая",
    kinds: ["tax_deduction_application", "tax_deduction_certificate", "legacy_tax_deduction_certificate", "tax_deduction_registry"]
  },
  {
    title: "Юр. и медкарта",
    kinds: [
      "personal_data_processing_consent",
      "minor_legal_representative_consent",
      "photo_video_consent",
      "medical_intervention_refusal",
      "outpatient_medical_card_025u",
      "medical_record_extract",
      "medical_record_copy_request",
      "medical_document_release_receipt",
      "xray_cbct_referral",
      "warranty_service_memo"
    ]
  },
  {
    title: "Лаборатория",
    kinds: ["lab_work_order"]
  }
] as const satisfies ReadonlyArray<{ title: string; kinds: readonly DocumentKind[] }>;

export function documentAmountSource(kind: DocumentKind): DocumentAmountSource {
  return documentKindMetadata[kind].amountSource;
}

export function documentRequiresPaidRecord(kind: DocumentKind): boolean {
  return documentKindMetadata[kind].requiresPaidRecord;
}

export const aiJobKindSchema = z.enum([
  "voice_transcription",
  "visit_note_draft",
  "image_summary",
  "document_draft",
  "paper_ocr"
]);
export type AiJobKind = z.infer<typeof aiJobKindSchema>;

export const aiJobStatusSchema = z.enum(["queued", "running", "needs_review", "accepted", "rejected", "failed"]);
export type AiJobStatus = z.infer<typeof aiJobStatusSchema>;

export const aiRecognitionTargetSchema = z.enum(["visit_note", "patient_import", "imaging_summary", "document_draft"]);
export type AiRecognitionTarget = z.infer<typeof aiRecognitionTargetSchema>;

export const imagingStudyKindSchema = z.enum(["periapical", "bitewing", "opg", "ceph", "cbct", "photo", "other"]);
export type ImagingStudyKind = z.infer<typeof imagingStudyKindSchema>;

export const imagingSourceKindSchema = z.enum([
  "manual_upload",
  "dicom_file",
  "dicomweb",
  "pacs",
  "twain_wia",
  "sensor_bridge",
  "folder_watch"
]);
export type ImagingSourceKind = z.infer<typeof imagingSourceKindSchema>;

export const clinicModeSchema = z.enum(["solo_doctor", "one_chair", "small_clinic", "network_clinic"]);
export type ClinicMode = z.infer<typeof clinicModeSchema>;

export const staffRoleSchema = z.enum(["owner", "doctor", "administrator", "assistant", "manager"]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const dentalSpecialtySchema = z.enum([
  "therapist",
  "orthopedist",
  "surgeon",
  "orthodontist",
  "periodontist",
  "hygienist",
  "pediatric",
  "implantologist",
  "radiologist",
  "universal"
]);
export type DentalSpecialty = z.infer<typeof dentalSpecialtySchema>;

export const serviceCategorySchema = z.enum([
  "consultation",
  "therapy",
  "surgery",
  "prosthetics",
  "orthodontics",
  "periodontology",
  "hygiene",
  "imaging",
  "documents",
  "other"
]);
export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

export const treatmentPlanItemStatusSchema = z.enum(["proposed", "approved", "in_progress", "completed", "cancelled"]);
export type TreatmentPlanItemStatus = z.infer<typeof treatmentPlanItemStatusSchema>;

export const treatmentPlanScenarioStrategySchema = z.enum(["urgent", "standard", "optimal", "phased", "maintenance"]);
export type TreatmentPlanScenarioStrategy = z.infer<typeof treatmentPlanScenarioStrategySchema>;

export const treatmentPlanScenarioPrioritySchema = z.enum(["budget", "balanced", "clinical"]);
export type TreatmentPlanScenarioPriority = z.infer<typeof treatmentPlanScenarioPrioritySchema>;

export const clinicalRuleSeveritySchema = z.enum(["info", "warning", "blocker"]);
export type ClinicalRuleSeverity = z.infer<typeof clinicalRuleSeveritySchema>;

export const clinicalRuleActionSchema = z.enum([
  "add_required_service",
  "block_service",
  "show_warning",
  "schedule_followup"
]);
export type ClinicalRuleAction = z.infer<typeof clinicalRuleActionSchema>;

export const paymentMethodSchema = z.enum(["cash", "card", "bank_transfer", "online", "insurance", "other"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum(["planned", "paid", "refunded", "voided"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const communicationChannelSchema = z.enum(["phone", "sms", "whatsapp", "telegram", "email", "in_person"]);
export type CommunicationChannel = z.infer<typeof communicationChannelSchema>;

export const communicationIntentSchema = z.enum([
  "appointment_confirmation",
  "payment_reminder",
  "post_visit_instruction",
  "recall",
  "document_ready",
  "imaging_review",
  "general"
]);
export type CommunicationIntent = z.infer<typeof communicationIntentSchema>;

export const communicationTaskWorkflowCodeSchema = z.enum([
  "telegram_tax_document_request",
  "telegram_billing_document_request",
  "telegram_medical_document_request",
  "telegram_patient_forms_request",
  "telegram_care_extraction_request",
  "telegram_care_implant_request",
  "telegram_care_filling_request",
  "telegram_care_endo_request",
  "telegram_care_surgery_request",
  "telegram_care_anesthesia_request",
  "telegram_care_hygiene_request",
  "telegram_care_prosthetics_request",
  "telegram_care_orthodontics_request",
  "telegram_care_periodontology_request",
  "telegram_appointment_reschedule_request",
  "telegram_appointment_call_request",
  "telegram_contact_request"
]);
export type CommunicationTaskWorkflowCode = z.infer<typeof communicationTaskWorkflowCodeSchema>;

export const communicationStatusSchema = z.enum([
  "queued",
  "scheduled",
  "needs_call",
  "sent",
  "delivered",
  "completed",
  "failed",
  "skipped"
]);
export type CommunicationStatus = z.infer<typeof communicationStatusSchema>;

export const communicationPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type CommunicationPriority = z.infer<typeof communicationPrioritySchema>;

export const communicationTaskOutcomeSchema = z.enum([
  "no_answer",
  "callback_requested",
  "reschedule_requested",
  "promised_payment",
  "document_pickup"
]);
export type CommunicationTaskOutcome = z.infer<typeof communicationTaskOutcomeSchema>;

export const integrationCategorySchema = z.enum([
  "dental_mis",
  "spreadsheet",
  "paper_archive",
  "imaging_system",
  "accounting",
  "custom"
]);
export type IntegrationCategory = z.infer<typeof integrationCategorySchema>;

export const integrationCapabilitySchema = z.enum([
  "patients",
  "appointments",
  "visits",
  "documents",
  "services",
  "payments",
  "imaging",
  "tax_documents",
  "audit"
]);
export type IntegrationCapability = z.infer<typeof integrationCapabilitySchema>;

export const integrationPresetStatusSchema = z.enum(["usable_now", "needs_mapping", "planned_connector"]);
export type IntegrationPresetStatus = z.infer<typeof integrationPresetStatusSchema>;

export const integrationPresetSchema = z.object({
  id: z.string(),
  title: z.string(),
  vendor: z.string(),
  category: integrationCategorySchema,
  status: integrationPresetStatusSchema,
  supportedInputs: z.array(z.string()),
  capabilities: z.array(integrationCapabilitySchema),
  migrationNotes: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high"])
});
export type IntegrationPreset = z.infer<typeof integrationPresetSchema>;

export const speechProviderKindSchema = z.enum([
  "browser_speech",
  "groq_whisper",
  "openai_transcribe",
  "deepgram_streaming",
  "assemblyai_async",
  "cloudflare_whisper",
  "azure_speech",
  "google_speech",
  "huggingface_asr",
  "mobile_native_speech",
  "local_whisper",
  "vosk_local"
]);
export type SpeechProviderKind = z.infer<typeof speechProviderKindSchema>;

export const speechProviderStatusSchema = z.enum(["usable_without_key", "needs_server_key", "planned_local"]);
export type SpeechProviderStatus = z.infer<typeof speechProviderStatusSchema>;

export const speechProviderModeSchema = z.enum(["browser_live", "server_upload", "server_streaming", "local_worker"]);
export type SpeechProviderMode = z.infer<typeof speechProviderModeSchema>;

export const speechProviderSchema = z.object({
  id: speechProviderKindSchema,
  title: z.string(),
  status: speechProviderStatusSchema,
  mode: speechProviderModeSchema,
  recommendedFor: z.array(z.string()),
  strengths: z.array(z.string()),
  limits: z.array(z.string()),
  costNote: z.string(),
  setupSettingsCount: z.number().int().nonnegative(),
  sourceUrl: z.string().url()
});
export type SpeechProvider = z.infer<typeof speechProviderSchema>;

export const speechGatewayProviderSchema = z.union([speechProviderKindSchema, z.literal("none")]);
export type SpeechGatewayProvider = z.infer<typeof speechGatewayProviderSchema>;

export const speechTranscriptionSourceSchema = z.enum(["visit", "import", "document", "settings_lab"]);
export type SpeechTranscriptionSource = z.infer<typeof speechTranscriptionSourceSchema>;

export const speechChunkUploadSchema = z
  .object({
    recordingId: z.string().min(1).max(120),
    chunkIndex: z.number().int().nonnegative(),
    mimeType: z.string().min(1).max(120).default("audio/webm"),
    audioBase64: z.string().max(12_000_000).optional(),
    localTranscript: z.string().max(20_000).nullable().optional(),
    durationMs: z.number().int().positive().max(180_000).nullable().optional(),
    language: z.string().min(2).max(12).default("ru"),
    source: speechTranscriptionSourceSchema.default("visit"),
    patientId: z.string().uuid().nullable().optional(),
    visitId: z.string().uuid().nullable().optional(),
    specialty: dentalSpecialtySchema.optional(),
    clientRecordedAt: z.string().nullable().optional()
  })
  .refine((input) => Boolean(input.audioBase64?.trim() || input.localTranscript?.trim()), {
    message: "Нужно передать аудиофайл или локальную расшифровку"
  });
export type SpeechChunkUploadInput = z.infer<typeof speechChunkUploadSchema>;

export const speechTranscriptionStatusSchema = z.enum(["transcribed", "fallback_text", "needs_provider_key", "failed"]);
export type SpeechTranscriptionStatus = z.infer<typeof speechTranscriptionStatusSchema>;

export const speechTranscriptionQualityLevelSchema = z.enum(["clear", "review", "empty", "failed"]);
export type SpeechTranscriptionQualityLevel = z.infer<typeof speechTranscriptionQualityLevelSchema>;

export const speechTranscriptionQualitySchema = z.object({
  level: speechTranscriptionQualityLevelSchema,
  confidence: z.number().min(0).max(1).nullable(),
  wordCount: z.number().int().nonnegative(),
  charCount: z.number().int().nonnegative(),
  durationMs: z.number().int().positive().nullable(),
  bytesPerSecond: z.number().nonnegative().nullable(),
  providerWarnings: z.array(z.string()),
  signals: z.array(z.string()),
  nextAction: z.string()
});
export type SpeechTranscriptionQuality = z.infer<typeof speechTranscriptionQualitySchema>;

export const speechProviderSelectionModeSchema = z.enum(["disabled", "manual", "auto", "fallback"]);
export type SpeechProviderSelectionMode = z.infer<typeof speechProviderSelectionModeSchema>;

export const speechKeyPoolSchema = z.object({
  configuredKeyCount: z.number().int().nonnegative(),
  availableKeyCount: z.number().int().nonnegative(),
  coolingDownKeyCount: z.number().int().nonnegative(),
  rotationEnabled: z.boolean(),
  maxAttemptsPerProvider: z.number().int().nonnegative(),
  timeoutMs: z.number().int().positive(),
  rateLimitCooldownMs: z.number().int().positive(),
  errorCooldownMs: z.number().int().positive(),
  authCooldownMs: z.number().int().positive()
});
export type SpeechKeyPool = z.infer<typeof speechKeyPoolSchema>;

export const speechProviderConnectorSchema = z.enum(["client_only", "server_wired", "server_cataloged", "local_bridge", "local_planned"]);
export type SpeechProviderConnector = z.infer<typeof speechProviderConnectorSchema>;

export const speechProviderRuntimeStatusSchema = z.object({
  providerId: speechProviderKindSchema,
  providerLabel: z.string(),
  connector: speechProviderConnectorSchema,
  doctorFacing: z.boolean(),
  canTranscribeChunks: z.boolean(),
  configured: z.boolean(),
  keyPool: speechKeyPoolSchema,
  acceptedSettingsCount: z.number().int().nonnegative(),
  missingSettingsCount: z.number().int().nonnegative(),
  recommendedUse: z.string(),
  nextStep: z.string(),
  warnings: z.array(z.string())
});
export type SpeechProviderRuntimeStatus = z.infer<typeof speechProviderRuntimeStatusSchema>;

export const speechProviderHealthLevelSchema = z.enum(["ready", "degraded", "setup_required", "planned", "offline"]);
export type SpeechProviderHealthLevel = z.infer<typeof speechProviderHealthLevelSchema>;

export const speechProviderKeyHealthSchema = z.object({
  fingerprint: z.string(),
  source: z.string(),
  ordinal: z.number().int().positive(),
  available: z.boolean(),
  coolingDownUntil: z.string().nullable(),
  failures: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
  lastUsedAt: z.string().nullable(),
  lastStatusCode: z.number().int().nullable(),
  lastError: z.string().nullable()
});
export type SpeechProviderKeyHealth = z.infer<typeof speechProviderKeyHealthSchema>;

export const speechProviderHealthSchema = z.object({
  providerId: speechProviderKindSchema,
  providerLabel: z.string(),
  connector: speechProviderConnectorSchema,
  configured: z.boolean(),
  canTranscribeChunks: z.boolean(),
  keyPool: speechKeyPoolSchema,
  keyHealth: z.array(speechProviderKeyHealthSchema),
  healthLevel: speechProviderHealthLevelSchema,
  fallbackRank: z.number().int().nonnegative().nullable(),
  safeToUseInVisit: z.boolean(),
  warnings: z.array(z.string()),
  nextStep: z.string()
});
export type SpeechProviderHealth = z.infer<typeof speechProviderHealthSchema>;

export const speechRecordingStrategyRequestSchema = z.object({
  expectedDurationMs: z.number().int().positive().max(14_400_000).nullable().optional(),
  networkState: z.enum(["online", "offline", "unknown"]).default("unknown"),
  privacyMode: z.enum(["cloud_allowed", "local_only"]).default("cloud_allowed"),
  specialty: dentalSpecialtySchema.default("universal"),
  source: speechTranscriptionSourceSchema.default("visit")
});
export type SpeechRecordingStrategyRequest = z.infer<typeof speechRecordingStrategyRequestSchema>;

export const speechRecordingStrategySchema = z.object({
  recommendedPath: z.enum(["server_chunked", "browser_live", "offline_queue", "local_transcript_only", "async_long_recording"]),
  providerId: speechGatewayProviderSchema,
  providerLabel: z.string(),
  serverUploadAllowed: z.boolean(),
  localQueueRequired: z.boolean(),
  deterministicParserRequired: z.boolean(),
  neuralPolishAllowed: z.boolean(),
  chunkMs: z.number().int().positive(),
  minChunkMs: z.number().int().positive(),
  maxChunkMs: z.number().int().positive(),
  estimatedChunkCount: z.number().int().nonnegative().nullable(),
  maxChunkBytes: z.number().int().positive(),
  reason: z.string(),
  steps: z.array(z.string()),
  warnings: z.array(z.string())
});
export type SpeechRecordingStrategy = z.infer<typeof speechRecordingStrategySchema>;

export const speechSttPromptPolicySchema = z.object({
  enabled: z.boolean(),
  version: z.string(),
  appliesTo: z.array(speechProviderKindSchema),
  maxChars: z.number().int().positive(),
  termCount: z.number().int().nonnegative(),
  promptPreview: z.string(),
  warnings: z.array(z.string())
});
export type SpeechSttPromptPolicy = z.infer<typeof speechSttPromptPolicySchema>;

export const speechGatewayStatusSchema = z.object({
  providerId: speechGatewayProviderSchema,
  requestedProviderId: speechGatewayProviderSchema,
  providerLabel: z.string(),
  providerSelectionMode: speechProviderSelectionModeSchema,
  serverTranscriptionEnabled: z.boolean(),
  serverTranscriptionCurrentlyAvailable: z.boolean(),
  keyConfigured: z.boolean(),
  keyPool: speechKeyPoolSchema,
  configuredProviderIds: z.array(speechProviderKindSchema),
  fallbackProviderIds: z.array(speechProviderKindSchema),
  maxChunkBytes: z.number().int().positive(),
  recommendedChunkMs: z.number().int().positive(),
  chunkingPolicy: z.object({
    strategy: z.enum(["time_and_silence", "time_only"]),
    minChunkMs: z.number().int().positive(),
    maxChunkMs: z.number().int().positive(),
    silenceMs: z.number().int().positive(),
    rmsThreshold: z.number().positive(),
    monitorIntervalMs: z.number().int().positive(),
    overlapMs: z.number().int().nonnegative(),
    dedupeWindowChars: z.number().int().positive()
  }),
  polishPolicy: z.object({
    deterministicEnabled: z.boolean(),
    neuralEnabled: z.boolean(),
    providerLabel: z.string(),
    modelName: z.string().nullable(),
    maxTranscriptChars: z.number().int().positive(),
    warnings: z.array(z.string())
  }),
  promptPolicy: speechSttPromptPolicySchema,
  audioRetention: z.enum(["discard_after_transcription", "disabled"]),
  nextSetupStep: z.string(),
  warnings: z.array(z.string())
});
export type SpeechGatewayStatus = z.infer<typeof speechGatewayStatusSchema>;

export const speechGatewayHealthReportSchema = z.object({
  generatedAt: z.string(),
  activeProviderId: speechGatewayProviderSchema,
  activeProviderLabel: z.string(),
  serverTranscriptionEnabled: z.boolean(),
  fallbackProviderIds: z.array(speechProviderKindSchema),
  totalConfiguredKeys: z.number().int().nonnegative(),
  totalAvailableKeys: z.number().int().nonnegative(),
  totalCoolingDownKeys: z.number().int().nonnegative(),
  timeoutMs: z.number().int().positive(),
  retryLimit: z.number().int().nonnegative(),
  promptEnabled: z.boolean(),
  deterministicParserEnabled: z.boolean(),
  providers: z.array(speechProviderHealthSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type SpeechGatewayHealthReport = z.infer<typeof speechGatewayHealthReportSchema>;

export const speechTranscriptionChunkSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  recordingId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  source: speechTranscriptionSourceSchema,
  patientId: z.string().uuid().nullable(),
  visitId: z.string().uuid().nullable(),
  providerId: speechGatewayProviderSchema,
  providerLabel: z.string(),
  mimeType: z.string(),
  byteLength: z.number().int().nonnegative(),
  durationMs: z.number().int().positive().nullable(),
  language: z.string(),
  transcript: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  status: speechTranscriptionStatusSchema,
  quality: speechTranscriptionQualitySchema.default({
    level: "review",
    confidence: null,
    wordCount: 0,
    charCount: 0,
    durationMs: null,
    bytesPerSecond: null,
    providerWarnings: ["У старого фрагмента распознавания нет метаданных качества."],
    signals: ["legacy_chunk"],
    nextAction: "Проверьте старый фрагмент распознавания перед переносом в карту."
  }),
  warnings: z.array(z.string()),
  clientRecordedAt: z.string().nullable(),
  createdAt: z.string()
});
export type SpeechTranscriptionChunk = z.infer<typeof speechTranscriptionChunkSchema>;

export const speechTranscriptionResponseSchema = z.object({
  chunk: speechTranscriptionChunkSchema,
  gateway: speechGatewayStatusSchema
});
export type SpeechTranscriptionResponse = z.infer<typeof speechTranscriptionResponseSchema>;

export const speechRecordingAssemblySchema = z.object({
  recordingId: z.string(),
  chunkCount: z.number().int().nonnegative(),
  receivedChunkIndexes: z.array(z.number().int().nonnegative()),
  missingChunkIndexes: z.array(z.number().int().nonnegative()),
  providerLabels: z.array(z.string()),
  statuses: z.array(speechTranscriptionStatusSchema),
  qualityCounts: z.object({
    clear: z.number().int().nonnegative(),
    review: z.number().int().nonnegative(),
    empty: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative()
  }),
  transcript: z.string(),
  warnings: z.array(z.string()),
  firstChunkAt: z.string().nullable(),
  lastChunkAt: z.string().nullable(),
  assembledAt: z.string()
});
export type SpeechRecordingAssembly = z.infer<typeof speechRecordingAssemblySchema>;

export const speechRecordingRecoveryStateSchema = z.enum([
  "complete",
  "quality_review",
  "missing_chunks",
  "failed_chunks",
  "transcript_empty"
]);
export type SpeechRecordingRecoveryState = z.infer<typeof speechRecordingRecoveryStateSchema>;

export const speechRecordingRecoveryItemSchema = z.object({
  recordingId: z.string(),
  source: speechTranscriptionSourceSchema,
  patientId: z.string().uuid().nullable(),
  visitId: z.string().uuid().nullable(),
  chunkCount: z.number().int().nonnegative(),
  receivedChunkIndexes: z.array(z.number().int().nonnegative()),
  missingChunkIndexes: z.array(z.number().int().nonnegative()),
  statusCounts: z.object({
    transcribed: z.number().int().nonnegative(),
    fallback_text: z.number().int().nonnegative(),
    needs_provider_key: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative()
  }),
  qualityCounts: z.object({
    clear: z.number().int().nonnegative(),
    review: z.number().int().nonnegative(),
    empty: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative()
  }),
  providerLabels: z.array(z.string()),
  transcriptPreview: z.string(),
  transcriptCharCount: z.number().int().nonnegative(),
  totalDurationMs: z.number().int().nonnegative().nullable(),
  totalBytes: z.number().int().nonnegative(),
  firstChunkAt: z.string().nullable(),
  lastChunkAt: z.string().nullable(),
  recoveryState: speechRecordingRecoveryStateSchema,
  nextAction: z.string(),
  warnings: z.array(z.string())
});
export type SpeechRecordingRecoveryItem = z.infer<typeof speechRecordingRecoveryItemSchema>;

export const speechRecordingRecoveryListSchema = z.object({
  recordings: z.array(speechRecordingRecoveryItemSchema),
  totalRecordings: z.number().int().nonnegative(),
  generatedAt: z.string()
});
export type SpeechRecordingRecoveryList = z.infer<typeof speechRecordingRecoveryListSchema>;

export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export type ClockTime = z.infer<typeof clockTimeSchema>;

export const weekdayIndexSchema = z.number().int().min(0).max(6);
export type WeekdayIndex = z.infer<typeof weekdayIndexSchema>;

function clockTimeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

export const clinicScheduleDefaultsSchema = z
  .object({
    workdayStart: clockTimeSchema,
    workdayEnd: clockTimeSchema,
    workingDays: z.array(weekdayIndexSchema).min(1).max(7),
    appointmentBufferMinutes: z.number().int().min(0).max(180)
  })
  .superRefine((value, context) => {
    if (clockTimeToMinutes(value.workdayEnd) <= clockTimeToMinutes(value.workdayStart)) {
      context.addIssue({
        code: "custom",
        path: ["workdayEnd"],
        message: "Окончание рабочего дня должно быть позже начала"
      });
    }
  });
export type ClinicScheduleDefaults = z.infer<typeof clinicScheduleDefaultsSchema>;

export const staffWorkingDaySchema = z
  .object({
    weekday: weekdayIndexSchema,
    enabled: z.boolean(),
    start: clockTimeSchema,
    end: clockTimeSchema
  })
  .superRefine((value, context) => {
    if (value.enabled && clockTimeToMinutes(value.end) <= clockTimeToMinutes(value.start)) {
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "Окончание рабочего дня сотрудника должно быть позже начала"
      });
    }
  });
export type StaffWorkingDay = z.infer<typeof staffWorkingDaySchema>;

export const staffWorkingHoursSchema = z.array(staffWorkingDaySchema).max(7);
export type StaffWorkingHours = z.infer<typeof staffWorkingHoursSchema>;

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(new Date("2026-01-01T00:00:00.000Z"));
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(isValidTimeZone, "Укажите реальный часовой пояс, например Europe/Samara или Europe/Moscow.");
export type TimeZoneId = z.infer<typeof timeZoneSchema>;

const dateLikeStringErrorMessage = "Укажите дату в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.";

const documentDateLikeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(isDateLikeString, dateLikeStringErrorMessage);

const nullableDocumentDateLikeStringSchema = z
  .string()
  .trim()
  .max(80)
  .refine((value) => !value || isDateLikeString(value), dateLikeStringErrorMessage)
  .nullable()
  .optional();

export const clinicProfileSchema = z.object({
  organizationId: z.string().uuid(),
  clinicName: z.string(),
  legalName: z.string().nullable(),
  inn: z.string().nullable(),
  kpp: z.string().nullable().optional(),
  ogrn: z.string().nullable().optional(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  medicalLicenseNumber: z.string().nullable().optional(),
  medicalLicenseIssuedAt: nullableDocumentDateLikeStringSchema,
  medicalLicenseIssuer: z.string().nullable().optional(),
  bankDetails: z.string().nullable().optional(),
  signatoryName: z.string().nullable().optional(),
  signatoryTitle: z.string().nullable().optional(),
  mode: clinicModeSchema,
  timezone: timeZoneSchema,
  defaultVisitMinutes: z.number().int().positive(),
  scheduleDefaults: clinicScheduleDefaultsSchema,
  networkEnabled: z.boolean(),
  egiszEnabled: z.boolean(),
  updatedAt: z.string()
});
export type ClinicProfile = z.infer<typeof clinicProfileSchema>;

export const staffMemberSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  fullName: z.string(),
  role: staffRoleSchema,
  specialties: z.array(dentalSpecialtySchema),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  active: z.boolean(),
  canSignMedicalRecords: z.boolean(),
  canManageMoney: z.boolean(),
  canManageImports: z.boolean(),
  color: z.string(),
  workingHours: staffWorkingHoursSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

export const chairSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  room: z.string().nullable(),
  specialization: dentalSpecialtySchema.nullable(),
  active: z.boolean(),
  hasXraySensor: z.boolean(),
  hasMicroscope: z.boolean(),
  hasSurgeryKit: z.boolean(),
  notes: z.string().nullable(),
  workingHours: staffWorkingHoursSchema.nullable().optional()
});
export type Chair = z.infer<typeof chairSchema>;

export const workspaceScopeSchema = z.enum(["personal", "clinic", "branch", "network"]);
export type WorkspaceScope = z.infer<typeof workspaceScopeSchema>;

export const workspaceSectionSchema = z.enum([
  "shift",
  "schedule",
  "patients",
  "imaging",
  "visit",
  "documents",
  "finance",
  "communications",
  "settings"
]);
export type WorkspaceSection = z.infer<typeof workspaceSectionSchema>;

export const clinicWorkspaceProfileSchema = z.object({
  id: z.string(),
  mode: clinicModeSchema,
  title: z.string(),
  description: z.string(),
  scope: workspaceScopeSchema,
  primaryRoles: z.array(staffRoleSchema),
  defaultSection: workspaceSectionSchema,
  visibleSections: z.array(workspaceSectionSchema),
  compactNavigation: z.boolean(),
  requiredCapabilities: z.array(z.string()),
  automations: z.array(z.string()),
  safeguards: z.array(z.string())
});
export type ClinicWorkspaceProfile = z.infer<typeof clinicWorkspaceProfileSchema>;

export const roleAccessPolicySchema = z.object({
  role: staffRoleSchema,
  title: z.string(),
  scope: workspaceScopeSchema,
  defaultSection: workspaceSectionSchema,
  canRead: z.array(workspaceSectionSchema),
  canWrite: z.array(workspaceSectionSchema),
  restricted: z.array(workspaceSectionSchema),
  requiresApprovalFor: z.array(z.string()),
  auditEvents: z.array(z.string())
});
export type RoleAccessPolicy = z.infer<typeof roleAccessPolicySchema>;

export const clinicSettingsSchema = z.object({
  profile: clinicProfileSchema,
  staff: z.array(staffMemberSchema),
  chairs: z.array(chairSchema),
  integrationPresets: z.array(integrationPresetSchema),
  workspaceProfiles: z.array(clinicWorkspaceProfileSchema),
  roleAccessPolicies: z.array(roleAccessPolicySchema),
  modeHints: z.array(z.string())
});
export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;

export const workloadStateSchema = z.enum(["idle", "healthy", "tight", "overbooked"]);
export type WorkloadState = z.infer<typeof workloadStateSchema>;

export const resourceLoadKindSchema = z.enum(["doctor", "assistant", "chair"]);
export type ResourceLoadKind = z.infer<typeof resourceLoadKindSchema>;

export const resourceLoadSchema = z.object({
  id: z.string(),
  kind: resourceLoadKindSchema,
  title: z.string(),
  subtitle: z.string(),
  bookedMinutes: z.number().int().nonnegative(),
  appointmentCount: z.number().int().nonnegative(),
  utilizationPercent: z.number().int().min(0).max(200),
  nextFreeAt: z.string().nullable(),
  state: workloadStateSchema,
  flags: z.array(z.string())
});
export type ResourceLoad = z.infer<typeof resourceLoadSchema>;

export const roleQueueSchema = z.object({
  role: staffRoleSchema,
  title: z.string(),
  ownerLabel: z.string(),
  openItems: z.number().int().nonnegative(),
  nextAction: z.string(),
  automationHint: z.string(),
  blockedBy: z.array(z.string())
});
export type RoleQueue = z.infer<typeof roleQueueSchema>;

export const scheduleWarningSchema = z.object({
  id: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  detail: z.string(),
  ownerRole: staffRoleSchema,
  relatedAppointmentId: z.string().uuid().nullable(),
  actionLabel: z.string()
});
export type ScheduleWarning = z.infer<typeof scheduleWarningSchema>;

export const clinicModeFitSchema = z.object({
  mode: clinicModeSchema,
  title: z.string(),
  fitScore: z.number().int().min(0).max(100),
  blockers: z.array(z.string()),
  upgrades: z.array(z.string()),
  lowFrictionNextStep: z.string()
});
export type ClinicModeFit = z.infer<typeof clinicModeFitSchema>;

export const shiftIntelligenceSchema = z.object({
  modeFit: clinicModeFitSchema,
  doctorLoads: z.array(resourceLoadSchema),
  assistantLoads: z.array(resourceLoadSchema),
  chairLoads: z.array(resourceLoadSchema),
  roleQueues: z.array(roleQueueSchema),
  scheduleWarnings: z.array(scheduleWarningSchema)
});
export type ShiftIntelligence = z.infer<typeof shiftIntelligenceSchema>;

export const protocolTemplateSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  specialty: dentalSpecialtySchema,
  title: z.string(),
  visitReason: z.string(),
  defaultDurationMinutes: z.number().int().positive(),
  complaintPrompt: z.string(),
  objectiveTemplate: z.string(),
  diagnosisHints: z.array(z.string()),
  treatmentPlanTemplate: z.string(),
  requiredDocuments: z.array(documentKindSchema),
  suggestedImaging: z.array(imagingStudyKindSchema),
  safetyWarnings: z.array(z.string()),
  updatedAt: z.string()
});
export type ProtocolTemplate = z.infer<typeof protocolTemplateSchema>;

export const serviceCatalogItemSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  category: serviceCategorySchema,
  specialty: dentalSpecialtySchema,
  basePriceRub: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  taxDeductible: z.boolean(),
  active: z.boolean()
});
export type ServiceCatalogItem = z.infer<typeof serviceCatalogItemSchema>;

export const pricelistSourceKindSchema = z.enum(["text", "ocr_text", "photo_ocr", "spreadsheet_copy", "manual"]);
export type PricelistSourceKind = z.infer<typeof pricelistSourceKindSchema>;

export const dentalMaterialKindSchema = z.enum([
  "composite",
  "glass_ionomer",
  "sealant",
  "ceramic",
  "zirconia",
  "lithium_disilicate",
  "metal_ceramic",
  "pmma",
  "metal",
  "titanium",
  "implant_system",
  "abutment",
  "bone_graft",
  "membrane",
  "aligner",
  "bracket",
  "fluoride",
  "whitening",
  "anesthetic",
  "imaging",
  "lab",
  "other",
  "unknown"
]);
export type DentalMaterialKind = z.infer<typeof dentalMaterialKindSchema>;

export const dentalRestorationTypeSchema = z.enum([
  "filling",
  "direct_restoration",
  "inlay",
  "onlay",
  "overlay",
  "veneer",
  "crown",
  "bridge",
  "implant_crown",
  "temporary_crown",
  "post_core",
  "denture",
  "ortho_appliance",
  "sealant",
  "whitening",
  "implant",
  "surgical_guide",
  "none",
  "unknown"
]);
export type DentalRestorationType = z.infer<typeof dentalRestorationTypeSchema>;

export const pricelistParserModeSchema = z.enum(["deterministic", "groq_json", "deterministic_groq_fallback"]);
export type PricelistParserMode = z.infer<typeof pricelistParserModeSchema>;

export const pricelistAiVisionSchema = z.object({
  providerId: z.literal("groq_whisper"),
  configured: z.boolean(),
  used: z.boolean(),
  modelName: z.string().nullable(),
  maxImagesPerRequest: z.number().int().positive(),
  reason: z.string()
});
export type PricelistAiVision = z.infer<typeof pricelistAiVisionSchema>;

export const dentalPricelistItemSchema = z.object({
  id: z.string(),
  sourceLine: z.number().int().positive(),
  sourceText: z.string(),
  title: z.string(),
  normalizedTitle: z.string(),
  category: serviceCategorySchema,
  specialty: dentalSpecialtySchema,
  treatmentKind: z.string(),
  materialKind: dentalMaterialKindSchema,
  restorationType: dentalRestorationTypeSchema,
  crownType: z.string().nullable(),
  brand: z.string().nullable(),
  toothScope: z.string().nullable(),
  unit: z.string(),
  priceRub: z.number().int().nonnegative().nullable(),
  priceMaxRub: z.number().int().nonnegative().nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  matchedServiceId: z.string().nullable()
});
export type DentalPricelistItem = z.infer<typeof dentalPricelistItemSchema>;

export const dentalPricelistCategorySummarySchema = z.object({
  category: serviceCategorySchema,
  specialty: dentalSpecialtySchema,
  count: z.number().int().nonnegative(),
  pricedCount: z.number().int().nonnegative(),
  minPriceRub: z.number().int().nonnegative().nullable(),
  maxPriceRub: z.number().int().nonnegative().nullable(),
  averagePriceRub: z.number().int().nonnegative().nullable(),
  materialKinds: z.array(dentalMaterialKindSchema),
  brands: z.array(z.string())
});
export type DentalPricelistCategorySummary = z.infer<typeof dentalPricelistCategorySummarySchema>;

export const dentalPricelistAnalysisRequestSchema = z
  .object({
    sourceName: z.string().min(1).max(160).default("manual-pricelist"),
    sourceKind: pricelistSourceKindSchema.default("text"),
    rawText: z.string().max(200_000).optional().default(""),
    imageBase64: z.string().max(4_000_000).optional(),
    imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
    preferredSpecialty: dentalSpecialtySchema.default("universal"),
    useServerAi: z.boolean().default(false)
  })
  .refine((input) => Boolean(input.rawText.trim() || input.imageBase64?.trim()), {
    message: "Нужно передать текст прайса или изображение"
  });
export type DentalPricelistAnalysisRequest = z.infer<typeof dentalPricelistAnalysisRequestSchema>;

export const dentalPricelistAnalysisResponseSchema = z.object({
  sourceName: z.string(),
  sourceKind: pricelistSourceKindSchema,
  parserMode: pricelistParserModeSchema,
  generatedAt: z.string(),
  items: z.array(dentalPricelistItemSchema),
  summary: z.array(dentalPricelistCategorySummarySchema),
  warnings: z.array(z.string()),
  aiVision: pricelistAiVisionSchema,
  groqJsonPromptVersion: z.string()
});
export type DentalPricelistAnalysisResponse = z.infer<typeof dentalPricelistAnalysisResponseSchema>;

export const treatmentPlanItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  serviceId: z.string(),
  toothCode: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPriceRub: z.number().int().nonnegative(),
  discountRub: z.number().int().nonnegative(),
  status: treatmentPlanItemStatusSchema,
  plannedDoctorUserId: z.string().uuid().nullable(),
  plannedChairId: z.string().uuid().nullable(),
  notes: z.string().nullable()
});
export type TreatmentPlanItem = z.infer<typeof treatmentPlanItemSchema>;

export const treatmentPlanScenarioSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  title: z.string(),
  strategy: treatmentPlanScenarioStrategySchema,
  priority: treatmentPlanScenarioPrioritySchema,
  totalRub: z.number().int().nonnegative(),
  durationMonths: z.number().int().nonnegative(),
  visitCount: z.number().int().positive(),
  includedServiceIds: z.array(z.string()),
  phases: z.array(
    z.object({
      title: z.string(),
      window: z.string(),
      amountRub: z.number().int().nonnegative(),
      focus: z.string()
    })
  ),
  pros: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  clinicalWarnings: z.array(z.string()),
  active: z.boolean()
});
export type TreatmentPlanScenario = z.infer<typeof treatmentPlanScenarioSchema>;

export const clinicalRuleSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  title: z.string(),
  category: serviceCategorySchema,
  specialty: dentalSpecialtySchema,
  action: clinicalRuleActionSchema,
  severity: clinicalRuleSeveritySchema,
  ownerRole: staffRoleSchema,
  triggerServiceIds: z.array(z.string()),
  requiredServiceIds: z.array(z.string()),
  requiresCompletedServiceIds: z.array(z.string()),
  blockedServiceIds: z.array(z.string()),
  condition: z.string().nullable(),
  warningText: z.string(),
  patientText: z.string(),
  active: z.boolean()
});
export type ClinicalRule = z.infer<typeof clinicalRuleSchema>;

export const clinicalRuleEvaluationSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  scenarioId: z.string().nullable(),
  title: z.string(),
  action: clinicalRuleActionSchema,
  severity: clinicalRuleSeveritySchema,
  ownerRole: staffRoleSchema,
  triggeredByServiceIds: z.array(z.string()),
  missingRequiredServiceIds: z.array(z.string()),
  missingCompletedServiceIds: z.array(z.string()),
  blockedServiceIds: z.array(z.string()),
  message: z.string(),
  patientMessage: z.string(),
  resolved: z.boolean()
});
export type ClinicalRuleEvaluation = z.infer<typeof clinicalRuleEvaluationSchema>;

export const clinicalRuleSummarySchema = z.object({
  activeRules: z.number().int().nonnegative(),
  evaluatedRules: z.number().int().nonnegative(),
  unresolved: z.number().int().nonnegative(),
  blockers: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  requiredServices: z.number().int().nonnegative(),
  coveredRules: z.number().int().nonnegative()
});
export type ClinicalRuleSummary = z.infer<typeof clinicalRuleSummarySchema>;

export const clinicalRuleEvaluationInputSchema = z.object({
  patientId: z.string().uuid(),
  scenarioId: z.string().nullable().optional(),
  serviceIds: z.array(z.string()).min(1),
  completedServiceIds: z.array(z.string()).default([])
});
export type ClinicalRuleEvaluationInput = z.infer<typeof clinicalRuleEvaluationInputSchema>;

export const clinicalRuleEvaluationResponseSchema = z.object({
  evaluations: z.array(clinicalRuleEvaluationSchema),
  summary: clinicalRuleSummarySchema
});
export type ClinicalRuleEvaluationResponse = z.infer<typeof clinicalRuleEvaluationResponseSchema>;

const clinicalRuleServiceIdSchema = z.string().trim().min(1).max(120);

const createClinicalRuleBaseSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    category: serviceCategorySchema,
    specialty: dentalSpecialtySchema,
    action: clinicalRuleActionSchema,
    severity: clinicalRuleSeveritySchema,
    ownerRole: staffRoleSchema,
    triggerServiceIds: z.array(clinicalRuleServiceIdSchema).min(1).max(80),
    requiredServiceIds: z.array(clinicalRuleServiceIdSchema).max(80).default([]),
    requiresCompletedServiceIds: z.array(clinicalRuleServiceIdSchema).max(80).default([]),
    blockedServiceIds: z.array(clinicalRuleServiceIdSchema).max(80).default([]),
    condition: z.string().trim().max(500).nullable().optional(),
    warningText: z.string().trim().min(1).max(700),
    patientText: z.string().trim().min(1).max(700),
    active: z.boolean().default(true)
  });

export const createClinicalRuleSchema = createClinicalRuleBaseSchema.superRefine((input, context) => {
    if (input.action === "add_required_service" && input.requiredServiceIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredServiceIds"],
        message: "Для правила добавления услуги укажите хотя бы одну обязательную услугу."
      });
    }
    if (
      input.action === "block_service" &&
      input.requiresCompletedServiceIds.length === 0 &&
      input.blockedServiceIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockedServiceIds"],
        message: "Для блокирующего правила укажите блокируемую услугу или требуемую завершенную услугу."
      });
    }
  });
export type CreateClinicalRuleInput = z.infer<typeof createClinicalRuleSchema>;

export const updateClinicalRuleSchema = createClinicalRuleBaseSchema.partial().extend({
  id: z.string()
});
export type UpdateClinicalRuleInput = z.infer<typeof updateClinicalRuleSchema>;

const fiscalReceiptUrlSchema = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), "Ссылка ОФД должна начинаться с http:// или https://");

const fiscalReceiptIssuedAtSchema = z
  .string()
  .trim()
  .max(80)
  .refine((value) => {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return !Number.isNaN(Date.parse(value));
    const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    if (ru) return !Number.isNaN(Date.parse(`${ru[3]}-${ru[2]}-${ru[1]}T00:00:00Z`));
    return false;
  }, "Дата фискального чека должна быть корректной датой.");

const strictFiscalReceiptIssuedAtSchema = fiscalReceiptIssuedAtSchema.refine(
  isDateLikeString,
  "Дата фискального чека должна быть реальной календарной датой."
);

export const fiscalReceiptDetailsSchema = z.object({
  fn: z.string().trim().max(32).nullable().optional(),
  fd: z.string().trim().max(32).nullable().optional(),
  fpd: z.string().trim().max(32).nullable().optional(),
  cashierName: z.string().trim().max(160).nullable().optional(),
  receiptUrl: fiscalReceiptUrlSchema.nullable().optional(),
  operationType: z.enum(["income", "income_return"]).nullable().optional()
});
export type FiscalReceiptDetails = z.infer<typeof fiscalReceiptDetailsSchema>;

export const paymentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  documentId: z.string().uuid().nullable(),
  amountRub: z.number().int().positive(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  fiscalReceiptNumber: z.string().nullable().optional(),
  fiscalReceiptIssuedAt: z.string().nullable().optional(),
  fiscalReceiptUrl: z.string().nullable().optional(),
  fiscalReceipt: fiscalReceiptDetailsSchema.nullable().optional(),
  clientMutationId: z.string().nullable().optional(),
  payerFullName: z.string().nullable().optional(),
  payerInn: z.string().nullable().optional(),
  payerBirthDate: z.string().nullable().optional(),
  payerIdentityDocument: z.string().nullable().optional(),
  payerRelationship: z.string().nullable().optional(),
  taxDeductionCode: z.enum(["1", "2"]).nullable().optional(),
  note: z.string().nullable()
});
export type Payment = z.infer<typeof paymentSchema>;

export const billingSummarySchema = z.object({
  totalPlannedRub: z.number().int().nonnegative(),
  totalDiscountRub: z.number().int().nonnegative(),
  totalPaidRub: z.number().int().nonnegative(),
  totalDueRub: z.number().int().nonnegative(),
  taxDeductionEligibleRub: z.number().int().nonnegative(),
  draftDocumentAmountRub: z.number().int().nonnegative(),
  openTreatmentItems: z.number().int().nonnegative(),
  unpaidDocuments: z.number().int().nonnegative()
});
export type BillingSummary = z.infer<typeof billingSummarySchema>;

export const communicationTemplateSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  title: z.string(),
  channel: communicationChannelSchema,
  intent: communicationIntentSchema,
  audienceRole: staffRoleSchema,
  body: z.string(),
  variables: z.array(z.string()),
  active: z.boolean()
});
export type CommunicationTemplate = z.infer<typeof communicationTemplateSchema>;

export const communicationTaskSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable(),
  visitId: z.string().uuid().nullable(),
  documentId: z.string().uuid().nullable(),
  assignedRole: staffRoleSchema,
  channel: communicationChannelSchema,
  intent: communicationIntentSchema,
  status: communicationStatusSchema,
  priority: communicationPrioritySchema,
  dueAt: z.string(),
  title: z.string(),
  body: z.string(),
  workflowCode: communicationTaskWorkflowCodeSchema.nullable().optional(),
  lastOutcome: communicationTaskOutcomeSchema.nullable().optional(),
  lastEventAt: z.string().nullable(),
  createdAt: z.string()
});
export type CommunicationTask = z.infer<typeof communicationTaskSchema>;

export const communicationEventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  patientId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  channel: communicationChannelSchema,
  direction: z.enum(["inbound", "outbound"]),
  status: communicationStatusSchema,
  message: z.string(),
  createdAt: z.string()
});
export type CommunicationEvent = z.infer<typeof communicationEventSchema>;

export const denteTelegramBotModeSchema = z.enum(["disabled", "shared_dente_bot", "clinic_owned_bot"]);
export type DenteTelegramBotMode = z.infer<typeof denteTelegramBotModeSchema>;

export const denteTelegramPrivacyModeSchema = z.enum([
  "no_phi_by_default",
  "limited_admin_only",
  "consented_phi_templates"
]);
export type DenteTelegramPrivacyMode = z.infer<typeof denteTelegramPrivacyModeSchema>;

export const denteTelegramFeatureSchema = z.enum([
  "appointment_reminders",
  "appointment_confirmation",
  "patient_linking",
  "pre_visit_intake",
  "document_ready_notice",
  "tax_document_request",
  "payment_reminders",
  "post_visit_instructions",
  "recalls",
  "review_requests",
  "staff_daily_digest",
  "staff_task_alerts",
  "callback_requests",
  "voice_note_intake",
  "secure_portal_links"
]);
export type DenteTelegramFeature = z.infer<typeof denteTelegramFeatureSchema>;

export const denteTelegramVisualCardKeySchema = z.enum([
  "mainMenu",
  "appointment",
  "documents",
  "tax",
  "billing",
  "care",
  "review",
  "staff"
]);
export type DenteTelegramVisualCardKey = z.infer<typeof denteTelegramVisualCardKeySchema>;

export const denteTelegramVisualCardUrlsSchema = z
  .object({
    mainMenu: z.string().trim().max(500).nullable().default(null),
    appointment: z.string().trim().max(500).nullable().default(null),
    documents: z.string().trim().max(500).nullable().default(null),
    tax: z.string().trim().max(500).nullable().default(null),
    billing: z.string().trim().max(500).nullable().default(null),
    care: z.string().trim().max(500).nullable().default(null),
    review: z.string().trim().max(500).nullable().default(null),
    staff: z.string().trim().max(500).nullable().default(null)
  })
  .default({});
export type DenteTelegramVisualCardUrls = z.infer<typeof denteTelegramVisualCardUrlsSchema>;

export const denteTelegramPostVisitCheckupDelayHoursByTopicSchema = z
  .object({
    extraction: z.number().int().min(1).max(720).default(24),
    implantation: z.number().int().min(1).max(720).default(24),
    filling_restoration: z.number().int().min(1).max(720).default(48),
    endo: z.number().int().min(1).max(720).default(48),
    surgery: z.number().int().min(1).max(720).default(24),
    local_anesthesia: z.number().int().min(1).max(720).default(24),
    hygiene: z.number().int().min(1).max(720).default(72),
    prosthetics: z.number().int().min(1).max(720).default(48),
    orthodontics: z.number().int().min(1).max(720).default(72),
    periodontology: z.number().int().min(1).max(720).default(72),
    other: z.number().int().min(1).max(720).default(48)
  })
  .default({});
export type DenteTelegramPostVisitCheckupDelayHoursByTopic = z.infer<typeof denteTelegramPostVisitCheckupDelayHoursByTopicSchema>;

const telegramBotUsernameSchema = z
  .string()
  .trim()
  .max(33)
  .regex(/^@?[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/, "Имя Telegram-бота должно содержать 5-32 символа: буквы, цифры, подчёркивания и окончание bot");

export const denteTelegramBotSettingsSchema = z.object({
  version: z.literal(1).default(1),
  organizationId: z.string().uuid(),
  mode: denteTelegramBotModeSchema,
  botUsername: telegramBotUsernameSchema.nullable(),
  ownBotUsername: telegramBotUsernameSchema.nullable(),
  webhookBaseUrl: z.string().trim().max(500).nullable(),
  patientPortalBaseUrl: z.string().trim().max(500).nullable(),
  welcomeImageUrl: z.string().trim().max(500).nullable(),
  visualCardUrls: denteTelegramVisualCardUrlsSchema,
  clinicReviewUrl: z.string().trim().max(500).nullable(),
  clinicMapsUrl: z.string().trim().max(500).nullable(),
  enabledFeatures: z.array(denteTelegramFeatureSchema),
  patientLinkTokenTtlMinutes: z.number().int().min(5).max(1440),
  appointmentReminderLeadTimesHours: z.array(z.number().int().min(1).max(168)).min(1).max(6).default([24]),
  reviewRequestDelayHours: z.number().int().min(1).max(720).default(2),
  postVisitCheckupDelayHoursByTopic: denteTelegramPostVisitCheckupDelayHoursByTopicSchema,
  allowVoiceIntake: z.boolean(),
  staffEscalationChannel: z.string().trim().max(128).nullable(),
  privacyMode: denteTelegramPrivacyModeSchema,
  updatedAt: z.string()
});
export type DenteTelegramBotSettings = z.infer<typeof denteTelegramBotSettingsSchema>;

export const updateDenteTelegramBotSettingsSchema = denteTelegramBotSettingsSchema
  .omit({ version: true, organizationId: true, updatedAt: true })
  .partial()
  .extend({
    version: z.literal(1).optional(),
    organizationId: z.string().uuid().optional(),
    updatedAt: z.string().optional()
  });
export type UpdateDenteTelegramBotSettingsInput = z.infer<typeof updateDenteTelegramBotSettingsSchema>;

export const denteTelegramSubjectTypeSchema = z.enum(["patient", "staff"]);
export type DenteTelegramSubjectType = z.infer<typeof denteTelegramSubjectTypeSchema>;

export const denteTelegramLinkCodeStatusSchema = z.enum(["pending", "used", "expired", "revoked"]);
export type DenteTelegramLinkCodeStatus = z.infer<typeof denteTelegramLinkCodeStatusSchema>;

export const denteTelegramChatLinkStatusSchema = z.enum(["active", "revoked"]);
export type DenteTelegramChatLinkStatus = z.infer<typeof denteTelegramChatLinkStatusSchema>;

export const denteTelegramLinkCodeSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  clinicId: z.string().uuid().nullable(),
  botConfigId: z.string().trim().min(1).max(160).default("default"),
  subjectType: denteTelegramSubjectTypeSchema,
  subjectId: z.string().uuid(),
  codeFingerprint: z.string().min(24).max(128),
  codeLast4: z.string().min(4).max(16),
  status: denteTelegramLinkCodeStatusSchema,
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdAt: z.string(),
  createdByUserId: z.string().uuid().nullable()
});
export type DenteTelegramLinkCode = z.infer<typeof denteTelegramLinkCodeSchema>;

export const denteTelegramLinkCodePublicSchema = denteTelegramLinkCodeSchema.omit({ codeFingerprint: true });
export type DenteTelegramLinkCodePublic = z.infer<typeof denteTelegramLinkCodePublicSchema>;

export const denteTelegramLinkCodeListResponseSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  filteredCount: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  cursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
  pendingCount: z.number().int().nonnegative(),
  usedCount: z.number().int().nonnegative(),
  expiredCount: z.number().int().nonnegative(),
  revokedCount: z.number().int().nonnegative(),
  linkCodes: z.array(denteTelegramLinkCodePublicSchema)
});
export type DenteTelegramLinkCodeListResponse = z.infer<typeof denteTelegramLinkCodeListResponseSchema>;

export const createDenteTelegramLinkCodeSchema = z.object({
  organizationId: z.string().uuid().optional(),
  subjectType: denteTelegramSubjectTypeSchema,
  subjectId: z.string().uuid(),
  clinicId: z.string().uuid().nullable().optional(),
  botConfigId: z.string().trim().min(1).max(160).optional(),
  ttlMinutes: z.number().int().min(5).max(1440).optional(),
  createdByUserId: z.string().uuid().nullable().optional()
});
export type CreateDenteTelegramLinkCodeInput = z.infer<typeof createDenteTelegramLinkCodeSchema>;

export const denteTelegramLinkCodeCreatedSchema = denteTelegramLinkCodePublicSchema.extend({
  code: z.string().min(8).max(64),
  deepLink: z.string().url().nullable(),
  qrSvg: z.string().min(1).max(80_000).nullable(),
  shareText: z.string().min(1).max(500)
});
export type DenteTelegramLinkCodeCreated = z.infer<typeof denteTelegramLinkCodeCreatedSchema>;

export const denteTelegramChatLinkSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  clinicId: z.string().uuid().nullable(),
  botConfigId: z.string().trim().min(1).max(160).default("default"),
  subjectType: denteTelegramSubjectTypeSchema,
  subjectId: z.string().uuid(),
  chatFingerprint: z.string().min(12).max(128),
  chatTransportRef: z.string().min(10).max(500).nullable().optional(),
  chatIdLast4: z.string().min(1).max(16).nullable().optional(),
  status: denteTelegramChatLinkStatusSchema,
  linkedAt: z.string(),
  revokedAt: z.string().nullable(),
  lastUpdateAt: z.string()
});
export type DenteTelegramChatLink = z.infer<typeof denteTelegramChatLinkSchema>;

export const denteTelegramChatLinkPublicSchema = denteTelegramChatLinkSchema.omit({ chatTransportRef: true });
export type DenteTelegramChatLinkPublic = z.infer<typeof denteTelegramChatLinkPublicSchema>;

export const denteTelegramChatLinkListResponseSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  filteredCount: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  cursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
  activeCount: z.number().int().nonnegative(),
  revokedCount: z.number().int().nonnegative(),
  chatLinks: z.array(denteTelegramChatLinkPublicSchema)
});
export type DenteTelegramChatLinkListResponse = z.infer<typeof denteTelegramChatLinkListResponseSchema>;

export const denteTelegramTemplateKindSchema = z.enum([
  "appointment_reminder",
  "appointment_confirmation",
  "payment_reminder_notice",
  "document_ready_notice",
  "tax_document_request_status",
  "callback_request_received",
  "post_visit_instruction_link",
  "post_visit_checkup",
  "recall_notice",
  "review_request",
  "staff_daily_digest"
]);
export type DenteTelegramTemplateKind = z.infer<typeof denteTelegramTemplateKindSchema>;

export const denteTelegramAppointmentCallbackActionSchema = z.enum(["confirm", "reschedule", "call_request"]);
export type DenteTelegramAppointmentCallbackAction = z.infer<typeof denteTelegramAppointmentCallbackActionSchema>;

export const denteTelegramAppointmentCallbackResultSchema = z.object({
  ok: z.boolean(),
  action: z.enum([
    "telegram_appointment_confirmed",
    "telegram_appointment_reschedule_requested",
    "telegram_callback_requested",
    "telegram_callback_rejected"
  ]),
  appointmentId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  replyText: z.string(),
  warnings: z.array(z.string())
});
export type DenteTelegramAppointmentCallbackResult = z.infer<typeof denteTelegramAppointmentCallbackResultSchema>;

export const denteTelegramMessageClassificationSchema = z.enum(["no_phi", "limited_admin", "phi_requires_consent"]);
export type DenteTelegramMessageClassification = z.infer<typeof denteTelegramMessageClassificationSchema>;

export const denteTelegramMessagePreviewRequestSchema = z.object({
  templateKind: denteTelegramTemplateKindSchema,
  patientId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  includePhi: z.boolean().default(false)
});
export type DenteTelegramMessagePreviewRequest = z.infer<typeof denteTelegramMessagePreviewRequestSchema>;

export const denteTelegramMessagePreviewSchema = z.object({
  templateKind: denteTelegramTemplateKindSchema,
  classification: denteTelegramMessageClassificationSchema,
  allowedByDefault: z.boolean(),
  text: z.string(),
  replyMarkup: z.record(z.unknown()).nullable(),
  photoUrl: z.string().url().nullable().default(null),
  variablesUsed: z.array(z.string()),
  warnings: z.array(z.string()),
  blockedReason: z.string().nullable()
});
export type DenteTelegramMessagePreview = z.infer<typeof denteTelegramMessagePreviewSchema>;

export const denteTelegramOutboxDeliveryStatusSchema = z.enum([
  "ready",
  "needs_chat_link",
  "blocked_by_policy",
  "transport_not_ready",
  "disabled"
]);
export type DenteTelegramOutboxDeliveryStatus = z.infer<typeof denteTelegramOutboxDeliveryStatusSchema>;

export const denteTelegramOutboxItemSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  patientId: z.string().uuid().nullable(),
  appointmentId: z.string().uuid().nullable(),
  subjectType: denteTelegramSubjectTypeSchema,
  subjectId: z.string().uuid(),
  chatLinkId: z.string().uuid().nullable(),
  templateKind: denteTelegramTemplateKindSchema,
  deliveryStatus: denteTelegramOutboxDeliveryStatusSchema,
  scheduledAt: z.string(),
  title: z.string(),
  previewText: z.string(),
  replyMarkup: z.record(z.unknown()).nullable(),
  photoUrl: z.string().url().nullable().default(null),
  warnings: z.array(z.string()),
  blockedReason: z.string().nullable(),
  source: z.enum([
    "communication_task",
    "staff_digest",
    "document_ready",
    "payment_reminder",
    "review_request",
    "post_visit_instruction",
    "post_visit_checkup",
    "recall",
    "appointment_reminder",
    "tax_document_request"
  ])
});
export type DenteTelegramOutboxItem = z.infer<typeof denteTelegramOutboxItemSchema>;

export const denteTelegramOutboxResponseSchema = z.object({
  generatedAt: z.string(),
  mode: denteTelegramBotModeSchema,
  transportReady: z.boolean(),
  totalCount: z.number().int().nonnegative(),
  filteredCount: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  cursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
  readyCount: z.number().int().nonnegative(),
  dueCount: z.number().int().nonnegative(),
  notDueCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  items: z.array(denteTelegramOutboxItemSchema),
  warnings: z.array(z.string())
});
export type DenteTelegramOutboxResponse = z.infer<typeof denteTelegramOutboxResponseSchema>;

export const denteTelegramOutboxSendRequestSchema = z.object({
  dryRun: z.boolean().default(false),
  clientMutationId: z.string().min(1).max(120).nullable().optional()
});
export type DenteTelegramOutboxSendRequest = z.infer<typeof denteTelegramOutboxSendRequestSchema>;

export const denteTelegramOutboxSendStatusSchema = z.enum(["sent", "dry_run", "blocked", "failed"]);
export type DenteTelegramOutboxSendStatus = z.infer<typeof denteTelegramOutboxSendStatusSchema>;

export const denteTelegramOutboxSendResponseSchema = z.object({
  status: denteTelegramOutboxSendStatusSchema,
  outboxItem: denteTelegramOutboxItemSchema.nullable(),
  taskId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  telegramMessageId: z.number().int().nonnegative().nullable(),
  clientMutationId: z.string().nullable(),
  warnings: z.array(z.string()),
  retryAfterSeconds: z.number().int().nonnegative().nullable().default(null),
  blockedReason: z.string().nullable()
});
export type DenteTelegramOutboxSendResponse = z.infer<typeof denteTelegramOutboxSendResponseSchema>;

export const denteTelegramOutboxSendDueResponseSchema = z.object({
  ok: z.boolean(),
  dryRun: z.boolean(),
  requestedLimit: z.number().int().positive(),
  dueCount: z.number().int().nonnegative(),
  notDueCount: z.number().int().nonnegative(),
  attemptedCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  dryRunCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  results: z.array(
    z.object({
      itemId: z.string(),
      statusCode: z.number().int(),
      result: z.union([
        denteTelegramOutboxSendResponseSchema,
        z.object({
          error: z.string(),
          message: z.string()
        })
      ])
    })
  )
});
export type DenteTelegramOutboxSendDueResponse = z.infer<typeof denteTelegramOutboxSendDueResponseSchema>;

export type DenteTelegramOutboxDeliveryReceipt = Pick<
  DenteTelegramOutboxSendResponse,
  "status" | "outboxItem" | "taskId" | "eventId" | "telegramMessageId" | "clientMutationId" | "warnings" | "blockedReason"
> & {
  outboxItemId: string;
  createdAt: string;
};

export const denteTelegramUpdateKindSchema = z.enum([
  "command",
  "message",
  "callback_query",
  "voice",
  "photo",
  "document",
  "unsupported"
]);
export type DenteTelegramUpdateKind = z.infer<typeof denteTelegramUpdateKindSchema>;

export const denteTelegramWebhookEventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  updateId: z.number().int().nonnegative(),
  botConfigId: z.string().min(1),
  chatFingerprint: z.string().nullable(),
  updateKind: denteTelegramUpdateKindSchema,
  command: z.string().max(64).nullable(),
  status: z.enum(["processing", "processed", "duplicate", "ignored", "rejected"]),
  action: z.string(),
  warnings: z.array(z.string()),
  createdAt: z.string()
});
export type DenteTelegramWebhookEvent = z.infer<typeof denteTelegramWebhookEventSchema>;

export const denteTelegramWebhookUpdateSchema = z
  .object({
    update_id: z.number().int().nonnegative()
  })
  .passthrough();

export const denteTelegramBotStatusSchema = z.object({
  settings: denteTelegramBotSettingsSchema,
  organizationId: z.string().uuid(),
  clinicId: z.string().uuid(),
  botConfigId: z.string().min(1).max(160),
  mode: denteTelegramBotModeSchema,
  botUsername: z.string().nullable(),
  tokenConfigured: z.boolean(),
  webhookSecretConfigured: z.boolean(),
  webhookReady: z.boolean(),
  clinicOwnedBotReady: z.boolean(),
  warnings: z.array(z.string()),
  nextActions: z.array(z.string()),
  processedUpdateCount: z.number().int().nonnegative(),
  pendingLinkCodeCount: z.number().int().nonnegative(),
  activeChatLinkCount: z.number().int().nonnegative(),
  recentEvents: z.array(denteTelegramWebhookEventSchema)
});
export type DenteTelegramBotStatus = z.infer<typeof denteTelegramBotStatusSchema>;

export const denteTelegramWebhookResponseSchema = z.object({
  ok: z.boolean(),
  duplicate: z.boolean(),
  action: z.string(),
  suggestedReply: z.string().nullable(),
  suggestedReplyMarkup: z.record(z.unknown()).nullable().default(null),
  suggestedPhotoUrl: z.string().url().nullable().default(null),
  warnings: z.array(z.string()),
  event: denteTelegramWebhookEventSchema.nullable()
});
export type DenteTelegramWebhookResponse = z.infer<typeof denteTelegramWebhookResponseSchema>;

export const communicationSummarySchema = z.object({
  openTasks: z.number().int().nonnegative(),
  urgentTasks: z.number().int().nonnegative(),
  dueToday: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  completedToday: z.number().int().nonnegative(),
  appointmentConfirmations: z.number().int().nonnegative(),
  paymentReminders: z.number().int().nonnegative(),
  postVisitInstructions: z.number().int().nonnegative()
});
export type CommunicationSummary = z.infer<typeof communicationSummarySchema>;

const patientAdministrativeTextSchema = z.string().trim().max(500).nullable().default(null);

const patientAdministrativeProfileBaseSchema = z.object({
  identityDocument: z.string().trim().max(240).nullable().default(null),
  taxpayerInn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/)
    .nullable()
    .default(null),
  registrationAddress: patientAdministrativeTextSchema,
  residentialAddress: patientAdministrativeTextSchema,
  insurancePolicyNumber: z.string().trim().max(120).nullable().default(null),
  snils: z.string().trim().max(40).nullable().default(null),
  legalRepresentativeFullName: z.string().trim().max(240).nullable().default(null),
  legalRepresentativeRelationship: z.string().trim().max(120).nullable().default(null),
  legalRepresentativeIdentityDocument: z.string().trim().max(240).nullable().default(null),
  legalRepresentativePhone: z.string().trim().max(80).nullable().default(null),
  preferredDocumentRecipient: z.string().trim().max(240).nullable().default(null),
  preferredAppointmentWeekdays: z.array(weekdayIndexSchema).max(7).default([]),
  preferredAppointmentStart: clockTimeSchema.nullable().default(null),
  preferredAppointmentEnd: clockTimeSchema.nullable().default(null),
  preferredAppointmentNote: patientAdministrativeTextSchema,
  dataProcessingBasisNote: patientAdministrativeTextSchema
});

export const patientAdministrativeProfileSchema = patientAdministrativeProfileBaseSchema.superRefine((value, context) => {
  if (
    value.preferredAppointmentStart &&
    value.preferredAppointmentEnd &&
    clockTimeToMinutes(value.preferredAppointmentEnd) <= clockTimeToMinutes(value.preferredAppointmentStart)
  ) {
    context.addIssue({
      code: "custom",
      path: ["preferredAppointmentEnd"],
      message: "Конец удобного времени приема должен быть позже начала"
    });
  }
});
export type PatientAdministrativeProfile = z.infer<typeof patientAdministrativeProfileSchema>;

export const patientSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: patientStatusSchema,
  fullName: z.string().min(1),
  birthDate: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  notes: z.string().nullable(),
  administrativeProfile: patientAdministrativeProfileSchema.nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Patient = z.infer<typeof patientSchema>;

export const patientInsightRiskSchema = z.enum(["low", "watch", "high"]);
export type PatientInsightRisk = z.infer<typeof patientInsightRiskSchema>;

export const patientInsightSchema = z.object({
  patientId: z.string().uuid(),
  riskLevel: patientInsightRiskSchema,
  riskReasons: z.array(z.string()),
  nextBestAction: z.string(),
  recallDueAt: z.string().nullable(),
  balanceDueRub: z.number().int().nonnegative(),
  openTasks: z.number().int().nonnegative(),
  missingDocumentKinds: z.array(documentKindSchema),
  clinicalFlags: z.array(z.string()),
  adminFlags: z.array(z.string()),
  lastActivityAt: z.string().nullable()
});
export type PatientInsight = z.infer<typeof patientInsightSchema>;

export const recommendedActionPrioritySchema = z.enum(["routine", "important", "urgent"]);
export type RecommendedActionPriority = z.infer<typeof recommendedActionPrioritySchema>;

export const recommendedActionSchema = z.object({
  id: z.string(),
  role: staffRoleSchema,
  priority: recommendedActionPrioritySchema,
  section: workspaceSectionSchema,
  patientId: z.string().uuid().nullable(),
  title: z.string(),
  detail: z.string(),
  metricLabel: z.string(),
  actionLabel: z.string(),
  source: z.string()
});
export type RecommendedAction = z.infer<typeof recommendedActionSchema>;

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid().nullable(),
  doctorUserId: z.string().uuid().nullable(),
  assistantUserId: z.string().uuid().nullable().optional(),
  chairId: z.string().uuid().nullable(),
  status: appointmentStatusSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().nullable(),
  comment: z.string().nullable()
});
export type Appointment = z.infer<typeof appointmentSchema>;

function parseStrictAppointmentDateTimeMs(value: string): number | null {
  const trimmed = value.trim();
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(trimmed);
  if (!match) return null;

  const [, yearPart, monthPart, dayPart, hourPart, minutePart, secondPart = "00"] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = Number(secondPart);

  if (!isValidDateParts(year, month, day)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export const createAppointmentSchema = z
  .object({
    patientId: z.string().uuid(),
    doctorUserId: z.string().uuid(),
    assistantUserId: z.string().uuid().nullable().optional(),
    chairId: z.string().uuid(),
    status: appointmentStatusSchema.default("planned"),
    startsAt: z.string().trim().min(1),
    endsAt: z.string().trim().min(1),
    reason: z.string().trim().max(500).nullable().optional(),
    comment: z.string().trim().max(1000).nullable().optional()
  })
  .superRefine((value, context) => {
    const startsAt = parseStrictAppointmentDateTimeMs(value.startsAt);
    const endsAt = parseStrictAppointmentDateTimeMs(value.endsAt);
    if (startsAt === null) {
      context.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Начало записи должно быть реальной датой и временем в ISO-формате с часовым поясом"
      });
    }
    if (endsAt === null) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Окончание записи должно быть реальной датой и временем в ISO-формате с часовым поясом"
      });
    }
    if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Окончание записи должно быть позже начала"
      });
    }
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z
  .object({
    patientId: z.string().uuid().nullable().optional(),
    doctorUserId: z.string().uuid().nullable().optional(),
    assistantUserId: z.string().uuid().nullable().optional(),
    chairId: z.string().uuid().nullable().optional(),
    status: appointmentStatusSchema.optional(),
    startsAt: z.string().trim().min(1).optional(),
    endsAt: z.string().trim().min(1).optional(),
    reason: z.string().trim().max(500).nullable().optional(),
    comment: z.string().trim().max(1000).nullable().optional()
  })
  .superRefine((value, context) => {
    const startsAt = value.startsAt !== undefined ? parseStrictAppointmentDateTimeMs(value.startsAt) : null;
    const endsAt = value.endsAt !== undefined ? parseStrictAppointmentDateTimeMs(value.endsAt) : null;

    if (value.startsAt !== undefined && startsAt === null) {
      context.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Начало записи должно быть реальной датой и временем в ISO-формате с часовым поясом"
      });
    }
    if (value.endsAt !== undefined && endsAt === null) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Окончание записи должно быть реальной датой и временем в ISO-формате с часовым поясом"
      });
    }
    if (value.startsAt !== undefined && value.endsAt !== undefined) {
      if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
        context.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "Окончание записи должно быть позже начала"
        });
      }
    }
  });
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const appointmentReadinessStateSchema = z.enum(["ready", "needs_attention", "blocked"]);
export type AppointmentReadinessState = z.infer<typeof appointmentReadinessStateSchema>;

export const appointmentReadinessCheckSchema = z.object({
  key: z.string(),
  title: z.string(),
  ready: z.boolean(),
  detail: z.string()
});
export type AppointmentReadinessCheck = z.infer<typeof appointmentReadinessCheckSchema>;

export const appointmentReadinessSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid().nullable(),
  state: appointmentReadinessStateSchema,
  score: z.number().int().min(0).max(100),
  ownerRole: staffRoleSchema,
  nextAction: z.string(),
  blockers: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
  checks: z.array(appointmentReadinessCheckSchema)
});
export type AppointmentReadiness = z.infer<typeof appointmentReadinessSchema>;

export const scheduleSuggestionSchema = z.object({
  id: z.string(),
  priority: recommendedActionPrioritySchema,
  ownerRole: staffRoleSchema,
  appointmentId: z.string().uuid().nullable(),
  section: workspaceSectionSchema,
  title: z.string(),
  detail: z.string(),
  actionLabel: z.string(),
  reason: z.string()
});
export type ScheduleSuggestion = z.infer<typeof scheduleSuggestionSchema>;

export const visitCloseChecklistItemSchema = z.object({
  id: z.string(),
  visitId: z.string().uuid(),
  title: z.string(),
  detail: z.string(),
  ready: z.boolean(),
  blocking: z.boolean(),
  ownerRole: staffRoleSchema,
  section: workspaceSectionSchema,
  actionLabel: z.string()
});
export type VisitCloseChecklistItem = z.infer<typeof visitCloseChecklistItemSchema>;

export const visitCloseChecklistSchema = z.object({
  visitId: z.string().uuid(),
  readyToSign: z.boolean(),
  score: z.number().int().min(0).max(100),
  nextAction: z.string(),
  blockingItems: z.number().int().nonnegative(),
  items: z.array(visitCloseChecklistItemSchema)
});
export type VisitCloseChecklist = z.infer<typeof visitCloseChecklistSchema>;

export const visitSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable(),
  status: visitStatusSchema,
  revision: z.number().int().nonnegative().default(1),
  complaint: z.string().nullable(),
  anamnesis: z.string().nullable(),
  objectiveStatus: z.string().nullable(),
  diagnosis: z.string().nullable(),
  treatmentPlan: z.string().nullable(),
  doctorSummary: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Visit = z.infer<typeof visitSchema>;

export const patientIntakePregnancyStatusSchema = z.enum([
  "not_applicable",
  "denied",
  "possible",
  "confirmed",
  "lactation",
  "unknown"
]);
export type PatientIntakePregnancyStatus = z.infer<typeof patientIntakePregnancyStatusSchema>;

export const patientIntakeQuestionnairePayloadSchema = z.object({
  chiefComplaint: z.string().trim().min(1).max(500),
  allergyStatus: z.string().trim().min(1).max(500),
  currentMedications: z.string().trim().min(1).max(500),
  chronicConditions: z.string().trim().min(1).max(700),
  pregnancyStatus: patientIntakePregnancyStatusSchema,
  anticoagulants: z.string().trim().min(1).max(400),
  infectiousRiskNotes: z.string().trim().min(1).max(500),
  cardioEndocrineNotes: z.string().trim().min(1).max(500),
  emergencyContact: z.string().trim().max(240).nullable().optional(),
  additionalNotes: z.string().trim().max(800).nullable().optional(),
  accuracyConfirmed: z.literal(true)
});
export type PatientIntakeQuestionnairePayload = z.infer<typeof patientIntakeQuestionnairePayloadSchema>;

export const paidMedicalServicesContractPayloadSchema = z.object({
  contractNumber: z.string().trim().min(1).max(120),
  contractDate: documentDateLikeStringSchema,
  serviceStart: documentDateLikeStringSchema,
  serviceEndOrCondition: z.string().trim().min(1).max(240),
  customerFullName: z.string().trim().min(1).max(240),
  representativeFullName: z.string().trim().max(240).nullable().optional(),
  plannedCareReason: z.string().trim().min(1).max(700),
  serviceScopeSummary: z.string().trim().min(1).max(1400),
  estimatedTotalRub: z.number().int().nonnegative(),
  paymentTerms: z.string().trim().min(1).max(800),
  priceChangeRules: z.string().trim().min(1).max(800),
  freeCareAvailabilityNotice: z.string().trim().min(1).max(800),
  medicalRecommendationWarning: z.string().trim().min(1).max(800),
  refusalAndRefundTerms: z.string().trim().min(1).max(800),
  warrantyAndClaimsTerms: z.string().trim().min(1).max(800),
  doctorFullName: z.string().trim().min(1).max(240),
  signedAt: documentDateLikeStringSchema,
  patientReceivedClinicInfo: z.literal(true),
  patientReceivedPriceAndServiceList: z.literal(true),
  patientUnderstandsPaidBasis: z.literal(true),
  changesRequireWrittenAgreement: z.literal(true)
});
export type PaidMedicalServicesContractPayload = z.infer<typeof paidMedicalServicesContractPayloadSchema>;

export const completedWorksActPayloadSchema = z.object({
  actNumber: z.string().trim().min(1).max(120),
  actDate: documentDateLikeStringSchema,
  contractNumber: z.string().trim().min(1).max(120),
  linkedContractDocumentId: z.string().uuid(),
  servicePeriodStart: documentDateLikeStringSchema,
  servicePeriodEnd: documentDateLikeStringSchema,
  doctorFullName: z.string().trim().min(1).max(240),
  acceptedServicesSummary: z.string().trim().min(1).max(1200),
  totalByActRub: z.number().int().nonnegative(),
  paidRub: z.number().int().nonnegative(),
  fiscalReceiptNumbers: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  patientClaimsText: z.string().trim().max(1000).nullable().optional(),
  linkedToSignedContract: z.literal(true),
  finalServiceScopeConfirmed: z.literal(true),
  fiscalReceiptsVerified: z.literal(true),
  patientAcceptedWorks: z.literal(true)
});
export type CompletedWorksActPayload = z.infer<typeof completedWorksActPayloadSchema>;

export const treatmentCostEstimatePayloadSchema = z.object({
  estimateNumber: z.string().trim().min(1).max(120),
  estimateDate: documentDateLikeStringSchema,
  patientOrPayerFullName: z.string().trim().min(1).max(240),
  treatmentBasis: z.string().trim().min(1).max(700),
  serviceLines: z
    .array(
      z.object({
        serviceName: z.string().trim().min(1).max(300),
        toothOrArea: z.string().trim().max(160).nullable().optional(),
        quantity: z.number().int().positive().max(999),
        unitPriceRub: z.number().int().nonnegative(),
        discountRub: z.number().int().nonnegative(),
        totalRub: z.number().int().nonnegative()
      })
    )
    .min(1)
    .max(80),
  totalAmountRub: z.number().int().positive(),
  estimateValidUntil: documentDateLikeStringSchema,
  priceChangeRules: z.string().trim().min(1).max(900),
  excludedItems: z.array(z.string().trim().min(1).max(260)).min(1).max(20),
  paymentMilestoneNotes: z.string().trim().min(1).max(900),
  responsibleDoctorFullName: z.string().trim().min(1).max(240),
  responsibleAdminFullName: z.string().trim().max(240).nullable().optional(),
  signedAt: documentDateLikeStringSchema,
  patientUnderstandsPreliminaryEstimate: z.literal(true),
  serviceScopeMatchesTreatmentPlan: z.literal(true),
  estimateDoesNotReplaceContractOrFiscalReceipt: z.literal(true),
  changesRequireUpdatedEstimate: z.literal(true)
});
export type TreatmentCostEstimatePayload = z.infer<typeof treatmentCostEstimatePayloadSchema>;

export const paymentInvoicePayloadSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(120),
  invoiceDate: documentDateLikeStringSchema,
  payerFullName: z.string().trim().min(1).max(240),
  payerPhone: z.string().trim().max(80).nullable().optional(),
  payerEmail: z.string().trim().max(240).nullable().optional(),
  paymentPurpose: z.string().trim().min(1).max(500),
  serviceLines: z
    .array(
      z.object({
        serviceName: z.string().trim().min(1).max(300),
        toothOrArea: z.string().trim().max(160).nullable().optional(),
        quantity: z.number().int().positive().max(999),
        unitPriceRub: z.number().int().nonnegative(),
        discountRub: z.number().int().nonnegative(),
        totalRub: z.number().int().nonnegative()
      })
    )
    .min(1)
    .max(60),
  totalAmountRub: z.number().int().positive(),
  dueDate: documentDateLikeStringSchema,
  paymentTerms: z.string().trim().min(1).max(700),
  clinicBankDetails: z.string().trim().min(1).max(1200),
  cashlessPaymentAllowed: z.boolean(),
  cashDeskPaymentAllowed: z.boolean(),
  qrPaymentPayload: z.string().trim().max(1000).nullable().optional(),
  clinicRequisitesVerified: z.literal(true),
  serviceScopeConfirmed: z.literal(true),
  payerInformedInvoiceIsNotFiscalReceipt: z.literal(true)
});
export type PaymentInvoicePayload = z.infer<typeof paymentInvoicePayloadSchema>;

export const paymentReceiptPayloadSchema = z
  .object({
    receiptNumber: z.string().trim().min(1).max(120),
    receiptDate: documentDateLikeStringSchema,
    selectedPaymentIds: z.array(z.string().uuid()).min(1).max(20),
    totalPaidRub: z.number().int().positive(),
    payerFullName: z.string().trim().min(1).max(240),
    taxSupportRequested: z.boolean().default(false),
    payerBirthDate: documentDateLikeStringSchema.nullable().optional(),
    payerInn: z
      .string()
      .trim()
      .regex(/^$|^\d{10}$|^\d{12}$/)
      .nullable()
      .optional(),
    payerIdentityDocument: z.string().trim().max(240).nullable().optional(),
    payerRelationship: z.string().trim().max(160).nullable().optional(),
    paymentPurpose: z.string().trim().min(1).max(500),
    fiscalReceiptNumbers: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
    issuedByFullName: z.string().trim().min(1).max(240),
    paymentAndFiscalDataVerified: z.literal(true),
    payerIdentityVerified: z.literal(true),
    receiptDoesNotReplaceFiscalReceipt: z.literal(true)
  })
  .superRefine((value, context) => {
    if (new Set(value.selectedPaymentIds).size !== value.selectedPaymentIds.length) {
      context.addIssue({
        code: "custom",
        path: ["selectedPaymentIds"],
        message: "Выбранные платежи не должны повторяться."
      });
    }
    const normalizedReceipts = value.fiscalReceiptNumbers.map((item) => item.trim().replace(/\s+/g, " ").toLocaleUpperCase("ru-RU"));
    if (new Set(normalizedReceipts).size !== normalizedReceipts.length) {
      context.addIssue({
        code: "custom",
        path: ["fiscalReceiptNumbers"],
        message: "Номера фискальных чеков не должны повторяться."
      });
    }
    if (value.taxSupportRequested) {
      const payerInnDigits = value.payerInn?.replace(/\D+/g, "") ?? "";
      const hasIdentityDocument = Boolean(value.payerIdentityDocument?.trim());
      if (!value.payerBirthDate?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["payerBirthDate"],
          message: "Для налоговой квитанции укажите дату рождения плательщика."
        });
      }
      if (!value.payerRelationship?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["payerRelationship"],
          message: "Для налоговой квитанции укажите связь плательщика с пациентом."
        });
      }
      if (payerInnDigits.length !== 12 && !hasIdentityDocument) {
        context.addIssue({
          code: "custom",
          path: ["payerInn"],
          message: "Для налоговой квитанции укажите 12-значный ИНН плательщика или документ удостоверения личности."
        });
      }
    }
  });
export type PaymentReceiptPayload = z.infer<typeof paymentReceiptPayloadSchema>;

export const installmentPaymentStatusSchema = z.enum(["planned", "paid", "overdue", "rescheduled", "cancelled"]);
export type InstallmentPaymentStatus = z.infer<typeof installmentPaymentStatusSchema>;

export const installmentPaymentSchedulePayloadSchema = z.object({
  scheduleNumber: z.string().trim().min(1).max(120),
  scheduleDate: documentDateLikeStringSchema,
  baseDocumentTitle: z.string().trim().min(1).max(300),
  payerFullName: z.string().trim().min(1).max(240),
  totalAmountRub: z.number().int().positive(),
  prepaidAmountRub: z.number().int().nonnegative(),
  remainingAmountRub: z.number().int().nonnegative(),
  installments: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        dueDate: documentDateLikeStringSchema,
        amountRub: z.number().int().positive(),
        status: installmentPaymentStatusSchema
      })
    )
    .min(1)
    .max(36),
  latePaymentPolicy: z.string().trim().min(1).max(700),
  paymentMethodNotes: z.string().trim().min(1).max(700),
  responsibleStaffFullName: z.string().trim().min(1).max(240),
  patientAcceptedSchedule: z.literal(true),
  scheduleDoesNotReplaceFiscalReceipt: z.literal(true),
  changesRequireWrittenAgreement: z.literal(true)
});
export type InstallmentPaymentSchedulePayload = z.infer<typeof installmentPaymentSchedulePayloadSchema>;

export const minorLegalRepresentativeConsentPayloadSchema = z.object({
  representativeFullName: z.string().trim().min(1).max(240),
  representativeRelationship: z.string().trim().min(1).max(160),
  representativeIdentityDocument: z.string().trim().min(1).max(240),
  authorityDocument: z.string().trim().min(1).max(300),
  representativePhone: z.string().trim().max(80).nullable().optional(),
  minorFullName: z.string().trim().min(1).max(240),
  minorBirthDate: documentDateLikeStringSchema,
  interventionScope: z.string().trim().min(1).max(700),
  diagnosisOrIndication: z.string().trim().min(1).max(700),
  explainedRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
  alternativesExplained: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  doctorFullName: z.string().trim().min(1).max(240),
  signedAt: documentDateLikeStringSchema,
  representativeIdentityVerified: z.literal(true),
  representativeAuthorityVerified: z.literal(true),
  informedConsentExplained: z.literal(true),
  medicalRecordConsentStored: z.literal(true),
  ageAppropriateExplanationGiven: z.literal(true)
});
export type MinorLegalRepresentativeConsentPayload = z.infer<typeof minorLegalRepresentativeConsentPayloadSchema>;

export const warrantyServiceMemoPayloadSchema = z.object({
  serviceOrWorkName: z.string().trim().min(1).max(500),
  completedAt: documentDateLikeStringSchema,
  teethOrArea: z.string().trim().min(1).max(240),
  materialsOrSystems: z.string().trim().min(1).max(700),
  warrantyPeriod: z.string().trim().min(1).max(300),
  controlVisitSchedule: z.string().trim().min(1).max(700),
  patientObligations: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
  excludedRiskFactors: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
  urgentContactReasons: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
  linkedActOrContract: z.string().trim().min(1).max(300),
  doctorFullName: z.string().trim().min(1).max(240),
  issuedAt: documentDateLikeStringSchema,
  localWarrantyPolicyApplied: z.literal(true),
  patientReceivedAftercare: z.literal(true),
  patientUnderstandsControlVisits: z.literal(true)
});
export type WarrantyServiceMemoPayload = z.infer<typeof warrantyServiceMemoPayloadSchema>;

export const taxDeductionApplicationRelationshipSchema = z.enum(["self", "spouse", "parent", "child", "ward"]);
export type TaxDeductionApplicationRelationship = z.infer<typeof taxDeductionApplicationRelationshipSchema>;

export const taxDeductionApplicationFormSchema = z.enum(["knd_1151156", "legacy_2021_2023"]);
export type TaxDeductionApplicationForm = z.infer<typeof taxDeductionApplicationFormSchema>;

export const taxDeductionApplicationDeliveryChannelSchema = z.enum(["paper", "pdf", "secure_link", "email", "portal", "other"]);
export type TaxDeductionApplicationDeliveryChannel = z.infer<typeof taxDeductionApplicationDeliveryChannelSchema>;

function isValidDateParts(year: number, month: number, day: number): boolean {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidTimeParts(hourText?: string, minuteText?: string, secondText?: string): boolean {
  if (hourText === undefined && minuteText === undefined && secondText === undefined) return true;
  if (hourText === undefined || minuteText === undefined) return false;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText === undefined ? 0 : Number(secondText);
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    Number.isInteger(second) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

function isValidTimezoneOffset(value?: string): boolean {
  if (value === undefined || value === "Z") return true;
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isDateLikeString(value: string): boolean {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(trimmed);
  if (iso) {
    return (
      isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3])) &&
      isValidTimeParts(iso[4], iso[5], iso[6]) &&
      isValidTimezoneOffset(iso[7])
    );
  }
  const ru = /^(\d{2})\.(\d{2})\.(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (ru) {
    return isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1])) && isValidTimeParts(ru[4], ru[5], ru[6]);
  }
  return false;
}

function normalizeDateOnlyString(value: string): string | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso && isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1]))) {
    return `${ru[3]}-${ru[2]}-${ru[1]}`;
  }
  return null;
}

function todayIsoDateOnly(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isPastOrTodayDateOnlyString(value: string): boolean {
  const normalized = normalizeDateOnlyString(value);
  return Boolean(normalized && normalized <= todayIsoDateOnly());
}

const birthDateInputSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => !value || isPastOrTodayDateOnlyString(value), {
    message: "Дата рождения должна быть реальной датой не позже сегодняшнего дня в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ."
  })
  .transform((value) => (value ? normalizeDateOnlyString(value) ?? value : value))
  .nullable()
  .optional();

const patientPhoneInputSchema = z
  .string()
  .trim()
  .max(80)
  .refine((value) => !value || value.replace(/\D/g, "").length >= 5, {
    message: "Телефон пациента должен содержать не меньше 5 цифр или быть пустым."
  })
  .nullable()
  .optional();

const taxDateLikeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(isDateLikeString, "Укажите дату в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.");

export const taxDeductionApplicationPayloadSchema = z
  .object({
    taxpayerFullName: z.string().trim().min(1).max(240),
    taxpayerInn: z
      .string()
      .trim()
      .regex(/^$|^\d{10}$|^\d{12}$/),
    taxpayerBirthDate: taxDateLikeStringSchema,
    taxpayerIdentityDocument: z.string().trim().min(1).max(240),
    relationshipToPatient: taxDeductionApplicationRelationshipSchema,
    requestedTaxYear: z.number().int().min(legacyTaxDeductionCertificateMinYear).max(2100),
    requestedForm: taxDeductionApplicationFormSchema,
    selectedPaymentIds: z.array(z.string().uuid()).max(200).default([]),
    deliveryChannel: taxDeductionApplicationDeliveryChannelSchema,
    contactForReadyDocument: z.string().trim().min(1).max(240),
    applicantAuthorityDocument: z.string().trim().max(300).nullable().optional(),
    requestedAt: taxDateLikeStringSchema,
    duplicateWarningAccepted: z.literal(true)
  })
  .superRefine((value, context) => {
    if (value.requestedForm === "legacy_2021_2023" && !/^\d{10}$|^\d{12}$/.test(value.taxpayerInn)) {
      context.addIssue({
        code: "custom",
        path: ["taxpayerInn"],
        message: "Для старой налоговой справки нужен 10- или 12-значный ИНН налогоплательщика."
      });
    }
    if (value.requestedForm === "knd_1151156" && value.taxpayerInn && !/^\d{12}$/.test(value.taxpayerInn)) {
      context.addIssue({
        code: "custom",
        path: ["taxpayerInn"],
        message: "Для заявления на КНД 1151156 нужен 12-значный ИНН физического лица."
      });
    }
    if (value.requestedTaxYear < taxDeductionCertificateMinYear && value.requestedForm !== "legacy_2021_2023") {
      context.addIssue({
        code: "custom",
        path: ["requestedForm"],
        message: "Для налоговых лет до 2024 нужна старая форма 2021-2023."
      });
    }
    if (value.requestedTaxYear >= taxDeductionCertificateMinYear && value.requestedForm !== "knd_1151156") {
      context.addIssue({
        code: "custom",
        path: ["requestedForm"],
        message: "Для налоговых лет с 2024 нужна справка КНД 1151156."
      });
    }
    if (value.relationshipToPatient !== "self" && !value.applicantAuthorityDocument?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["applicantAuthorityDocument"],
        message: "Для заявления представителя нужен документ, подтверждающий полномочия."
      });
    }
  });
export type TaxDeductionApplicationPayload = z.infer<typeof taxDeductionApplicationPayloadSchema>;

export const taxPaymentSelectionPayloadSchema = z
  .object({
    selectedPaymentIds: z.array(z.string().uuid()).min(1).max(200)
  })
  .strict();
export type TaxPaymentSelectionPayload = z.infer<typeof taxPaymentSelectionPayloadSchema>;

export const anesthesiaDoseRowSchema = z.object({
  time: z.string().trim().min(1).max(40),
  medication: z.string().trim().min(1).max(120),
  doseMl: z.string().trim().min(1).max(40),
  zone: z.string().trim().min(1).max(160),
  reaction: z.string().trim().max(240).nullable().optional()
});
export type AnesthesiaDoseRow = z.infer<typeof anesthesiaDoseRowSchema>;

export const anesthesiaConsentPayloadSchema = z.object({
  method: z.string().trim().min(1).max(160),
  anesthetic: z.string().trim().min(1).max(160),
  vasoconstrictor: z.string().trim().max(120).nullable().optional(),
  plannedZone: z.string().trim().min(1).max(160),
  allergyStatus: z.string().trim().min(1).max(240),
  restrictionNotes: z.string().trim().max(500).nullable().optional(),
  doseRows: z.array(anesthesiaDoseRowSchema).min(1).max(8),
  patientAnesthesiaRisksExplained: z.literal(true),
  allergyAndRestrictionStatusChecked: z.literal(true),
  patientConfirmedAnesthesiaConsent: z.literal(true)
});
export type AnesthesiaConsentPayload = z.infer<typeof anesthesiaConsentPayloadSchema>;

export const clinicalToothSurfaceSchema = z.enum([
  "occlusal",
  "mesial",
  "distal",
  "buccal",
  "lingual",
  "palatal",
  "incisal",
  "root",
  "implant_site",
  "not_applicable"
]);
export type ClinicalToothSurface = z.infer<typeof clinicalToothSurfaceSchema>;

export const clinicalToothStatusSchema = z.enum([
  "sound",
  "watch",
  "caries",
  "pulpitis_periodontitis",
  "periodontal",
  "missing",
  "implant",
  "prosthetic",
  "orthodontic",
  "planned",
  "completed",
  "other"
]);
export type ClinicalToothStatus = z.infer<typeof clinicalToothStatusSchema>;

export const clinicalToothRowSchema = z.object({
  toothOrArea: z.string().trim().min(1).max(80),
  surfaces: z.array(clinicalToothSurfaceSchema).min(1).max(8),
  status: clinicalToothStatusSchema,
  diagnosisOrFinding: z.string().trim().min(1).max(500),
  indication: z.string().trim().min(1).max(500),
  plannedAction: z.string().trim().min(1).max(500),
  prognosis: z.string().trim().max(300).nullable().optional(),
  periodontalStatus: z.string().trim().max(300).nullable().optional(),
  implantOrProstheticNotes: z.string().trim().max(300).nullable().optional(),
  orthodonticNotes: z.string().trim().max(300).nullable().optional()
});
export type ClinicalToothRow = z.infer<typeof clinicalToothRowSchema>;

export const clinicalToothRowsSchema = z.array(clinicalToothRowSchema).min(1).max(64);

export const prescriptionMedicationRowSchema = z.object({
  medication: z.string().trim().min(1).max(160),
  dosage: z.string().trim().min(1).max(160),
  instructions: z.string().trim().min(1).max(300),
  duration: z.string().trim().min(1).max(120)
});
export type PrescriptionMedicationRow = z.infer<typeof prescriptionMedicationRowSchema>;

export const prescriptionMedicationPayloadSchema = z.object({
  clinicalToothRows: clinicalToothRowsSchema,
  medications: z.array(prescriptionMedicationRowSchema).min(1).max(10),
  safetyNotes: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  urgentContactReason: z.string().trim().min(1).max(300)
});
export type PrescriptionMedicationPayload = z.infer<typeof prescriptionMedicationPayloadSchema>;

export const labWorkOrderPayloadSchema = z.object({
  clinicalToothRows: clinicalToothRowsSchema,
  workType: z.string().trim().min(1).max(160),
  teethOrArea: z.string().trim().min(1).max(160),
  material: z.string().trim().min(1).max(160),
  shade: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(200),
  deadline: z.string().trim().min(1).max(120),
  technicianNotes: z.string().trim().max(800).nullable().optional()
});
export type LabWorkOrderPayload = z.infer<typeof labWorkOrderPayloadSchema>;

export const photoVideoConsentMaterialSchema = z.enum([
  "intraoral_photo",
  "face_photo",
  "video",
  "xray",
  "cbct",
  "scan",
  "other"
]);
export type PhotoVideoConsentMaterial = z.infer<typeof photoVideoConsentMaterialSchema>;

export const photoVideoConsentPayloadSchema = z.object({
  clinicalRecordUse: z.literal(true),
  labTransferAllowed: z.boolean(),
  colleagueConsultationAllowed: z.boolean(),
  educationUseAllowed: z.boolean(),
  marketingUseAllowed: z.boolean(),
  recognizablePublicationAllowed: z.boolean(),
  materials: z.array(photoVideoConsentMaterialSchema).min(1).max(7),
  anonymizationRequired: z.literal(true),
  revocationChannel: z.string().trim().min(1).max(240),
  scopeNotes: z.string().trim().max(800).nullable().optional()
});
export type PhotoVideoConsentPayload = z.infer<typeof photoVideoConsentPayloadSchema>;

export const xrayCbctReferralStudyTypeSchema = z.enum([
  "rvg",
  "opg",
  "cbct",
  "trg",
  "tmj",
  "sinus",
  "photo_protocol",
  "other"
]);
export type XrayCbctReferralStudyType = z.infer<typeof xrayCbctReferralStudyTypeSchema>;

export const xrayCbctReferralPrioritySchema = z.enum(["routine", "urgent"]);
export type XrayCbctReferralPriority = z.infer<typeof xrayCbctReferralPrioritySchema>;

export const xrayCbctReferralPregnancyStatusSchema = z.enum([
  "not_applicable",
  "denied",
  "possible",
  "confirmed",
  "unknown"
]);
export type XrayCbctReferralPregnancyStatus = z.infer<typeof xrayCbctReferralPregnancyStatusSchema>;

export const xrayCbctReferralPayloadSchema = z.object({
  studyType: xrayCbctReferralStudyTypeSchema,
  clinicalToothRows: clinicalToothRowsSchema,
  area: z.string().trim().min(1).max(200),
  clinicalQuestion: z.string().trim().min(1).max(500),
  indication: z.string().trim().min(1).max(500),
  pregnancyStatus: xrayCbctReferralPregnancyStatusSchema,
  safetyNotes: z.string().trim().min(1).max(500),
  priority: xrayCbctReferralPrioritySchema,
  includeDicomExport: z.boolean(),
  includeRadiologistReport: z.boolean(),
  requestedBy: z.string().trim().min(1).max(200),
  recipientClinic: z.string().trim().max(240).nullable().optional(),
  dueDate: z.string().trim().max(80).nullable().optional()
});
export type XrayCbctReferralPayload = z.infer<typeof xrayCbctReferralPayloadSchema>;

export const medicalDocumentReleaseReceiptPayloadSchema = z.object({
  sourceRequestDocumentId: z.string().uuid(),
  recipientFullName: z.string().trim().min(1).max(240),
  recipientIdentityDocument: z.string().trim().min(1).max(240),
  recipientAuthority: z.string().trim().min(1).max(300),
  releaseChannel: z.enum(["paper", "pdf", "dicom_archive", "secure_link", "physical_media", "other"]),
  documentTypes: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
  periodStart: z.string().trim().max(40).nullable().optional(),
  periodEnd: z.string().trim().max(40).nullable().optional(),
  deliveredAt: documentDateLikeStringSchema,
  accessExpiresAt: z.string().trim().max(80).nullable().optional(),
  deliveryProtectionNote: z.string().trim().min(1).max(500),
  thirdPartyDataChecked: z.literal(true)
});
export type MedicalDocumentReleaseReceiptPayload = z.infer<typeof medicalDocumentReleaseReceiptPayloadSchema>;

export const medicalRecordExtractPayloadSchema = z.object({
  periodStart: z.string().trim().min(1).max(40),
  periodEnd: z.string().trim().min(1).max(40),
  sourceVisitIds: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  complaintAndAnamnesis: z.string().trim().min(1).max(1200),
  objectiveStatus: z.string().trim().min(1).max(1200),
  diagnosis: z.string().trim().min(1).max(1000),
  clinicalToothRows: clinicalToothRowsSchema,
  treatmentProvided: z.string().trim().min(1).max(1600),
  recommendations: z.string().trim().min(1).max(1600),
  doctorFullName: z.string().trim().min(1).max(240),
  recipientFullName: z.string().trim().min(1).max(240),
  recipientAuthority: z.string().trim().min(1).max(300),
  issuedAt: documentDateLikeStringSchema,
  preparedFromSignedMedicalRecords: z.literal(true),
  thirdPartyDataChecked: z.literal(true)
});
export type MedicalRecordExtractPayload = z.infer<typeof medicalRecordExtractPayloadSchema>;

const outpatientMedicalCard025uDateSchema = z.string().trim().max(40).nullable().optional();
const outpatientMedicalCard025uOptionalTextSchema = z.string().trim().max(1200).nullable().optional();
const outpatientMedicalCard025uCodeSchema = z.enum(["1", "2", "unknown"]);

export const outpatientMedicalCard025uDoctorSchema = z.object({
  fullName: z.string().trim().min(1).max(240),
  position: z.string().trim().max(160).nullable().optional(),
  specialty: z.string().trim().max(160).nullable().optional()
});
export type OutpatientMedicalCard025uDoctor = z.infer<typeof outpatientMedicalCard025uDoctorSchema>;

export const outpatientMedicalCard025uDiagnosisRowSchema = z.object({
  date: z.string().trim().min(1).max(40),
  diagnosis: z.string().trim().min(1).max(1000),
  icd10Code: z.string().trim().max(40).nullable().optional(),
  firstOrRepeat: z.enum(["first", "repeat", "unknown"]),
  doctorFullName: z.string().trim().min(1).max(240),
  doctorPosition: z.string().trim().max(160).nullable().optional(),
  doctorSpecialty: z.string().trim().max(160).nullable().optional()
});
export type OutpatientMedicalCard025uDiagnosisRow = z.infer<typeof outpatientMedicalCard025uDiagnosisRowSchema>;

export const outpatientMedicalCard025uTextRecordSchema = z.object({
  date: outpatientMedicalCard025uDateSchema,
  title: z.string().trim().max(240).nullable().optional(),
  text: z.string().trim().min(1).max(2000),
  doctor: outpatientMedicalCard025uDoctorSchema.nullable().optional()
});
export type OutpatientMedicalCard025uTextRecord = z.infer<typeof outpatientMedicalCard025uTextRecordSchema>;

export const outpatientMedicalCard025uEventRowSchema = z.object({
  date: outpatientMedicalCard025uDateSchema,
  event: z.string().trim().min(1).max(240),
  result: z.string().trim().max(1200).nullable().optional(),
  organization: z.string().trim().max(240).nullable().optional(),
  doctor: outpatientMedicalCard025uDoctorSchema.nullable().optional()
});
export type OutpatientMedicalCard025uEventRow = z.infer<typeof outpatientMedicalCard025uEventRowSchema>;

export const outpatientMedicalCard025uXrayDoseRowSchema = z.object({
  date: outpatientMedicalCard025uDateSchema,
  study: z.string().trim().min(1).max(240),
  area: z.string().trim().max(240).nullable().optional(),
  dose: z.string().trim().max(120).nullable().optional(),
  sourceDocument: z.string().trim().max(240).nullable().optional()
});
export type OutpatientMedicalCard025uXrayDoseRow = z.infer<typeof outpatientMedicalCard025uXrayDoseRowSchema>;

export const outpatientMedicalCard025uSpecialistVisitRecordSchema = z.object({
  sourceVisitId: z.string().trim().min(1).max(120),
  visitDate: z.string().trim().min(1).max(40),
  location: z.string().trim().max(240).nullable().optional(),
  doctorFullName: z.string().trim().min(1).max(240),
  doctorPosition: z.string().trim().max(160).nullable().optional(),
  doctorSpecialty: z.string().trim().max(160).nullable().optional(),
  firstOrRepeat: z.enum(["first", "repeat", "unknown"]),
  complaints: z.string().trim().min(1).max(1200),
  anamnesis: z.string().trim().min(1).max(1200),
  objectiveData: z.string().trim().min(1).max(1600),
  primaryDiagnosis: z.string().trim().min(1).max(1000),
  primaryDiagnosisIcd10: z.string().trim().max(40).nullable().optional(),
  complications: outpatientMedicalCard025uOptionalTextSchema,
  comorbidities: outpatientMedicalCard025uOptionalTextSchema,
  externalCause: outpatientMedicalCard025uOptionalTextSchema,
  healthGroup: z.string().trim().max(120).nullable().optional(),
  dispensaryObservation: outpatientMedicalCard025uOptionalTextSchema,
  orders: z.string().trim().min(1).max(1600),
  treatmentProvided: z.string().trim().min(1).max(1600),
  medicinesAndPhysiotherapy: outpatientMedicalCard025uOptionalTextSchema,
  sickLeaveOrCertificate: outpatientMedicalCard025uOptionalTextSchema,
  preferentialPrescriptions: outpatientMedicalCard025uOptionalTextSchema,
  informedConsentOrRefusal: z.string().trim().min(1).max(800),
  clinicalToothRows: clinicalToothRowsSchema
});
export type OutpatientMedicalCard025uSpecialistVisitRecord = z.infer<typeof outpatientMedicalCard025uSpecialistVisitRecordSchema>;

export const outpatientMedicalCard025uPayloadSchema = z.object({
  formNumber: z.literal("025/у"),
  sourceOrderReference: z.literal("Приказ Минздрава России от 13.05.2025 N 274н"),
  medicalOrganizationName: z.string().trim().min(1).max(300),
  medicalOrganizationAddress: z.string().trim().max(500).nullable().optional(),
  medicalOrganizationOgrnOrOgrnip: z.string().trim().max(80).nullable().optional(),
  medicalOrganizationLicense: z.string().trim().max(300).nullable().optional(),
  medicalCardNumber: z.string().trim().min(1).max(120),
  openedAt: z.string().trim().min(1).max(40),
  periodStart: z.string().trim().min(1).max(40),
  periodEnd: z.string().trim().min(1).max(40),
  sourceVisitIds: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  patientFullName: z.string().trim().min(1).max(240),
  patientBirthDate: outpatientMedicalCard025uDateSchema,
  patientSexCode: outpatientMedicalCard025uCodeSchema,
  citizenship: z.string().trim().max(120).nullable().optional(),
  identityDocument: z.string().trim().max(240).nullable().optional(),
  identityDocumentSeries: z.string().trim().max(40).nullable().optional(),
  identityDocumentNumber: z.string().trim().max(80).nullable().optional(),
  patientPhone: z.string().trim().max(80).nullable().optional(),
  patientEmail: z.string().trim().max(160).nullable().optional(),
  registrationAddress: z.string().trim().max(500).nullable().optional(),
  registrationUrbanRuralCode: outpatientMedicalCard025uCodeSchema,
  stayAddress: z.string().trim().max(500).nullable().optional(),
  stayUrbanRuralCode: outpatientMedicalCard025uCodeSchema,
  omsPolicy: z.string().trim().max(120).nullable().optional(),
  omsIssuedAt: outpatientMedicalCard025uDateSchema,
  insurerName: z.string().trim().max(240).nullable().optional(),
  snils: z.string().trim().max(40).nullable().optional(),
  socialSupportCode: z.string().trim().max(120).nullable().optional(),
  healthStatusDisclosureContact: z.string().trim().max(300).nullable().optional(),
  employmentCode: z.string().trim().max(120).nullable().optional(),
  disabilityGroup: z.string().trim().max(120).nullable().optional(),
  workOrStudyPlace: z.string().trim().max(240).nullable().optional(),
  palliativeCareNeedCode: z.string().trim().max(120).nullable().optional(),
  bloodGroup: z.string().trim().max(40).nullable().optional(),
  rhFactor: z.string().trim().max(40).nullable().optional(),
  kellK1: z.string().trim().max(40).nullable().optional(),
  otherBloodData: z.string().trim().max(300).nullable().optional(),
  allergyHistory: z.string().trim().max(1000).nullable().optional(),
  chronicDispensaryRegister: z.array(outpatientMedicalCard025uDiagnosisRowSchema).max(100),
  finalDiagnoses: z.array(outpatientMedicalCard025uDiagnosisRowSchema).min(1).max(100),
  specialistVisitRecords: z.array(outpatientMedicalCard025uSpecialistVisitRecordSchema).min(1).max(50),
  dynamicObservationRecords: z.array(outpatientMedicalCard025uTextRecordSchema).max(100),
  stageEpicrisisRecords: z.array(outpatientMedicalCard025uTextRecordSchema).max(50),
  departmentHeadConsultations: z.array(outpatientMedicalCard025uTextRecordSchema).max(50),
  medicalCommissionRecords: z.array(outpatientMedicalCard025uTextRecordSchema).max(50),
  dispensaryObservationEntries: z.array(outpatientMedicalCard025uTextRecordSchema).max(100),
  hospitalizationRows: z.array(outpatientMedicalCard025uEventRowSchema).max(50),
  ambulatorySurgeryRows: z.array(outpatientMedicalCard025uEventRowSchema).max(50),
  xrayDoseRows: z.array(outpatientMedicalCard025uXrayDoseRowSchema).max(100),
  functionalResults: z.array(outpatientMedicalCard025uTextRecordSchema).max(100),
  laboratoryResults: z.array(outpatientMedicalCard025uTextRecordSchema).max(100),
  finalEpicrisis: z.string().trim().max(4000).nullable().optional(),
  preparedFromSignedMedicalRecords: z.literal(true),
  officialForm274nChecked: z.literal(true),
  thirdPartyDataChecked: z.literal(true)
});
export type OutpatientMedicalCard025uPayload = z.infer<typeof outpatientMedicalCard025uPayloadSchema>;

export const medicalRecordCopyRequestFormatSchema = z.enum(["paper", "pdf", "dicom_archive", "secure_link", "physical_media", "other"]);
export type MedicalRecordCopyRequestFormat = z.infer<typeof medicalRecordCopyRequestFormatSchema>;

export const medicalRecordCopyRequestPayloadSchema = z.object({
  requestedDocumentTypes: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
  periodStart: z.string().trim().max(40).nullable().optional(),
  periodEnd: z.string().trim().max(40).nullable().optional(),
  requestedFormat: medicalRecordCopyRequestFormatSchema,
  recipientFullName: z.string().trim().min(1).max(240),
  recipientIdentityDocument: z.string().trim().min(1).max(240),
  recipientAuthority: z.string().trim().min(1).max(300),
  representativeAuthorityDocument: z.string().trim().max(300).nullable().optional(),
  requestedAt: documentDateLikeStringSchema,
  contactForDelivery: z.string().trim().min(1).max(240),
  specialInstructions: z.string().trim().max(700).nullable().optional(),
  includeDicomSourceData: z.boolean(),
  identityVerified: z.literal(true),
  thirdPartyDataExclusionAcknowledged: z.literal(true)
});
export type MedicalRecordCopyRequestPayload = z.infer<typeof medicalRecordCopyRequestPayloadSchema>;

export const postVisitCareTopicSchema = z.enum([
  "extraction",
  "implantation",
  "filling_restoration",
  "endo",
  "surgery",
  "local_anesthesia",
  "hygiene",
  "prosthetics",
  "orthodontics",
  "periodontology",
  "other"
]);
export type PostVisitCareTopic = z.infer<typeof postVisitCareTopicSchema>;

export const postVisitRecommendationsPayloadSchema = z.object({
  careTopic: postVisitCareTopicSchema,
  procedureName: z.string().trim().min(1).max(500),
  toothOrArea: z.string().trim().min(1).max(240),
  performedAt: documentDateLikeStringSchema,
  doctorFullName: z.string().trim().min(1).max(240),
  allowedAfter: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  temporaryRestrictions: z.array(z.string().trim().min(1).max(300)).min(1).max(16),
  medicationAndRinsePlan: z.array(z.string().trim().min(1).max(300)).min(1).max(16),
  hygieneInstructions: z.array(z.string().trim().min(1).max(300)).min(1).max(16),
  nutritionInstructions: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  urgentWarningSigns: z.array(z.string().trim().min(1).max(300)).min(1).max(16),
  plannedFollowUpAt: z.string().trim().max(120).nullable().optional(),
  clinicContactInstruction: z.string().trim().min(1).max(500),
  telegramSummary: z.string().trim().min(1).max(700),
  patientReceivedPrintedCopy: z.literal(true),
  patientUnderstandsUrgentSigns: z.literal(true),
  safeForTelegramSending: z.literal(true)
});
export type PostVisitRecommendationsPayload = z.infer<typeof postVisitRecommendationsPayloadSchema>;

export const treatmentPlanPayloadSchema = z.object({
  clinicalReason: z.string().trim().min(1).max(700),
  diagnosisSummary: z.string().trim().min(1).max(700),
  teethOrArea: z.string().trim().min(1).max(240),
  clinicalToothRows: clinicalToothRowsSchema,
  treatmentGoals: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  plannedStages: z
    .array(
      z.object({
        stageName: z.string().trim().min(1).max(180),
        plannedServices: z.string().trim().min(1).max(500),
        plannedTiming: z.string().trim().min(1).max(180),
        clinicalNotes: z.string().trim().max(500).nullable().optional(),
        estimatedAmountRub: z.number().int().nonnegative().nullable().optional()
      })
    )
    .min(1)
    .max(24),
  estimatedTotalRub: z.number().int().nonnegative(),
  alternatives: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  risksAndLimitations: z.array(z.string().trim().min(1).max(300)).min(1).max(16),
  prognosisAndLimits: z.string().trim().min(1).max(900),
  controlPlan: z.string().trim().min(1).max(700),
  doctorFullName: z.string().trim().min(1).max(240),
  plannedAt: documentDateLikeStringSchema,
  patientQuestionsAnswered: z.literal(true),
  planRequiresSeparateConsent: z.literal(true),
  planRequiresNewApprovalOnChange: z.literal(true)
});
export type TreatmentPlanPayload = z.infer<typeof treatmentPlanPayloadSchema>;

export const treatmentPlanAcceptanceVariantSchema = z.enum(["urgent", "standard", "optimal", "staged", "maintenance", "other"]);
export type TreatmentPlanAcceptanceVariant = z.infer<typeof treatmentPlanAcceptanceVariantSchema>;

export const treatmentPlanAcceptancePayloadSchema = z.object({
  selectedVariant: treatmentPlanAcceptanceVariantSchema,
  clinicalGoal: z.string().trim().min(1).max(700),
  diagnosisSummary: z.string().trim().min(1).max(700),
  teethOrArea: z.string().trim().min(1).max(240),
  clinicalToothRows: clinicalToothRowsSchema,
  acceptedStages: z
    .array(
      z.object({
        stageName: z.string().trim().min(1).max(180),
        plannedServices: z.string().trim().min(1).max(500),
        plannedTiming: z.string().trim().min(1).max(180),
        estimatedAmountRub: z.number().int().nonnegative().nullable().optional()
      })
    )
    .min(1)
    .max(20),
  estimatedTotalRub: z.number().int().nonnegative(),
  estimateValidUntil: documentDateLikeStringSchema,
  paymentTerms: z.string().trim().min(1).max(700),
  rejectedAlternatives: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  risksAndLimitations: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  warrantyAndControlTerms: z.string().trim().min(1).max(700),
  doctorFullName: z.string().trim().min(1).max(240),
  acceptedAt: documentDateLikeStringSchema,
  patientQuestionsAnswered: z.literal(true),
  patientUnderstandsAlternatives: z.literal(true),
  patientUnderstandsCostMayChange: z.literal(true),
  revisionRequiresNewApproval: z.literal(true)
});
export type TreatmentPlanAcceptancePayload = z.infer<typeof treatmentPlanAcceptancePayloadSchema>;

export const visitAttendanceCertificatePayloadSchema = z.object({
  attendedAtStart: documentDateLikeStringSchema,
  attendedAtEnd: documentDateLikeStringSchema,
  purpose: z.string().trim().min(1).max(240),
  recipientOrganization: z.string().trim().max(240).nullable().optional(),
  issuedAt: documentDateLikeStringSchema,
  signedByFullName: z.string().trim().min(1).max(240),
  signedByRole: z.string().trim().min(1).max(160),
  diagnosisDisclosureExcluded: z.literal(true),
  notSickLeaveAcknowledged: z.literal(true)
});
export type VisitAttendanceCertificatePayload = z.infer<typeof visitAttendanceCertificatePayloadSchema>;

export const paymentRefundCorrectionPayloadSchema = z.object({
  action: z.enum(["full_refund", "partial_refund", "payment_transfer", "receipt_correction", "payer_details_correction"]),
  selectedPaymentIds: z.array(z.string().uuid()).min(1).max(20),
  amountRub: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
  refundMethod: z.enum(["cash", "card", "bank_transfer", "internal_offset", "no_money_movement"]),
  recipientFullName: z.string().trim().min(1).max(240),
  recipientIdentityDocument: z.string().trim().min(1).max(240),
  bankDetails: z.string().trim().max(1000).nullable().optional(),
  originalFiscalReceiptNumber: z.string().trim().min(1).max(120),
  correctionFiscalReceiptNumber: z.string().trim().max(120).nullable().optional(),
  accountantDecision: z.string().trim().min(1).max(500)
}).superRefine((value, context) => {
  if (new Set(value.selectedPaymentIds).size !== value.selectedPaymentIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selectedPaymentIds"],
      message: "Каждый исходный платеж можно выбрать только один раз."
    });
  }
});
export type PaymentRefundCorrectionPayload = z.infer<typeof paymentRefundCorrectionPayloadSchema>;

export const informedConsentPayloadSchema = z.object({
  intervention: z.string().trim().min(1).max(500),
  toothOrArea: z.string().trim().min(1).max(240),
  diagnosisOrIndication: z.string().trim().min(1).max(500),
  expectedBenefit: z.string().trim().min(1).max(500),
  plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
  materialOrMedicationNotes: z.string().trim().max(500).nullable().optional(),
  trustedContactForMedicalInfo: z.string().trim().max(240).nullable().optional(),
  explainedRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  alternatives: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  aftercareRequirements: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  doctorFullName: z.string().trim().min(1).max(240),
  consentConfirmedAt: documentDateLikeStringSchema,
  patientQuestionsAnswered: z.literal(true),
  patientUnderstandsRisks: z.literal(true),
  patientMayWithdrawBeforeIntervention: z.literal(true)
});
export type InformedConsentPayload = z.infer<typeof informedConsentPayloadSchema>;

export const procedureSpecificConsentProcedureSchema = z.enum([
  "local_anesthesia",
  "therapy_endo_restoration",
  "surgery_extraction",
  "implantation_bone_graft",
  "prosthetics",
  "orthodontics",
  "hygiene_whitening",
  "periodontology",
  "other"
]);
export type ProcedureSpecificConsentProcedure = z.infer<typeof procedureSpecificConsentProcedureSchema>;

export const procedureSpecificConsentPayloadSchema = z.object({
  procedureType: procedureSpecificConsentProcedureSchema,
  procedureName: z.string().trim().min(1).max(500),
  toothOrArea: z.string().trim().min(1).max(240),
  diagnosisOrIndication: z.string().trim().min(1).max(500),
  clinicalToothRows: clinicalToothRowsSchema,
  plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
  materialsAndSystems: z.string().trim().max(700).nullable().optional(),
  patientSpecificRiskFactors: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  procedureSpecificRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
  alternatives: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  aftercareAndLimits: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  doctorFullName: z.string().trim().min(1).max(240),
  consentConfirmedAt: documentDateLikeStringSchema,
  localClinicFormAttached: z.boolean(),
  patientQuestionsAnswered: z.literal(true),
  exactProcedureConfirmed: z.literal(true),
  patientUnderstandsSpecificRisks: z.literal(true)
});
export type ProcedureSpecificConsentPayload = z.infer<typeof procedureSpecificConsentPayloadSchema>;

export const personalDataProcessingConsentPayloadSchema = z.object({
  operatorLegalName: z.string().trim().min(1).max(240),
  operatorInn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/),
  operatorAddress: z.string().trim().min(1).max(500),
  processingPurposes: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  personalDataCategories: z.array(z.string().trim().min(1).max(240)).min(1).max(20),
  processingActions: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
  thirdPartyTransferRules: z.string().trim().min(1).max(700),
  crossBorderTransferAllowed: z.boolean(),
  automatedDecisionMakingAllowed: z.boolean(),
  retentionPeriod: z.string().trim().min(1).max(300),
  revocationChannel: z.string().trim().min(1).max(500),
  consentGivenAt: documentDateLikeStringSchema,
  patientConfirmedVoluntaryConsent: z.literal(true),
  medicalDataProcessingAcknowledged: z.literal(true)
});
export type PersonalDataProcessingConsentPayload = z.infer<typeof personalDataProcessingConsentPayloadSchema>;

export const medicalInterventionRefusalPayloadSchema = z.object({
  refusedIntervention: z.string().trim().min(1).max(500),
  clinicalIndication: z.string().trim().min(1).max(500),
  patientReason: z.string().trim().max(500).nullable().optional(),
  explainedRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  alternativesOffered: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  urgentWarningSigns: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  doctorFullName: z.string().trim().min(1).max(240),
  refusalConfirmedAt: documentDateLikeStringSchema,
  patientUnderstandsConsequences: z.literal(true),
  secondOpinionOffered: z.literal(true),
  emergencyCareExplained: z.literal(true)
});
export type MedicalInterventionRefusalPayload = z.infer<typeof medicalInterventionRefusalPayloadSchema>;

export const documentPayloadSchema = z
  .object({
    patientIntakeQuestionnaire: patientIntakeQuestionnairePayloadSchema.optional(),
    paidMedicalServicesContract: paidMedicalServicesContractPayloadSchema.optional(),
    completedWorksAct: completedWorksActPayloadSchema.optional(),
    treatmentCostEstimate: treatmentCostEstimatePayloadSchema.optional(),
    paymentInvoice: paymentInvoicePayloadSchema.optional(),
    paymentReceipt: paymentReceiptPayloadSchema.optional(),
    installmentPaymentSchedule: installmentPaymentSchedulePayloadSchema.optional(),
    minorLegalRepresentativeConsent: minorLegalRepresentativeConsentPayloadSchema.optional(),
    warrantyServiceMemo: warrantyServiceMemoPayloadSchema.optional(),
    taxDeductionApplication: taxDeductionApplicationPayloadSchema.optional(),
    taxPaymentSelection: taxPaymentSelectionPayloadSchema.optional(),
    anesthesiaConsentLog: anesthesiaConsentPayloadSchema.optional(),
    prescriptionMedicationOrder: prescriptionMedicationPayloadSchema.optional(),
    labWorkOrder: labWorkOrderPayloadSchema.optional(),
    photoVideoConsent: photoVideoConsentPayloadSchema.optional(),
    xrayCbctReferral: xrayCbctReferralPayloadSchema.optional(),
    medicalDocumentReleaseReceipt: medicalDocumentReleaseReceiptPayloadSchema.optional(),
    outpatientMedicalCard025u: outpatientMedicalCard025uPayloadSchema.optional(),
    medicalRecordExtract: medicalRecordExtractPayloadSchema.optional(),
    medicalRecordCopyRequest: medicalRecordCopyRequestPayloadSchema.optional(),
    postVisitRecommendations: postVisitRecommendationsPayloadSchema.optional(),
    treatmentPlan: treatmentPlanPayloadSchema.optional(),
    treatmentPlanAcceptance: treatmentPlanAcceptancePayloadSchema.optional(),
    visitAttendanceCertificate: visitAttendanceCertificatePayloadSchema.optional(),
    paymentRefundCorrection: paymentRefundCorrectionPayloadSchema.optional(),
    informedConsent: informedConsentPayloadSchema.optional(),
    procedureSpecificConsent: procedureSpecificConsentPayloadSchema.optional(),
    personalDataProcessingConsent: personalDataProcessingConsentPayloadSchema.optional(),
    medicalInterventionRefusal: medicalInterventionRefusalPayloadSchema.optional()
  })
  .strict();
export type DocumentPayload = z.infer<typeof documentPayloadSchema>;
export type DocumentPayloadKey = keyof DocumentPayload;

export const taxPaymentSnapshotSchema = z.object({
  createdAt: z.string(),
  taxYear: z.number().int().min(legacyTaxDeductionCertificateMinYear).max(2100),
  taxPayerInn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/)
    .nullable(),
  paymentIds: z.array(z.string().uuid()).min(1).max(200),
  fiscalReceiptKeys: z.array(z.string().trim().min(1).max(160)).min(1).max(200),
  payments: z.array(paymentSchema).min(1).max(200)
});
export type TaxPaymentSnapshot = z.infer<typeof taxPaymentSnapshotSchema>;

export const documentPayloadKeysByKind: Partial<Record<DocumentKind, readonly DocumentPayloadKey[]>> = {
  patient_intake_questionnaire: ["patientIntakeQuestionnaire"],
  paid_medical_services_contract: ["paidMedicalServicesContract"],
  completed_works_act: ["completedWorksAct"],
  treatment_cost_estimate: ["treatmentCostEstimate"],
  payment_invoice: ["paymentInvoice"],
  payment_receipt: ["paymentReceipt"],
  installment_payment_schedule: ["installmentPaymentSchedule"],
  minor_legal_representative_consent: ["minorLegalRepresentativeConsent"],
  warranty_service_memo: ["warrantyServiceMemo"],
  tax_deduction_application: ["taxDeductionApplication"],
  tax_deduction_certificate: ["taxPaymentSelection"],
  legacy_tax_deduction_certificate: ["taxPaymentSelection"],
  tax_deduction_registry: ["taxPaymentSelection"],
  anesthesia_consent_log: ["anesthesiaConsentLog"],
  prescription_medication_order: ["prescriptionMedicationOrder"],
  lab_work_order: ["labWorkOrder"],
  photo_video_consent: ["photoVideoConsent"],
  xray_cbct_referral: ["xrayCbctReferral"],
  medical_document_release_receipt: ["medicalDocumentReleaseReceipt"],
  outpatient_medical_card_025u: ["outpatientMedicalCard025u"],
  medical_record_extract: ["medicalRecordExtract"],
  medical_record_copy_request: ["medicalRecordCopyRequest"],
  post_visit_recommendations: ["postVisitRecommendations"],
  treatment_plan: ["treatmentPlan"],
  treatment_plan_acceptance: ["treatmentPlanAcceptance"],
  visit_attendance_certificate: ["visitAttendanceCertificate"],
  payment_refund_correction_request: ["paymentRefundCorrection"],
  informed_consent: ["informedConsent"],
  procedure_specific_consent_packet: ["procedureSpecificConsent"],
  personal_data_processing_consent: ["personalDataProcessingConsent"],
  medical_intervention_refusal: ["medicalInterventionRefusal"]
};

export function documentPayloadAllowedKeys(kind: DocumentKind): readonly DocumentPayloadKey[] {
  return documentPayloadKeysByKind[kind] ?? [];
}

export function documentPayloadActualKeys(payload: DocumentPayload | null | undefined): DocumentPayloadKey[] {
  if (!payload) return [];
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key as DocumentPayloadKey);
}

export function documentPayloadDisallowedKeys(kind: DocumentKind, payload: DocumentPayload | null | undefined): DocumentPayloadKey[] {
  const allowed = documentPayloadAllowedKeys(kind);
  return documentPayloadActualKeys(payload).filter((key) => !allowed.includes(key));
}

export const documentIssueSignatureModeSchema = z.enum([
  "paper_signed",
  "simple_electronic_signature",
  "qualified_electronic_signature"
]);
export type DocumentIssueSignatureMode = z.infer<typeof documentIssueSignatureModeSchema>;

export const documentIssueSignatureAttestationSchema = z
  .object({
    mode: documentIssueSignatureModeSchema,
    signedAt: documentDateLikeStringSchema,
    recipientFullName: z.string().trim().min(1).max(240),
    recipientRole: z.string().trim().min(1).max(120),
    staffFullName: z.string().trim().min(1).max(240),
    staffRole: z.string().trim().min(1).max(120),
    identityChecked: z.literal(true),
    documentOpenedAndChecked: z.literal(true),
    recipientSigned: z.literal(true),
    clinicRepresentativeSigned: z.literal(true),
    note: z.string().trim().max(500).nullable().optional()
  })
  .strict();
export type DocumentIssueSignatureAttestation = z.infer<typeof documentIssueSignatureAttestationSchema>;

export const issueDocumentSchema = z
  .object({
    signatureAttestation: documentIssueSignatureAttestationSchema
  })
  .strict();
export type IssueDocumentInput = z.infer<typeof issueDocumentSchema>;

export const documentVoidReasonCodeSchema = z.enum([
  "draft_error",
  "issued_in_error",
  "patient_request",
  "duplicate_document",
  "tax_certificate_correction",
  "medical_release_correction",
  "payment_correction",
  "other"
]);
export type DocumentVoidReasonCode = z.infer<typeof documentVoidReasonCodeSchema>;

export const documentVoidAttestationSchema = z
  .object({
    reasonCode: documentVoidReasonCodeSchema,
    reasonText: z.string().trim().min(12).max(700),
    voidedAt: documentDateLikeStringSchema,
    staffFullName: z.string().trim().min(1).max(240),
    staffRole: z.string().trim().min(1).max(120),
    correctionDocumentId: z.string().uuid().nullable().optional(),
    replacementRequired: z.boolean().default(false),
    patientOrPayerNotified: z.boolean().default(false),
    archivePreserved: z.literal(true),
    statusReviewed: z.literal(true)
  })
  .strict();
export type DocumentVoidAttestation = z.infer<typeof documentVoidAttestationSchema>;

export const voidDocumentSchema = z
  .object({
    voidAttestation: documentVoidAttestationSchema
  })
  .strict();
export type VoidDocumentInput = z.infer<typeof voidDocumentSchema>;

export const documentReleaseJournalEntryKindSchema = z.enum([
  "request_registered",
  "extract_issued",
  "release_completed"
]);
export type DocumentReleaseJournalEntryKind = z.infer<typeof documentReleaseJournalEntryKindSchema>;

export const documentReleaseMaterialKindSchema = z.enum(["original", "copy", "extract", "dicom_archive", "mixed", "other"]);
export type DocumentReleaseMaterialKind = z.infer<typeof documentReleaseMaterialKindSchema>;

export const documentReleaseJournalEntrySchema = z
  .object({
    id: z.string().uuid(),
    entryKind: documentReleaseJournalEntryKindSchema,
    documentId: z.string().uuid(),
    sourceRequestDocumentId: z.string().uuid().nullable(),
    organizationId: z.string().uuid(),
    patientId: z.string().uuid(),
    visitId: z.string().uuid().nullable(),
    materialKind: documentReleaseMaterialKindSchema,
    deliveryMethod: medicalRecordCopyRequestFormatSchema,
    documentTypes: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
    periodStart: z.string().trim().max(40).nullable(),
    periodEnd: z.string().trim().max(40).nullable(),
    recipientFullName: z.string().trim().min(1).max(240),
    recipientIdentityDocument: z.string().trim().max(240).nullable(),
    recipientAuthority: z.string().trim().min(1).max(300),
    deliveredAt: documentDateLikeStringSchema,
    retentionPolicy: z.string().trim().min(1).max(500),
    sourceSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    createdAt: z.string(),
    createdByUserId: z.string().uuid().nullable()
  })
  .strict();
export type DocumentReleaseJournalEntry = z.infer<typeof documentReleaseJournalEntrySchema>;

export const taxXmlSourceSnapshotSchema = z
  .object({
    createdAt: z.string(),
    patient: patientSchema,
    clinicProfile: clinicProfileSchema,
    payments: z.array(paymentSchema)
  })
  .strict();
export type TaxXmlSourceSnapshot = z.infer<typeof taxXmlSourceSnapshotSchema>;

export const taxXmlSnapshotSchema = z
  .object({
    fileName: z.string().trim().min(1).max(180),
    xml: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string(),
    taxOfficeCode: z.string().regex(/^\d{4}$/),
    sourceSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/)
  })
  .strict();
export type TaxXmlSnapshot = z.infer<typeof taxXmlSnapshotSchema>;

export const generatedDocumentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  kind: documentKindSchema,
  title: z.string(),
  status: z.enum(["draft", "issued", "voided"]),
  issuedAt: z.string().nullable(),
  totalAmountRub: z.number().nonnegative().nullable(),
  taxYear: z.number().int().min(legacyTaxDeductionCertificateMinYear).max(2100).nullable().optional(),
  taxPayerInn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/)
    .nullable()
    .optional(),
  taxPaymentSnapshot: taxPaymentSnapshotSchema.nullable().optional(),
  payload: documentPayloadSchema.nullable().optional(),
  signatureAttestation: documentIssueSignatureAttestationSchema.nullable().optional(),
  voidAttestation: documentVoidAttestationSchema.nullable().optional(),
  releaseJournalEntry: documentReleaseJournalEntrySchema.nullable().optional(),
  taxXmlSourceSnapshot: taxXmlSourceSnapshotSchema.nullable().optional(),
  taxXmlSnapshot: taxXmlSnapshotSchema.nullable().optional(),
  storagePath: z.string().nullable().optional(),
  issuedSnapshotSha256: z.string().nullable().optional(),
  issuedSnapshotCreatedAt: z.string().nullable().optional(),
  issuedByUserId: z.string().uuid().nullable().optional(),
  voidedAt: z.string().nullable().optional(),
  voidedByUserId: z.string().uuid().nullable().optional()
});
export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;
export const documentChainSummarySchema = z
  .object({
    paidMedicalServicesContract: z
      .object({
        contractNumber: z.string().trim().min(1).max(120),
        contractDate: documentDateLikeStringSchema
      })
      .optional(),
    medicalRecordCopyRequest: z
      .object({
        requestedDocumentTypes: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
        periodStart: z.string().trim().max(40).nullable().optional(),
        periodEnd: z.string().trim().max(40).nullable().optional(),
        requestedFormat: medicalRecordCopyRequestFormatSchema,
        recipientFullName: z.string().trim().min(1).max(240),
        recipientIdentityDocument: z.string().trim().min(1).max(240),
        recipientAuthority: z.string().trim().min(1).max(300),
        representativeAuthorityDocument: z.string().trim().max(300).nullable().optional()
      })
      .optional()
  })
  .strict();
export type DocumentChainSummary = z.infer<typeof documentChainSummarySchema>;
export const publicGeneratedDocumentSchema = generatedDocumentSchema
  .omit({ storagePath: true, payload: true, taxPaymentSnapshot: true, taxXmlSourceSnapshot: true, taxXmlSnapshot: true })
  .extend({ chainSummary: documentChainSummarySchema.nullable().optional() });
export type PublicGeneratedDocument = z.infer<typeof publicGeneratedDocumentSchema>;

export const documentAuditFactsSchema = z.object({
  documentId: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  kind: documentKindSchema,
  title: z.string(),
  status: z.enum(["draft", "issued", "voided"]),
  issuedAt: z.string().nullable(),
  issuedByUserId: z.string().uuid().nullable(),
  signatureAttestation: documentIssueSignatureAttestationSchema.nullable(),
  voidAttestation: documentVoidAttestationSchema.nullable(),
  releaseJournalEntry: documentReleaseJournalEntrySchema.nullable(),
  generatedAt: z.string(),
  snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  snapshotCreatedAt: z.string().nullable(),
  immutableSnapshotReady: z.boolean(),
  canPreviewHtml: z.boolean(),
  canDownloadHtml: z.boolean(),
  canExportPdf: z.boolean(),
  canExportFnsXml: z.boolean(),
  htmlPreviewUrl: z.string(),
  htmlDownloadUrl: z.string().nullable(),
  pdfDownloadUrl: z.string().nullable(),
  taxXmlDownloadUrl: z.string().nullable(),
  taxXmlSourceSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  taxXmlSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  taxXmlSnapshotCreatedAt: z.string().nullable(),
  taxXmlOfficialValidationStatus: z.enum(["not_applicable", "external_validation_required"]),
  taxXmlOfficialValidationNote: z.string().nullable(),
  sourceStatus: documentSourceStatusSchema,
  sourceAuthority: z.string(),
  sourceReference: z.string(),
  sourceNote: z.string(),
  sourceCheckedAt: z.string(),
  sourceUrls: z.array(z.string().url()),
  blockers: z.array(z.string()),
  warnings: z.array(z.string())
});
export type DocumentAuditFacts = z.infer<typeof documentAuditFactsSchema>;

export const imagingStudySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  kind: imagingStudyKindSchema,
  title: z.string(),
  toothCode: z.string().nullable(),
  region: z.string().nullable(),
  capturedAt: z.string(),
  sourceKind: imagingSourceKindSchema,
  sourceName: z.string(),
  storagePath: z.string().nullable().optional(),
  dicomStudyUid: z.string().nullable().optional(),
  status: z.enum(["available", "needs_review", "failed"]),
  aiSummary: z.string().nullable(),
  previewUrl: z.string(),
  viewerUrl: z.string().nullable()
});
export type ImagingStudy = z.infer<typeof imagingStudySchema>;

export const importBatchSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  sourceName: z.string(),
  status: z.enum(["previewed", "completed", "completed_with_skips", "failed"]),
  totalRows: z.number().int().nonnegative(),
  importedRows: z.number().int().nonnegative(),
  skippedRows: z.number().int().nonnegative(),
  warningRows: z.number().int().nonnegative(),
  blockedRows: z.number().int().nonnegative(),
  createdAt: z.string()
});
export type ImportBatch = z.infer<typeof importBatchSchema>;

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string()
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const dashboardSchema = z.object({
  clinicName: z.string(),
  todayIso: z.string(),
  clinicSettings: clinicSettingsSchema,
  shiftIntelligence: shiftIntelligenceSchema,
  patients: z.array(patientSchema),
  patientInsights: z.array(patientInsightSchema),
  recommendedActions: z.array(recommendedActionSchema),
  appointments: z.array(appointmentSchema),
  appointmentReadiness: z.array(appointmentReadinessSchema),
  scheduleSuggestions: z.array(scheduleSuggestionSchema),
  activeVisit: visitSchema,
  visitCloseChecklist: visitCloseChecklistSchema,
  documents: z.array(publicGeneratedDocumentSchema),
  imagingStudies: z.array(imagingStudySchema),
  protocolTemplates: z.array(protocolTemplateSchema),
  serviceCatalog: z.array(serviceCatalogItemSchema),
  treatmentPlanItems: z.array(treatmentPlanItemSchema),
  treatmentPlanScenarios: z.array(treatmentPlanScenarioSchema),
  clinicalRules: z.array(clinicalRuleSchema),
  clinicalRuleEvaluations: z.array(clinicalRuleEvaluationSchema),
  clinicalRuleSummary: clinicalRuleSummarySchema,
  payments: z.array(paymentSchema),
  billingSummary: billingSummarySchema,
  communicationTemplates: z.array(communicationTemplateSchema),
  communicationTasks: z.array(communicationTaskSchema),
  communicationEvents: z.array(communicationEventSchema),
  communicationSummary: communicationSummarySchema,
  importBatches: z.array(importBatchSchema),
  speechProviders: z.array(speechProviderSchema),
  auditEvents: z.array(auditEventSchema),
  complianceWarnings: z.array(z.string())
});
export type Dashboard = z.infer<typeof dashboardSchema>;

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(1).max(240),
  birthDate: birthDateInputSchema,
  phone: patientPhoneInputSchema,
  email: z.string().trim().email().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  administrativeProfile: patientAdministrativeProfileSchema.nullable().optional()
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = z.object({
  fullName: z.string().trim().min(1).max(240).optional(),
  birthDate: birthDateInputSchema,
  phone: patientPhoneInputSchema,
  email: z.string().trim().email().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional()
});
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const updatePatientAdministrativeProfileSchema = patientAdministrativeProfileBaseSchema.partial().superRefine((value, context) => {
  if ((value.preferredAppointmentStart && !value.preferredAppointmentEnd) || (!value.preferredAppointmentStart && value.preferredAppointmentEnd)) {
    context.addIssue({
      code: "custom",
      path: value.preferredAppointmentStart ? ["preferredAppointmentEnd"] : ["preferredAppointmentStart"],
      message: "Начало и конец удобного времени приема нужно указывать вместе"
    });
  }
  if (
    value.preferredAppointmentStart &&
    value.preferredAppointmentEnd &&
    clockTimeToMinutes(value.preferredAppointmentEnd) <= clockTimeToMinutes(value.preferredAppointmentStart)
  ) {
    context.addIssue({
      code: "custom",
      path: ["preferredAppointmentEnd"],
      message: "Конец удобного времени приема должен быть позже начала"
    });
  }
});
export type UpdatePatientAdministrativeProfileInput = z.infer<typeof updatePatientAdministrativeProfileSchema>;

export const updateClinicModeSchema = z.object({
  mode: clinicModeSchema
});
export type UpdateClinicModeInput = z.infer<typeof updateClinicModeSchema>;

export const updateClinicProfileSchema = z.object({
  clinicName: z.string().trim().min(1).max(240).optional(),
  legalName: z.string().trim().max(240).nullable().optional(),
  inn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/)
    .nullable()
    .optional(),
  kpp: z
    .string()
    .trim()
    .regex(/^\d{9}$/)
    .nullable()
    .optional(),
  ogrn: z
    .string()
    .trim()
    .regex(/^\d{13}$|^\d{15}$/)
    .nullable()
    .optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().email().max(240).nullable().optional(),
  website: z.string().trim().max(300).nullable().optional(),
  medicalLicenseNumber: z.string().trim().max(160).nullable().optional(),
  medicalLicenseIssuedAt: nullableDocumentDateLikeStringSchema,
  medicalLicenseIssuer: z.string().trim().max(400).nullable().optional(),
  bankDetails: z.string().trim().max(1000).nullable().optional(),
  signatoryName: z.string().trim().max(240).nullable().optional(),
  signatoryTitle: z.string().trim().max(180).nullable().optional(),
  timezone: timeZoneSchema.optional(),
  defaultVisitMinutes: z.number().int().positive().max(480).optional(),
  scheduleDefaults: clinicScheduleDefaultsSchema.optional(),
  egiszEnabled: z.boolean().optional()
});
export type UpdateClinicProfileInput = z.infer<typeof updateClinicProfileSchema>;

export const createStaffMemberSchema = z.object({
  fullName: z.string().trim().min(1).max(240),
  role: staffRoleSchema,
  specialties: z.array(dentalSpecialtySchema).min(1).default(["universal"]),
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().email().max(240).nullable().optional(),
  workingHours: staffWorkingHoursSchema.nullable().optional()
});
export type CreateStaffMemberInput = z.infer<typeof createStaffMemberSchema>;

export const updateStaffWorkingHoursSchema = z.object({
  workingHours: staffWorkingHoursSchema
});
export type UpdateStaffWorkingHoursInput = z.infer<typeof updateStaffWorkingHoursSchema>;

export const updateChairWorkingHoursSchema = z.object({
  workingHours: staffWorkingHoursSchema
});
export type UpdateChairWorkingHoursInput = z.infer<typeof updateChairWorkingHoursSchema>;

export const createChairSchema = z.object({
  name: z.string().trim().min(1).max(120),
  room: z.string().trim().max(120).nullable().optional(),
  specialization: dentalSpecialtySchema.nullable().optional(),
  hasXraySensor: z.boolean().default(false),
  hasMicroscope: z.boolean().default(false),
  hasSurgeryKit: z.boolean().default(false),
  notes: z.string().trim().max(500).nullable().optional(),
  workingHours: staffWorkingHoursSchema.nullable().optional()
});
export type CreateChairInput = z.infer<typeof createChairSchema>;

export const createDocumentSchema = z
  .object({
    patientId: z.string().uuid(),
    visitId: z.string().uuid().nullable().optional(),
    kind: documentKindSchema,
    title: z.string().trim().min(1).max(240).optional(),
    totalAmountRub: z.number().int().nonnegative().nullable().optional(),
    taxYear: z.number().int().min(legacyTaxDeductionCertificateMinYear).max(2100).nullable().optional(),
    taxPayerInn: z
      .string()
      .trim()
      .regex(/^\d{10}$|^\d{12}$/)
      .nullable()
      .optional(),
    payload: documentPayloadSchema.nullable().optional()
  })
  .superRefine((input, context) => {
    const disallowedKeys = documentPayloadDisallowedKeys(input.kind, input.payload);
    if (disallowedKeys.length === 0) return;
    const documentLabel = documentKindMetadata[input.kind]?.label ?? input.kind;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload"],
      message: `Структурированные данные не соответствуют документу "${documentLabel}": ${disallowedKeys.join(", ")}`
    });
  });
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const createPaymentSchema = z
  .object({
    patientId: z.string().uuid(),
    visitId: z.string().uuid().nullable().optional(),
    documentId: z.string().uuid().nullable().optional(),
    amountRub: z.number().int().positive(),
    method: paymentMethodSchema.default("card"),
    fiscalReceiptNumber: z.string().trim().max(120).nullable().optional(),
    fiscalReceiptIssuedAt: strictFiscalReceiptIssuedAtSchema.nullable().optional(),
    fiscalReceiptUrl: fiscalReceiptUrlSchema.nullable().optional(),
    fiscalReceipt: fiscalReceiptDetailsSchema.nullable().optional(),
    clientMutationId: z.string().trim().min(1).max(120).nullable().optional(),
    payerFullName: z.string().trim().max(240).nullable().optional(),
    payerInn: z.string().trim().regex(/^\d{10}$|^\d{12}$/).nullable().optional(),
    payerBirthDate: birthDateInputSchema,
    payerIdentityDocument: z.string().trim().max(240).nullable().optional(),
    payerRelationship: z.string().trim().max(120).nullable().optional(),
    taxDeductionCode: z.enum(["1", "2"]).nullable().optional(),
    note: z.string().nullable().optional()
  })
  .superRefine((input, context) => {
    const fiscalReceiptIssuedAt = input.fiscalReceiptIssuedAt?.trim();
    if (fiscalReceiptIssuedAt && !isDateLikeString(fiscalReceiptIssuedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fiscalReceiptIssuedAt"],
        message: "Дата фискального чека должна быть реальной календарной датой."
      });
    }
    if (input.fiscalReceipt?.operationType === "income_return") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fiscalReceipt", "operationType"],
        message: "Возвратный фискальный чек нельзя записывать как новую оплату."
      });
    }
    const fiscalReceiptUrl = input.fiscalReceiptUrl?.trim();
    const structuredReceiptUrl = input.fiscalReceipt?.receiptUrl?.trim();
    if (fiscalReceiptUrl && structuredReceiptUrl && fiscalReceiptUrl !== structuredReceiptUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fiscalReceipt", "receiptUrl"],
        message: "Ссылка ОФД в реквизитах чека должна совпадать с основной ссылкой ОФД."
      });
    }
    if (!input.taxDeductionCode) return;
    const requiredTaxFields: Array<[keyof typeof input, string]> = [
      ["fiscalReceiptIssuedAt", "дата фискального чека"],
      ["payerFullName", "ФИО плательщика"],
      ["payerBirthDate", "дата рождения плательщика"],
      ["payerIdentityDocument", "документ плательщика"],
      ["payerRelationship", "родство плательщика с пациентом"]
    ];
    for (const [field, label] of requiredTaxFields) {
      const value = input[field];
      if (typeof value === "string" && value.trim()) continue;
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `Для налоговой оплаты нужен явный ввод: ${label}.`
      });
    }
    const fiscalReceipt = input.fiscalReceipt;
    const requiredFiscalReceiptFields: Array<[keyof NonNullable<typeof fiscalReceipt>, string]> = [
      ["fn", "ФН"],
      ["fd", "ФД"],
      ["fpd", "ФПД"]
    ];
    for (const [field, label] of requiredFiscalReceiptFields) {
      const value = fiscalReceipt?.[field];
      if (typeof value === "string" && value.trim()) continue;
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fiscalReceipt", field],
        message: `Для налоговой оплаты укажите реквизит фискального чека: ${label}.`
      });
    }
  });
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const completeCommunicationTaskSchema = z.object({
  taskId: z.string().uuid(),
  outcome: communicationTaskOutcomeSchema.optional(),
  note: z.string().trim().min(1).max(1000).optional()
});
export type CompleteCommunicationTaskInput = z.infer<typeof completeCommunicationTaskSchema>;

export const createImagingStudySchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable().optional(),
  kind: imagingStudyKindSchema,
  title: z.string().trim().min(1).max(180),
  toothCode: z.string().trim().min(1).max(24).nullable().optional(),
  region: z.string().trim().min(1).max(120).nullable().optional(),
  sourceKind: imagingSourceKindSchema.default("manual_upload"),
  sourceName: z.string().trim().min(1).max(160).default("manual"),
  storagePath: z.string().trim().min(1).max(2048).nullable().optional(),
  dicomStudyUid: z.string().trim().min(1).max(128).nullable().optional(),
  capturedAt: z.string().optional(),
  aiSummary: z.string().trim().max(2000).nullable().optional()
});
export type CreateImagingStudyInput = z.infer<typeof createImagingStudySchema>;

export const imagingImportPreviewRequestSchema = z.object({
  sourceName: z.string().trim().min(1).max(160).default("imaging_manifest"),
  sourceKind: imagingSourceKindSchema.default("folder_watch"),
  rawText: z.string().trim().min(1).max(120000)
});
export type ImagingImportPreviewRequest = z.infer<typeof imagingImportPreviewRequestSchema>;

export const imagingImportPreviewRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  patientId: z.string().uuid().nullable(),
  patientName: z.string().nullable(),
  phone: z.string().nullable(),
  kind: imagingStudyKindSchema.nullable(),
  title: z.string().nullable(),
  toothCode: z.string().nullable(),
  region: z.string().nullable(),
  capturedAt: z.string().nullable(),
  filePath: z.string().nullable(),
  sourceKind: imagingSourceKindSchema,
  sourceName: z.string(),
  status: z.enum(["ready", "warning", "blocked"]),
  warnings: z.array(z.string())
});
export type ImagingImportPreviewRow = z.infer<typeof imagingImportPreviewRowSchema>;

export const imagingImportPreviewResponseSchema = z.object({
  sourceName: z.string(),
  sourceKind: imagingSourceKindSchema,
  totalRows: z.number().int().nonnegative(),
  readyRows: z.number().int().nonnegative(),
  warningRows: z.number().int().nonnegative(),
  blockedRows: z.number().int().nonnegative(),
  rows: z.array(imagingImportPreviewRowSchema),
  parserNotes: z.array(z.string())
});
export type ImagingImportPreviewResponse = z.infer<typeof imagingImportPreviewResponseSchema>;

export const imagingImportCommitResponseSchema = z.object({
  sourceName: z.string(),
  sourceKind: imagingSourceKindSchema,
  importedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  createdStudyIds: z.array(z.string().uuid()),
  preview: imagingImportPreviewResponseSchema
});
export type ImagingImportCommitResponse = z.infer<typeof imagingImportCommitResponseSchema>;

export const imagingFolderScanRequestSchema = z.object({
  folderPath: z.string().min(1),
  recursive: z.boolean().default(true),
  sourceName: z.string().min(1).default("folder_scan"),
  maxFiles: z.number().int().positive().max(5000).default(500),
  maxFolders: z.number().int().positive().max(3000).default(900),
  maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000)
});
export type ImagingFolderScanRequest = z.infer<typeof imagingFolderScanRequestSchema>;

export const imagingFolderScanResponseSchema = z.object({
  folderPath: z.string(),
  recursive: z.boolean(),
  filesFound: z.number().int().nonnegative(),
  filesReturned: z.number().int().nonnegative(),
  rawText: z.string(),
  preview: imagingImportPreviewResponseSchema,
  warnings: z.array(z.string())
});
export type ImagingFolderScanResponse = z.infer<typeof imagingFolderScanResponseSchema>;

export const dicomSeriesViewerSchema = z.enum(["none", "two_d_stack", "cbct_mpr", "external_dicom"]);
export type DicomSeriesViewer = z.infer<typeof dicomSeriesViewerSchema>;

export const dicomMprProjectionSchema = z.enum([
  "axial",
  "coronal",
  "sagittal",
  "oblique",
  "panoramic_reconstruction",
  "three_d_volume",
  "mip"
]);
export type DicomMprProjection = z.infer<typeof dicomMprProjectionSchema>;

export const dicomMprToolSchema = z.enum([
  "window_level",
  "pan",
  "zoom",
  "slice_scroll",
  "crosshair",
  "rotate_axes",
  "oblique_planes",
  "mpr_3up",
  "panoramic_curve",
  "measurement",
  "measure_distance",
  "measure_angle",
  "area_roi",
  "volume_roi",
  "implant_axis",
  "implant_library",
  "nerve_canal",
  "bone_density_probe",
  "surgical_guide",
  "reset",
  "export_snapshot",
  "external_open"
]);
export type DicomMprTool = z.infer<typeof dicomMprToolSchema>;

export const dicomMprResourceTierSchema = z.enum(["low_end", "standard", "workstation", "diagnostic_workstation"]);
export type DicomMprResourceTier = z.infer<typeof dicomMprResourceTierSchema>;

export const dicomMprLoadStrategySchema = z.enum([
  "metadata_only",
  "two_d_stack_stream",
  "mpr_downsampled",
  "mpr_full",
  "external_handoff"
]);
export type DicomMprLoadStrategy = z.infer<typeof dicomMprLoadStrategySchema>;

export const dicomMprCacheModeSchema = z.enum(["none", "metadata_only", "bounded_disk", "dicomweb_stream"]);
export type DicomMprCacheMode = z.infer<typeof dicomMprCacheModeSchema>;

export const dicomMprResourcePolicySchema = z.object({
  requiredTier: dicomMprResourceTierSchema,
  loadStrategy: dicomMprLoadStrategySchema,
  estimatedMemoryMb: z.number().int().nonnegative(),
  maxClientSlices: z.number().int().positive(),
  thumbnailFirst: z.boolean(),
  downsampleRecommended: z.boolean(),
  cacheMode: dicomMprCacheModeSchema,
  safetyCaps: z.array(z.string()),
  nextAction: z.string()
});
export type DicomMprResourcePolicy = z.infer<typeof dicomMprResourcePolicySchema>;

export const dicomMprReadinessSchema = z.object({
  volumeCandidate: z.boolean(),
  canOpenMpr: z.boolean(),
  canBuildPanoramic: z.boolean(),
  recommendedLayout: z.enum(["none", "two_d_stack", "mpr_3up", "mpr_4up", "external_only"]),
  minSliceCount: z.number().int().positive(),
  projections: z.array(dicomMprProjectionSchema),
  tools: z.array(dicomMprToolSchema),
  resourcePolicy: dicomMprResourcePolicySchema,
  blockers: z.array(z.string()),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomMprReadiness = z.infer<typeof dicomMprReadinessSchema>;

export const dicomSeriesPreviewRequestSchema = z.object({
  sourceName: z.string().min(1).default("dicom_series_manifest"),
  sourceKind: imagingSourceKindSchema.default("dicom_file"),
  rawText: z.string().min(1)
});
export type DicomSeriesPreviewRequest = z.infer<typeof dicomSeriesPreviewRequestSchema>;

export const dicomSeriesPreviewRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  patientId: z.string().uuid().nullable(),
  patientName: z.string().nullable(),
  phone: z.string().nullable(),
  kind: imagingStudyKindSchema.nullable(),
  modality: z.string().nullable(),
  studyInstanceUid: z.string().nullable(),
  seriesInstanceUid: z.string().nullable(),
  sopInstanceUid: z.string().nullable(),
  studyDescription: z.string().nullable(),
  seriesDescription: z.string().nullable(),
  instanceNumber: z.number().int().nonnegative().nullable(),
  imageRows: z.number().int().positive().nullable(),
  imageColumns: z.number().int().positive().nullable(),
  bitsAllocated: z.number().int().positive().nullable(),
  samplesPerPixel: z.number().int().positive().nullable(),
  estimatedPixelBytes: z.number().int().nonnegative().nullable(),
  capturedAt: z.string().nullable(),
  filePath: z.string().nullable(),
  sourceKind: imagingSourceKindSchema,
  sourceName: z.string(),
  status: z.enum(["ready", "warning", "blocked"]),
  warnings: z.array(z.string())
});
export type DicomSeriesPreviewRow = z.infer<typeof dicomSeriesPreviewRowSchema>;

export const dicomSeriesPreviewGroupSchema = z.object({
  id: z.string(),
  patientId: z.string().uuid().nullable(),
  patientName: z.string().nullable(),
  kind: imagingStudyKindSchema.nullable(),
  modality: z.string().nullable(),
  studyInstanceUid: z.string().nullable(),
  seriesInstanceUid: z.string().nullable(),
  studyDescription: z.string().nullable(),
  seriesDescription: z.string().nullable(),
  capturedAt: z.string().nullable(),
  fileCount: z.number().int().nonnegative(),
  imageRows: z.number().int().positive().nullable(),
  imageColumns: z.number().int().positive().nullable(),
  bitsAllocated: z.number().int().positive().nullable(),
  samplesPerPixel: z.number().int().positive().nullable(),
  estimatedPixelBytes: z.number().int().nonnegative().nullable(),
  firstFilePath: z.string().nullable(),
  sourceKind: imagingSourceKindSchema,
  sourceName: z.string(),
  recommendedViewer: dicomSeriesViewerSchema,
  mprReadiness: dicomMprReadinessSchema,
  status: z.enum(["ready", "warning", "blocked"]),
  warnings: z.array(z.string())
});
export type DicomSeriesPreviewGroup = z.infer<typeof dicomSeriesPreviewGroupSchema>;

export const dicomSeriesPreviewResponseSchema = z.object({
  sourceName: z.string(),
  sourceKind: imagingSourceKindSchema,
  totalRows: z.number().int().nonnegative(),
  totalSeries: z.number().int().nonnegative(),
  readySeries: z.number().int().nonnegative(),
  warningSeries: z.number().int().nonnegative(),
  blockedSeries: z.number().int().nonnegative(),
  rows: z.array(dicomSeriesPreviewRowSchema),
  series: z.array(dicomSeriesPreviewGroupSchema),
  parserNotes: z.array(z.string())
});
export type DicomSeriesPreviewResponse = z.infer<typeof dicomSeriesPreviewResponseSchema>;

export const dicomFolderSeriesPreviewRequestSchema = z.object({
  folderPath: z.string().min(1),
  recursive: z.boolean().default(true),
  sourceName: z.string().min(1).default("dicom_folder_headers"),
  maxFiles: z.number().int().positive().max(5000).default(800),
  maxFolders: z.number().int().positive().max(3000).default(900),
  maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
  maxHeaderBytes: z.number().int().positive().max(1024 * 1024).default(256 * 1024)
});
export type DicomFolderSeriesPreviewRequest = z.infer<typeof dicomFolderSeriesPreviewRequestSchema>;

export const dicomFolderSeriesPreviewResponseSchema = z.object({
  folderPath: z.string(),
  recursive: z.boolean(),
  filesFound: z.number().int().nonnegative(),
  filesParsed: z.number().int().nonnegative(),
  metadataRows: z.number().int().nonnegative(),
  rawText: z.string(),
  preview: dicomSeriesPreviewResponseSchema,
  warnings: z.array(z.string())
});
export type DicomFolderSeriesPreviewResponse = z.infer<typeof dicomFolderSeriesPreviewResponseSchema>;

export const dicomFirstFramePreviewRequestSchema = z.object({
  folderPath: z.string().min(1),
  recursive: z.boolean().default(true),
  maxFiles: z.number().int().positive().max(500).default(80),
  maxFolders: z.number().int().positive().max(3000).default(900),
  maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
  maxFileBytes: z.number().int().positive().max(256 * 1024 * 1024).default(64 * 1024 * 1024),
  maxPreviewEdge: z.number().int().min(128).max(1024).default(512),
  preferredFileIndex: z.number().int().nonnegative().optional()
});
export type DicomFirstFramePreviewRequest = z.infer<typeof dicomFirstFramePreviewRequestSchema>;

export const dicomFirstFramePreviewStatusSchema = z.enum(["ready", "unsupported", "not_found"]);
export type DicomFirstFramePreviewStatus = z.infer<typeof dicomFirstFramePreviewStatusSchema>;

export const dicomFirstFramePreviewResponseSchema = z.object({
  version: z.literal("dental-crm-dicom-first-frame-preview-v1"),
  generatedAt: z.string(),
  folderPath: z.string(),
  status: dicomFirstFramePreviewStatusSchema,
  sourceFileName: z.string().nullable(),
  sourceFileIndex: z.number().int().nonnegative().nullable(),
  requestedFileIndex: z.number().int().nonnegative().nullable(),
  selectableFileCount: z.number().int().nonnegative(),
  transferSyntaxUid: z.string().nullable(),
  photometricInterpretation: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  sourceWidth: z.number().int().positive().nullable(),
  sourceHeight: z.number().int().positive().nullable(),
  bitsAllocated: z.number().int().positive().nullable(),
  bitsStored: z.number().int().positive().nullable(),
  pixelRepresentation: z.number().int().min(0).max(1).nullable(),
  windowCenter: z.number().nullable(),
  windowWidth: z.number().positive().nullable(),
  imageDataUrl: z.string().nullable(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomFirstFramePreviewResponse = z.infer<typeof dicomFirstFramePreviewResponseSchema>;

export const dicomLocalFolderDiscoveryRequestSchema = z.object({
  rootPaths: z.array(z.string().min(1)).max(12).optional(),
  maxDepth: z.number().int().min(0).max(8).default(5),
  maxFolders: z.number().int().positive().max(3000).default(900),
  maxFilesPerFolder: z.number().int().positive().max(500).default(120),
  minDicomFiles: z.number().int().positive().max(20).default(2),
  maxCandidates: z.number().int().positive().max(50).default(12)
});
export type DicomLocalFolderDiscoveryRequest = z.infer<typeof dicomLocalFolderDiscoveryRequestSchema>;

export const dicomLocalFolderDiscoveryCandidateSchema = z.object({
  folderPath: z.string(),
  displayName: z.string(),
  safeDisplayName: z.string(),
  sourceLabel: z.string(),
  sourceKind: z.string(),
  folderFingerprint: z.string(),
  depth: z.number().int().nonnegative(),
  dicomLikeFiles: z.number().int().nonnegative(),
  archivesFound: z.number().int().nonnegative(),
  imageFiles: z.number().int().nonnegative(),
  hasDicomDir: z.boolean(),
  latestModifiedAt: z.string().nullable(),
  firstFilePath: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  warnings: z.array(z.string())
});
export type DicomLocalFolderDiscoveryCandidate = z.infer<typeof dicomLocalFolderDiscoveryCandidateSchema>;

export const dicomLocalFolderDiscoveryResponseSchema = z.object({
  version: z.literal("dental-crm-dicom-local-discovery-v1"),
  generatedAt: z.string(),
  roots: z.array(z.string()),
  scannedFolders: z.number().int().nonnegative(),
  candidates: z.array(dicomLocalFolderDiscoveryCandidateSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomLocalFolderDiscoveryResponse = z.infer<typeof dicomLocalFolderDiscoveryResponseSchema>;

export const dentalModelFileFormatSchema = z.enum(["stl", "obj", "ply", "glb", "gltf", "3mf", "zip_archive", "unknown"]);
export type DentalModelFileFormat = z.infer<typeof dentalModelFileFormatSchema>;

export const dentalModelFileRoleSchema = z.enum([
  "upper_arch",
  "lower_arch",
  "skull_surface",
  "maxilla_surface",
  "mandible_surface",
  "ct_bone_surface",
  "bite",
  "crown",
  "bridge",
  "implant_guide",
  "surgical_guide",
  "aligner",
  "scan_body",
  "unknown"
]);
export type DentalModelFileRole = z.infer<typeof dentalModelFileRoleSchema>;

export const dentalModelFileCandidateSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  format: dentalModelFileFormatSchema,
  role: dentalModelFileRoleSchema,
  sizeBytes: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string())
});
export type DentalModelFileCandidate = z.infer<typeof dentalModelFileCandidateSchema>;

export const dentalModelWorkbenchLoadTargetSchema = z.enum(["metadata_only", "external_model_viewer", "local_bridge"]);
export type DentalModelWorkbenchLoadTarget = z.infer<typeof dentalModelWorkbenchLoadTargetSchema>;

export const dentalModelWorkbenchPairingHintSchema = z.enum(["same_folder_ct_series", "model_only_folder", "unknown"]);
export type DentalModelWorkbenchPairingHint = z.infer<typeof dentalModelWorkbenchPairingHintSchema>;

export const ctSurfaceModelSourceKindSchema = z.enum(["imported_surface_file", "external_local_bridge", "manual_contour", "unknown"]);
export type CtSurfaceModelSourceKind = z.infer<typeof ctSurfaceModelSourceKindSchema>;

export const ctSurfaceModelReadinessSchema = z.enum(["metadata_only", "pending_local_bridge", "ready_external", "blocked"]);
export type CtSurfaceModelReadiness = z.infer<typeof ctSurfaceModelReadinessSchema>;

export const ctSurfaceModelRegistrationStatusSchema = z.enum(["same_folder_inferred", "registered", "unregistered", "unknown"]);
export type CtSurfaceModelRegistrationStatus = z.infer<typeof ctSurfaceModelRegistrationStatusSchema>;

export const ctSurfaceModelSourceSeriesRefSchema = z.object({
  folderFingerprint: z.string(),
  pairingHint: dentalModelWorkbenchPairingHintSchema,
  studyInstanceUid: z.string().nullable(),
  seriesInstanceUid: z.string().nullable()
});
export type CtSurfaceModelSourceSeriesRef = z.infer<typeof ctSurfaceModelSourceSeriesRefSchema>;

export const ctSurfaceModelManifestSchema = z.object({
  role: dentalModelFileRoleSchema,
  format: dentalModelFileFormatSchema,
  sourceKind: ctSurfaceModelSourceKindSchema,
  sourceSeriesRef: ctSurfaceModelSourceSeriesRefSchema.nullable(),
  frameOfReferenceUid: z.string().nullable(),
  registrationStatus: ctSurfaceModelRegistrationStatusSchema,
  readiness: ctSurfaceModelReadinessSchema,
  loadTarget: dentalModelWorkbenchLoadTargetSchema,
  sizeMb: z.number().int().nonnegative(),
  checksum: z.string().nullable(),
  meshStats: z.object({
    vertices: z.number().int().nonnegative().nullable(),
    triangles: z.number().int().nonnegative().nullable(),
    decimation: z.string().nullable()
  }).nullable(),
  containsMeshGeometry: z.literal(false),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type CtSurfaceModelManifest = z.infer<typeof ctSurfaceModelManifestSchema>;

export const dentalModelWorkbenchItemSchema = z.object({
  fileName: z.string(),
  format: dentalModelFileFormatSchema,
  role: dentalModelFileRoleSchema,
  sizeBytes: z.number().int().nonnegative(),
  sizeMb: z.number().int().nonnegative(),
  loadTarget: dentalModelWorkbenchLoadTargetSchema,
  pairingHint: dentalModelWorkbenchPairingHintSchema,
  ctSurfaceManifest: ctSurfaceModelManifestSchema.nullable(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DentalModelWorkbenchItem = z.infer<typeof dentalModelWorkbenchItemSchema>;

export const dentalModelWorkbenchManifestSchema = z.object({
  version: z.literal("dental-crm-model-workbench-v1"),
  folderFingerprint: z.string(),
  totalModels: z.number().int().nonnegative(),
  ctSurfaceModels: z.number().int().nonnegative(),
  largestModelMb: z.number().int().nonnegative(),
  recommendedTarget: dentalModelWorkbenchLoadTargetSchema,
  items: z.array(dentalModelWorkbenchItemSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DentalModelWorkbenchManifest = z.infer<typeof dentalModelWorkbenchManifestSchema>;

export const localImagingOrganizerRequestSchema = z.object({
  rootPaths: z.array(z.string().min(1)).max(12).optional(),
  maxDepth: z.number().int().min(0).max(8).default(5),
  maxFolders: z.number().int().positive().max(3000).default(900),
  maxFilesPerFolder: z.number().int().positive().max(800).default(180),
  maxCandidates: z.number().int().positive().max(50).default(12),
  includeDentalModels: z.boolean().default(true),
  includeDicom: z.boolean().default(true)
});
export type LocalImagingOrganizerRequest = z.infer<typeof localImagingOrganizerRequestSchema>;

export const localImagingOrganizerRecommendedActionSchema = z.enum([
  "open_ct_workup",
  "review_3d_models",
  "mixed_case_workup",
  "manual_review"
]);
export type LocalImagingOrganizerRecommendedAction = z.infer<typeof localImagingOrganizerRecommendedActionSchema>;

export const localImagingOrganizerCaseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  safeDisplayName: z.string(),
  sourceLabel: z.string(),
  sourceKind: z.string(),
  folderFingerprint: z.string(),
  folderPath: z.string(),
  latestModifiedAt: z.string().nullable(),
  dicomLikeFiles: z.number().int().nonnegative(),
  archiveFiles: z.number().int().nonnegative(),
  imageFiles: z.number().int().nonnegative(),
  modelFiles: z.number().int().nonnegative(),
  dicomConfidence: z.number().min(0).max(1),
  modelConfidence: z.number().min(0).max(1),
  combinedConfidence: z.number().min(0).max(1),
  recommendedAction: localImagingOrganizerRecommendedActionSchema,
  modelCandidates: z.array(dentalModelFileCandidateSchema),
  modelWorkbenchManifest: dentalModelWorkbenchManifestSchema,
  reasons: z.array(z.string()),
  warnings: z.array(z.string())
});
export type LocalImagingOrganizerCase = z.infer<typeof localImagingOrganizerCaseSchema>;

export const localImagingOrganizerResponseSchema = z.object({
  version: z.literal("dental-crm-local-imaging-organizer-v1"),
  generatedAt: z.string(),
  roots: z.array(z.string()),
  scannedFolders: z.number().int().nonnegative(),
  cases: z.array(localImagingOrganizerCaseSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type LocalImagingOrganizerResponse = z.infer<typeof localImagingOrganizerResponseSchema>;

export const dicomWebAuthModeSchema = z.enum(["none", "bearer", "basic", "reverse_proxy"]);
export type DicomWebAuthMode = z.infer<typeof dicomWebAuthModeSchema>;

export const dicomWebConnectorStatusSchema = z.enum(["ready", "auth_required", "unreachable", "misconfigured"]);
export type DicomWebConnectorStatus = z.infer<typeof dicomWebConnectorStatusSchema>;

export const dicomWebConnectorCheckRequestSchema = z.object({
  endpointUrl: z.string().url(),
  qidoRsPath: z.string().min(1).default("/studies"),
  wadoRsPath: z.string().min(1).default("/studies"),
  stowRsPath: z.string().min(1).default("/studies"),
  studyInstanceUid: z.string().max(128).nullable().optional(),
  seriesInstanceUid: z.string().max(128).nullable().optional(),
  authMode: dicomWebAuthModeSchema.default("reverse_proxy"),
  timeoutMs: z.number().int().positive().max(30_000).default(5_000)
});
export type DicomWebConnectorCheckRequest = z.infer<typeof dicomWebConnectorCheckRequestSchema>;

export const dicomWebConnectorCheckResponseSchema = z.object({
  endpointOrigin: z.string(),
  qidoUrl: z.string(),
  wadoBaseUrl: z.string(),
  stowBaseUrl: z.string(),
  configuredAuthMode: dicomWebAuthModeSchema,
  status: dicomWebConnectorStatusSchema,
  canSearch: z.boolean(),
  canRetrieve: z.boolean(),
  storeConfigured: z.boolean(),
  qidoHttpStatus: z.number().int().nullable(),
  latencyMs: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomWebConnectorCheckResponse = z.infer<typeof dicomWebConnectorCheckResponseSchema>;

export const imagingViewerModeSchema = z.enum(["two_d", "stack", "mpr", "photo"]);
export type ImagingViewerMode = z.infer<typeof imagingViewerModeSchema>;

export const imagingViewerWindowPresetSchema = z.enum([
  "bone",
  "soft_tissue",
  "implant",
  "endo",
  "caries",
  "perio",
  "photo",
  "custom"
]);
export type ImagingViewerWindowPreset = z.infer<typeof imagingViewerWindowPresetSchema>;

export const imagingViewerToolSchema = z.enum([
  "window_level",
  "pan",
  "zoom",
  "rotate",
  "invert",
  "measure_distance",
  "measure_angle",
  "measure_area",
  "measure_volume",
  "note",
  "implant_axis",
  "implant_library",
  "nerve_canal",
  "panoramic_curve",
  "bone_density_probe",
  "surgical_guide",
  "reset"
]);
export type ImagingViewerTool = z.infer<typeof imagingViewerToolSchema>;

export const imagingViewerAnnotationTypeSchema = z.enum([
  "note",
  "distance",
  "angle",
  "roi",
  "area_roi",
  "volume_roi",
  "implant_axis",
  "nerve_canal",
  "panoramic_curve",
  "bone_density_probe",
  "surgical_guide",
  "landmark"
]);
export type ImagingViewerAnnotationType = z.infer<typeof imagingViewerAnnotationTypeSchema>;

export const imagingViewerAnnotationSemanticRoleSchema = z.enum(["ridge_width", "bone_height", "clearance", "generic"]);
export type ImagingViewerAnnotationSemanticRole = z.infer<typeof imagingViewerAnnotationSemanticRoleSchema>;

export const imagingViewerPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().nullable().optional(),
  plane: dicomMprProjectionSchema.nullable().optional()
});
export type ImagingViewerPoint = z.infer<typeof imagingViewerPointSchema>;

export const imagingViewerImplantPlanSchema = z.object({
  itemId: z.string().min(1).max(120),
  system: z.string().min(1).max(120),
  line: z.string().min(1).max(160),
  diameterMm: z.number().positive().max(20),
  lengthMm: z.number().positive().max(80),
  platform: z.string().min(1).max(120),
  indication: z.string().max(300),
  selectedAt: z.string().nullable().default(null)
});
export type ImagingViewerImplantPlan = z.infer<typeof imagingViewerImplantPlanSchema>;

export const imagingViewerSessionStateSchema = z.object({
  mode: imagingViewerModeSchema,
  activeTool: imagingViewerToolSchema,
  activeQuickActionId: z.string().min(1).max(120).nullable().default(null),
  windowPreset: imagingViewerWindowPresetSchema,
  windowCenter: z.number().nullable(),
  windowWidth: z.number().positive().nullable(),
  brightness: z.number().min(0.1).max(4),
  contrast: z.number().min(0.1).max(4),
  inverted: z.boolean(),
  rotationDeg: z.number().int(),
  flipHorizontal: z.boolean(),
  zoom: z.number().min(0.1).max(10),
  panX: z.number(),
  panY: z.number(),
  sliceIndex: z.number().int().nonnegative().nullable().default(null),
  projection: dicomMprProjectionSchema.nullable(),
  axisDeg: z.number().min(-180).max(180),
  slabMm: z.number().positive().max(100),
  crosshair: z.boolean(),
  linkedPlanes: z.boolean(),
  implantPlan: imagingViewerImplantPlanSchema.nullable().default(null)
});
export type ImagingViewerSessionState = z.infer<typeof imagingViewerSessionStateSchema>;

export const imagingViewerAnnotationSchema = z.object({
  id: z.string().min(1).max(120),
  type: imagingViewerAnnotationTypeSchema,
  label: z.string().min(1).max(160),
  toothCode: z.string().max(20).nullable(),
  points: z.array(imagingViewerPointSchema).max(64),
  measurementValue: z.number().nullable(),
  unit: z.string().max(20).nullable(),
  semanticRole: imagingViewerAnnotationSemanticRoleSchema.nullable().optional(),
  note: z.string().max(1000).nullable(),
  createdByUserId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ImagingViewerAnnotation = z.infer<typeof imagingViewerAnnotationSchema>;

export const saveImagingViewerSessionRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable().optional(),
  state: imagingViewerSessionStateSchema,
  annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
  clientSavedAt: z.string().nullable().optional()
});
export type SaveImagingViewerSessionRequest = z.infer<typeof saveImagingViewerSessionRequestSchema>;

export const imagingViewerSessionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  studyId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  state: imagingViewerSessionStateSchema,
  annotations: z.array(imagingViewerAnnotationSchema),
  clientSavedAt: z.string().nullable(),
  serverSavedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  warnings: z.array(z.string())
});
export type ImagingViewerSession = z.infer<typeof imagingViewerSessionSchema>;

export const imagingViewerSessionResponseSchema = z.object({
  session: imagingViewerSessionSchema,
  warnings: z.array(z.string())
});
export type ImagingViewerSessionResponse = z.infer<typeof imagingViewerSessionResponseSchema>;

export const dicomViewerKindSchema = z.enum(["ohif", "cornerstone3d", "weasis", "radiant", "external_url"]);
export type DicomViewerKind = z.infer<typeof dicomViewerKindSchema>;

export const dicomViewerLaunchModeSchema = z.enum(["dicomweb_url", "local_manifest", "external_handoff", "blocked"]);
export type DicomViewerLaunchMode = z.infer<typeof dicomViewerLaunchModeSchema>;

export const dicomViewerDataSourceKindSchema = z.enum(["dicomweb", "local_files", "external_viewer", "none"]);
export type DicomViewerDataSourceKind = z.infer<typeof dicomViewerDataSourceKindSchema>;

export const dicomViewerLaunchManifestRequestSchema = z.object({
  viewerKind: dicomViewerKindSchema.default("ohif"),
  series: dicomSeriesPreviewGroupSchema,
  viewerState: imagingViewerSessionStateSchema.nullable().optional(),
  annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
  dicomWebBaseUrl: z.string().url().nullable().optional(),
  ohifBaseUrl: z.string().url().nullable().optional(),
  externalViewerPath: z.string().max(1000).nullable().optional(),
  allowExternalHandoff: z.boolean().default(true)
});
export type DicomViewerLaunchManifestRequest = z.infer<typeof dicomViewerLaunchManifestRequestSchema>;

export const dicomViewerLaunchManifestResponseSchema = z.object({
  viewerKind: dicomViewerKindSchema,
  launchMode: dicomViewerLaunchModeSchema,
  viewerUrl: z.string().nullable(),
  studyInstanceUid: z.string().nullable(),
  seriesInstanceUid: z.string().nullable(),
  dataSource: z.object({
    kind: dicomViewerDataSourceKindSchema,
    qidoRoot: z.string().nullable(),
    wadoRoot: z.string().nullable(),
    stowRoot: z.string().nullable(),
    studyInstanceUid: z.string().nullable(),
    seriesInstanceUid: z.string().nullable(),
    sourceKind: imagingSourceKindSchema,
    sourceName: z.string()
  }),
  displaySetSelector: z.object({
    preferredLayout: dicomMprReadinessSchema.shape.recommendedLayout,
    projections: z.array(dicomMprProjectionSchema),
    studyInstanceUid: z.string().nullable(),
    seriesInstanceUid: z.string().nullable()
  }),
  cornerstoneVolumeId: z.string().nullable(),
  resourcePolicy: dicomMprResourcePolicySchema,
  viewerState: imagingViewerSessionStateSchema.nullable(),
  annotations: z.array(imagingViewerAnnotationSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomViewerLaunchManifestResponse = z.infer<typeof dicomViewerLaunchManifestResponseSchema>;

export const dicomViewerToolStateTargetSchema = z.enum(["cornerstone3d", "ohif", "generic_json", "external_viewer"]);
export type DicomViewerToolStateTarget = z.infer<typeof dicomViewerToolStateTargetSchema>;

export const dicomViewerViewportTypeSchema = z.enum(["stack", "volume", "derived"]);
export type DicomViewerViewportType = z.infer<typeof dicomViewerViewportTypeSchema>;

export const dicomViewerToolModeSchema = z.enum(["active", "passive", "enabled", "disabled"]);
export type DicomViewerToolMode = z.infer<typeof dicomViewerToolModeSchema>;

export const dicomViewerTargetToolSchema = z.enum([
  "WindowLevelTool",
  "PanTool",
  "ZoomTool",
  "StackScrollTool",
  "CrosshairsTool",
  "LengthTool",
  "AngleTool",
  "ArrowAnnotateTool",
  "RectangleROITool",
  "BidirectionalTool",
  "SplineROITool",
  "PlanarFreehandROITool",
  "ProbeTool"
]);
export type DicomViewerTargetTool = z.infer<typeof dicomViewerTargetToolSchema>;

export const dicomViewerToolConfigSchema = z.object({
  crmTool: imagingViewerToolSchema,
  targetTool: dicomViewerTargetToolSchema,
  mode: dicomViewerToolModeSchema,
  shortcut: z.string().max(20).nullable(),
  reason: z.string()
});
export type DicomViewerToolConfig = z.infer<typeof dicomViewerToolConfigSchema>;

export const dicomViewerViewportStateSchema = z.object({
  viewportId: z.string(),
  viewportType: dicomViewerViewportTypeSchema,
  projection: dicomMprProjectionSchema.nullable(),
  volumeId: z.string().nullable(),
  referencedImageId: z.string().nullable(),
  sliceIndex: z.number().int().nonnegative().nullable().default(null),
  windowPreset: imagingViewerWindowPresetSchema,
  windowCenter: z.number().nullable(),
  windowWidth: z.number().positive().nullable(),
  zoom: z.number().min(0.1).max(10),
  rotationDeg: z.number().int(),
  slabMm: z.number().positive().max(100),
  axisDeg: z.number().min(-180).max(180),
  crosshair: z.boolean(),
  linkedPlanes: z.boolean()
});
export type DicomViewerViewportState = z.infer<typeof dicomViewerViewportStateSchema>;

export const dicomViewerToolStatePointSchema = z.object({
  world: z.tuple([z.number(), z.number(), z.number()]),
  canvas: z.tuple([z.number(), z.number()]).nullable(),
  plane: dicomMprProjectionSchema.nullable(),
  sourceIndex: z.number().int().nonnegative()
});
export type DicomViewerToolStatePoint = z.infer<typeof dicomViewerToolStatePointSchema>;

export const dicomViewerToolStateAnnotationSchema = z.object({
  id: z.string(),
  sourceAnnotationId: z.string(),
  targetTool: dicomViewerTargetToolSchema,
  type: imagingViewerAnnotationTypeSchema,
  label: z.string(),
  semanticRole: imagingViewerAnnotationSemanticRoleSchema.nullable().optional(),
  toothCode: z.string().nullable(),
  note: z.string().nullable(),
  viewportId: z.string(),
  frameOfReferenceUid: z.string().nullable(),
  referencedImageId: z.string().nullable(),
  measurement: z.object({
    value: z.number().nullable(),
    unit: z.string().nullable()
  }),
  points: z.array(dicomViewerToolStatePointSchema).max(64),
  locked: z.boolean(),
  needsReview: z.boolean(),
  warnings: z.array(z.string())
});
export type DicomViewerToolStateAnnotation = z.infer<typeof dicomViewerToolStateAnnotationSchema>;

export const dicomViewerPlanningTaskKindSchema = z.enum([
  "panoramic_reconstruction",
  "cross_section_curve",
  "distance_measurement",
  "angle_measurement",
  "area_roi",
  "volume_roi",
  "implant_axis",
  "implant_library",
  "nerve_canal",
  "bone_density_probe",
  "surgical_guide"
]);
export type DicomViewerPlanningTaskKind = z.infer<typeof dicomViewerPlanningTaskKindSchema>;

export const dicomViewerPlanningTaskSchema = z.object({
  id: z.string(),
  kind: dicomViewerPlanningTaskKindSchema,
  title: z.string(),
  targetTool: dicomViewerTargetToolSchema,
  projection: dicomMprProjectionSchema.nullable(),
  windowPreset: imagingViewerWindowPresetSchema,
  slabMm: z.number().positive().max(100),
  axisDeg: z.number().min(-180).max(180),
  requiresVolume: z.boolean(),
  status: z.enum(["active", "ready", "blocked"]),
  outputUnit: z.string().max(40).nullable(),
  implantPlan: imagingViewerImplantPlanSchema.nullable().default(null),
  reason: z.string(),
  warnings: z.array(z.string())
});
export type DicomViewerPlanningTask = z.infer<typeof dicomViewerPlanningTaskSchema>;

export const dicomClientRuntimeSurfaceSchema = z.enum(["mobile_web", "tablet_web", "desktop_web", "desktop_app", "unknown"]);
export type DicomClientRuntimeSurface = z.infer<typeof dicomClientRuntimeSurfaceSchema>;

export const dicomDirectoryHandlePersistenceSchema = z.enum(["unsupported", "session_only", "persisted_handle"]);
export type DicomDirectoryHandlePersistence = z.infer<typeof dicomDirectoryHandlePersistenceSchema>;

export const dicomWorkstationClientFactsSchema = z.object({
  deviceMemoryGb: z.number().positive().nullable(),
  hardwareConcurrency: z.number().int().positive().nullable(),
  webgl2Supported: z.boolean(),
  webglVendor: z.string().max(180).nullable().optional(),
  webglRenderer: z.string().max(240).nullable().optional(),
  maxTextureSize: z.number().int().positive().nullable().optional(),
  max3dTextureSize: z.number().int().positive().nullable().optional(),
  maxRenderbufferSize: z.number().int().positive().nullable().optional(),
  devicePixelRatio: z.number().positive().nullable().optional(),
  offscreenCanvasSupported: z.boolean().optional(),
  webWorkerSupported: z.boolean().optional(),
  indexedDbSupported: z.boolean(),
  storageQuotaMb: z.number().int().nonnegative().nullable(),
  storageUsageMb: z.number().int().nonnegative().nullable(),
  online: z.boolean(),
  runtimeSurfaceHint: dicomClientRuntimeSurfaceSchema.optional(),
  desktopShellBridgeSupported: z.boolean().optional(),
  directoryPickerSupported: z.boolean().optional(),
  directoryHandlePersistence: dicomDirectoryHandlePersistenceSchema.optional(),
  userAgent: z.string().max(300).nullable().optional(),
  platform: z.string().max(120).nullable().optional()
});
export type DicomWorkstationClientFacts = z.infer<typeof dicomWorkstationClientFactsSchema>;

export const dicomClientNetworkModeSchema = z.enum(["online", "offline_local", "offline_remote_blocked"]);
export type DicomClientNetworkMode = z.infer<typeof dicomClientNetworkModeSchema>;

export const dicomClientExecutionLaneSchema = z.enum([
  "metadata_only",
  "external_or_local_viewer",
  "browser_preview",
  "browser_mpr",
  "desktop_app_mpr"
]);
export type DicomClientExecutionLane = z.infer<typeof dicomClientExecutionLaneSchema>;

export const dicomClientRuntimeProfileSchema = z.object({
  surface: dicomClientRuntimeSurfaceSchema,
  networkMode: dicomClientNetworkModeSchema,
  executionLane: dicomClientExecutionLaneSchema,
  mobileConstrained: z.boolean(),
  desktopAppPreferred: z.boolean(),
  canUseLocalFiles: z.boolean(),
  canUseRemoteArchive: z.boolean(),
  canUseBrowserMpr: z.boolean(),
  label: z.string(),
  nextAction: z.string(),
  warnings: z.array(z.string())
});
export type DicomClientRuntimeProfile = z.infer<typeof dicomClientRuntimeProfileSchema>;

export const dicomWorkstationReadinessCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["pass", "warn", "fail"]),
  detail: z.string(),
  nextAction: z.string()
});
export type DicomWorkstationReadinessCheck = z.infer<typeof dicomWorkstationReadinessCheckSchema>;

export const dicomGpuClassSchema = z.enum(["none", "integrated_low", "integrated_ok", "discrete_ok", "diagnostic"]);
export type DicomGpuClass = z.infer<typeof dicomGpuClassSchema>;

export const dicomRenderMemoryBudgetClassSchema = z.enum(["minimum", "constrained", "standard", "workstation", "diagnostic"]);
export type DicomRenderMemoryBudgetClass = z.infer<typeof dicomRenderMemoryBudgetClassSchema>;

export const dicomDiagnosticPixelPolicySchema = z.enum([
  "metadata_only_no_pixels",
  "browser_preview_not_diagnostic",
  "desktop_app_or_external_review"
]);
export type DicomDiagnosticPixelPolicy = z.infer<typeof dicomDiagnosticPixelPolicySchema>;

export const dicomRenderTextureStrategySchema = z.enum([
  "metadata_only",
  "stack_2d_textures",
  "single_3d_texture",
  "bricked_3d_textures",
  "external_viewer"
]);
export type DicomRenderTextureStrategy = z.infer<typeof dicomRenderTextureStrategySchema>;

export const dicomRenderQualityModeSchema = z.enum([
  "metadata_only",
  "interactive_low",
  "balanced_mpr",
  "diagnostic_full",
  "external"
]);
export type DicomRenderQualityMode = z.infer<typeof dicomRenderQualityModeSchema>;

export const dicomGpuRenderPlanSchema = z.object({
  gpuClass: dicomGpuClassSchema,
  textureStrategy: dicomRenderTextureStrategySchema,
  qualityMode: dicomRenderQualityModeSchema,
  downsampleFactor: z.number().int().positive(),
  targetSliceBatch: z.number().int().positive(),
  maxTextureEdge: z.number().int().positive().nullable(),
  max3dTextureEdge: z.number().int().positive().nullable(),
  estimatedGpuMemoryMb: z.number().int().nonnegative(),
  memoryBudgetClass: dicomRenderMemoryBudgetClassSchema.default("standard"),
  hardwareQualityWeight: z.number().min(0).max(1).default(0.5),
  progressiveSliceWindowCap: z.number().int().positive().default(32),
  diagnosticPixelPolicy: dicomDiagnosticPixelPolicySchema.default("browser_preview_not_diagnostic"),
  useWebWorker: z.boolean(),
  useOffscreenCanvas: z.boolean(),
  interactionBudgetMs: z.number().int().positive(),
  firstPaintStrategy: z.string(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomGpuRenderPlan = z.infer<typeof dicomGpuRenderPlanSchema>;

export const dicomRenderCacheTaskKindSchema = z.enum([
  "metadata_index",
  "thumbnail_first",
  "fetch_slice_range",
  "decode_slice_range",
  "upload_texture_range",
  "build_volume_texture",
  "build_texture_brick",
  "derive_mpr_plane",
  "derive_panoramic_curve",
  "persist_cache_index",
  "external_handoff"
]);
export type DicomRenderCacheTaskKind = z.infer<typeof dicomRenderCacheTaskKindSchema>;

export const dicomRenderCacheTargetSchema = z.enum(["main_thread", "web_worker", "offscreen_canvas", "gpu", "indexeddb", "external_viewer"]);
export type DicomRenderCacheTarget = z.infer<typeof dicomRenderCacheTargetSchema>;

export const dicomRenderCachePrioritySchema = z.enum(["blocking", "interactive", "prefetch", "background", "deferred"]);
export type DicomRenderCachePriority = z.infer<typeof dicomRenderCachePrioritySchema>;

export const dicomRenderCacheTaskSchema = z.object({
  id: z.string(),
  kind: dicomRenderCacheTaskKindSchema,
  target: dicomRenderCacheTargetSchema,
  priority: dicomRenderCachePrioritySchema,
  sliceStart: z.number().int().nonnegative().nullable(),
  sliceEnd: z.number().int().nonnegative().nullable(),
  projection: dicomMprProjectionSchema.nullable(),
  estimatedMemoryMb: z.number().int().nonnegative(),
  budgetMs: z.number().int().positive(),
  blocking: z.boolean(),
  label: z.string(),
  nextAction: z.string()
});
export type DicomRenderCacheTask = z.infer<typeof dicomRenderCacheTaskSchema>;

export const dicomRenderInteractionPhaseSchema = z.object({
  id: z.enum(["external_review", "first_visible_slice", "interactive_navigation", "idle_refine"]),
  label: z.string(),
  trigger: z.string(),
  targetFrameMs: z.number().int().positive(),
  downsampleFactor: z.number().int().positive(),
  maxResidentSlices: z.number().int().positive(),
  workerCount: z.number().int().nonnegative(),
  nextAction: z.string()
});
export type DicomRenderInteractionPhase = z.infer<typeof dicomRenderInteractionPhaseSchema>;

export const dicomProgressiveLoadStageKindSchema = z.enum([
  "metadata_only",
  "external_handoff",
  "seed_slices",
  "interleaved_decimation",
  "active_window",
  "adjacent_window",
  "idle_refine"
]);
export type DicomProgressiveLoadStageKind = z.infer<typeof dicomProgressiveLoadStageKindSchema>;

export const dicomProgressiveLoadRequestPatternSchema = z.enum([
  "none",
  "center_first",
  "interleaved",
  "active_window",
  "adjacent_window",
  "idle_full"
]);
export type DicomProgressiveLoadRequestPattern = z.infer<typeof dicomProgressiveLoadRequestPatternSchema>;

export const dicomProgressiveLoadCornerstoneRequestTypeSchema = z.enum([
  "none",
  "thumbnail",
  "interaction",
  "prefetch",
  "compute",
  "external"
]);
export type DicomProgressiveLoadCornerstoneRequestType = z.infer<typeof dicomProgressiveLoadCornerstoneRequestTypeSchema>;

export const dicomProgressiveLoadStageSchema = z.object({
  id: z.string(),
  kind: dicomProgressiveLoadStageKindSchema,
  label: z.string(),
  priority: dicomRenderCachePrioritySchema,
  target: dicomRenderCacheTargetSchema,
  requestPattern: dicomProgressiveLoadRequestPatternSchema,
  cornerstoneRequestType: dicomProgressiveLoadCornerstoneRequestTypeSchema,
  cancelGroupId: z.string().nullable(),
  requiresStageIds: z.array(z.string()),
  sliceStart: z.number().int().nonnegative().nullable(),
  sliceEnd: z.number().int().nonnegative().nullable(),
  sliceOrder: z.array(z.number().int().nonnegative()).max(256),
  decimationFactor: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  maxResidentSlices: z.number().int().positive(),
  budgetMs: z.number().int().positive(),
  blocking: z.boolean(),
  nextAction: z.string()
});
export type DicomProgressiveLoadStage = z.infer<typeof dicomProgressiveLoadStageSchema>;

export const dicomRenderCachePlanRequestSchema = z.object({
  series: dicomSeriesPreviewGroupSchema,
  renderPlan: dicomGpuRenderPlanSchema,
  viewerState: imagingViewerSessionStateSchema.nullable().optional()
});
export type DicomRenderCachePlanRequest = z.infer<typeof dicomRenderCachePlanRequestSchema>;

export const dicomRenderCachePlanResponseSchema = z.object({
  version: z.literal("dental-crm-dicom-render-cache-v1"),
  generatedAt: z.string(),
  textureStrategy: dicomRenderTextureStrategySchema,
  qualityMode: dicomRenderQualityModeSchema,
  memoryBudgetClass: dicomRenderMemoryBudgetClassSchema,
  hardwareQualityWeight: z.number().min(0).max(1),
  progressiveSliceWindowCap: z.number().int().positive(),
  diagnosticPixelPolicy: dicomDiagnosticPixelPolicySchema,
  activeSliceIndex: z.number().int().nonnegative(),
  centerSliceIndex: z.number().int().nonnegative(),
  firstWindowStart: z.number().int().nonnegative(),
  firstWindowEnd: z.number().int().nonnegative(),
  visibleSliceBudget: z.number().int().positive(),
  maxResidentSlices: z.number().int().positive(),
  totalBatches: z.number().int().positive(),
  decodeConcurrency: z.number().int().positive(),
  uploadConcurrency: z.number().int().positive(),
  workerCount: z.number().int().nonnegative(),
  gpuMemoryBudgetMb: z.number().int().nonnegative(),
  cpuMemoryBudgetMb: z.number().int().nonnegative(),
  shouldPersistToIndexedDb: z.boolean(),
  firstPaintBudgetMs: z.number().int().positive(),
  interactionBudgetMs: z.number().int().positive(),
  interactionPhases: z.array(dicomRenderInteractionPhaseSchema),
  progressiveStages: z.array(dicomProgressiveLoadStageSchema),
  tasks: z.array(dicomRenderCacheTaskSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomRenderCachePlanResponse = z.infer<typeof dicomRenderCachePlanResponseSchema>;

export const dicomViewerToolStateBundleRequestSchema = z.object({
  target: dicomViewerToolStateTargetSchema.default("cornerstone3d"),
  viewerKind: dicomViewerKindSchema.default("cornerstone3d"),
  series: dicomSeriesPreviewGroupSchema,
  viewerState: imagingViewerSessionStateSchema.nullable().optional(),
  annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
  renderPlan: dicomGpuRenderPlanSchema.nullable().optional()
});
export type DicomViewerToolStateBundleRequest = z.infer<typeof dicomViewerToolStateBundleRequestSchema>;

export const dicomViewerToolStateBundleResponseSchema = z.object({
  version: z.literal("dental-crm-dicom-tool-state-v1"),
  target: dicomViewerToolStateTargetSchema,
  viewerKind: dicomViewerKindSchema,
  generatedAt: z.string(),
  seriesRef: z.object({
    studyInstanceUid: z.string().nullable(),
    seriesInstanceUid: z.string().nullable(),
    sourceKind: imagingSourceKindSchema,
    sourceName: z.string(),
    cornerstoneVolumeId: z.string().nullable(),
    firstFilePath: z.string().nullable()
  }),
  adapterHints: z.object({
    cornerstone3d: z.object({
      toolGroupId: z.string(),
      renderingEngineId: z.string(),
      volumeId: z.string().nullable(),
      viewportIds: z.array(z.string())
    }),
    ohif: z.object({
      measurementSourceName: z.string(),
      displaySetInstanceUid: z.string().nullable(),
      hangingProtocolStage: z.string()
    })
  }),
  viewports: z.array(dicomViewerViewportStateSchema),
  tools: z.array(dicomViewerToolConfigSchema),
  annotations: z.array(dicomViewerToolStateAnnotationSchema),
  planningTasks: z.array(dicomViewerPlanningTaskSchema),
  activeQuickActionId: z.string().min(1).max(120).nullable().default(null),
  implantPlan: imagingViewerImplantPlanSchema.nullable().default(null),
  resourcePolicy: dicomMprResourcePolicySchema,
  renderPlan: dicomGpuRenderPlanSchema.nullable(),
  exportHints: z.array(z.string()),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomViewerToolStateBundleResponse = z.infer<typeof dicomViewerToolStateBundleResponseSchema>;

export const dicomWorkstationReadinessRequestSchema = z.object({
  series: dicomSeriesPreviewGroupSchema,
  client: dicomWorkstationClientFactsSchema,
  connector: dicomWebConnectorCheckResponseSchema.nullable().optional()
});
export type DicomWorkstationReadinessRequest = z.infer<typeof dicomWorkstationReadinessRequestSchema>;

export const dicomWorkstationReadinessResponseSchema = z.object({
  detectedTier: dicomMprResourceTierSchema,
  requiredTier: dicomMprResourceTierSchema,
  effectiveLoadStrategy: dicomMprLoadStrategySchema,
  runtimeProfile: dicomClientRuntimeProfileSchema,
  readinessScore: z.number().int().min(0).max(100),
  canOpenInBrowser: z.boolean(),
  shouldUseExternalViewer: z.boolean(),
  renderPlan: dicomGpuRenderPlanSchema,
  checks: z.array(dicomWorkstationReadinessCheckSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomWorkstationReadinessResponse = z.infer<typeof dicomWorkstationReadinessResponseSchema>;

export const dicomViewerWorkbenchManifestRequestSchema = z.object({
  viewerKind: dicomViewerKindSchema.default("cornerstone3d"),
  target: dicomViewerToolStateTargetSchema.default("cornerstone3d"),
  series: dicomSeriesPreviewGroupSchema,
  client: dicomWorkstationClientFactsSchema,
  connector: dicomWebConnectorCheckResponseSchema.nullable().optional(),
  viewerState: imagingViewerSessionStateSchema.nullable().optional(),
  annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
  dicomWebBaseUrl: z.string().url().nullable().optional(),
  ohifBaseUrl: z.string().url().nullable().optional(),
  externalViewerPath: z.string().max(1000).nullable().optional(),
  allowExternalHandoff: z.boolean().default(true)
});
export type DicomViewerWorkbenchManifestRequest = z.infer<typeof dicomViewerWorkbenchManifestRequestSchema>;

export const dicomViewerWorkbenchManifestResponseSchema = z.object({
  version: z.literal("dental-crm-dicom-workbench-v1"),
  generatedAt: z.string(),
  readiness: dicomWorkstationReadinessResponseSchema,
  renderCachePlan: dicomRenderCachePlanResponseSchema,
  launchManifest: dicomViewerLaunchManifestResponseSchema,
  toolStateBundle: dicomViewerToolStateBundleResponseSchema,
  doctorBlocking: z.boolean(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomViewerWorkbenchManifestResponse = z.infer<typeof dicomViewerWorkbenchManifestResponseSchema>;

export const dicomWorkbenchPixelPolicySchema = z.literal("metadata_and_tool_state_only_no_pixels");
export type DicomWorkbenchPixelPolicy = z.infer<typeof dicomWorkbenchPixelPolicySchema>;

export const dicomWorkbenchBundleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  seriesKey: z.string(),
  patientId: z.string().uuid().nullable(),
  studyInstanceUid: z.string().nullable(),
  seriesInstanceUid: z.string().nullable(),
  sourceName: z.string(),
  sourceKind: imagingSourceKindSchema,
  pixelPolicy: dicomWorkbenchPixelPolicySchema,
  manifest: dicomViewerWorkbenchManifestResponseSchema,
  clientSavedAt: z.string().nullable(),
  serverSavedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  warnings: z.array(z.string())
});
export type DicomWorkbenchBundle = z.infer<typeof dicomWorkbenchBundleSchema>;

export const saveDicomWorkbenchBundleRequestSchema = z.object({
  manifest: dicomViewerWorkbenchManifestResponseSchema,
  clientSavedAt: z.string().nullable().optional(),
  seriesKey: z.string().min(1).max(1000).optional()
});
export type SaveDicomWorkbenchBundleRequest = z.infer<typeof saveDicomWorkbenchBundleRequestSchema>;

export const dicomWorkbenchBundleResponseSchema = z.object({
  bundle: dicomWorkbenchBundleSchema,
  warnings: z.array(z.string())
});
export type DicomWorkbenchBundleResponse = z.infer<typeof dicomWorkbenchBundleResponseSchema>;

export const dicomWorkbenchBundleListResponseSchema = z.object({
  bundles: z.array(dicomWorkbenchBundleSchema),
  total: z.number().int().nonnegative(),
  generatedAt: z.string(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomWorkbenchBundleListResponse = z.infer<typeof dicomWorkbenchBundleListResponseSchema>;

export const dicomFolderWorkupPathSchema = z.enum(["open_mpr", "downsampled_mpr", "external_viewer", "metadata_only"]);
export type DicomFolderWorkupPath = z.infer<typeof dicomFolderWorkupPathSchema>;

export const dicomFolderWorkupPlanRequestSchema = z.object({
  folderPath: z.string().min(1),
  recursive: z.boolean().default(true),
  sourceName: z.string().min(1).default("dicom_folder_workup"),
  maxFiles: z.number().int().positive().max(5000).default(800),
  maxFolders: z.number().int().positive().max(3000).default(900),
  maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
  maxHeaderBytes: z.number().int().positive().max(1024 * 1024).default(256 * 1024),
  client: dicomWorkstationClientFactsSchema,
  viewerState: imagingViewerSessionStateSchema.nullable().optional()
});
export type DicomFolderWorkupPlanRequest = z.infer<typeof dicomFolderWorkupPlanRequestSchema>;

export const dicomFolderWorkupPlanSeriesSchema = z.object({
  series: dicomSeriesPreviewGroupSchema,
  readiness: dicomWorkstationReadinessResponseSchema,
  renderCachePlan: dicomRenderCachePlanResponseSchema,
  recommendedPath: dicomFolderWorkupPathSchema,
  doctorBlocking: z.boolean(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomFolderWorkupPlanSeries = z.infer<typeof dicomFolderWorkupPlanSeriesSchema>;

export const dicomFolderWorkupPlanResponseSchema = z.object({
  version: z.literal("dental-crm-dicom-folder-workup-v1"),
  generatedAt: z.string(),
  folder: dicomFolderSeriesPreviewResponseSchema,
  selectedSeriesCount: z.number().int().nonnegative(),
  plans: z.array(dicomFolderWorkupPlanSeriesSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type DicomFolderWorkupPlanResponse = z.infer<typeof dicomFolderWorkupPlanResponseSchema>;

export const localBridgeKindSchema = z.enum([
  "speech_whisper",
  "speech_vosk",
  "dicom_cbct",
  "ocr_vision",
  "ohif_viewer",
  "migration_staging"
]);
export type LocalBridgeKind = z.infer<typeof localBridgeKindSchema>;

export const localBridgeStatusSchema = z.enum([
  "ready",
  "not_configured",
  "unreachable",
  "blocked",
  "misconfigured",
  "planned"
]);
export type LocalBridgeStatus = z.infer<typeof localBridgeStatusSchema>;

export const localBridgeReadinessItemSchema = z.object({
  kind: localBridgeKindSchema,
  title: z.string(),
  status: localBridgeStatusSchema,
  configured: z.boolean(),
  reachable: z.boolean(),
  urlRedacted: z.string().nullable(),
  setupSettingsCount: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative().nullable(),
  role: z.string(),
  workload: z.string(),
  privacyBoundary: z.string(),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type LocalBridgeReadinessItem = z.infer<typeof localBridgeReadinessItemSchema>;

export const localBridgeReadinessResponseSchema = z.object({
  generatedAt: z.string(),
  allowRemoteBridgeProbe: z.boolean(),
  configuredCount: z.number().int().nonnegative(),
  readyCount: z.number().int().nonnegative(),
  bridges: z.array(localBridgeReadinessItemSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type LocalBridgeReadinessResponse = z.infer<typeof localBridgeReadinessResponseSchema>;

export const localBridgeUseScenarioSchema = z.enum([
  "visit_dictation",
  "document_ocr",
  "price_photo_ocr",
  "cbct_mpr",
  "imaging_import"
]);
export type LocalBridgeUseScenario = z.infer<typeof localBridgeUseScenarioSchema>;

export const localBridgeUsePathSchema = z.enum([
  "browser_local",
  "server_gateway",
  "local_bridge",
  "cloud_provider",
  "metadata_preview",
  "external_viewer",
  "manual_review"
]);
export type LocalBridgeUsePath = z.infer<typeof localBridgeUsePathSchema>;

export const localBridgeUsePlanStepSchema = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  owner: z.enum(["doctor", "administrator", "assistant", "system"]),
  path: localBridgeUsePathSchema,
  storesLocalFirst: z.boolean(),
  blocking: z.boolean(),
  detail: z.string()
});
export type LocalBridgeUsePlanStep = z.infer<typeof localBridgeUsePlanStepSchema>;

export const localBridgeUsePlanSchema = z.object({
  scenario: localBridgeUseScenarioSchema,
  title: z.string(),
  primaryPath: localBridgeUsePathSchema,
  localBridgeKind: localBridgeKindSchema.nullable(),
  canProceed: z.boolean(),
  doctorBlocking: z.boolean(),
  confidence: z.number().min(0).max(1),
  steps: z.array(localBridgeUsePlanStepSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type LocalBridgeUsePlan = z.infer<typeof localBridgeUsePlanSchema>;

export const localBridgeUsePlansResponseSchema = z.object({
  generatedAt: z.string(),
  readiness: localBridgeReadinessResponseSchema,
  plans: z.array(localBridgeUsePlanSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type LocalBridgeUsePlansResponse = z.infer<typeof localBridgeUsePlansResponseSchema>;

export const visitNoteDraftRequestSchema = z.object({
  patientId: z.string().uuid(),
  transcript: z.string().trim().min(1).max(80_000),
  specialty: dentalSpecialtySchema.default("universal"),
  source: z.enum(["voice", "typed", "image"]).default("voice")
});
export type VisitNoteDraftRequest = z.infer<typeof visitNoteDraftRequestSchema>;

export const visitNoteDraftQualitySchema = z.object({
  level: z.enum(["ready", "review", "needs_more_dictation"]),
  confidence: z.number().min(0).max(1),
  specialty: dentalSpecialtySchema,
  detectedToothCodes: z.array(z.string()),
  detectedToothStates: z.record(z.enum(["idle", "watch", "planned", "done", "missing", "treatment"])).optional(),
  signals: z.array(z.string()),
  missingCriticalFields: z.array(z.string()),
  nextAction: z.string()
});
export type VisitNoteDraftQuality = z.infer<typeof visitNoteDraftQualitySchema>;

export const visitNoteDraftSchema = z.object({
  complaint: z.string().nullable(),
  anamnesis: z.string().nullable(),
  objectiveStatus: z.string().nullable(),
  diagnosis: z.string().nullable(),
  treatmentPlan: z.string().nullable(),
  quality: visitNoteDraftQualitySchema.optional(),
  warnings: z.array(z.string())
});
export type VisitNoteDraft = z.infer<typeof visitNoteDraftSchema>;

export const visitDraftAutosaveSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  selectedSpecialty: dentalSpecialtySchema,
  transcript: z.string(),
  draft: visitNoteDraftSchema,
  baseRevision: z.number().int().nonnegative().nullable(),
  clientDraftId: z.string().nullable(),
  clientSavedAt: z.string().nullable(),
  serverSavedAt: z.string(),
  transcriptHash: z.string()
});
export type VisitDraftAutosave = z.infer<typeof visitDraftAutosaveSchema>;

export const visitDraftAutosaveRequestSchema = z
  .object({
    visitId: z.string().uuid(),
    patientId: z.string().uuid(),
    selectedSpecialty: dentalSpecialtySchema,
    transcript: z.string().max(80_000).default(""),
    draft: visitNoteDraftSchema,
    baseRevision: z.number().int().nonnegative().nullable().optional(),
    clientDraftId: z.string().min(1).max(120).nullable().optional(),
    clientSavedAt: z.string().nullable().optional()
  })
  .refine(
    (input) =>
      Boolean(
        input.transcript.trim() ||
          input.draft.complaint?.trim() ||
          input.draft.anamnesis?.trim() ||
          input.draft.objectiveStatus?.trim() ||
          input.draft.diagnosis?.trim() ||
          input.draft.treatmentPlan?.trim()
      ),
    { message: "Нужно передать текст приема или заполнить поля черновика" }
  );
export type VisitDraftAutosaveRequest = z.infer<typeof visitDraftAutosaveRequestSchema>;

export const visitDraftAutosaveResponseSchema = z.object({
  serverDraft: visitDraftAutosaveSchema.nullable()
});
export type VisitDraftAutosaveResponse = z.infer<typeof visitDraftAutosaveResponseSchema>;

export const speechTranscriptPolishRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(80_000),
  specialty: dentalSpecialtySchema.default("universal"),
  source: z.enum(["voice", "typed", "recording_chunk"]).default("voice")
});
export type SpeechTranscriptPolishRequest = z.infer<typeof speechTranscriptPolishRequestSchema>;

export const speechTranscriptPolishModeSchema = z.enum(["deterministic", "deterministic_neural"]);
export type SpeechTranscriptPolishMode = z.infer<typeof speechTranscriptPolishModeSchema>;

export const speechTranscriptPolishResponseSchema = z.object({
  rawTranscript: z.string(),
  normalizedTranscript: z.string(),
  changedPhrases: z.array(z.string()),
  warnings: z.array(z.string()),
  polishMode: speechTranscriptPolishModeSchema,
  modelName: z.string().nullable(),
  neuralWarnings: z.array(z.string()),
  draft: visitNoteDraftSchema
});
export type SpeechTranscriptPolishResponse = z.infer<typeof speechTranscriptPolishResponseSchema>;

const ruleParserSpecialtyLabels: Record<DentalSpecialty, string> = {
  therapist: "терапия",
  orthopedist: "ортопедия",
  surgeon: "хирургия",
  orthodontist: "ортодонтия",
  periodontist: "пародонтология",
  hygienist: "профилактика и гигиена",
  pediatric: "детская стоматология",
  implantologist: "имплантология",
  radiologist: "рентгенология",
  universal: "осмотр"
};

type VisitDraftParserProfile = {
  complaintTokens: string[];
  objectiveTokens: string[];
  diagnosisTokens: string[];
  planTokens: string[];
  objectiveFallback: string;
  diagnosisFallback: string | null;
  planFallback: string;
  reviewHints: string[];
};

const commonComplaintTokens = [
  "жалоб",
  "без жалоб",
  "беспоко",
  "отмечает",
  "боль",
  "ноет",
  "ноч",
  "самопроиз",
  "накусыв",
  "ирради",
  "холод",
  "горяч",
  "сладк",
  "кисл",
  "застрев",
  "чувств",
  "эстет",
  "скуч",
  "отек",
  "кровоточ",
  "прикус",
  "скол",
  "подвиж"
];
const commonAnamnesisTokens = [
  "анамнез",
  "со слов",
  "ранее",
  "после лечения",
  "в течение",
  "аллерг",
  "сомат",
  "здоров",
  "препарат",
  "принимает",
  "не принимает",
  "курен",
  "диабет",
  "недел",
  "месяц",
  "беремен",
  "антикоаг",
  "давлен",
  "гиперт",
  "не отягощ"
];
const commonObjectiveTokens = [
  "объектив",
  "status",
  "статус",
  "localis",
  "praesens",
  "осмотр",
  "слизист",
  "зонд",
  "перкус",
  "пальпац",
  "эод",
  "свищ",
  "инфильтр",
  "карман",
  "рецесс",
  "поддеснев",
  "наддеснев",
  "окклюз",
  "мод",
  "блэк",
  "класс по блэку",
  "мезиаль",
  "дисталь",
  "апроксим",
  "контакт",
  "вестибуляр",
  "оральн",
  "пришееч",
  "иропз",
  "кпу",
  "фиссур",
  "гермет",
  "дефект",
  "снимок",
  "рентген",
  "визиограф",
  "прицельн",
  "кт",
  "клкт",
  "оптг",
  "rvg",
  "cbct",
  "периапик"
];
const commonDiagnosisTokens = [
  "диагноз",
  "ds",
  "dx",
  "d/s",
  "мкб",
  "k02",
  "k04",
  "k05",
  "k08",
  "кариес",
  "пульп",
  "периодонт",
  "адент",
  "гингив",
  "пародонт",
  "периост",
  "абсцесс",
  "альвеолит",
  "ретенц",
  "дистоп"
];
const commonPlanTokens = [
  "план",
  "леч",
  "показан",
  "проведен",
  "выполн",
  "сделан",
  "назнач",
  "анест",
  "изоляц",
  "коффердам",
  "матриц",
  "клин",
  "финир",
  "полиров",
  "мод",
  "блэк",
  "шлиф",
  "коррекц",
  "контакт",
  "артикуляц",
  "карпул",
  "ультракаин",
  "септанест",
  "убистезин",
  "препар",
  "адгезив",
  "рестав",
  "ирригац",
  "пломбир",
  "стеклоиономер",
  "сиц",
  "mta",
  "гермет",
  "удал",
  "контроль",
  "рекоменд",
  "соглас",
  "наблюд"
];

const visitDraftParserProfiles: Record<DentalSpecialty, VisitDraftParserProfile> = {
  therapist: {
    complaintTokens: ["кари", "пломб", "рестав", "эндо", "канал", "холод", "горяч", "накусыв", "самопроиз", "ноч"],
    objectiveTokens: [
      "кари",
      "полост",
      "пломб",
      "канал",
      "усть",
      "пульп",
      "перкус",
      "зонд",
      "эод",
      "холод",
      "периапик",
      "окклюз",
      "мод",
      "блэк",
      "класс по блэку",
      "мезиаль",
      "дисталь",
      "апроксим",
      "контакт",
      "вестибуляр",
      "оральн",
      "пришееч",
      "иропз",
      "кпу",
      "фиссур",
      "дефект",
      "гермет",
      "коффердам"
    ],
    diagnosisTokens: ["ds", "dx", "d/s", "k02", "k04", "кариес", "пульп", "периодонтит", "периапик"],
    planTokens: [
      "анест",
      "изоляц",
      "коффердам",
      "матриц",
      "клин",
      "финир",
      "полиров",
      "мод",
      "блэк",
      "шлиф",
      "коррекц",
      "контакт",
      "артикуляц",
      "карпул",
      "ультракаин",
      "септанест",
      "убистезин",
      "препар",
      "адгезив",
      "рестав",
      "эндодонт",
      "рабочая длина",
      "апекслокатор",
      "мастер-штифт",
      "гуттаперч",
      "силер",
      "латеральная конденсация",
      "вертикальная конденсация",
      "стеклоиономер",
      "сиц",
      "mta",
      "гермет",
      "ирригац",
      "канал",
      "пломб",
      "временная пломба"
    ],
    objectiveFallback: "Объективно уточнить зуб, полость/реставрацию, перкуссию, зондирование, реакцию на холод и данные снимка.",
    diagnosisFallback: null,
    planFallback: "План: уточнить диагноз, согласовать анестезию, изоляцию, лечение кариеса/эндо и контроль окклюзии.",
    reviewHints: ["Проверить зуб, диагноз K02/K04, снимок и согласие на лечение."]
  },
  orthopedist: {
    complaintTokens: ["корон", "вклад", "протез", "скол", "эстет", "жев", "мост", "винир"],
    objectiveTokens: ["культ", "прикус", "окклюз", "уступ", "слеп", "скан", "абатмент", "препар"],
    diagnosisTokens: ["k08", "адент", "дефект", "стираем", "разруш", "ортопед"],
    planTokens: ["скан", "слеп", "препар", "временн", "корон", "вклад", "протез", "примерк", "фиксац"],
    objectiveFallback: "Объективно уточнить опоры, прикус, окклюзионные контакты, состояние пародонта и снимки опорных зубов.",
    diagnosisFallback: null,
    planFallback: "План: диагностика опор, фотопротокол/сканирование, варианты ортопедической конструкции, временный этап и фиксация.",
    reviewHints: ["Не финализировать ортопедический план без оценки опор, прикуса и согласованных альтернатив."]
  },
  surgeon: {
    complaintTokens: ["удал", "отек", "абсцесс", "шов", "травм", "альвеолит", "зуб мудрости", "восьм"],
    objectiveTokens: ["отек", "инфильтр", "слизист", "лун", "шов", "подвиж", "перкус", "кт", "канал нижней челюсти"],
    diagnosisTokens: ["ретенц", "дистоп", "периост", "абсцесс", "альвеолит", "k01", "k04"],
    planTokens: ["анест", "удал", "разрез", "дрен", "швы", "кюретаж", "рекоменд", "контроль"],
    objectiveFallback: "Объективно уточнить отек, слизистую, подвижность, перкуссию, КТ/снимок и отношение к анатомическим структурам.",
    diagnosisFallback: null,
    planFallback: "План: анестезия, хирургический этап, гемостаз/швы, рекомендации, контрольный осмотр.",
    reviewHints: ["Проверить аллергии, антикоагулянты, давление, КТ/снимок и послеоперационные рекомендации."]
  },
  orthodontist: {
    complaintTokens: ["прикус", "скуч", "брекет", "элайн", "ретейн", "щелк", "сустав"],
    objectiveTokens: ["класс", "перекрыт", "скуч", "диаст", "трема", "средняя линия", "трг", "оптг", "модел"],
    diagnosisTokens: ["дисталь", "мезиаль", "глубок", "открыт", "перекрест", "аномал"],
    planTokens: ["диагност", "трг", "оптг", "скан", "брекет", "элайн", "сепарац", "ретенц", "контроль"],
    objectiveFallback: "Объективно уточнить прикус, классы, скученность, средние линии, ВНЧС, ОПТГ/ТРГ/сканы.",
    diagnosisFallback: null,
    planFallback: "План: ортодонтическая диагностика, фотопротокол, ОПТГ/ТРГ/скан, варианты брекеты/элайнеры и ретенция.",
    reviewHints: ["Не обещать сроки без диагностики, анализа снимков, моделей и обсуждения ретенции."]
  },
  periodontist: {
    complaintTokens: ["десн", "кровоточ", "карман", "подвиж", "рецесс", "запах", "оголен"],
    objectiveTokens: ["карман", "кровоточ", "рецесс", "подвиж", "фуркац", "налет", "камень", "индекс"],
    diagnosisTokens: ["k05", "гингив", "пародонтит", "рецесс", "мукозит"],
    planTokens: ["пародонтограмм", "снятие", "скейлинг", "кюретаж", "шинир", "recall", "контроль"],
    objectiveFallback: "Объективно уточнить индексы налета/кровоточивости, глубину карманов, рецессии, подвижность и снимки.",
    diagnosisFallback: null,
    planFallback: "План: пародонтальная карта, профессиональная гигиена/скейлинг, домашняя гигиена, recall и контроль.",
    reviewHints: ["Пародонтальный статус требует измерений, индексов и динамического контроля."]
  },
  hygienist: {
    complaintTokens: ["налет", "камень", "пигмент", "запах", "проф", "гигиен", "кровоточ"],
    objectiveTokens: ["налет", "камень", "пигмент", "индекс", "десн", "air flow", "airflow", "ультразв"],
    diagnosisTokens: ["налет", "зубной камень", "гингив", "k05"],
    planTokens: ["ультразв", "air flow", "airflow", "полиров", "фтор", "обуч", "ершик", "нить", "recall"],
    objectiveFallback: "Объективно уточнить налет, камень, пигментацию, состояние десны, индексы гигиены и зоны риска.",
    diagnosisFallback: null,
    planFallback: "План: профгигиена, полировка, реминерализация по показаниям, обучение домашней гигиене и recall.",
    reviewHints: ["Профилактический прием должен завершаться понятной домашней гигиеной и сроком recall."]
  },
  pediatric: {
    complaintTokens: ["молоч", "ребен", "страх", "адаптац", "кариес", "боль", "пломб"],
    objectiveTokens: ["молоч", "прикус", "кари", "налет", "гермет", "пульп", "поведение"],
    diagnosisTokens: ["кариес", "пульп", "периодонт", "гингив"],
    planTokens: ["адаптац", "аппликац", "гермет", "пломб", "лечение", "проф", "контроль"],
    objectiveFallback: "Объективно уточнить зубы молочного/постоянного прикуса, поведение ребенка, налет, кариес и слизистую.",
    diagnosisFallback: null,
    planFallback: "План: адаптация, лечение/профилактика по показаниям, инструкции родителю, контроль.",
    reviewHints: ["Фиксировать согласие законного представителя и поведение ребенка на приеме."]
  },
  implantologist: {
    complaintTokens: ["имплан", "нет зуб", "адент", "кость", "синус", "протез", "жев"],
    objectiveTokens: ["кт", "cbct", "кость", "синус", "нерв", "гребень", "слизист", "шаблон", "окклюз"],
    diagnosisTokens: ["адент", "атроф", "дефект", "периимплант", "k08"],
    planTokens: ["кт", "планирован", "имплан", "навигац", "шаблон", "синус", "костн", "формиров", "раскрыт"],
    objectiveFallback: "Объективно уточнить зону адентии, объем кости по КТ, слизистую, соседние зубы, окклюзию и риски.",
    diagnosisFallback: null,
    planFallback: "План: КТ-анализ, варианты имплантации/костной пластики, сроки этапов, согласие и хирургический протокол.",
    reviewHints: ["Имплантационный план не финализировать без КТ, медицинских рисков и ортопедической цели."]
  },
  radiologist: {
    complaintTokens: ["снимок", "кт", "оптг", "трг", "опис", "рентген", "очаг"],
    objectiveTokens: ["кт", "cbct", "оптг", "трг", "периапик", "очаг", "канал", "пазух", "сустав"],
    diagnosisTokens: ["очаг", "киста", "гранул", "резорб", "периодонт", "опис"],
    planTokens: ["опис", "рекоменд", "сопостав", "консультац", "контроль"],
    objectiveFallback: "Описание исследования: указать тип снимка, область, качество, ключевые находки и ограничения.",
    diagnosisFallback: "Описание снимка требует клинической корреляции лечащим врачом.",
    planFallback: "План: передать описание лечащему врачу, сопоставить с жалобами и клиническим осмотром.",
    reviewHints: ["Рентгенологическое описание не является самостоятельным клиническим диагнозом."]
  },
  universal: {
    complaintTokens: ["осмотр", "консульт", "первич", "план", "проф", "жалоб"],
    objectiveTokens: ["осмотр", "зуб", "слизист", "прикус", "гигиен", "снимок", "пародонт"],
    diagnosisTokens: ["диагноз", "кариес", "адент", "гингив", "пародонт"],
    planTokens: ["план", "маршрут", "консультац", "снимок", "проф", "контроль"],
    objectiveFallback: "Объективно уточнить зубную формулу, слизистую, пародонтальный статус, гигиену, прикус и снимки по показаниям.",
    diagnosisFallback: null,
    planFallback: "План: маршрутизация по специальностям, снимки/документы по показаниям, согласование приоритетов лечения.",
    reviewHints: ["Осмотр должен давать понятный маршрут: что срочно, что планово, что наблюдать."]
  }
};

export type DentalSpeechNormalization = {
  rawText: string;
  normalizedText: string;
  changedPhrases: string[];
  warnings: string[];
};

const spokenToothNumberMap: Array<[RegExp, string]> = [
  [/\b(?:один\s+один|одиннадцат(?:ый|ого|ом)?)\b/gi, "11"],
  [/\b(?:один\s+два|двенадцат(?:ый|ого|ом)?)\b/gi, "12"],
  [/\b(?:один\s+три|тринадцат(?:ый|ого|ом)?)\b/gi, "13"],
  [/\b(?:один\s+четыре|четырнадцат(?:ый|ого|ом)?)\b/gi, "14"],
  [/\b(?:один\s+пять|пятнадцат(?:ый|ого|ом)?)\b/gi, "15"],
  [/\b(?:один\s+шесть|шестнадцат(?:ый|ого|ом)?)\b/gi, "16"],
  [/\b(?:один\s+семь|семнадцат(?:ый|ого|ом)?)\b/gi, "17"],
  [/\b(?:один\s+восемь|восемнадцат(?:ый|ого|ом)?)\b/gi, "18"],
  [/\b(?:два\s+один|двадцать\s+перв(?:ый|ого|ом)?)\b/gi, "21"],
  [/\b(?:два\s+два|двадцать\s+втор(?:ой|ого|ом)?)\b/gi, "22"],
  [/\b(?:два\s+три|двадцать\s+трет(?:ий|ьего|ьем)?)\b/gi, "23"],
  [/\b(?:два\s+четыре|двадцать\s+четверт(?:ый|ого|ом)?)\b/gi, "24"],
  [/\b(?:два\s+пять|двадцать\s+пят(?:ый|ого|ом)?)\b/gi, "25"],
  [/\b(?:два\s+шесть|двадцать\s+шест(?:ой|ого|ом)?)\b/gi, "26"],
  [/\b(?:два\s+семь|двадцать\s+седьм(?:ой|ого|ом)?)\b/gi, "27"],
  [/\b(?:два\s+восемь|двадцать\s+восьм(?:ой|ого|ом)?)\b/gi, "28"],
  [/\b(?:три\s+один|тридцать\s+перв(?:ый|ого|ом)?)\b/gi, "31"],
  [/\b(?:три\s+два|тридцать\s+втор(?:ой|ого|ом)?)\b/gi, "32"],
  [/\b(?:три\s+три|тридцать\s+трет(?:ий|ьего|ьем)?)\b/gi, "33"],
  [/\b(?:три\s+четыре|тридцать\s+четверт(?:ый|ого|ом)?)\b/gi, "34"],
  [/\b(?:три\s+пять|тридцать\s+пят(?:ый|ого|ом)?)\b/gi, "35"],
  [/\b(?:три\s+шесть|тридцать\s+шест(?:ой|ого|ом)?)\b/gi, "36"],
  [/\b(?:три\s+семь|тридцать\s+седьм(?:ой|ого|ом)?)\b/gi, "37"],
  [/\b(?:три\s+восемь|тридцать\s+восьм(?:ой|ого|ом)?)\b/gi, "38"],
  [/\b(?:четыре\s+один|сорок\s+перв(?:ый|ого|ом)?)\b/gi, "41"],
  [/\b(?:четыре\s+два|сорок\s+втор(?:ой|ого|ом)?)\b/gi, "42"],
  [/\b(?:четыре\s+три|сорок\s+трет(?:ий|ьего|ьем)?)\b/gi, "43"],
  [/\b(?:четыре\s+четыре|сорок\s+четверт(?:ый|ого|ом)?)\b/gi, "44"],
  [/\b(?:четыре\s+пять|сорок\s+пят(?:ый|ого|ом)?)\b/gi, "45"],
  [/\b(?:четыре\s+шесть|сорок\s+шест(?:ой|ого|ом)?)\b/gi, "46"],
  [/\b(?:четыре\s+семь|сорок\s+седьм(?:ой|ого|ом)?)\b/gi, "47"],
  [/\b(?:четыре\s+восемь|сорок\s+восьм(?:ой|ого|ом)?)\b/gi, "48"]
];

function dentalTermPattern(source: string): RegExp {
  return new RegExp(`(?<![0-9A-Za-zА-Яа-яЁё])(?:${source})(?![0-9A-Za-zА-Яа-яЁё])`, "gi");
}

const spokenAnatomicToothQuadrants = [
  { archPattern: String.raw`верхн(?:яя|ей|юю|ий|его|ем)?`, sidePattern: String.raw`прав(?:ая|ой|ую|ый|ого|ом)?`, quadrant: "1" },
  { archPattern: String.raw`верхн(?:яя|ей|юю|ий|его|ем)?`, sidePattern: String.raw`лев(?:ая|ой|ую|ый|ого|ом)?`, quadrant: "2" },
  { archPattern: String.raw`нижн(?:яя|ей|юю|ий|его|ем)?`, sidePattern: String.raw`лев(?:ая|ой|ую|ый|ого|ом)?`, quadrant: "3" },
  { archPattern: String.raw`нижн(?:яя|ей|юю|ий|его|ем)?`, sidePattern: String.raw`прав(?:ая|ой|ую|ый|ого|ом)?`, quadrant: "4" }
];

const spokenAnatomicToothPositions: Array<[string, string]> = [
  ["1", String.raw`единиц(?:а|ы|у|ей|е)?|перв(?:ый|ого|ому|ым|ом)?`],
  ["2", String.raw`двойк(?:а|и|у|ой|е)?|двоечк(?:а|и|у|ой|е)?|втор(?:ой|ого|ому|ым|ом)?`],
  ["3", String.raw`тройк(?:а|и|у|ой|е)?|клык(?:а|ом|е)?|трет(?:ий|ьего|ьему|ьим|ьем)?`],
  ["4", String.raw`четверк(?:а|и|у|ой|е)?|четверочк(?:а|и|у|ой|е)?|четверт(?:ый|ого|ому|ым|ом)?`],
  ["5", String.raw`пятерк(?:а|и|у|ой|е)?|пятерочк(?:а|и|у|ой|е)?|пят(?:ый|ого|ому|ым|ом)?`],
  ["6", String.raw`шестер(ка|ки|ку|кой|ке)?|шест(?:ой|ого|ому|ым|ом)?`],
  ["7", String.raw`семерк(?:а|и|у|ой|е)?|седьм(?:ой|ого|ому|ым|ом)?`],
  ["8", String.raw`восьмерк(?:а|и|у|ой|е)?|восьм(?:ой|ого|ому|ым|ом)?`]
];

const spokenAnatomicToothMap: Array<[RegExp, string]> = spokenAnatomicToothQuadrants.flatMap(
  ({ archPattern, sidePattern, quadrant }) =>
    spokenAnatomicToothPositions.flatMap(([position, positionPattern]) => {
      const replacement = `зуб ${quadrant}${position}`;
      return [
        [dentalTermPattern(String.raw`${archPattern}\s+${sidePattern}\s+(?:${positionPattern})`), replacement],
        [dentalTermPattern(String.raw`${sidePattern}\s+${archPattern}\s+(?:${positionPattern})`), replacement],
        [dentalTermPattern(String.raw`(?:${positionPattern})\s+${archPattern}\s+${sidePattern}`), replacement]
      ] as Array<[RegExp, string]>;
    })
);

const dentalSpeechReplacementMap: Array<[RegExp, string, string]> = [
  [
    /(?<![0-9A-Za-zА-Яа-яЁё])((?:зуб(?:а|е|ом)?|област(?:ь|и)|fdi)\s+)([1-4])\s*[\.,]\s*([1-8])(?![0-9A-Za-zА-Яа-яЁё])/gi,
    "$1$2$3",
    "номер зуба FDI"
  ],
  [
    /(?<![0-9A-Za-zА-Яа-яЁё])([1-4])\s*[\.,]\s*([1-8])(\s+(?:зуб|зуба|зубе|зубом))(?![0-9A-Za-zА-Яа-яЁё])/gi,
    "$1$2$3",
    "номер зуба FDI"
  ],
  [dentalTermPattern(String.raw`к\s*л\s*к\s*т`), "КЛКТ", "КЛКТ"],
  [dentalTermPattern(String.raw`клкт`), "КЛКТ", "КЛКТ"],
  [dentalTermPattern(String.raw`конусно[-\s]*лучев(?:ая|ой|ую)\s+компьютерн(?:ая|ой|ую)\s+томограф(?:ия|ию)`), "КЛКТ", "КЛКТ"],
  [dentalTermPattern(String.raw`к\s*т`), "КТ", "КТ"],
  [dentalTermPattern(String.raw`кт`), "КТ", "КТ"],
  [dentalTermPattern(String.raw`о\s*п\s*т\s*г`), "ОПТГ", "ОПТГ"],
  [dentalTermPattern(String.raw`оптг`), "ОПТГ", "ОПТГ"],
  [dentalTermPattern(String.raw`р\s*в\s*г|эр\s*вэ\s*гэ|рвг`), "RVG", "RVG"],
  [dentalTermPattern(String.raw`э\s*о\s*д|е\s*о\s*д|эод|еод`), "ЭОД", "ЭОД"],
  [dentalTermPattern(String.raw`д\s*с|ди\s*эс|ds|d\/s`), "DS", "DS"],
  [dentalTermPattern(String.raw`д\s*икс|ди\s*икс|dx`), "Dx", "Dx"],
  [dentalTermPattern(String.raw`м\s*к\s*б(?:\s*[-–]?\s*10)?|эм\s*ка\s*бэ(?:\s*[-–]?\s*10)?`), "МКБ-10", "МКБ-10"],
  [dentalTermPattern(String.raw`(?:k|к|ка)\s*0\s*2\s*(?:[.,]|точк(?:а|и)?)\s*1`), "K02.1", "K02.1"],
  [dentalTermPattern(String.raw`(?:k|к|ка)\s*0\s*4\s*(?:[.,]|точк(?:а|и)?)\s*0`), "K04.0", "K04.0"],
  [dentalTermPattern(String.raw`(?:k|к|ка)\s*0\s*4\s*(?:[.,]|точк(?:а|и)?)\s*5`), "K04.5", "K04.5"],
  [dentalTermPattern(String.raw`си\s*би\s*си\s*ти|cbct`), "CBCT", "CBCT"],
  [dentalTermPattern(String.raw`(?:кофердам|кофедам|кофирдам|коффердамм)(?:ом|а|е)?`), "коффердам", "коффердам"],
  [dentalTermPattern(String.raw`раббер\s*дам(?:ом|а|е)?`), "коффердам", "коффердам"],
  [dentalTermPattern(String.raw`раббердам(?:ом|а|е)?`), "коффердам", "коффердам"],
  [dentalTermPattern(String.raw`эйр\s*флоу|айр\s*флоу|air\s*flow|airflow`), "Air Flow", "Air Flow"],
  [dentalTermPattern(String.raw`(?:пульпид|пульпед)(?:а|ом|е)?`), "пульпит", "пульпит"],
  [dentalTermPattern(String.raw`(?:периодантит|переодонтит)(?:а|ом|е)?`), "периодонтит", "периодонтит"],
  [dentalTermPattern(String.raw`(?:пародантит|парадонтит)(?:а|ом|е)?`), "пародонтит", "пародонтит"],
  [dentalTermPattern(String.raw`кариес\s+дентина|кариес\s+дентин`), "кариес дентина", "кариес дентина"],
  [dentalTermPattern(String.raw`кариозн(?:ая|ой|ую)\s+поласть|кариозн(?:ая|ой|ую)\s+полас[тд]ь`), "кариозная полость", "кариозная полость"],
  [dentalTermPattern(String.raw`зандирован(?:ие|ия)|зондированее`), "зондирование", "зондирование"],
  [dentalTermPattern(String.raw`перкусия`), "перкуссия", "перкуссия"],
  [dentalTermPattern(String.raw`палпац(?:ия|ии)|пальпацыя`), "пальпация", "пальпация"],
  [dentalTermPattern(String.raw`адгизивн(?:ый|ого|ом|ая|ую)`), "адгезивный", "адгезивный"],
  [dentalTermPattern(String.raw`рестоврац(?:ия|ии|ию)`), "реставрация", "реставрация"],
  [dentalTermPattern(String.raw`пламб(?:а|ы|у|ой|е)?`), "пломба", "пломба"],
  [dentalTermPattern(String.raw`матриц(?:а|ы|у|ей|е)?`), "матрица", "матрица"],
  [dentalTermPattern(String.raw`клин(?:а|ом|е)?`), "клин", "клин"],
  [dentalTermPattern(String.raw`финиров(?:ание|ания)|финишн(?:ая|ой|ую)\s+обработк(?:а|и|у)`), "финирование", "финирование"],
  [dentalTermPattern(String.raw`полеровк(?:а|и|у)|полировк(?:а|и|у)`), "полировка", "полировка"],
  [dentalTermPattern(String.raw`холодов(?:ая|ой|ую)\s+проб(?:а|ы|у)|термо\s*проб(?:а|ы|у)|термопроб(?:а|ы|у)`), "холодовая проба", "холодовая проба"],
  [dentalTermPattern(String.raw`визиограф(?:ия|ии|ию)|прицельн(?:ый|ого|ом|ая|ую)\s+сним(?:ок|ка)`), "прицельный снимок", "прицельный снимок"],
  [dentalTermPattern(String.raw`и\s*р\s*о\s*п\s*з|иропз`), "ИРОПЗ", "ИРОПЗ"],
  [dentalTermPattern(String.raw`к\s*п\s*у|кпу`), "КПУ", "КПУ"],
  [dentalTermPattern(String.raw`с\s*и\s*ц|сиц`), "СИЦ", "СИЦ"],
  [dentalTermPattern(String.raw`м\s*т\s*а|mta`), "MTA", "MTA"],
  [dentalTermPattern(String.raw`стекло\s*иономерн(ый|ого|ом|ая|ую)?`), "стеклоиономерн$1", "стеклоиономерный цемент"],
  [dentalTermPattern(String.raw`фесур(?:а|ы|у|ой)?|фиссур(?:а|ы|у|ой)?`), "фиссура", "фиссура"],
  [dentalTermPattern(String.raw`гермитизац(?:ия|ии|ию)|герметизац(?:ия|ии|ию)`), "герметизация", "герметизация"],
  [dentalTermPattern(String.raw`мастер\s*штифт(?:а|ом|е)?`), "мастер-штифт", "мастер-штифт"],
  [dentalTermPattern(String.raw`м\s*о\s*д|эм\s*о\s*дэ|мод`), "МОД", "МОД"],
  [dentalTermPattern(String.raw`м\s*о|эм\s*о`), "МО", "МО"],
  [dentalTermPattern(String.raw`о\s*д|о\s*дэ`), "ОД", "ОД"],
  [
    dentalTermPattern(String.raw`мезиальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+окклюзионн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+дистальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`),
    "МОД",
    "МОД"
  ],
  [
    dentalTermPattern(String.raw`мезиальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+окклюзионн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`),
    "МО",
    "МО"
  ],
  [
    dentalTermPattern(String.raw`дистальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+окклюзионн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`),
    "ОД",
    "ОД"
  ],
  [dentalTermPattern(String.raw`перв(?:ого|ый|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`), "I класс по Блэку", "класс по Блэку"],
  [dentalTermPattern(String.raw`втор(?:ого|ой|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`), "II класс по Блэку", "класс по Блэку"],
  [dentalTermPattern(String.raw`треть(?:его|ий|ем)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`), "III класс по Блэку", "класс по Блэку"],
  [dentalTermPattern(String.raw`четверт(?:ого|ый|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`), "IV класс по Блэку", "класс по Блэку"],
  [dentalTermPattern(String.raw`пят(?:ого|ый|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`), "V класс по Блэку", "класс по Блэку"],
  [dentalTermPattern(String.raw`оклюзионн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`), "окклюзионн$1", "окклюзионная поверхность"],
  [dentalTermPattern(String.raw`медиальн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`), "мезиальн$1", "мезиальная поверхность"],
  [dentalTermPattern(String.raw`апрокс\s*имальн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?|апроксималн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`), "апроксимальн$1$2", "апроксимальная поверхность"],
  [dentalTermPattern(String.raw`контактн(?:ый|ого|ом|ая|ую|ой)?\s+пун[кт](?:а|ом|е)?`), "контактный пункт", "контактный пункт"],
  [dentalTermPattern(String.raw`при\s+шеечн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`), "пришеечн$1", "пришеечная область"],
  [dentalTermPattern(String.raw`апек\s*локатор`), "апекслокатор", "апекслокатор"],
  [dentalTermPattern(String.raw`рабоч(?:ая|ей|ую)\s+длин(?:а|ы|у)`), "рабочая длина", "рабочая длина"],
  [dentalTermPattern(String.raw`гут[ао]\s*перч(?:а|и|у|ей)?`), "гуттаперча", "гуттаперча"],
  [dentalTermPattern(String.raw`силлер(?:а|ом|е)?`), "силер", "силер"],
  [dentalTermPattern(String.raw`времен(?:ная|ной|ную)\s+пломб(?:а|ы|у|ой)?`), "временная пломба", "временная пломба"],
  [dentalTermPattern(String.raw`статус\s+пр[еэ]з[еэ]нс|status\s+praesens`), "status praesens", "status praesens"],
  [dentalTermPattern(String.raw`статус\s+локалис|status\s+localis`), "status localis", "status localis"],
  [dentalTermPattern(String.raw`ирригац(?:ия|ии|ию)|иригац(?:ия|ии|ию)`), "ирригация", "ирригация"],
  [dentalTermPattern(String.raw`пломбиров(?:ание|ания)|пламбиров(?:ание|ания)`), "пломбирование", "пломбирование"],
  [dentalTermPattern(String.raw`шлифовк(?:а|и|у|ой)|пришлифовк(?:а|и|у|ой)`), "шлифовка", "шлифовка"],
  [dentalTermPattern(String.raw`коррекц(?:ия|ии|ию)\s+окклюз(?:ии|ия|ию)|корекц(?:ия|ии|ию)\s+оклюз(?:ии|ия|ию)`), "коррекция окклюзии", "коррекция окклюзии"],
  [dentalTermPattern(String.raw`артикуляционн(?:ая|ой|ую)\s+бумаг(?:а|и|у|ой)`), "артикуляционная бумага", "артикуляционная бумага"],
  [dentalTermPattern(String.raw`карпул(?:а|ы|у|ой|е)?`), "карпула", "карпула"],
  [dentalTermPattern(String.raw`переапикальн(?:ый|ого|ом)?|периапекальн(?:ый|ого|ом)?`), "периапикальный", "периапикальный"],
  [dentalTermPattern(String.raw`обьективно|объективна`), "объективно", "объективно"],
  [dentalTermPattern(String.raw`анастезия|анистезия|анестезея`), "анестезия", "анестезия"],
  [dentalTermPattern(String.raw`инфильтрационн(?:ая|ой|ую)|инфилтрационн(?:ая|ой|ую)`), "инфильтрационная", "инфильтрационная анестезия"],
  [dentalTermPattern(String.raw`проводников(?:ая|ой|ую)`), "проводниковая", "проводниковая анестезия"],
  [dentalTermPattern(String.raw`ортопантомограмма|ортопантомограмму`), "ОПТГ", "ОПТГ"]
];

const spokenToothOrdinalMap: Array<[RegExp, string]> = [
  [dentalTermPattern(String.raw`одиннадцат(?:ый|ого|ому|ым|ом)?`), "11"],
  [dentalTermPattern(String.raw`двенадцат(?:ый|ого|ому|ым|ом)?`), "12"],
  [dentalTermPattern(String.raw`тринадцат(?:ый|ого|ому|ым|ом)?`), "13"],
  [dentalTermPattern(String.raw`четырнадцат(?:ый|ого|ому|ым|ом)?`), "14"],
  [dentalTermPattern(String.raw`пятнадцат(?:ый|ого|ому|ым|ом)?`), "15"],
  [dentalTermPattern(String.raw`шестнадцат(?:ый|ого|ому|ым|ом)?`), "16"],
  [dentalTermPattern(String.raw`семнадцат(?:ый|ого|ому|ым|ом)?`), "17"],
  [dentalTermPattern(String.raw`восемнадцат(?:ый|ого|ому|ым|ом)?`), "18"],
  [dentalTermPattern(String.raw`двадцать\s+перв(?:ый|ого|ому|ым|ом)?`), "21"],
  [dentalTermPattern(String.raw`двадцать\s+втор(?:ой|ого|ому|ым|ом)?`), "22"],
  [dentalTermPattern(String.raw`двадцать\s+трет(?:ий|ьего|ьему|ьим|ьем)?`), "23"],
  [dentalTermPattern(String.raw`двадцать\s+четверт(?:ый|ого|ому|ым|ом)?`), "24"],
  [dentalTermPattern(String.raw`двадцать\s+пят(?:ый|ого|ому|ым|ом)?`), "25"],
  [dentalTermPattern(String.raw`двадцать\s+шест(?:ой|ого|ому|ым|ом)?`), "26"],
  [dentalTermPattern(String.raw`двадцать\s+седьм(?:ой|ого|ому|ым|ом)?`), "27"],
  [dentalTermPattern(String.raw`двадцать\s+восьм(?:ой|ого|ому|ым|ом)?`), "28"],
  [dentalTermPattern(String.raw`тридцать\s+перв(?:ый|ого|ому|ым|ом)?`), "31"],
  [dentalTermPattern(String.raw`тридцать\s+втор(?:ой|ого|ому|ым|ом)?`), "32"],
  [dentalTermPattern(String.raw`тридцать\s+трет(?:ий|ьего|ьему|ьим|ьем)?`), "33"],
  [dentalTermPattern(String.raw`тридцать\s+четверт(?:ый|ого|ому|ым|ом)?`), "34"],
  [dentalTermPattern(String.raw`тридцать\s+пят(?:ый|ого|ому|ым|ом)?`), "35"],
  [dentalTermPattern(String.raw`тридцать\s+шест(?:ой|ого|ому|ым|ом)?`), "36"],
  [dentalTermPattern(String.raw`тридцать\s+седьм(?:ой|ого|ому|ым|ом)?`), "37"],
  [dentalTermPattern(String.raw`тридцать\s+восьм(?:ой|ого|ому|ым|ом)?`), "38"],
  [dentalTermPattern(String.raw`сорок\s+перв(?:ый|ого|ому|ым|ом)?`), "41"],
  [dentalTermPattern(String.raw`сорок\s+втор(?:ой|ого|ому|ым|ом)?`), "42"],
  [dentalTermPattern(String.raw`сорок\s+трет(?:ий|ьего|ьему|ьим|ьем)?`), "43"],
  [dentalTermPattern(String.raw`сорок\s+четверт(?:ый|ого|ому|ым|ом)?`), "44"],
  [dentalTermPattern(String.raw`сорок\s+пят(?:ый|ого|ому|ым|ом)?`), "45"],
  [dentalTermPattern(String.raw`сорок\s+шест(?:ой|ого|ому|ым|ом)?`), "46"],
  [dentalTermPattern(String.raw`сорок\s+седьм(?:ой|ого|ому|ым|ом)?`), "47"],
  [dentalTermPattern(String.raw`сорок\s+восьм(?:ой|ого|ому|ым|ом)?`), "48"]
];

const spokenToothPhraseMap: Array<[string, string]> = [
  ["один один", "11"],
  ["одиннадцатый", "11"],
  ["одиннадцатого", "11"],
  ["один два", "12"],
  ["двенадцатый", "12"],
  ["один три", "13"],
  ["тринадцатый", "13"],
  ["один четыре", "14"],
  ["четырнадцатый", "14"],
  ["один пять", "15"],
  ["пятнадцатый", "15"],
  ["один шесть", "16"],
  ["шестнадцатый", "16"],
  ["один семь", "17"],
  ["семнадцатый", "17"],
  ["один восемь", "18"],
  ["восемнадцатый", "18"],
  ["два один", "21"],
  ["двадцать первый", "21"],
  ["два два", "22"],
  ["двадцать второй", "22"],
  ["два три", "23"],
  ["двадцать третий", "23"],
  ["два четыре", "24"],
  ["двадцать четвертый", "24"],
  ["два пять", "25"],
  ["двадцать пятый", "25"],
  ["два шесть", "26"],
  ["двадцать шестой", "26"],
  ["два семь", "27"],
  ["двадцать седьмой", "27"],
  ["два восемь", "28"],
  ["двадцать восьмой", "28"],
  ["три один", "31"],
  ["тридцать первый", "31"],
  ["три два", "32"],
  ["тридцать второй", "32"],
  ["три три", "33"],
  ["тридцать третий", "33"],
  ["три четыре", "34"],
  ["тридцать четвертый", "34"],
  ["три пять", "35"],
  ["тридцать пятый", "35"],
  ["три шесть", "36"],
  ["тридцать шестой", "36"],
  ["три семь", "37"],
  ["тридцать седьмой", "37"],
  ["три восемь", "38"],
  ["тридцать восьмой", "38"],
  ["четыре один", "41"],
  ["сорок первый", "41"],
  ["четыре два", "42"],
  ["сорок второй", "42"],
  ["четыре три", "43"],
  ["сорок третий", "43"],
  ["четыре четыре", "44"],
  ["сорок четвертый", "44"],
  ["четыре пять", "45"],
  ["сорок пятый", "45"],
  ["четыре шесть", "46"],
  ["сорок шестой", "46"],
  ["четыре семь", "47"],
  ["сорок седьмой", "47"],
  ["четыре восемь", "48"],
  ["сорок восьмой", "48"]
];

const dentalSpeechPhraseMap: Array<[string, string, string]> = [
  ["к л к т", "КЛКТ", "КЛКТ"],
  ["клкт", "КЛКТ", "КЛКТ"],
  ["конусно лучевая компьютерная томография", "КЛКТ", "КЛКТ"],
  ["к т", "КТ", "КТ"],
  ["кт", "КТ", "КТ"],
  ["о п т г", "ОПТГ", "ОПТГ"],
  ["оптг", "ОПТГ", "ОПТГ"],
  ["р в г", "RVG", "RVG"],
  ["эр вэ гэ", "RVG", "RVG"],
  ["рвг", "RVG", "RVG"],
  ["э о д", "ЭОД", "ЭОД"],
  ["е о д", "ЭОД", "ЭОД"],
  ["эод", "ЭОД", "ЭОД"],
  ["еод", "ЭОД", "ЭОД"],
  ["ди эс", "DS", "DS"],
  ["д с", "DS", "DS"],
  ["ди икс", "Dx", "Dx"],
  ["д икс", "Dx", "Dx"],
  ["эм ка бэ", "МКБ-10", "МКБ-10"],
  ["м к б", "МКБ-10", "МКБ-10"],
  ["ка ноль два точка один", "K02.1", "K02.1"],
  ["к ноль два точка один", "K02.1", "K02.1"],
  ["ка ноль четыре точка ноль", "K04.0", "K04.0"],
  ["к ноль четыре точка ноль", "K04.0", "K04.0"],
  ["ка ноль четыре точка пять", "K04.5", "K04.5"],
  ["к ноль четыре точка пять", "K04.5", "K04.5"],
  ["си би си ти", "CBCT", "CBCT"],
  ["cbct", "CBCT", "CBCT"],
  ["кофердам", "коффердам", "коффердам"],
  ["кофедам", "коффердам", "коффердам"],
  ["кофирдам", "коффердам", "коффердам"],
  ["раббер дам", "коффердам", "коффердам"],
  ["эйр флоу", "Air Flow", "Air Flow"],
  ["айр флоу", "Air Flow", "Air Flow"],
  ["air flow", "Air Flow", "Air Flow"],
  ["airflow", "Air Flow", "Air Flow"],
  ["е макс", "E.max", "E.max"],
  ["и макс", "E.max", "E.max"],
  ["emax", "E.max", "E.max"],
  ["пульпид", "пульпит", "пульпит"],
  ["периодантит", "периодонтит", "периодонтит"],
  ["переодонтит", "периодонтит", "периодонтит"],
  ["пародантит", "пародонтит", "пародонтит"],
  ["парадонтит", "пародонтит", "пародонтит"],
  ["кариес дентин", "кариес дентина", "кариес дентина"],
  ["кариозная поласть", "кариозная полость", "кариозная полость"],
  ["зандирование", "зондирование", "зондирование"],
  ["перкусия", "перкуссия", "перкуссия"],
  ["пальпацыя", "пальпация", "пальпация"],
  ["адгизивный протокол", "адгезивный протокол", "адгезивный протокол"],
  ["рестоврация", "реставрация", "реставрация"],
  ["пламба", "пломба", "пломба"],
  ["холодовая проба", "холодовая проба", "холодовая проба"],
  ["термо проба", "холодовая проба", "холодовая проба"],
  ["визиография", "прицельный снимок", "прицельный снимок"],
  ["апрокс имальная", "апроксимальная", "апроксимальная поверхность"],
  ["апроксималная", "апроксимальная", "апроксимальная поверхность"],
  ["контактный пунт", "контактный пункт", "контактный пункт"],
  ["контактный пукнт", "контактный пункт", "контактный пункт"],
  ["и р о п з", "ИРОПЗ", "ИРОПЗ"],
  ["иропз", "ИРОПЗ", "ИРОПЗ"],
  ["к п у", "КПУ", "КПУ"],
  ["с и ц", "СИЦ", "СИЦ"],
  ["стекло иономерный", "стеклоиономерный", "стеклоиономерный цемент"],
  ["м т а", "MTA", "MTA"],
  ["фесура", "фиссура", "фиссура"],
  ["гермитизация", "герметизация", "герметизация"],
  ["мастер штифт", "мастер-штифт", "мастер-штифт"],
  ["м о д", "МОД", "МОД"],
  ["эм о дэ", "МОД", "МОД"],
  ["мезиально окклюзиально дистальная", "МОД", "МОД"],
  ["мезиально окклюзиальная", "МО", "МО"],
  ["дистально окклюзиальная", "ОД", "ОД"],
  ["второго класса по блэку", "II класс по Блэку", "класс по Блэку"],
  ["второго класса по блеку", "II класс по Блэку", "класс по Блэку"],
  ["финишная обработка", "финирование", "финирование"],
  ["полеровка", "полировка", "полировка"],
  ["корекция оклюзии", "коррекция окклюзии", "коррекция окклюзии"],
  ["коррекция оклюзии", "коррекция окклюзии", "коррекция окклюзии"],
  ["пришлифовка", "шлифовка", "шлифовка"],
  ["иригация", "ирригация", "ирригация"],
  ["пломбировка каналов", "пломбирование каналов", "пломбирование каналов"],
  ["диоксид циркония", "диоксид циркония", "диоксид циркония"],
  ["циркон", "цирконий", "цирконий"],
  ["металлокерамика", "металлокерамика", "металлокерамика"],
  ["пмма", "PMMA", "PMMA"],
  ["композитный винир", "композитный винир", "композитный винир"],
  ["керамический винир", "керамический винир", "керамический винир"],
  ["инлей", "inlay", "inlay"],
  ["онлей", "onlay", "onlay"],
  ["оверлей", "overlay", "overlay"],
  ["эндокоронка", "эндокоронка", "эндокоронка"],
  ["абатмент", "абатмент", "абатмент"],
  ["формирователь десны", "формирователь десны", "формирователь десны"],
  ["синус лифтинг", "синус-лифтинг", "синус-лифтинг"],
  ["костная пластика", "костная пластика", "костная пластика"],
  ["навигационный шаблон", "навигационный шаблон", "навигационный шаблон"],
  ["айтеро", "iTero", "iTero"],
  ["медит", "Medit", "Medit"],
  ["три шейп", "3Shape", "3Shape"],
  ["обьективно", "объективно", "объективно"],
  ["объективна", "объективно", "объективно"],
  ["статус презенс", "status praesens", "status praesens"],
  ["статус локалис", "status localis", "status localis"],
  ["анастезия", "анестезия", "анестезия"],
  ["анистезия", "анестезия", "анестезия"],
  ["ортопантомограмма", "ОПТГ", "ОПТГ"],
  ["ортопантомограмму", "ОПТГ", "ОПТГ"]
];

function escapedPhrasePattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![0-9A-Za-zА-Яа-яЁё])${escaped}(?![0-9A-Za-zА-Яа-яЁё])`, "gi");
}

function applyTrackedReplacement(text: string, pattern: RegExp, replacement: string, label: string, changes: string[]): string {
  if (!pattern.test(text)) return text;
  pattern.lastIndex = 0;
  changes.push(label);
  return text.replace(pattern, replacement);
}

function applyTrackedPhraseReplacement(text: string, phrase: string, replacement: string, label: string, changes: string[]): string {
  return applyTrackedReplacement(text, escapedPhrasePattern(phrase), replacement, label, changes);
}

function normalizeSpeechSections(text: string): string {
  return text
    .replace(/\s+((?:без\s+жалоб|жалобы\s+отрицает)\s*[:\-]?)/gi, "\n$1")
    .replace(/(?<!без)\s+(жалоб(?:ы|а)?(?!\s+отрицает)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:пациент\s+)?жалуется\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:пациент\s+)?отмечает\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:беспокоит|беспокоят)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+(анамнез\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:аллергологический\s+анамнез|аллерги(?:я|ю)|соматически|соматический\s+статус|препараты|лекарственные\s+препараты|постоянные\s+препараты)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+(со слов\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:из\s+анамнеза|со\s+слов\s+пациента|ранее\s+лечен|ранее\s+лечилась|после\s+лечения)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+(объективно\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:status\s+praesens|status\s+localis|осмотр|при\s+осмотре|на\s+снимке|рентгенологически)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:DS|Dx|D\/S)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:ds|dx|d\/s|предварительный\s+)?диагноз\s*[:\-]?|предварительно\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+(план\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+((?:лечение|показано|проведен(?:о|а|ы)?|выполнен(?:о|а|ы)?|сделан(?:о|а|ы)?|назначен(?:о|а|ы)?|рекомендован(?:о|а|ы)?)\s*[:\-]?)/gi, "\n$1")
    .replace(/\s+(рекомендации\s*[:\-]?)/gi, "\n$1")
    .replace(/\n{3,}/g, "\n\n");
}

export function normalizeDentalSpeechTranscript(
  transcript: string,
  specialty: DentalSpecialty = "universal"
): DentalSpeechNormalization {
  const rawText = transcript;
  let normalizedText = transcript
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
  const changedPhrases: string[] = [];

  for (const [phrase, replacement] of spokenToothPhraseMap) {
    normalizedText = applyTrackedPhraseReplacement(normalizedText, phrase, replacement, `номер зуба -> ${replacement}`, changedPhrases);
  }

  for (const [pattern, replacement] of spokenAnatomicToothMap) {
    normalizedText = applyTrackedReplacement(normalizedText, pattern, replacement, `анатомическое название зуба -> ${replacement.replace("зуб ", "")}`, changedPhrases);
  }

  for (const [phrase, replacement, label] of dentalSpeechPhraseMap) {
    normalizedText = applyTrackedPhraseReplacement(normalizedText, phrase, replacement, label, changedPhrases);
  }

  for (const [pattern, replacement] of spokenToothOrdinalMap) {
    normalizedText = applyTrackedReplacement(normalizedText, pattern, replacement, `номер зуба -> ${replacement}`, changedPhrases);
  }

  for (const [pattern, replacement] of spokenToothNumberMap) {
    normalizedText = applyTrackedReplacement(normalizedText, pattern, replacement, `номер зуба -> ${replacement}`, changedPhrases);
  }

  for (const [pattern, replacement, label] of dentalSpeechReplacementMap) {
    normalizedText = applyTrackedReplacement(normalizedText, pattern, replacement, label, changedPhrases);
  }

  normalizedText = normalizeSpeechSections(normalizedText)
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,.;:])(?=\S)/g, "$1 ")
    .replace(/\bK(0[0-9])\.\s+([0-9])\b/g, "K$1.$2")
    .replace(/\bE\.\s+max\b/gi, "E.max")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const toothCodes = extractToothCodes(normalizedText);
  const lower = normalizedText.toLowerCase();
  const warnings = [
    "Нормализация диктовки только чистит текст и секции, не добавляет клинические факты.",
    `Фокус нормализации: ${ruleParserSpecialtyLabels[specialty]}.`
  ];
  if (changedPhrases.length) {
    warnings.push(`Изменены фразы: ${uniqueStrings(changedPhrases).slice(0, 8).join(", ")}.`);
  }
  if (!toothCodes.length) {
    warnings.push("Номер зуба не найден автоматически: врачу нужно проверить запись.");
  }
  if (includesAnyText(lower, ["диагноз", "k01", "k02", "k04", "k05", "k08", "кариес", "пульпит", "периодонтит", "пародонтит"])) {
    warnings.push("В тексте есть диагноз/код: система не подтверждает его автоматически.");
  }

  return {
    rawText,
    normalizedText,
    changedPhrases: uniqueStrings(changedPhrases),
    warnings
  };
}

function includesAnyText(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

const complaintSectionPrefixes = [
  "жалобы",
  "жалоба",
  "без жалоб",
  "жалобы отрицает",
  "повод",
  "пациент жалуется",
  "жалуется",
  "пациент отмечает",
  "отмечает",
  "беспокоит",
  "беспокоят"
];
const anamnesisSectionPrefixes = [
  "анамнез",
  "аллергологический анамнез",
  "аллергия",
  "аллергию",
  "соматически",
  "соматический статус",
  "препараты",
  "лекарственные препараты",
  "постоянные препараты",
  "из анамнеза",
  "со слов",
  "со слов пациента",
  "ранее лечен",
  "ранее лечилась",
  "после лечения"
];
const objectiveSectionPrefixes = [
  "объективно",
  "объективный статус",
  "status praesens",
  "status localis",
  "осмотр",
  "при осмотре",
  "на снимке",
  "рентгенологически"
];
const diagnosisSectionPrefixes = ["диагноз", "предварительный диагноз", "клинический диагноз", "предварительно", "DS", "Dx", "D/S"];
const planSectionPrefixes = [
  "план",
  "лечение",
  "показано",
  "проведено",
  "проведена",
  "проведены",
  "выполнено",
  "выполнена",
  "выполнены",
  "сделано",
  "сделана",
  "сделаны",
  "рекомендации",
  "рекомендовано",
  "рекомендована",
  "рекомендованы",
  "назначения",
  "назначено",
  "назначена",
  "назначены"
];
const allSectionPrefixes = [
  ...complaintSectionPrefixes,
  ...anamnesisSectionPrefixes,
  ...objectiveSectionPrefixes,
  ...diagnosisSectionPrefixes,
  ...planSectionPrefixes
];

function cleanRuleParserLine(value: string): string {
  const trimmed = value.trim();
  if (/^(?:без\s+жалоб|жалобы\s+отрицает)\s*[:\-.]?$/i.test(trimmed)) return "нет";
  return value
    .replace(
      /^(жалобы|жалоба|без жалоб|жалобы отрицает|повод|пациент жалуется|жалуется|пациент отмечает|отмечает|беспокоит|беспокоят|анамнез|аллергологический анамнез|аллергия|аллергию|соматически|соматический статус|препараты|лекарственные препараты|постоянные препараты|из анамнеза|со слов|со слов пациента|ранее лечен|ранее лечилась|после лечения|объективно|объективный статус|status praesens|status localis|осмотр|при осмотре|на снимке|рентгенологически|диагноз|предварительный диагноз|клинический диагноз|предварительно|DS|Dx|D\/S|план|лечение|показано|проведено|проведена|проведены|выполнено|выполнена|выполнены|сделано|сделана|сделаны|рекомендации|рекомендовано|рекомендована|рекомендованы|назначения|назначено|назначена|назначены)\s*[:\-.]?\s*/i,
      ""
    )
    .replace(/[.;]+$/g, "")
    .trim();
}

function lineStartsWithSection(value: string, sectionPrefixes: string[]): boolean {
  const lower = value.toLowerCase().trim();
  return sectionPrefixes.some(
    (prefix) => {
      const normalizedPrefix = prefix.toLowerCase();
      return (
        lower === normalizedPrefix ||
        lower.startsWith(`${normalizedPrefix}:`) ||
        lower.startsWith(`${normalizedPrefix}.`) ||
        lower.startsWith(`${normalizedPrefix},`) ||
        lower.startsWith(`${normalizedPrefix};`) ||
        lower.startsWith(`${normalizedPrefix} -`) ||
        lower.startsWith(`${normalizedPrefix}-`) ||
        lower.startsWith(`${normalizedPrefix} `)
      );
    }
  );
}

function cleanFallbackComplaintLine(context: RuleParserContext): string | null {
  const firstLine = context.allLines[0] ?? null;
  if (!firstLine) return null;
  if (lineStartsWithSection(firstLine, complaintSectionPrefixes) || includesAnyText(firstLine.toLowerCase(), ["без жалоб", "жалобы отрицает"])) {
    return cleanRuleParserLine(firstLine) || firstLine;
  }
  return firstLine;
}

type RuleParserContext = {
  allLines: string[];
  unscopedLines: string[];
  sectionBlocks: string[];
};

function splitRuleParserSentences(value: string): string[] {
  return value
    .split(/[.;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildRuleParserContext(text: string): RuleParserContext {
  const sectionBlocks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const unscopedLines = sectionBlocks
    .filter((line) => !lineStartsWithSection(line, allSectionPrefixes))
    .flatMap(splitRuleParserSentences);

  return {
    allLines: text
      .split(/[\n.;]+/)
      .map((line) => line.trim())
      .filter(Boolean),
    unscopedLines,
    sectionBlocks
  };
}

function findRuleParserLines(
  context: RuleParserContext,
  tokens: string[],
  sectionPrefixes: string[] = [],
  limit = 4
): string | null {
  const sectionBlocks = sectionPrefixes.length
    ? context.sectionBlocks.filter((item) => lineStartsWithSection(item, sectionPrefixes)).map(cleanRuleParserLine).filter(Boolean)
    : [];
  const searchLines = sectionBlocks.length ? context.unscopedLines : context.allLines;

  const excludedPrefixes = allSectionPrefixes.filter((prefix) => !sectionPrefixes.includes(prefix));
  const matchedLines = searchLines
    .filter((item) => !lineStartsWithSection(item, excludedPrefixes))
    .filter((item) => includesAnyText(item.toLowerCase(), tokens))
    .map(cleanRuleParserLine)
    .filter(Boolean);
  const mergedLines = uniqueStrings([...sectionBlocks, ...matchedLines]).slice(0, limit);
  return mergedLines.length ? mergedLines.join(". ") : null;
}

function extractToothCodes(text: string): string[] {
  const matches = text.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/g) ?? [];
  return uniqueStrings(matches).slice(0, 8);
}

function buildVisitDraftQuality(input: {
  specialty: DentalSpecialty;
  text: string;
  toothCodes: string[];
  complaintLine: string | null;
  anamnesisLine: string | null;
  objectiveLine: string | null;
  diagnosisLine: string | null;
  planLine: string | null;
  planSignal: boolean;
}): VisitNoteDraftQuality {
  const lower = input.text.toLowerCase();
  const signals: string[] = [];
  const missingCriticalFields: string[] = [];

  if (input.complaintLine) signals.push("complaint_detected");
  else missingCriticalFields.push("complaint");
  if (input.anamnesisLine) signals.push("anamnesis_detected");
  else missingCriticalFields.push("anamnesis");
  if (input.objectiveLine) signals.push("objective_detected");
  else missingCriticalFields.push("objective_status");
  if (input.diagnosisLine) signals.push("diagnosis_mentioned");
  else missingCriticalFields.push("diagnosis_review");
  if (input.planLine || input.planSignal) signals.push("plan_detected");
  else missingCriticalFields.push("treatment_plan");
  if (input.toothCodes.length) signals.push("tooth_codes_detected");
  else missingCriticalFields.push("tooth_or_region");
  if (includesAnyText(lower, ["кт", "клкт", "cbct", "оптг", "rvg", "трг", "снимок", "рентген"])) signals.push("imaging_mentioned");
  if (includesAnyText(lower, ["соглас", "договор", "информирован"])) signals.push("consent_mentioned");
  if (includesAnyText(lower, ["аллерг", "антикоаг", "диабет", "беремен", "давлен"])) signals.push("medical_risk_mentioned");
  if (
    includesAnyText(lower, [
      "анест",
      "коффердам",
      "препар",
      "адгезив",
      "рестав",
      "рабочая длина",
      "апекслокатор",
      "гуттаперч",
      "силер",
      "ирригац",
      "пломбир",
      "пломб",
      "матриц",
      "клин",
      "финир",
      "полиров",
      "шлиф",
      "коррекц",
      "контакт",
      "артикуляц",
      "карпул",
      "ультракаин",
      "септанест",
      "убистезин",
      "сиц",
      "mta",
      "гермет",
      "временная пломба",
      "удал",
      "имплан",
      "корон",
      "брекет",
      "air flow",
      "канал"
    ])
  ) {
    signals.push("procedure_mentioned");
  }

  const signalScore = Math.min(0.42, signals.length * 0.055);
  const toothScore = input.toothCodes.length ? 0.16 : 0;
  const fieldScore =
    (input.complaintLine ? 0.08 : 0) +
    (input.anamnesisLine ? 0.06 : 0) +
    (input.objectiveLine ? 0.1 : 0) +
    (input.diagnosisLine ? 0.08 : 0) +
    (input.planLine || input.planSignal ? 0.1 : 0);
  const textScore = Math.min(0.14, input.text.length / 1800);
  const confidence = Number(Math.max(0.25, Math.min(0.97, 0.18 + signalScore + toothScore + fieldScore + textScore)).toFixed(2));
  const level: VisitNoteDraftQuality["level"] =
    confidence >= 0.78 && missingCriticalFields.length <= 2
      ? "ready"
      : confidence >= 0.48
        ? "review"
        : "needs_more_dictation";

  return {
    level,
    confidence,
    specialty: input.specialty,
    detectedToothCodes: input.toothCodes,
    signals: uniqueStrings(signals),
    missingCriticalFields: uniqueStrings(missingCriticalFields),
    nextAction:
      level === "ready"
        ? "Проверить распознанные поля, диагноз, документы и подписать только после врачебного подтверждения."
        : level === "review"
          ? "Проверить недостающие поля и при необходимости дописать короткую диктовку."
          : "Продиктовать жалобы, объективный статус, зуб/область и план лечения подробнее."
  };
}

export function buildRuleBasedVisitDraftFromTranscript(
  transcript: string,
  specialty: DentalSpecialty = "universal",
  options: { sourceLabel?: string } = {}
): VisitNoteDraft {
  const normalization = normalizeDentalSpeechTranscript(transcript, specialty);
  const text = normalization.normalizedText.trim();
  const lower = text.toLowerCase();
  const parserContext = buildRuleParserContext(text);
  const profile = visitDraftParserProfiles[specialty] ?? visitDraftParserProfiles.universal;
  const toothCodes = extractToothCodes(text);
  const sourceLabel = options.sourceLabel ?? "Локальный разбор диктовки";
  const complaintLine = findRuleParserLines(parserContext, [...commonComplaintTokens, ...profile.complaintTokens], complaintSectionPrefixes, 4);
  const anamnesisLine = findRuleParserLines(parserContext, commonAnamnesisTokens, anamnesisSectionPrefixes, 4);
  const objectiveLine = findRuleParserLines(parserContext, [...commonObjectiveTokens, ...profile.objectiveTokens], objectiveSectionPrefixes, 6);
  const diagnosisLine = findRuleParserLines(parserContext, [...commonDiagnosisTokens, ...profile.diagnosisTokens], diagnosisSectionPrefixes, 4);
  const planLine = findRuleParserLines(parserContext, [...commonPlanTokens, ...profile.planTokens], planSectionPrefixes, 6);
  const planSignal = includesAnyText(lower, [
    "леч",
    "анест",
    "коффердам",
    "препар",
    "адгезив",
    "рестав",
    "ирригац",
    "пломбир",
    "пломб",
    "матриц",
    "клин",
    "финир",
    "полиров",
    "шлиф",
    "коррекц",
    "контакт",
    "артикуляц",
    "карпул",
    "ультракаин",
    "септанест",
    "убистезин",
    "сиц",
    "mta",
    "гермет",
    "рабочая длина",
    "апекслокатор",
    "гуттаперч",
    "силер",
    "временная пломба",
    "удал",
    "чистк",
    "имплан",
    "брекет",
    "корон",
    "винир",
    "inlay",
    "onlay",
    "overlay",
    "эндокорон",
    "e.max",
    "циркон",
    "металлокерамик",
    "pmma",
    "абатмент",
    "синус-лифтинг",
    "костная пластика",
    "навигационный шаблон"
  ]);

  const complaint =
    complaintLine ??
    cleanFallbackComplaintLine(parserContext) ??
    (text || "Жалобы не распознаны, уточнить у пациента.");
  const anamnesis =
    anamnesisLine ??
    "Анамнез уточнить: сроки, аллергии, препараты, хронические заболевания, беременность, антикоагулянты.";
  const objectiveStatus =
    objectiveLine ??
    [profile.objectiveFallback, toothCodes.length ? `Распознаны зубы/сегменты: ${toothCodes.join(", ")}.` : null].filter(Boolean).join(" ");
  const diagnosis =
    diagnosisLine ??
    profile.diagnosisFallback;
  const treatmentPlan =
    planLine ??
    (planSignal
      ? cleanRuleParserLine(text)
      : profile.planFallback);

  return {
    complaint,
    anamnesis,
    objectiveStatus,
    diagnosis,
    treatmentPlan,
    quality: buildVisitDraftQuality({
      specialty,
      text,
      toothCodes,
      complaintLine,
      anamnesisLine,
      objectiveLine,
      diagnosisLine,
      planLine,
      planSignal
    }),
    warnings: [
      `${sourceLabel}: черновик собран по профилю специальности и ключевым словам; это не финальное медицинское решение.`,
      ...normalization.warnings,
      "Диагноз, план, противопоказания, документы и подпись подтверждает врач.",
      `Фокус приема: ${ruleParserSpecialtyLabels[specialty]}.`,
      toothCodes.length ? `Распознаны зубы/сегменты: ${toothCodes.join(", ")}.` : "Номер зуба не распознан автоматически.",
      ...profile.reviewHints
    ]
  };
}

export const acceptVisitDraftSchema = z.object({
  visitId: z.string().uuid(),
  draft: visitNoteDraftSchema,
  doctorSummary: z.string().nullable().optional(),
  clientMutationId: z.string().min(1).max(120).nullable().optional(),
  baseRevision: z.number().int().nonnegative().nullable().optional(),
  clientSavedAt: z.string().nullable().optional()
});
export type AcceptVisitDraftInput = z.infer<typeof acceptVisitDraftSchema>;

export const visitSaveReceiptSchema = z.object({
  visitId: z.string().uuid(),
  clientMutationId: z.string().nullable(),
  status: z.enum(["accepted", "duplicate", "conflict_accepted"]),
  serverRevision: z.number().int().nonnegative(),
  savedAt: z.string(),
  warning: z.string().nullable()
});
export type VisitSaveReceipt = z.infer<typeof visitSaveReceiptSchema>;

export const acceptVisitDraftResponseSchema = z.object({
  visit: visitSchema,
  visitCloseChecklist: visitCloseChecklistSchema,
  saveReceipt: visitSaveReceiptSchema
});
export type AcceptVisitDraftResponse = z.infer<typeof acceptVisitDraftResponseSchema>;

export const aiRecognitionJobSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid().nullable(),
  imagingStudyId: z.string().uuid().nullable(),
  kind: aiJobKindSchema,
  target: aiRecognitionTargetSchema,
  status: aiJobStatusSchema,
  sourceLabel: z.string(),
  inputText: z.string(),
  resultText: z.string(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  suggestedNextStep: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type AiRecognitionJob = z.infer<typeof aiRecognitionJobSchema>;

export const createAiRecognitionJobSchema = z.object({
  kind: aiJobKindSchema,
  target: aiRecognitionTargetSchema,
  sourceLabel: z.string().trim().min(1).max(160).default("manual"),
  inputText: z.string().trim().min(1).max(80000),
  patientId: z.string().uuid().nullable().optional(),
  imagingStudyId: z.string().uuid().nullable().optional()
});
export type CreateAiRecognitionJobInput = z.infer<typeof createAiRecognitionJobSchema>;

export const aiRecognitionJobResponseSchema = z.object({
  job: aiRecognitionJobSchema
});
export type AiRecognitionJobResponse = z.infer<typeof aiRecognitionJobResponseSchema>;

export const importSourceKindSchema = z.enum([
  "csv_text",
  "xlsx_copy",
  "mis_export",
  "image_ocr",
  "voice_dictation",
  "free_text"
]);
export type ImportSourceKind = z.infer<typeof importSourceKindSchema>;

export const importPreviewRequestSchema = z.object({
  sourceName: z.string().trim().min(1).max(160).default("manual_csv"),
  sourceKind: importSourceKindSchema.default("csv_text"),
  rawText: z.string().trim().min(1).max(120000)
});
export type ImportPreviewRequest = z.infer<typeof importPreviewRequestSchema>;

export const importPreviewRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  birthDate: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["ready", "warning", "blocked"]),
  warnings: z.array(z.string())
});
export type ImportPreviewRow = z.infer<typeof importPreviewRowSchema>;

export const importPreviewResponseSchema = z.object({
  sourceName: z.string(),
  totalRows: z.number().int().nonnegative(),
  readyRows: z.number().int().nonnegative(),
  warningRows: z.number().int().nonnegative(),
  blockedRows: z.number().int().nonnegative(),
  rows: z.array(importPreviewRowSchema)
});
export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;

export const importCommitRequestSchema = importPreviewRequestSchema;
export type ImportCommitRequest = z.infer<typeof importCommitRequestSchema>;

export const importCommitResponseSchema = z.object({
  preview: importPreviewResponseSchema,
  importedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  importedPatientIds: z.array(z.string().uuid())
});
export type ImportCommitResponse = z.infer<typeof importCommitResponseSchema>;

export const importIntakeRequestSchema = z.object({
  sourceName: z.string().trim().min(1).max(160).default("manual_input"),
  sourceKind: importSourceKindSchema,
  rawText: z.string().trim().min(1).max(120000),
  fileName: z.string().trim().min(1).max(260).nullable().optional()
});
export type ImportIntakeRequest = z.infer<typeof importIntakeRequestSchema>;

export const importIntakeResponseSchema = z.object({
  sourceName: z.string(),
  sourceKind: importSourceKindSchema,
  normalizedText: z.string(),
  preview: importPreviewResponseSchema,
  recognitionNotes: z.array(z.string())
});
export type ImportIntakeResponse = z.infer<typeof importIntakeResponseSchema>;

export const documentIngestionKindSchema = z.enum([
  "txt",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "rtf",
  "zip",
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "odt",
  "ods",
  "odp",
  "image",
  "legacy_database",
  "legacy_dump",
  "unknown"
]);
export type DocumentIngestionKind = z.infer<typeof documentIngestionKindSchema>;

export const documentIngestionTargetSchema = z.enum(["smart_import", "patients", "imaging", "pricelist", "plain_text"]);
export type DocumentIngestionTarget = z.infer<typeof documentIngestionTargetSchema>;

export const documentIngestionRequestSchema = z
  .object({
    fileName: z.string().min(1).max(260),
    mimeType: z.string().max(160).nullable().optional(),
    fileBase64: z.string().max(8_000_000).optional(),
    rawText: z.string().max(300_000).optional(),
    target: documentIngestionTargetSchema.default("smart_import")
  })
  .refine((input) => Boolean(input.fileBase64?.trim() || input.rawText?.trim()), {
    message: "Нужно передать файл или текст документа"
  });
export type DocumentIngestionRequest = z.infer<typeof documentIngestionRequestSchema>;

export const documentIngestionRouteSchema = z.object({
  target: documentIngestionTargetSchema,
  title: z.string(),
  endpoint: z.string(),
  enabled: z.boolean(),
  reason: z.string()
});
export type DocumentIngestionRoute = z.infer<typeof documentIngestionRouteSchema>;

export const documentIngestionQualitySchema = z.object({
  extractionQuality: z.enum(["ready", "review", "ocr_required", "unsupported"]),
  confidence: z.number().min(0).max(1),
  suggestedTarget: documentIngestionTargetSchema,
  signals: z.array(z.string()),
  nextAction: z.string()
});
export type DocumentIngestionQuality = z.infer<typeof documentIngestionQualitySchema>;

export const documentIngestionExtractedFileSchema = z.object({
  fileName: z.string(),
  detectedKind: documentIngestionKindSchema,
  rowCount: z.number().int().nonnegative(),
  tableCount: z.number().int().nonnegative(),
  textPreview: z.string(),
  warnings: z.array(z.string())
});
export type DocumentIngestionExtractedFile = z.infer<typeof documentIngestionExtractedFileSchema>;

export const documentIngestionResponseSchema = z.object({
  fileName: z.string(),
  mimeType: z.string().nullable(),
  detectedKind: documentIngestionKindSchema,
  byteSize: z.number().int().nonnegative(),
  extractedText: z.string(),
  textPreview: z.string(),
  rowCount: z.number().int().nonnegative(),
  tableCount: z.number().int().nonnegative(),
  extractedFiles: z.array(documentIngestionExtractedFileSchema),
  routes: z.array(documentIngestionRouteSchema),
  quality: documentIngestionQualitySchema,
  warnings: z.array(z.string()),
  parserNotes: z.array(z.string())
});
export type DocumentIngestionResponse = z.infer<typeof documentIngestionResponseSchema>;

export const smartImportModeSchema = z.enum(["auto", "patients", "imaging", "mixed"]);
export type SmartImportMode = z.infer<typeof smartImportModeSchema>;

export const uiLanguageSchema = z.enum(["ru"]);
export type UiLanguage = z.infer<typeof uiLanguageSchema>;

export const onboardingStepSchema = z.enum(["intro", "role", "clinic", "legal", "team", "sources", "telegram", "done"]);
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const uiPreferencesSchema = z.object({
  version: z.literal(1).default(1),
  uiLanguage: uiLanguageSchema.default("ru"),
  selectedWorkspaceRole: staffRoleSchema.default("doctor"),
  selectedSpecialty: dentalSpecialtySchema.default("therapist"),
  selectedProtocolId: z.string().max(200).nullable().default(null),
  selectedPatientId: z.string().uuid().nullable().default(null),
  scheduleDoctorFilterId: z.string().uuid().nullable().default(null),
  scheduleAssistantFilterId: z.string().uuid().nullable().default(null),
  scheduleChairFilterId: z.string().uuid().nullable().default(null),
  scheduleDefaultDoctorUserId: z.string().uuid().nullable().default(null),
  scheduleDefaultAssistantUserId: z.string().uuid().nullable().default(null),
  scheduleDefaultChairId: z.string().uuid().nullable().default(null),
  scheduleStatusFilter: z.union([appointmentStatusSchema, z.literal("all")]).default("all"),
  scheduleDateFilter: z.string().max(10).default(""),
  paymentMethod: paymentMethodSchema.default("card"),
  taxDocumentYear: z.number().int().min(legacyTaxDeductionCertificateMinYear).max(2100).default(new Date().getFullYear()),
  selectedDocumentKind: documentKindSchema.default("patient_intake_questionnaire"),
  taxApplicationForm: taxDeductionApplicationFormSchema.default("knd_1151156"),
  taxApplicationDeliveryChannel: taxDeductionApplicationDeliveryChannelSchema.default("paper"),
  paymentReceiptTaxSupportRequested: z.boolean().default(false),
  documentIssueSignatureMode: documentIssueSignatureModeSchema.default("paper_signed"),
  documentIssueStaffFullName: z.string().trim().max(160).default(""),
  documentIssueStaffRole: z.string().trim().max(120).default("Врач/администратор"),
  procedureConsentProcedureType: procedureSpecificConsentProcedureSchema.default("implantation_bone_graft"),
  postVisitCareTopic: postVisitCareTopicSchema.default("filling_restoration"),
  pricelistSourceKind: pricelistSourceKindSchema.default("spreadsheet_copy"),
  usePricelistAi: z.boolean().default(false),
  recognitionKind: aiJobKindSchema.default("voice_transcription"),
  recognitionTarget: aiRecognitionTargetSchema.default("visit_note"),
  importSourceKind: importSourceKindSchema.default("csv_text"),
  documentIngestionTarget: documentIngestionTargetSchema.default("smart_import"),
  imagingImportSourceKind: imagingSourceKindSchema.default("folder_watch"),
  smartImportMode: smartImportModeSchema.default("auto"),
  imagingKindFilter: z.union([imagingStudyKindSchema, z.literal("all")]).default("all"),
  dicomWebEndpointUrl: z.string().max(500).default("http://127.0.0.1:8042/dicom-web"),
  ohifBaseUrl: z.string().max(500).default("http://127.0.0.1:3000"),
  telegramBotConfigId: z.string().trim().max(160).default(""),
  telegramLinkSubjectType: denteTelegramSubjectTypeSchema.default("patient"),
  telegramLinkStaffId: z.string().uuid().nullable().default(null),
  telegramOutboxStatusFilter: z
    .union([denteTelegramOutboxDeliveryStatusSchema, z.literal("all"), z.literal("due")])
    .default("all"),
  telegramOutboxTemplateFilter: z.union([denteTelegramTemplateKindSchema, z.literal("all")]).default("all"),
  onboardingDismissed: z.boolean().default(false),
  onboardingDismissedAt: z.string().nullable().default(null),
  onboardingStep: onboardingStepSchema.default("intro"),
  onboardingDraftMode: z.boolean().default(false),
  savedAt: z.string().default("")
});
export type UiPreferences = z.infer<typeof uiPreferencesSchema>;

export const uiPreferencesInputSchema = uiPreferencesSchema.omit({ version: true, savedAt: true }).extend({
  version: z.literal(1).optional(),
  savedAt: z.string().optional()
});
export type UiPreferencesInput = z.infer<typeof uiPreferencesInputSchema>;

export const smartImportRequestSchema = z.object({
  sourceName: z.string().trim().min(1).max(160).default("smart_import"),
  rawText: z.string().trim().min(1).max(120000),
  mode: smartImportModeSchema.default("auto")
});
export type SmartImportRequest = z.infer<typeof smartImportRequestSchema>;

export const smartImportLineKindSchema = z.enum(["patient", "imaging", "clinic", "legacy_source", "ignored"]);
export type SmartImportLineKind = z.infer<typeof smartImportLineKindSchema>;

export const smartImportLineClassificationSchema = z.object({
  lineNumber: z.number().int().positive(),
  kind: smartImportLineKindSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  text: z.string()
});
export type SmartImportLineClassification = z.infer<typeof smartImportLineClassificationSchema>;

export const smartImportClinicProfileSuggestionSchema = z.object({
  fields: updateClinicProfileSchema.partial(),
  confidence: z.number().min(0).max(1),
  sourceLineNumbers: z.array(z.number().int().positive()),
  warnings: z.array(z.string())
});
export type SmartImportClinicProfileSuggestion = z.infer<typeof smartImportClinicProfileSuggestionSchema>;

export const smartImportPublicLookupTargetSchema = z.object({
  kind: z.enum(["maps", "company_registry", "website_search", "medical_license_registry"]),
  title: z.string(),
  query: z.string(),
  url: z.string().url(),
  privacy: z.string(),
  nextAction: z.string()
});
export type SmartImportPublicLookupTarget = z.infer<typeof smartImportPublicLookupTargetSchema>;

export const smartImportLegacySourceKindSchema = z.enum([
  "mis_database",
  "firebird_database",
  "access_database",
  "sqlite_database",
  "sql_dump",
  "spreadsheet_export",
  "csv_export",
  "archive_export",
  "pacs_dicom",
  "dicom_folder",
  "xray_image_archive",
  "vendor_imaging_system",
  "network_share",
  "unknown_legacy_source"
]);
export type SmartImportLegacySourceKind = z.infer<typeof smartImportLegacySourceKindSchema>;

export const smartImportLegacySourceAutomationLevelSchema = z.enum([
  "ready_for_preview",
  "needs_file_upload",
  "needs_local_bridge",
  "manual_review"
]);
export type SmartImportLegacySourceAutomationLevel = z.infer<typeof smartImportLegacySourceAutomationLevelSchema>;

export const smartImportLegacySourceSchema = z.object({
  kind: smartImportLegacySourceKindSchema,
  title: z.string(),
  confidence: z.number().min(0).max(1),
  sourceRef: z.string().nullable(),
  safeSourceAlias: z.string().nullable(),
  evidence: z.array(z.string()),
  requiredArtifacts: z.array(z.string()),
  recommendedRoute: z.string(),
  automationLevel: smartImportLegacySourceAutomationLevelSchema,
  privacy: z.string(),
  nextAction: z.string()
});
export type SmartImportLegacySource = z.infer<typeof smartImportLegacySourceSchema>;

export const smartImportMigrationPlanStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ready", "review", "manual", "blocked"]),
  detail: z.string(),
  nextAction: z.string()
});
export type SmartImportMigrationPlanStep = z.infer<typeof smartImportMigrationPlanStepSchema>;

export const smartImportMigrationPlanSchema = z.object({
  coverage: z.object({
    patients: z.boolean(),
    imaging: z.boolean(),
    clinicProfile: z.boolean(),
    publicLookup: z.boolean(),
    legacySources: z.boolean()
  }),
  steps: z.array(smartImportMigrationPlanStepSchema),
  privacyWarnings: z.array(z.string()),
  nextAction: z.string()
});
export type SmartImportMigrationPlan = z.infer<typeof smartImportMigrationPlanSchema>;

export const smartImportPreviewResponseSchema = z.object({
  sourceName: z.string(),
  totalLines: z.number().int().nonnegative(),
  patientRawText: z.string(),
  imagingRawText: z.string(),
  clinicRawText: z.string(),
  legacySourceRawText: z.string(),
  patientPreview: importPreviewResponseSchema,
  imagingPreview: imagingImportPreviewResponseSchema,
  clinicSuggestion: smartImportClinicProfileSuggestionSchema.nullable(),
  publicLookupTargets: z.array(smartImportPublicLookupTargetSchema),
  legacySources: z.array(smartImportLegacySourceSchema),
  migrationPlan: smartImportMigrationPlanSchema,
  lineClassifications: z.array(smartImportLineClassificationSchema),
  parserNotes: z.array(z.string())
});
export type SmartImportPreviewResponse = z.infer<typeof smartImportPreviewResponseSchema>;

export const smartImportCommitResponseSchema = z.object({
  preview: smartImportPreviewResponseSchema,
  patientCommit: importCommitResponseSchema.nullable(),
  imagingCommit: imagingImportCommitResponseSchema.nullable()
});
export type SmartImportCommitResponse = z.infer<typeof smartImportCommitResponseSchema>;

export const migrationLocalSourceDiscoveryRequestSchema = z.object({
  rootPaths: z.array(z.string().min(1)).max(16).optional(),
  maxDepth: z.number().int().min(0).max(8).default(5),
  maxFolders: z.number().int().positive().max(5000).default(1600),
  maxFilesPerFolder: z.number().int().positive().max(500).default(160),
  maxCandidates: z.number().int().positive().max(80).default(18),
  includeWorkstationSignals: z.boolean().default(true),
  maxWorkstationSignals: z.number().int().nonnegative().max(80).default(24)
});
export type MigrationLocalSourceDiscoveryRequest = z.infer<typeof migrationLocalSourceDiscoveryRequestSchema>;

export const migrationLocalSourceDiscoveryCandidateSchema = z.object({
  sourceRef: z.string(),
  safeDisplayName: z.string(),
  sourceKind: smartImportLegacySourceKindSchema,
  sourceLabel: z.string(),
  sourceFingerprint: z.string(),
  depth: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  matchedFiles: z.number().int().nonnegative(),
  databaseFiles: z.number().int().nonnegative(),
  dumpFiles: z.number().int().nonnegative(),
  tableFiles: z.number().int().nonnegative(),
  archiveFiles: z.number().int().nonnegative(),
  dicomLikeFiles: z.number().int().nonnegative(),
  imageFiles: z.number().int().nonnegative(),
  hasDicomDir: z.boolean(),
  latestModifiedAt: z.string().nullable(),
  reasons: z.array(z.string()),
  warnings: z.array(z.string()),
  smartImportLine: z.string()
});
export type MigrationLocalSourceDiscoveryCandidate = z.infer<typeof migrationLocalSourceDiscoveryCandidateSchema>;

export const migrationLocalSourceDiscoveryResponseSchema = z.object({
  version: z.literal("dental-crm-migration-local-discovery-v1"),
  generatedAt: z.string(),
  roots: z.array(z.string()),
  scannedFolders: z.number().int().nonnegative(),
  candidates: z.array(migrationLocalSourceDiscoveryCandidateSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type MigrationLocalSourceDiscoveryResponse = z.infer<typeof migrationLocalSourceDiscoveryResponseSchema>;

export const migrationLocalSourceWorkupRequestSchema = z.object({
  sourceRef: z.string().min(1),
  sourceKind: smartImportLegacySourceKindSchema.optional(),
  safeDisplayName: z.string().trim().max(160).optional()
});
export type MigrationLocalSourceWorkupRequest = z.infer<typeof migrationLocalSourceWorkupRequestSchema>;

export const migrationExtractableEntitySchema = z.enum([
  "clinic_profile",
  "patients",
  "appointments",
  "visits",
  "payments",
  "documents",
  "service_catalog",
  "imaging",
  "dicom_series",
  "unknown"
]);
export type MigrationExtractableEntity = z.infer<typeof migrationExtractableEntitySchema>;

export const migrationLocalSourceWorkupStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ready", "needs_bridge", "manual", "blocked"]),
  detail: z.string(),
  actionLabel: z.string()
});
export type MigrationLocalSourceWorkupStep = z.infer<typeof migrationLocalSourceWorkupStepSchema>;

export const migrationLocalSourceHandoffSchema = z.object({
  title: z.string(),
  method: z.enum(["GET", "POST"]),
  endpoint: z.string(),
  payloadHint: z.string(),
  privacy: z.string()
});
export type MigrationLocalSourceHandoff = z.infer<typeof migrationLocalSourceHandoffSchema>;

export const migrationReadinessItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ready", "warning", "blocked"]),
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  detail: z.string(),
  nextAction: z.string()
});
export type MigrationReadinessItem = z.infer<typeof migrationReadinessItemSchema>;

export const migrationReadinessSchema = z.object({
  level: z.enum(["ready_for_preview", "needs_bridge", "needs_export", "manual_review", "blocked"]),
  score: z.number().min(0).max(1),
  blockers: z.array(migrationReadinessItemSchema),
  warnings: z.array(migrationReadinessItemSchema),
  ready: z.array(migrationReadinessItemSchema),
  nextAction: z.string()
});
export type MigrationReadiness = z.infer<typeof migrationReadinessSchema>;

export const migrationBridgeKitActionSchema = z.object({
  id: z.string(),
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  title: z.string(),
  detail: z.string(),
  safety: z.string(),
  doneWhen: z.string()
});
export type MigrationBridgeKitAction = z.infer<typeof migrationBridgeKitActionSchema>;

export const migrationBridgeKitSchema = z.object({
  kind: z.enum([
    "none",
    "file_upload",
    "local_db_bridge",
    "dicom_export",
    "image_manifest",
    "network_share_bridge",
    "browser_manifest_bridge",
    "manual_manifest"
  ]),
  title: z.string(),
  status: z.enum(["ready", "needs_admin", "needs_export", "manual", "blocked"]),
  requiredTools: z.array(z.string()),
  parserTargets: z.array(migrationExtractableEntitySchema),
  adminActions: z.array(migrationBridgeKitActionSchema),
  doctorActions: z.array(migrationBridgeKitActionSchema),
  outputManifest: z.object({
    format: z.string(),
    endpoint: z.string(),
    requiredColumns: z.array(z.string()),
    optionalColumns: z.array(z.string()),
    forbiddenFields: z.array(z.string())
  }),
  privacyBoundary: z.string(),
  nextAction: z.string()
});
export type MigrationBridgeKit = z.infer<typeof migrationBridgeKitSchema>;

export const migrationLocalSourceWorkupResponseSchema = z.object({
  version: z.literal("dental-crm-migration-source-workup-v1"),
  generatedAt: z.string(),
  safeDisplayName: z.string(),
  sourceKind: smartImportLegacySourceKindSchema,
  sourceFingerprint: z.string(),
  sourceLabel: z.string(),
  sourceExists: z.boolean(),
  sourceIsDirectory: z.boolean(),
  fileExtension: z.string().nullable(),
  automationLevel: smartImportLegacySourceAutomationLevelSchema,
  extractableEntities: z.array(migrationExtractableEntitySchema),
  requiredArtifacts: z.array(z.string()),
  recommendedRoute: z.string(),
  readiness: migrationReadinessSchema,
  bridgeKit: migrationBridgeKitSchema,
  handoffs: z.array(migrationLocalSourceHandoffSchema),
  steps: z.array(migrationLocalSourceWorkupStepSchema),
  warnings: z.array(z.string()),
  privacyWarnings: z.array(z.string()),
  smartImportLine: z.string(),
  nextAction: z.string()
});
export type MigrationLocalSourceWorkupResponse = z.infer<typeof migrationLocalSourceWorkupResponseSchema>;

export const migrationLocalSourceProbeRequestSchema = z.object({
  sourceRef: z.string().min(1),
  sourceKind: smartImportLegacySourceKindSchema.optional(),
  safeDisplayName: z.string().trim().max(160).optional(),
  maxDepth: z.number().int().min(0).max(4).default(2),
  maxFolders: z.number().int().positive().max(500).default(120),
  maxFiles: z.number().int().positive().max(3000).default(600),
  maxSampleArtifacts: z.number().int().positive().max(80).default(18),
  readHeaderBytes: z.number().int().positive().max(65536).default(4096)
});
export type MigrationLocalSourceProbeRequest = z.infer<typeof migrationLocalSourceProbeRequestSchema>;

export const migrationProbeArtifactKindSchema = z.enum([
  "database",
  "dump",
  "table",
  "archive",
  "dicom",
  "image",
  "model",
  "folder",
  "unknown"
]);
export type MigrationProbeArtifactKind = z.infer<typeof migrationProbeArtifactKindSchema>;

export const migrationProbeArtifactSchema = z.object({
  id: z.string(),
  safeName: z.string(),
  kind: migrationProbeArtifactKindSchema,
  extension: z.string().nullable(),
  byteSize: z.number().int().nonnegative().nullable(),
  modifiedAt: z.string().nullable(),
  depth: z.number().int().nonnegative(),
  signals: z.array(z.string())
});
export type MigrationProbeArtifact = z.infer<typeof migrationProbeArtifactSchema>;

export const migrationProbeAdapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["built_in", "needs_local_bridge", "needs_export", "manual", "blocked"]),
  confidence: z.number().min(0).max(1),
  input: z.string(),
  output: z.string(),
  privacy: z.string(),
  nextAction: z.string()
});
export type MigrationProbeAdapter = z.infer<typeof migrationProbeAdapterSchema>;

export const migrationLocalSourceProbeResponseSchema = z.object({
  version: z.literal("dental-crm-migration-source-probe-v1"),
  generatedAt: z.string(),
  safeDisplayName: z.string(),
  sourceKind: smartImportLegacySourceKindSchema,
  sourceFingerprint: z.string(),
  sourceLabel: z.string(),
  sourceExists: z.boolean(),
  sourceIsDirectory: z.boolean(),
  sourceByteSize: z.number().int().nonnegative().nullable(),
  latestModifiedAt: z.string().nullable(),
  scannedFolders: z.number().int().nonnegative(),
  scannedFiles: z.number().int().nonnegative(),
  counts: z.object({
    databases: z.number().int().nonnegative(),
    dumps: z.number().int().nonnegative(),
    tables: z.number().int().nonnegative(),
    archives: z.number().int().nonnegative(),
    dicom: z.number().int().nonnegative(),
    images: z.number().int().nonnegative(),
    models: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative()
  }),
  formatSignals: z.array(z.string()),
  detectedVendors: z.array(z.string()),
  artifactSamples: z.array(migrationProbeArtifactSchema),
  adapters: z.array(migrationProbeAdapterSchema),
  handoffs: z.array(migrationLocalSourceHandoffSchema),
  warnings: z.array(z.string()),
  privacyWarnings: z.array(z.string()),
  recommendedRoute: z.string(),
  readiness: migrationReadinessSchema,
  bridgeKit: migrationBridgeKitSchema,
  nextAction: z.string()
});
export type MigrationLocalSourceProbeResponse = z.infer<typeof migrationLocalSourceProbeResponseSchema>;

export const clinicPublicLookupRequestSchema = z
  .object({
    inn: z.string().trim().max(32).optional(),
    kpp: z.string().trim().max(32).optional(),
    ogrn: z.string().trim().max(32).optional(),
    clinicName: z.string().trim().max(240).optional(),
    legalName: z.string().trim().max(240).optional(),
    address: z.string().trim().max(500).optional(),
    medicalLicenseNumber: z.string().trim().max(120).optional()
  })
  .refine(
    (value) => [value.inn, value.kpp, value.ogrn, value.clinicName, value.legalName, value.address, value.medicalLicenseNumber].some((item) => item && item.trim()),
    "Укажите ИНН, КПП, ОГРН, название, адрес или номер медицинской лицензии клиники."
  );
export type ClinicPublicLookupRequest = z.infer<typeof clinicPublicLookupRequestSchema>;

export const clinicPublicLookupSuggestionSchema = z.object({
  source: z.enum(["dadata", "manual_public_targets"]),
  confidence: z.number().min(0).max(1),
  fields: updateClinicProfileSchema.partial(),
  warnings: z.array(z.string())
});
export type ClinicPublicLookupSuggestion = z.infer<typeof clinicPublicLookupSuggestionSchema>;

export const clinicPublicLookupResponseSchema = z.object({
  version: z.literal("dental-crm-clinic-public-lookup-v1"),
  generatedAt: z.string(),
  providerStatus: z.enum(["not_configured", "ready", "error", "skipped_no_safe_query"]),
  provider: z.string(),
  safeQuery: z.string(),
  suggestions: z.array(clinicPublicLookupSuggestionSchema),
  publicLookupTargets: z.array(smartImportPublicLookupTargetSchema),
  warnings: z.array(z.string()),
  nextAction: z.string()
});
export type ClinicPublicLookupResponse = z.infer<typeof clinicPublicLookupResponseSchema>;

export const migrationAutopilotRequestSchema = z.object({
  rootPaths: z.array(z.string().min(1)).max(16).optional(),
  maxDepth: z.number().int().min(0).max(8).default(5),
  maxFolders: z.number().int().positive().max(5000).default(1600),
  maxFilesPerFolder: z.number().int().positive().max(500).default(160),
  maxCandidates: z.number().int().positive().max(80).default(18),
  maxProbeCandidates: z.number().int().positive().max(8).default(4),
  includeWorkstationSignals: z.boolean().default(true),
  maxWorkstationSignals: z.number().int().nonnegative().max(80).default(24),
  knownSources: z.array(migrationLocalSourceDiscoveryCandidateSchema).max(80).optional(),
  knownScannedFolders: z.number().int().nonnegative().max(5000).optional(),
  smartImport: smartImportRequestSchema.optional(),
  clinic: clinicPublicLookupRequestSchema.optional()
});
export type MigrationAutopilotRequest = z.infer<typeof migrationAutopilotRequestSchema>;

export const migrationAutopilotSourceSchema = z.object({
  candidate: migrationLocalSourceDiscoveryCandidateSchema,
  probe: migrationLocalSourceProbeResponseSchema.nullable(),
  score: z.number().min(0).max(1),
  priority: z.enum(["critical", "high", "normal", "low"]),
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  readiness: migrationReadinessSchema,
  bridgeKit: migrationBridgeKitSchema,
  recommendedAction: z.string(),
  riskFlags: z.array(z.string())
});
export type MigrationAutopilotSource = z.infer<typeof migrationAutopilotSourceSchema>;

export const migrationAutopilotStepSchema = z.object({
  order: z.number().int().positive(),
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  title: z.string(),
  detail: z.string(),
  blocking: z.boolean()
});
export type MigrationAutopilotStep = z.infer<typeof migrationAutopilotStepSchema>;

export const migrationAutopilotPacketStatusSchema = z.enum([
  "ready_for_preview",
  "needs_admin",
  "needs_bridge",
  "needs_export",
  "manual_review",
  "blocked",
  "empty"
]);
export type MigrationAutopilotPacketStatus = z.infer<typeof migrationAutopilotPacketStatusSchema>;

export const migrationAutopilotPacketLaneSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  status: migrationAutopilotPacketStatusSchema,
  score: z.number().min(0).max(1),
  detail: z.string(),
  nextAction: z.string()
});
export type MigrationAutopilotPacketLane = z.infer<typeof migrationAutopilotPacketLaneSchema>;

export const migrationAutopilotHandoffPhaseSchema = z.enum([
  "clinic_requisites",
  "source_access",
  "export_or_bridge",
  "staging_preview",
  "doctor_control"
]);
export type MigrationAutopilotHandoffPhase = z.infer<typeof migrationAutopilotHandoffPhaseSchema>;

export const migrationAutopilotHandoffChecklistItemSchema = z.object({
  id: z.string(),
  phase: migrationAutopilotHandoffPhaseSchema,
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  status: migrationAutopilotPacketStatusSchema,
  title: z.string(),
  detail: z.string(),
  requiredArtifact: z.string(),
  sourceFingerprint: z.string().nullable(),
  sourceKind: smartImportLegacySourceKindSchema.nullable(),
  privacy: z.string(),
  doneWhen: z.string(),
  blocking: z.boolean()
});
export type MigrationAutopilotHandoffChecklistItem = z.infer<typeof migrationAutopilotHandoffChecklistItemSchema>;

export const migrationAutopilotOperatorScriptActionSchema = z.enum([
  "discover_sources",
  "pick_source",
  "open_plan",
  "open_probe",
  "add_to_parser",
  "prepare_export",
  "run_clinic_lookup",
  "build_preview",
  "doctor_review",
  "manual"
]);
export type MigrationAutopilotOperatorScriptAction = z.infer<typeof migrationAutopilotOperatorScriptActionSchema>;

export const migrationAutopilotOperatorScriptStepSchema = z.object({
  id: z.string(),
  owner: z.enum(["administrator", "doctor", "assistant", "system"]),
  title: z.string(),
  buttonLabel: z.string(),
  detail: z.string(),
  action: migrationAutopilotOperatorScriptActionSchema,
  sourceFingerprint: z.string().nullable(),
  sourceKind: smartImportLegacySourceKindSchema.nullable(),
  estimatedMinutes: z.number().int().nonnegative(),
  blocking: z.boolean()
});
export type MigrationAutopilotOperatorScriptStep = z.infer<typeof migrationAutopilotOperatorScriptStepSchema>;

export const migrationAutopilotOperatorScriptSchema = z.object({
  title: z.string(),
  headline: z.string(),
  totalEstimatedMinutes: z.number().int().nonnegative(),
  steps: z.array(migrationAutopilotOperatorScriptStepSchema)
});
export type MigrationAutopilotOperatorScript = z.infer<typeof migrationAutopilotOperatorScriptSchema>;

export const migrationAutopilotDryRunSummarySchema = z.object({
  previewableSources: z.number().int().nonnegative(),
  adminBlockedSources: z.number().int().nonnegative(),
  doctorReviewRequiredSources: z.number().int().nonnegative(),
  estimatedOperatorMinutes: z.number().int().nonnegative(),
  estimatedClinicDowntimeMinutes: z.number().int().nonnegative(),
  fastestRoute: z.string(),
  nextBestAction: z.string()
});
export type MigrationAutopilotDryRunSummary = z.infer<typeof migrationAutopilotDryRunSummarySchema>;

export const migrationAutopilotOperatorPacketSchema = z.object({
  overallStatus: migrationAutopilotPacketStatusSchema,
  score: z.number().min(0).max(1),
  dataClasses: z.object({
    clinicRequisites: z.boolean(),
    oldDatabases: z.boolean(),
    imaging: z.boolean(),
    documents: z.boolean(),
    serviceCatalog: z.boolean(),
    payments: z.boolean(),
    workstationHints: z.boolean(),
    browserManifests: z.boolean(),
    smartPreviewSources: z.boolean()
  }),
  totals: z.object({
    sources: z.number().int().nonnegative(),
    probed: z.number().int().nonnegative(),
    readyForPreview: z.number().int().nonnegative(),
    needsBridge: z.number().int().nonnegative(),
    needsExport: z.number().int().nonnegative(),
    manualReview: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    databaseSources: z.number().int().nonnegative(),
    mediaSources: z.number().int().nonnegative(),
    tableSources: z.number().int().nonnegative(),
    workstationHints: z.number().int().nonnegative(),
    browserManifests: z.number().int().nonnegative(),
    smartPreviewSources: z.number().int().nonnegative(),
    publicLookupTargets: z.number().int().nonnegative(),
    clinicSuggestions: z.number().int().nonnegative()
  }),
  dryRun: migrationAutopilotDryRunSummarySchema,
  lanes: z.array(migrationAutopilotPacketLaneSchema),
  handoffChecklist: z.array(migrationAutopilotHandoffChecklistItemSchema),
  firstActions: z.array(z.string()),
  operatorScript: migrationAutopilotOperatorScriptSchema,
  onlineLookupPolicy: z.object({
    allowed: z.array(z.string()),
    forbidden: z.array(z.string()),
    safeQuery: z.string().nullable(),
    providerStatus: z.enum(["not_configured", "ready", "error", "skipped_no_safe_query"]).nullable()
  })
});
export type MigrationAutopilotOperatorPacket = z.infer<typeof migrationAutopilotOperatorPacketSchema>;

export const migrationAutopilotResponseSchema = z.object({
  version: z.literal("dental-crm-migration-autopilot-v1"),
  generatedAt: z.string(),
  discovery: z.object({
    roots: z.array(z.string()),
    scannedFolders: z.number().int().nonnegative(),
    candidateCount: z.number().int().nonnegative(),
    probedCount: z.number().int().nonnegative()
  }),
  sources: z.array(migrationAutopilotSourceSchema),
  clinicLookup: clinicPublicLookupResponseSchema.nullable(),
  operatorPacket: migrationAutopilotOperatorPacketSchema,
  steps: z.array(migrationAutopilotStepSchema),
  warnings: z.array(z.string()),
  privacyWarnings: z.array(z.string()),
  nextAction: z.string()
});
export type MigrationAutopilotResponse = z.infer<typeof migrationAutopilotResponseSchema>;

export type LocalImagingFolderDraft = any;
export type BrowserPickedImagingFolderPreview = any;
export type BrowserImagingScanProgress = any;
export type ImagingViewerState = any;
export type ImagingViewerSaveState = any;
export type MprProjection = any;
export type MprWindowPreset = any;

export * from "./utils/strings.js";
export * from "./utils/dates.js";
