import { z } from "zod";
import { type DocumentKind } from "../documents/index.js";

export const allowedHttpUrlProtocols: ReadonlySet<string> = new Set([
	"http:",
	"https:",
]);

export function isHttpUrl(value: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return false;
	}
	return allowedHttpUrlProtocols.has(parsed.protocol);
}

export const httpUrlSchema = z.string().url().refine(isHttpUrl, {
	message: "адрес должен начинаться с http:// или https://",
});

export const visitStatusSchema = z.enum(["draft", "signed", "voided"]);

export type VisitStatus = z.infer<typeof visitStatusSchema>;

export type DocumentKindGroup =
	| "visit"
	| "payment"
	| "tax"
	| "legal"
	| "workflow";

export type DocumentAmountSource = "none" | "planned" | "paid";

export const documentSourceStatusSchema = z.enum([
	"official_form",
	"official_workflow",
	"clinic_template",
	"internal_register",
]);

export type DocumentSourceStatus = z.infer<typeof documentSourceStatusSchema>;

export type DocumentKindBaseMetadata = {
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

export const documentSourceStatusLabels: Record<DocumentSourceStatus, string> =
	{
		official_form: "Официальная форма",
		official_workflow: "Официальный порядок",
		clinic_template: "Шаблон клиники",
		internal_register: "Внутренний реестр",
	};

export const documentKindBaseMetadata = {
	paid_medical_services_contract: {
		title: "Договор платных медицинских услуг",
		label: "Договор",
		actionLabel: "Подготовить договор",
		group: "payment",
		amountSource: "planned",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	completed_works_act: {
		title: "Акт выполненных работ",
		label: "Акт",
		actionLabel: "Закрыть акт",
		group: "payment",
		amountSource: "paid",
		requiresVisit: true,
		requiresPaidRecord: true,
	},
	tax_deduction_certificate: {
		title: "Справка для налогового вычета",
		label: "Налоговый вычет",
		actionLabel: "Справка для налоговой",
		group: "tax",
		amountSource: "paid",
		requiresVisit: false,
		requiresPaidRecord: true,
	},
	informed_consent: {
		title: "Информированное добровольное согласие",
		label: "Согласие",
		actionLabel: "Согласие",
		group: "visit",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	procedure_specific_consent_packet: {
		title: "Согласие на стоматологическое вмешательство по процедуре",
		label: "Спец. согласие",
		actionLabel: "Согласие по процедуре",
		group: "visit",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	treatment_plan: {
		title: "План лечения",
		label: "План",
		actionLabel: "План лечения",
		group: "visit",
		amountSource: "planned",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	treatment_plan_acceptance: {
		title: "Согласование плана лечения и альтернатив",
		label: "Согласование",
		actionLabel: "Согласование плана",
		group: "visit",
		amountSource: "planned",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	anesthesia_consent_log: {
		title: "Согласие и журнал местной анестезии",
		label: "Анестезия",
		actionLabel: "Анестезия/журнал",
		group: "visit",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	prescription_medication_order: {
		title: "Назначение лекарственных препаратов",
		label: "Назначения",
		actionLabel: "Назначения",
		group: "visit",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	personal_data_processing_consent: {
		title: "Согласие на обработку персональных данных",
		label: "Персональные данные",
		actionLabel: "Согласие на обработку данных",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	minor_legal_representative_consent: {
		title: "Согласие законного представителя несовершеннолетнего",
		label: "Представитель",
		actionLabel: "Согласие представителя",
		group: "legal",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	photo_video_consent: {
		title: "Согласие на фото-, видео- и рентген-материалы",
		label: "Фото/видео",
		actionLabel: "Фото/видео согласие",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	medical_intervention_refusal: {
		title: "Отказ от медицинского вмешательства",
		label: "Отказ",
		actionLabel: "Отказ от вмешательства",
		group: "legal",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	treatment_cost_estimate: {
		title: "Смета лечения",
		label: "Смета",
		actionLabel: "Смета лечения",
		group: "payment",
		amountSource: "planned",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	payment_invoice: {
		title: "Счет на оплату",
		label: "Счет",
		actionLabel: "Счет на оплату",
		group: "payment",
		amountSource: "planned",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	payment_receipt: {
		title: "Квитанция/памятка об оплате",
		label: "Квитанция",
		actionLabel: "Квитанция/памятка",
		group: "payment",
		amountSource: "paid",
		requiresVisit: false,
		requiresPaidRecord: true,
	},
	installment_payment_schedule: {
		title: "График рассрочки и оплат",
		label: "Рассрочка",
		actionLabel: "График оплат",
		group: "payment",
		amountSource: "planned",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	post_visit_recommendations: {
		title: "Рекомендации после приема",
		label: "Рекомендации",
		actionLabel: "Рекомендации",
		group: "visit",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	outpatient_medical_card_025u: {
		title:
			"[ЛИКВИДИРОВАНО] Медицинская карта 025/у (заменена на 043/у per Mandates 8i, 8s)",
		label: "Карта 025/у (ликвидирована)",
		actionLabel: "Карта 025/у (ликвидирована)",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	dental_medical_card_043u: {
		title: "Медицинская карта приёма",
		label: "Медицинская карта приёма",
		actionLabel: "Медицинская карта приёма",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	orthodontic_medical_card_043_1u: {
		title: "Ортодонтическая карта",
		label: "Ортодонтическая карта",
		actionLabel: "Ортодонтическая карта",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	daily_dentist_diary_037u: {
		title: "Дневник приёма",
		label: "Дневник приёма",
		actionLabel: "Дневник приёма",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	summary_dentist_statement_039u: {
		title: "Сводная ведомость приёма",
		label: "Сводная ведомость приёма",
		actionLabel: "Сводная ведомость приёма",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	medical_record_extract: {
		title: "Выписка из карты",
		label: "Выписка из карты",
		actionLabel: "Выписка из карты",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	medical_record_copy_request: {
		title: "Запрос на копии медицинской документации",
		label: "Копии карты",
		actionLabel: "Запрос копий карты",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	medical_document_release_receipt: {
		title: "Расписка о выдаче медицинской документации",
		label: "Выдача копий",
		actionLabel: "Расписка выдачи",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	xray_cbct_referral: {
		title: "Направление на рентген/КЛКТ",
		label: "Снимок",
		actionLabel: "Направление на снимок",
		group: "legal",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	radiation_dose_sheet: {
		title: "Лист учета дозовых нагрузок пациента при рентгенологических исследованиях",
		label: "Лист доз",
		actionLabel: "Лист доз",
		group: "legal",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	lab_work_order: {
		title: "Зуботехнический заказ-наряд",
		label: "Лаборатория",
		actionLabel: "Заказ в лабораторию",
		group: "workflow",
		amountSource: "planned",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	visit_attendance_certificate: {
		title: "Справка о посещении врача-стоматолога",
		label: "Справка о визите",
		actionLabel: "Справка о посещении",
		group: "legal",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	warranty_service_memo: {
		title: "Гарантийная памятка по стоматологической работе",
		label: "Гарантия",
		actionLabel: "Гарантийная памятка",
		group: "legal",
		amountSource: "none",
		requiresVisit: true,
		requiresPaidRecord: false,
	},
	payment_refund_correction_request: {
		title: "Заявление на возврат или коррекцию оплаты",
		label: "Возврат оплаты",
		actionLabel: "Возврат/коррекция",
		group: "payment",
		amountSource: "paid",
		requiresVisit: true,
		requiresPaidRecord: true,
	},
	tax_deduction_application: {
		title: "Заявление на справку для налогового вычета",
		label: "Заявление",
		actionLabel: "Заявление на вычет",
		group: "tax",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
	legacy_tax_deduction_certificate: {
		title: "Справка об оплате медицинских услуг для налоговой до 2024 года",
		label: "Старая справка",
		actionLabel: "Справка до 2024",
		group: "tax",
		amountSource: "paid",
		requiresVisit: false,
		requiresPaidRecord: true,
	},
	tax_deduction_registry: {
		title: "Реестр оплат для налоговой справки",
		label: "Реестр",
		actionLabel: "Реестр для вычета",
		group: "tax",
		amountSource: "paid",
		requiresVisit: false,
		requiresPaidRecord: true,
	},
	patient_intake_questionnaire: {
		title: "Анкета пациента",
		label: "Анкета",
		actionLabel: "Анкета пациента",
		group: "visit",
		amountSource: "none",
		requiresVisit: false,
		requiresPaidRecord: false,
	},
} as const satisfies Record<DocumentKind, DocumentKindBaseMetadata>;

export const documentSourceCheckedAt = "2026-05-24";

export const fnsDocumentSourceCheckedAt = "2026-05-25";
