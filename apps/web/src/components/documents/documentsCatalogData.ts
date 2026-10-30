/**
 * documentsCatalogData.ts
 *
 * Канонический реестр документов, информированных согласий
 * и справок налогового вычета 13% НДФЛ DENTE Dental CRM.
 *
 * Инварианты Мандата 8x, 8ap, 8e и 8n:
 * - Никаких советских шифров и канцелярита («043/у» -> «Медицинская карта приёма»).
 * - Ровно 16 утверждённых форм с распределением по 6 клиническим категориям.
 * - Чистые иконки, zero-emoji, строгий медицинский стиль.
 * - Целевой размер: 200–250 строк (Sweet Spot).
 */

import type { DocumentKind } from "@dental/shared";
import type React from "react";
import {
	Award,
	ClipboardList,
	FileCheck,
	FileText,
	Heart,
	Receipt,
	Scan,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	UserCheck,
	Zap,
} from "lucide-react";
import { DentalMedicalCard, ToothDeciduous } from "../icons/DentalIcons";

export type DocumentCatalogCategory =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "refusal"
	| "pediatric"
	| "registry";

export interface DocumentCatalogItem {
	readonly id: string;
	readonly kind?: DocumentKind | undefined;
	readonly titleRu: string;
	readonly category: DocumentCatalogCategory;
	readonly descriptionRu: string;
	readonly badgeRu: string;
	readonly regulationRu: string;
	readonly icon: React.ComponentType<{ className?: string; size?: number }>;
	readonly isPediatric?: boolean | undefined;
	readonly isStatutory?: boolean | undefined;
	readonly printSupported: boolean;
	readonly onQuickAction?: () => void;
}

export interface DocumentCatalogActionHandlers {
	readonly onOpenKind?: ((kind: DocumentKind, titleRu?: string) => void) | undefined;
	readonly onOpenA4Tab?: ((tab: string) => void) | undefined;
	readonly onOpenTaxModal?: ((tab?: string) => void) | undefined;
	readonly onOpenConsentModal?: (() => void) | undefined;
	readonly onOpenDiplomaModal?: (() => void) | undefined;
}

export const CATALOG_CATEGORIES: readonly { id: DocumentCatalogCategory; label: string }[] = [
	{ id: "all", label: "Все документы" },
	{ id: "intake", label: "Первичный приём" },
	{ id: "clinical", label: "Клинические" },
	{ id: "finance_tax", label: "Финансы и НДФЛ" },
	{ id: "pediatric", label: "Детский приём" },
	{ id: "refusal", label: "Отказы" },
	{ id: "registry", label: "Реестры" },
];

/**
 * Создаёт полный список 16 утверждённых бланков и шаблонов клиники
 */
