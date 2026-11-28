import {
	type AiRecognitionTarget,
	type Appointment,
	type ClinicMode,
	type Dashboard,
	type DentalSpecialty,
	type DicomFolderWorkupPath,
	type DocumentChainSummary,
	type DocumentSourceStatus,
	documentKindMetadata,
	type GeneratedDocument,
	type IntegrationCapability,
	type IntegrationCategory,
	type IntegrationPresetStatus,
	type LocalBridgeStatus,
	type LocalBridgeUsePath,
	type ResourceLoad,
	type ScheduleWarning,
	type SpeechGatewayStatus,
	type SpeechProvider,
	type StaffRole,
} from "@dental/shared";

export const appointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Готово",
	cancelled: "Отмена",
	no_show: "Не пришел",
	...({ in_progress: "В кресле", IN_PROGRESS: "В кресле", IN_TREATMENT: "В кресле" }),
};

function buildDocumentLabelMap(
	pick: "label" | "actionLabel",
): Record<GeneratedDocument["kind"], string> {
	return {
		paid_medical_services_contract: documentKindMetadata.paid_medical_services_contract[pick],
		completed_works_act: documentKindMetadata.completed_works_act[pick],
		tax_deduction_certificate: documentKindMetadata.tax_deduction_certificate[pick],
		informed_consent: documentKindMetadata.informed_consent[pick],
		procedure_specific_consent_packet: documentKindMetadata.procedure_specific_consent_packet[pick],
		treatment_plan: documentKindMetadata.treatment_plan[pick],
		treatment_plan_acceptance: documentKindMetadata.treatment_plan_acceptance[pick],
		anesthesia_consent_log: documentKindMetadata.anesthesia_consent_log[pick],
		prescription_medication_order: documentKindMetadata.prescription_medication_order[pick],
		personal_data_processing_consent: documentKindMetadata.personal_data_processing_consent[pick],
		minor_legal_representative_consent: documentKindMetadata.minor_legal_representative_consent[pick],
		photo_video_consent: documentKindMetadata.photo_video_consent[pick],
		medical_intervention_refusal: documentKindMetadata.medical_intervention_refusal[pick],
		treatment_cost_estimate: documentKindMetadata.treatment_cost_estimate[pick],
		payment_invoice: documentKindMetadata.payment_invoice[pick],
		payment_receipt: documentKindMetadata.payment_receipt[pick],
		installment_payment_schedule: documentKindMetadata.installment_payment_schedule[pick],
		post_visit_recommendations: documentKindMetadata.post_visit_recommendations[pick],
		parent_memo: documentKindMetadata.parent_memo[pick],
		bravery_diploma: documentKindMetadata.bravery_diploma[pick],
		outpatient_medical_card_025u: documentKindMetadata.outpatient_medical_card_025u[pick],
		dental_medical_card_043u: documentKindMetadata.dental_medical_card_043u[pick],
		orthodontic_medical_card_043_1u: documentKindMetadata.orthodontic_medical_card_043_1u[pick],
		daily_dentist_diary_037u: documentKindMetadata.daily_dentist_diary_037u[pick],
		summary_dentist_statement_039u: documentKindMetadata.summary_dentist_statement_039u[pick],
		medical_record_extract: documentKindMetadata.medical_record_extract[pick],
		medical_record_copy_request: documentKindMetadata.medical_record_copy_request[pick],
		medical_document_release_receipt: documentKindMetadata.medical_document_release_receipt[pick],
		xray_cbct_referral: documentKindMetadata.xray_cbct_referral[pick],
		radiation_dose_sheet: documentKindMetadata.radiation_dose_sheet[pick],
		lab_work_order: documentKindMetadata.lab_work_order[pick],
		visit_attendance_certificate: documentKindMetadata.visit_attendance_certificate[pick],
		warranty_service_memo: documentKindMetadata.warranty_service_memo[pick],
		payment_refund_correction_request: documentKindMetadata.payment_refund_correction_request[pick],
		tax_deduction_application: documentKindMetadata.tax_deduction_application[pick],
		legacy_tax_deduction_certificate: documentKindMetadata.legacy_tax_deduction_certificate[pick],
		tax_deduction_registry: documentKindMetadata.tax_deduction_registry[pick],
		patient_intake_questionnaire: documentKindMetadata.patient_intake_questionnaire[pick],
	};
}

export const documentLabels: Record<GeneratedDocument["kind"], string> = buildDocumentLabelMap("label");

export const documentActionLabels: Record<GeneratedDocument["kind"], string> = buildDocumentLabelMap("actionLabel");

export const documentSourceStatusClassNames: Record<
	DocumentSourceStatus,
	string
> = {
	official_form: "document-source-badge official-form",
	official_workflow: "document-source-badge official-workflow",
	clinic_template: "document-source-badge clinic-template",
	internal_register: "document-source-badge internal-register",
};

export const documentStatusLabels: Record<GeneratedDocument["status"], string> =
	{
		draft: "Черновик",
		issued: "Выдан",
		voided: "Аннулирован",
	};

export const taxPaymentSelectionPayloadDocumentKinds = new Set<
	GeneratedDocument["kind"]
>([
	"tax_deduction_certificate",
	"legacy_tax_deduction_certificate",
	"tax_deduction_registry",
]);
export const taxPaymentSelectionDocumentKinds = new Set<
	GeneratedDocument["kind"]
>([...taxPaymentSelectionPayloadDocumentKinds, "tax_deduction_application"]);

export function paymentTaxYearForUi(
	payment: Pick<
		Dashboard["payments"][number],
		"fiscalReceiptIssuedAt" | "paidAt"
	>,
): number | null {
	const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
	if (!sourceDate) return null;
	const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
	if (explicitYear) return Number(explicitYear);
	const parsedDate = new Date(sourceDate);
	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear();
}

export function taxPaymentPayerKeyForUi(
	payment: Pick<
		Dashboard["payments"][number],
		| "payerInn"
		| "payerFullName"
		| "payerBirthDate"
		| "payerIdentityDocument"
		| "payerRelationship"
	>,
): string {
	const payerInn = payment.payerInn?.trim();
	if (payerInn) return `inn:${payerInn}`;
	const identityParts = [
		payment.payerFullName?.trim(),
		payment.payerBirthDate?.trim(),
		payment.payerIdentityDocument?.trim(),
		payment.payerRelationship?.trim(),
	].filter(Boolean);
	return identityParts.length >= 3
		? `identity:${identityParts.join("|").toLocaleLowerCase("ru-RU")}`
		: "";
}

export function paymentFiscalReceiptLabelForUi(
	payment: Pick<
		Dashboard["payments"][number],
		"id" | "fiscalReceiptNumber" | "fiscalReceipt"
	>,
): string {
	const details = payment.fiscalReceipt;
	const structured = [
		details?.fn ? `ФН ${details.fn}` : null,
		details?.fd ? `ФД ${details.fd}` : null,
		details?.fpd ? `ФПД ${details.fpd}` : null,
	]
		.filter(Boolean)
		.join("; ");
	return (
		structured || payment.fiscalReceiptNumber?.trim() || payment.id.slice(0, 8)
	);
}

export function clinicalRuleSummaryForUi(
	evaluations: Dashboard["clinicalRuleEvaluations"],
	activeRules: number,
): Dashboard["clinicalRuleSummary"] {
	const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
	const requiredServiceIds = new Set(
		unresolved.flatMap((evaluation) => evaluation.missingRequiredServiceIds),
	);
	return {
		activeRules,
		evaluatedRules: evaluations.length,
		unresolved: unresolved.length,
		blockers: unresolved.filter(
			(evaluation) => evaluation.severity === "blocker",
		).length,
		warnings: unresolved.filter(
			(evaluation) => evaluation.severity === "warning",
		).length,
		requiredServices: requiredServiceIds.size,
		coveredRules: evaluations.filter((evaluation) => evaluation.resolved)
			.length,
	};
}

export type DocumentWithChainSummary = {
	title: string;
	chainSummary?: DocumentChainSummary | null | undefined;
};