export function getDocumentsCatalogData(
	handlers: DocumentCatalogActionHandlers = {},
): DocumentCatalogItem[] {
	return [
		// 1. Первичный приём (Intake)
		{
			id: "doc_treatment_contract",
			kind: "paid_medical_services_contract",
			titleRu: "Договор платных медицинских услуг",
			category: "intake",
			descriptionRu: "Договор с пациентом или заказчиком на оказание стоматологических услуг",
			badgeRu: "Договор клиники",
			regulationRu: "Договор клиники · Стандарт",
			icon: FileText,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("contract"),
		},
		{
			id: "doc_informed_consent_general",
			kind: "informed_consent",
			titleRu: "Информированное согласие на лечение",
			category: "intake",
			descriptionRu: "Добровольное информированное согласие на диагностику, осмотр и анестезию",
			badgeRu: "Согласие на лечение",
			regulationRu: "Клинический стандарт согласия",
			icon: ShieldCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("informed_consent"),
		},
		{
			id: "doc_personal_data_consent",
			kind: "personal_data_processing_consent",
			titleRu: "Согласие на обработку персданных",
			category: "intake",
			descriptionRu: "Правовое основание для ведения медкарты, связи и сервисных уведомлений",
			badgeRu: "Согласие на обработку персональных данных",
			regulationRu: "Персональные данные · Конфиденциальность",
			icon: UserCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("personal_data"),
		},
		{
			id: "doc_patient_health_questionnaire",
			kind: "patient_intake_questionnaire",
			titleRu: "Анкета первичного пациента о здоровье",
			category: "intake",
			descriptionRu: "Сбор аллергоанамнеза, соматических патологий и реакций на медикаменты",
			badgeRu: "Анкета здоровья",
			regulationRu: "Анкета здоровья · Аллергоанамнез",
			icon: ClipboardList,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("patient_intake_questionnaire", "Анкета первичного пациента о здоровье"),
		},

		// 2. Клинические протоколы и карта (Clinical)
		{
			id: "doc_medical_card_visit",
			kind: "dental_medical_card_043u",
			titleRu: "Медицинская карта приёма",
			category: "clinical",
			descriptionRu: "Амбулаторный дневник приёма, статус зубной формулы и протокол осмотра",
			badgeRu: "Медицинская карта",
			regulationRu: "Медицинская карта · Дневник приёма",
			icon: DentalMedicalCard,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("medical_card"),
		},
		{
			id: "doc_treatment_plan",
			kind: "treatment_plan",
			titleRu: "План стоматологического лечения",
			category: "clinical",
			descriptionRu: "Поэтапный клинический график санации, финансовая смета и сроки",
			badgeRu: "План и смета",
			regulationRu: "План лечения · Гарантии",
			icon: FileText,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("treatment_plan"),
		},
		{
			id: "doc_xray_referral",
			kind: "xray_cbct_referral",
			titleRu: "Направление на рентгенодиагностику и КТ",
			category: "clinical",
			descriptionRu: "Направление на прицельный снимок, панораму (ОПТГ) или 3D томографию (КЛКТ)",
			badgeRu: "Рентген / КЛКТ",
			regulationRu: "Лучевая диагностика · Направление",
			icon: Scan,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("xray_cbct_referral", "Направление на рентгенодиагностику и КТ"),
		},
		{
			id: "doc_post_visit_recommendations",
			kind: "post_visit_recommendations",
			titleRu: "Рекомендации пациенту после приёма",
			category: "clinical",
			descriptionRu: "Памятка по домашнему уходу и режиму после терапевтического или хирургического лечения",
			badgeRu: "Памятка ухода",
			regulationRu: "Памятка пациенту · Реабилитация",
			icon: Sparkles,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("post_visit_recommendations", "Рекомендации пациенту после приёма"),
		},

		// 3. Финансы и налоговый вычет 13% НДФЛ (Finance & Tax)
		{
			id: "doc_tax_deduction_certificate",
			kind: "tax_deduction_certificate",
			titleRu: "Справка для налогового вычета 13% НДФЛ",
			category: "finance_tax",
			descriptionRu: "Справка об оплате медуслуг по кодам 1 и 2 (КНД 1151156) для возврата 13% НДФЛ",
			badgeRu: "Справка ФНС 13%",
			regulationRu: "Справка об оплате медуслуг · КНД 1151156",
			icon: Zap,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenTaxModal?.("form"),
		},
		{
			id: "doc_tax_deduction_registry",
			titleRu: "Реестр справок для налогового вычета (ФНС)",
			category: "registry",
			descriptionRu: "Электронный журнал выданных справок об оплате медицинских услуг для ФНС",
			badgeRu: "Журнал ФНС",
			regulationRu: "Реестр справок об оплате медуслуг",
			icon: ClipboardList,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenTaxModal?.("registry"),
		},
		{
			id: "doc_treatment_act_completed",
			kind: "completed_works_act",
			titleRu: "Акт выполненных стоматологических работ",
			category: "finance_tax",
			descriptionRu: "Финансовый акт оказанных услуг с подписями сторон о надлежащей приёмке",
			badgeRu: "Акт услуг",
			regulationRu: "Финансовый акт · Услуги",
			icon: FileCheck,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("act"),
		},
		{
			id: "doc_payment_receipt",
			kind: "payment_receipt",
			titleRu: "Квитанция и подтверждение оплаты",
			category: "finance_tax",
			descriptionRu: "Подтверждение оплаты услуг наличными, картой, СБП или авансом",
			badgeRu: "Кассовый чек",
			regulationRu: "Кассовый чек и оплата",
			icon: Receipt,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("payment_receipt", "Квитанция и подтверждение оплаты"),
		},

		// 4. Отказы (Refusal)
		{
			id: "doc_medical_intervention_refusal",
			kind: "medical_intervention_refusal",
			titleRu: "Отказ от медицинского вмешательства",
			category: "refusal",
			descriptionRu: "Официальный бланк отказа пациента от предложенного обследования или плана лечения",
			badgeRu: "Бланк отказа",
			regulationRu: "Отказ от медицинского вмешательства",
			icon: ShieldAlert,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("medical_intervention_refusal", "Отказ от медицинского вмешательства"),
		},

		// 5. Детский приём (Pediatric)
		{
			id: "doc_pediatric_representative_consent",
			kind: "minor_legal_representative_consent",
			titleRu: "Согласие законного представителя ребёнка",
			category: "pediatric",
			descriptionRu: "Согласие родителя, усыновителя или опекуна на осмотр и лечение несовершеннолетнего",
			badgeRu: "Педиатрия",
			regulationRu: "Согласие представителя · Педиатрия",
			icon: Heart,
			isPediatric: true,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenConsentModal?.(),
		},
		{
			id: "doc_pediatric_bravery_diploma",
			titleRu: "Грамота за смелость (детский диплом)",
			category: "pediatric",
			descriptionRu: "Памятный именной диплом маленькому пациенту за храбрость у кресла врача",
			badgeRu: "Грамота",
			regulationRu: "Детская грамота за смелость",
			icon: Award,
			isPediatric: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenDiplomaModal?.(),
		},
		{
			id: "doc_pediatric_treatment_plan",
			kind: "treatment_plan",
			titleRu: "План лечения ребёнка",
			category: "pediatric",
			descriptionRu: "График адаптационных визитов, санации молочных зубов и герметизации фиссур",
			badgeRu: "Детский план",
			regulationRu: "План детской санации · Педиатрия",
			icon: ToothDeciduous,
			isPediatric: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("treatment_plan"),
		},
	];
}