export function completedActContractReferenceForUi(
	document: DocumentWithChainSummary,
): string {
	const payload = document.chainSummary?.paidMedicalServicesContract;
	if (!payload?.contractNumber) return document.title;
	const contractDate = payload.contractDate?.trim();
	return contractDate
		? `${payload.contractNumber} от ${contractDate}`
		: payload.contractNumber;
}

export const serviceCategoryLabels: Record<
	Dashboard["serviceCatalog"][number]["category"],
	string
> = {
	consultation: "Консультация",
	therapy: "Терапия",
	surgery: "Хирургия",
	prosthetics: "Ортопедия",
	orthodontics: "Ортодонтия",
	periodontology: "Пародонтология",
	hygiene: "Гигиена",
	imaging: "Снимки",
	documents: "Документы",
	other: "Другое",
};

export const treatmentStatusLabels: Record<
	Dashboard["treatmentPlanItems"][number]["status"],
	string
> = {
	proposed: "предложено",
	approved: "согласовано",
	in_progress: "в работе",
	completed: "готово",
	cancelled: "отменено",
};

export const scenarioStrategyLabels: Record<
	Dashboard["treatmentPlanScenarios"][number]["strategy"],
	string
> = {
	urgent: "Срочно",
	standard: "Стандарт",
	optimal: "Оптимально",
	phased: "По этапам",
	maintenance: "Поддержка",
};

export const scenarioPriorityLabels: Record<
	Dashboard["treatmentPlanScenarios"][number]["priority"],
	string
> = {
	budget: "бюджет",
	balanced: "баланс",
	clinical: "клинический приоритет",
};

export const clinicalRuleSeverityLabels: Record<
	Dashboard["clinicalRuleEvaluations"][number]["severity"],
	string
> = {
	info: "контроль",
	warning: "предупреждение",
	blocker: "важно",
};

export const clinicalRuleActionLabels: Record<
	Dashboard["clinicalRuleEvaluations"][number]["action"],
	string
> = {
	add_required_service: "добавить услугу",
	block_service: "проверить риск",
	show_warning: "показать врачу",
	schedule_followup: "поставить recall",
};

export const paymentMethodLabels: Record<string, string> = {
	cash: "Наличные",
	card: "Карта",
	bank_transfer: "Перевод",
	online: "Онлайн",
	insurance: "ДМС",
	family_wallet: "Семейный счет",
	other: "Иной способ",
};

export const communicationChannelLabels: Record<
	Dashboard["communicationTasks"][number]["channel"],
	string
> = {
	phone: "Звонок",
	sms: "SMS",
	whatsapp: "WhatsApp",
	telegram: "Телеграм",
	email: "Email",
	in_person: "В кабинете",
	vk: "ВКонтакте",
	max: "MAX",
};

export const communicationIntentLabels: Record<string, string> = {
	appointment_confirmation: "Подтверждение",
	payment_reminder: "Оплата",
	post_visit_instruction: "Инструкция",
	recall: "Повторный визит",
	document_ready: "Документы",
	imaging_review: "Снимок",
	general: "Связь",
	lead_capture: "Лид с лендинга",
	callback_requested: "Запрос обратного звонка",
	// Ответ на «СТОП» или «СТАРТ» от пациента. В журнале должно быть видно, что
	// это ответ на его обращение, а не наша рассылка.
	transactional_reply: "Ответ пациенту",
};

export const communicationPriorityLabels: Record<
	Dashboard["communicationTasks"][number]["priority"],
	string
> = {
	low: "низкий",
	normal: "обычный",
	high: "важно",
	urgent: "срочно",
};

export const communicationStatusLabels: Record<
	Dashboard["communicationTasks"][number]["status"],
	string
> = {
	queued: "в очереди",
	scheduled: "запланировано",
	needs_call: "нужен звонок",
	sent: "отправлено",
	delivered: "доставлено",
	completed: "закрыто",
	skipped: "пропущено",
	failed: "ошибка",
};

function isGeneratedDocumentKind(
	value: string,
): value is GeneratedDocument["kind"] {
	return value in documentLabels;
}

const moneyKindList: GeneratedDocument["kind"][] = [];
for (const [kind, metadata] of Object.entries(documentKindMetadata)) {
	if (metadata.amountSource !== "none" && isGeneratedDocumentKind(kind)) {
		moneyKindList.push(kind);
	}
}

export const moneyDocumentKinds = new Set<GeneratedDocument["kind"]>(moneyKindList);

export const structuredPayloadDocumentKinds = new Set<
	GeneratedDocument["kind"]
>([
	"paid_medical_services_contract",
	"completed_works_act",
	"treatment_cost_estimate",
	"payment_invoice",
	"payment_receipt",
	"installment_payment_schedule",
	"minor_legal_representative_consent",
	"warranty_service_memo",
	"patient_intake_questionnaire",
	"tax_deduction_application",
	"tax_deduction_certificate",
	"legacy_tax_deduction_certificate",
	"tax_deduction_registry",
	"anesthesia_consent_log",
	"prescription_medication_order",
	"lab_work_order",
	"photo_video_consent",
	"xray_cbct_referral",
	"dental_medical_card_043u",
	"medical_record_extract",
	"medical_record_copy_request",
	"post_visit_recommendations",
	"treatment_plan",
	"treatment_plan_acceptance",
	"visit_attendance_certificate",
	"medical_document_release_receipt",
	"payment_refund_correction_request",
	"informed_consent",
	"procedure_specific_consent_packet",
	"personal_data_processing_consent",
	"medical_intervention_refusal",
]);

export const clinicModeLabels: Record<
	ClinicMode,
	{ title: string; detail: string }
> = {
	solo_doctor: {
		title: "Отдельный врач",
		detail:
			"Минимум экранов, максимум скорости приема, документы и диктовка под рукой.",
	},
	one_chair: {
		title: "1 кабинет",
		detail: "Один поток пациентов, одна смена, простая касса, снимки и вычеты.",
	},
	small_clinic: {
		title: "Малая клиника",
		detail: "Несколько врачей, кресел, администраторы, ассистенты и роли.",
	},
	network_clinic: {
		title: "Сеть",
		detail:
			"Филиалы, централизованные шаблоны, права, импорт и сквозной аудит.",
	},
};

export const staffRoleLabels: Record<StaffRole, string> = {
	owner: "Владелец",
	admin: "Администратор системы",
	head_doctor: "Главный врач",
	manager: "Управляющий",
	accountant: "Бухгалтер",
	senior_admin: "Старший администратор",
	administrator: "Администратор",
	registrar: "Регистратор",
	doctor: "Врач",
	senior_nurse: "Старшая медсестра",
	assistant: "Ассистент",
	curator: "Куратор",
};

/**
 * ПОДПИСИ СТРОКИ ДЕЙСТВИЙ ТОПБАРА.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ СЛОВАРЁМ. Раньше эти строки лежали прямо в JSX
 * (`workspaceShell.tsx`), а у двух кнопок текста не было вовсе — смысл жил только
 * в `title`, то есть на телефоне не существовал. Библиотеки i18n в проекте нет,
 * поэтому текст живёт словарём рядом с владельцем, как `workspaceActionsLabels`,
 * `imagingUiLabels` и `pricelistUiMeta`.
 *
 * У каждого действия ЕСТЬ `label` — видимая подпись. Это не стиль, а требование:
 * всплывающая подсказка не является подписью, потому что на касании её нет.
 * `title` остаётся, но только как дополнение к подписи, а не вместо неё.
 */
export const workspaceTopbarLabels = {
	/** Экстренная помощь у кресла (SOS). */
	emergency: {
		label: "SOS",
		title: "Экстренная помощь у кресла (Ctrl+Alt+E)",
	},
	/** Быстрое переключение врача или ассистента по PIN у кресла. */
	switchRole: {
		label: "Сменить врача",
		title: "Быстро сменить врача или ассистента по PIN у кресла (без блокировки экрана)",
	},
	/** Подпись выпадающего списка ролей. */
	role: {
		region: "Рабочий режим",
		caption: "Роль",
	},
	/** Главное действие продукта. Оно обязано быть достижимо одним нажатием. */
	book: {
		label: "Запись",
		title: "Записать пациента — открыть расписание",
	},
	/**
	 * Ярлык врача на приём. Ведёт в приём и ставит курсор в поле диктовки: это
	 * то же самое действие, которым раньше был безымянный микрофон.
	 */
	visit: {
		label: "Прием",
		title: "Открыть приём и поставить курсор в поле диктовки",
	},
	/** Повторный проход мастера настройки клиники. */
	setup: {
		label: "Настроить",
		title: "Заново пройти мастер настройки клиники",
	},
	/**
	 * Замок рабочего места. Подпись обязательна: без неё это был красный значок
	 * без слов, а красный в палитре означает опасность, тогда как запереть
	 * рабочее место — обычное безопасное действие в конце смены.
	 *
	 * Подпись НЕ «Замок»: по-русски это слово читается двумя разными словами
	 * («замо́к» и «за́мок»), и рядом со значком висячего замка короткая подпись
	 * экономит место за счёт однозначности. Глагол говорит, что произойдёт.
	 */
	lock: {
		label: "Заблокировать",
		title: "Запереть рабочее место — вернуться можно по ПИН-коду сотрудника",
	},
	/** Кнопка вызова клинического ИИ-ассистента Дента. */
	copilot: {
		label: "Дента",
		title: "Дента — Клинический ИИ-ассистент (Ctrl+K)",
	},
	/** Кнопка открытия рабочего стола врача (Doctor Shift Cockpit). */
	doctorCockpit: {
		label: "Рабочий стол",
		title: "Рабочий стол врача (Doctor Shift Cockpit) — сменные показатели, сделка % и пакетная подпись медицинских карт",
	},
	/** Компактная капсула дневного заработка врача в шапке. */
	todayEarnings: {
		formatLabel: (formattedRub: string) => `+${formattedRub} сегодня`,
		title: "Ваш заработок за сегодняшнюю смену — нажмите, чтобы открыть сводку смены",
	},
	/** Кнопка вызова Базы знаний и интерактивного обучения DENTE. */
	learning: {
		label: "Обучение",
		title: "База знаний и интерактивное обучение DENTE",
	},
	/** 3D КЛКТ томография (Захаров, 312 срезов DICOM). */
	cbctDemo: {
		label: "3D КЛКТ",
		title: "Открыть 3D КЛКТ студию: реальное исследование (312 срезов DICOM)",
	},
	/** Интерактивный тюнер контраста и срезов КЛКТ. */
	cbctTuner: {
		label: "Тюнер КТ",
		title: "Открыть интерактивный тюнер контраста, срезов и ОПТГ панорамы",
	},
	/** Режим защиты приватности «Экран пациента». */
	patientScreen: {
		label: "Экран пациента",
		title: "Режим «Экран пациента» (Alt+H): скрыть балансы, долги и себестоимость",
	},
	/** Глобальный поиск и командный центр. */
	commandHud: {
		label: "Поиск и команды",
		title: "Глобальный поиск и команды (Ctrl+K)",
	},
	/** Подключение мобильного терминала по LAN QR. */
	lanQr: {
		label: "LAN QR",
		title: "Подключить телефон у кресла (LAN QR)",
	},
	/** Профиль сотрудника и быстрое контекстное меню. */
	profile: {
		label: "Профиль",
		title: "Профиль врача и быстрое контекстное меню",
	},
	/** Переключение темы оформления интерфейса. */
	theme: {
		label: "Тема",
		title: "Переключить светлую/тёмную тему оформления",
	},
	/** Завершение сеанса работы в клинике. */
	logout: {
		label: "Выход",
		title: "Завершить сеанс работы в клинике",
	},
} as const;

export const workloadStateLabels: Record<ResourceLoad["state"], string> = {
	idle: "пусто",
	healthy: "норма",
	tight: "плотно",
	overbooked: "плотный график приёма",
};

export const warningSeverityLabels: Record<
	ScheduleWarning["severity"],
	string
> = {
	info: "контроль",
	warning: "риск",
	critical: "важно",
};

export const specialtyLabels: Record<DentalSpecialty, string> = {
	therapist: "терапия",
	orthopedist: "ортопедия",
	surgeon: "хирургия",
	orthodontist: "ортодонтия",
	periodontist: "пародонтология",
	hygienist: "гигиена",
	pediatric: "детская",
	implantologist: "имплантация",
	radiologist: "рентген",
	universal: "универсально",
};

export const integrationCategoryLabels: Record<IntegrationCategory, string> = {
	dental_mis: "Старая МИС",
	spreadsheet: "Таблица",
	paper_archive: "Бумага/OCR",
	imaging_system: "Снимки",
	accounting: "Касса",
	custom: "Свой формат",
};

export const integrationCapabilityLabels: Record<
	IntegrationCapability,
	string
> = {
	patients: "пациенты",
	appointments: "записи",
	visits: "ЭМК",
	documents: "документы",
	services: "услуги",
	payments: "оплаты",
	imaging: "снимки",
	tax_documents: "вычет",
	audit: "аудит",
};

export const integrationStatusLabels: Record<IntegrationPresetStatus, string> =
	{
		usable_now: "можно сейчас",
		needs_mapping: "нужна карта полей",
		planned_connector: "подключение позже",
	};

export const recognitionTargetLabels: Record<AiRecognitionTarget, string> = {
	visit_note: "ЭМК",
	patient_import: "Импорт пациентов",
	imaging_summary: "описание снимка",
	document_draft: "документ",
};

export const speechProviderStatusLabels: Record<
	SpeechProvider["status"],
	string
> = {
	usable_without_key: "без серверного подключения",
	needs_server_key: "нужно серверное подключение",
	planned_local: "локальный контур",
};

export const speechProviderModeLabels: Record<SpeechProvider["mode"], string> =
	{
		browser_live: "браузерная диктовка",
		server_upload: "загрузка фрагментов",
		server_streaming: "поток",
		local_worker: "офлайн-обработчик",
	};

export const speechProviderSelectionLabels: Record<
	SpeechGatewayStatus["providerSelectionMode"],
	string
> = {
	disabled: "ожидает ключ",
	manual: "ручной выбор",
	auto: "автовыбор",
	fallback: "резерв",
};

export const speechProviderHealthLabels: Record<string, string> = {
	ready: "готов",
	degraded: "ограничен",
	setup_required: "нужна настройка",
	planned: "запланирован",
	offline: "офлайн",
};

export const speechRecordingPathLabels: Record<string, string> = {
	server_chunked: "серверное распознавание по фрагментам",
	browser_live: "браузерная диктовка",
	offline_queue: "офлайн-очередь",
	local_transcript_only: "только локальный текст",
	async_long_recording: "длинная запись в фоне",
};

export const speechRecoveryStateLabels: Record<string, string> = {
	complete: "готово",
	quality_review: "проверка качества",
	missing_chunks: "нет фрагментов",
	failed_chunks: "ошибка фрагментов",
	transcript_empty: "пустая расшифровка",
};

export const dicomFolderWorkupPathLabels: Record<
	DicomFolderWorkupPath,
	string
> = {
	open_mpr: "открыть КТ-срезы",
	downsampled_mpr: "быстрые КТ-срезы",
	external_viewer: "внешний просмотр",
	metadata_only: "только метаданные",
};

export const localBridgeStatusLabels: Record<LocalBridgeStatus, string> = {
	ready: "готов",
	not_configured: "не настроен",
	unreachable: "недоступен",
	blocked: "нужно действие",
	misconfigured: "ошибка настройки",
	planned: "запланирован",
};

export const localBridgeUsePathLabels: Record<LocalBridgeUsePath, string> = {
	browser_local: "локально в браузере",
	server_gateway: "серверное распознавание",
	local_bridge: "локальный модуль ПК",
	cloud_provider: "серверное распознавание",
	metadata_preview: "предпросмотр метаданных",
	external_viewer: "внешний просмотр",
	manual_review: "ручная проверка",
};
