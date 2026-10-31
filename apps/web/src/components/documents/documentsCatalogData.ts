/**
 * apps/web/src/components/documents/documentsCatalogData.ts
 *
 * Канонический SSOT документооборота, юридических шаблонов и расчета целочисленных копеек DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-практика), 8x (Живой русский клинический язык), 8ap (Анти-вранье).
 * Диапазон строк: 300–350 строк (Sweet Spot).
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

export type DocumentCatalogCategory =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "refusal"
	| "pediatric"
	| "registry";

export interface ClinicRequisites {
	readonly name: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly address: string;
	readonly phone: string;
	readonly license: string;
}

export interface PatientRequisites {
	readonly fullName: string;
	readonly birthDate: string;
	readonly passport: string;
	readonly address: string;
	readonly phone: string;
	readonly inn?: string | undefined;
}

export interface DoctorRequisites {
	readonly fullName: string;
	readonly specialty: string;
}

export interface DocumentServiceItem {
	readonly id: string;
	readonly title: string;
	readonly code804n?: string | undefined;
	readonly quantity: number;
	readonly priceKopecks: number;
	readonly amountKopecks: number;
}

export interface DocumentLegalContext {
	readonly clinic: ClinicRequisites;
	readonly patient: PatientRequisites;
	readonly doctor: DoctorRequisites;
	readonly documentNumber: string;
	readonly documentDate: string;
	readonly taxYear?: number | undefined;
	readonly services: readonly DocumentServiceItem[];
	readonly totalAmountKopecks: number;
	readonly diagnosisRu?: string | undefined;
	readonly anamnesisRu?: string | undefined;
	readonly epicrisisRu?: string | undefined;
}

export const DEFAULT_CLINIC_REQUISITES: ClinicRequisites = {
	name: 'ООО "Стоматологическая клиника ДЕНТЕ"',
	inn: "7701234567",
	ogrn: "1237700456789",
	address: "г. Москва, ул. Клиническая, д. 12, стр. 1",
	phone: "+7 (495) 789-01-23",
	license: "ЛО41-01137-77/00561234 от 14.02.2021 выдана ДЗМ",
};

/**
 * Целочисленное форматирование копеек в рубли (Мандат 8wy).
 */
export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.max(0, Math.round(kopecks || 0));
	const rubles = Math.floor(safeKopecks / 100);
	const remainder = safeKopecks % 100;
	const formattedRubles = rubles.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
	return remainder > 0
		? `${formattedRubles},${remainder.toString().padStart(2, "0")} ₽`
		: `${formattedRubles} ₽`;
}

export function sumKopecks(items: readonly { readonly amountKopecks: number }[]): number {
	return items.reduce((acc, curr) => acc + (curr.amountKopecks || 0), 0);
}

// ---------------------------------------------------------------------------
// КАНОНИЧЕСКИЕ ЮРИДИЧЕСКИЕ ШАБЛОНЫ (БЕЗ СОВЕТСКОГО КАНЦЕЛЯРИТА И БЕЗ ЭМОДЗИ)
// ---------------------------------------------------------------------------

export function generateContractTemplate(ctx: DocumentLegalContext): string {
	return `ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ № ${ctx.documentNumber}

г. Москва                                                              Дата: ${ctx.documentDate}

1. СТОРОНЫ ДОГОВОРА
Исполнитель: ${ctx.clinic.name}, ОГРН ${ctx.clinic.ogrn}, ИНН ${ctx.clinic.inn}, адрес: ${ctx.clinic.address}, лицензия: ${ctx.clinic.license}.
Заказчик (Пациент): ${ctx.patient.fullName}, дата рождения: ${ctx.patient.birthDate}, паспорт: ${ctx.patient.passport}, телефон: ${ctx.patient.phone}, адрес: ${ctx.patient.address}.

2. ПРЕДМЕТ ДОГОВОРА
2.1. Исполнитель обязуется оказать Пациенту квалифицированные стоматологические услуги в соответствии с медицинскими показаниями и стандартами качества, а Пациент обязуется оплатить оказанные услуги.
2.2. Лечащий врач: ${ctx.doctor.fullName} (${ctx.doctor.specialty}).

3. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ
3.1. Предварительная стоимость услуг по согласованному плану лечения составляет: ${formatKopecksToRubles(ctx.totalAmountKopecks)}.
3.2. Оплата производится в кассу или на расчетный счет Исполнителя в день оказания услуг.

4. ПОДПИСИ СТОРОН
Исполнитель: _________________ / ${ctx.doctor.fullName} /          Пациент: _________________ / ${ctx.patient.fullName} /`;
}

export function generateActTemplate(ctx: DocumentLegalContext): string {
	const itemsRows = ctx.services.length > 0
		? ctx.services.map((s, idx) => `${idx + 1}. ${s.title} — ${s.quantity} шт. × ${formatKopecksToRubles(s.priceKopecks)} = ${formatKopecksToRubles(s.amountKopecks)}`).join("\n")
		: "1. Стоматологический терапевтический приём и санация — 1 усл. = " + formatKopecksToRubles(ctx.totalAmountKopecks);

	return `АКТ ВЫПОЛНЕННЫХ УСЛУГ К ДОГОВОРУ № ${ctx.documentNumber}

г. Москва                                                              Дата: ${ctx.documentDate}

Исполнитель: ${ctx.clinic.name}
Пациент: ${ctx.patient.fullName} (паспорт: ${ctx.patient.passport})
Лечащий врач: ${ctx.doctor.fullName}

ПЕРЕЧЕНЬ ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ:
${itemsRows}

ИТОГО К ОПЛАТЕ: ${formatKopecksToRubles(ctx.totalAmountKopecks)}

Претензий по объёму, срокам и качеству оказанных медицинских услуг Пациент к клинике не имеет.
Услуги оказаны в полном объёме, надлежащего качества.

Исполнитель: _________________ / ${ctx.doctor.fullName} /          Пациент: _________________ / ${ctx.patient.fullName} /`;
}

export function generateTaxCertificateTemplate(ctx: DocumentLegalContext): string {
	const year = ctx.taxYear || new Date().getFullYear();
	return `СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВЫХ ОРГАНОВ РФ
Номер справки: ${ctx.documentNumber}
Отчётный налоговый период: ${year} год

1. Сведения о медицинской организации:
Наименование: ${ctx.clinic.name}
ИНН: ${ctx.clinic.inn} | ОГРН: ${ctx.clinic.ogrn}
Лицензия на медицинскую деятельность: ${ctx.clinic.license}
Адрес местонахождения: ${ctx.clinic.address}

2. Сведения о налогоплательщике и пациенте:
Пациент: ${ctx.patient.fullName}, дата рождения: ${ctx.patient.birthDate}
Документ, удостоверяющий личность: ${ctx.patient.passport}
${ctx.patient.inn ? `ИНН налогоплательщика: ${ctx.patient.inn}` : "ИНН налогоплательщика: не указан (для физлиц не обязателен)"}

3. Сведения об оплате стоматологических услуг:
Код услуги 1 (обычное лечение): ${formatKopecksToRubles(ctx.totalAmountKopecks)}
Код услуги 2 (дорогостоящее лечение): 0 ₽
ИТОГО подтверждённая сумма расходов: ${formatKopecksToRubles(ctx.totalAmountKopecks)}

Справка выдана для предоставления в налоговые органы РФ с целью получения социального налогового вычета.
Уполномоченное лицо клиники: _________________ / Главный врач / М.П.
Дата выдачи: ${ctx.documentDate}`;
}

export function generateCardExtractTemplate(ctx: DocumentLegalContext): string {
	return `ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПРИЁМА
Выписка № ${ctx.documentNumber} к карте пациента

1. Пациент: ${ctx.patient.fullName}, ${ctx.patient.birthDate} г.р.
2. Лечебное учреждение: ${ctx.clinic.name}
3. Лечащий врач: ${ctx.doctor.fullName} (${ctx.doctor.specialty})
4. Клинический диагноз: ${ctx.diagnosisRu || "К02.1 Кариес дентина зуба 4.6. Интактный зубной ряд."}
5. Анамнез заболевания: ${ctx.anamnesisRu || "Пациент обратился с жалобами на кратковременные боли от температурных раздражителей. Аллергоанамнез не отягощен."}
6. Проведенное лечение:
${ctx.services.map((s, i) => `${i + 1}) ${s.title} (${s.quantity} ед.)`).join("\n") || "Препарирование кариозной полости, медикаментозная обработка, постановка светоотверждаемой пломбы."}
7. Исход лечения и рекомендации: ${ctx.epicrisisRu || "Зуб восстановлен анатомически и функционально. Санация завершена. Контрольный осмотр через 6 месяцев."}

Врач: _________________ / ${ctx.doctor.fullName} /          М.П. Клиники
Дата: ${ctx.documentDate}`;
}

// ---------------------------------------------------------------------------
// КАТАЛОГ БЛАНКОВ И ПЕРЕКЛЮЧАТЕЛЬ ШАБЛОНОВ
// ---------------------------------------------------------------------------

export interface DocumentCatalogItem {
	readonly id: string;
	readonly kind?: DocumentKind | undefined;
	readonly titleRu: string;
	readonly category: DocumentCatalogCategory;
	readonly descriptionRu: string;
	readonly badgeRu: string;
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

export function getDocumentsCatalogData(
	handlers: DocumentCatalogActionHandlers = {},
): DocumentCatalogItem[] {
	return [
		{
			id: "doc_treatment_contract",
			kind: "paid_medical_services_contract",
			titleRu: "Договор платных медицинских услуг",
			category: "intake",
			descriptionRu: "Договор с пациентом на оказание стоматологических услуг",
			badgeRu: "Договор клиники",
			icon: FileText,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("contract"),
		},
		{
			id: "doc_treatment_act_completed",
			kind: "completed_works_act",
			titleRu: "Акт выполненных стоматологических работ",
			category: "finance_tax",
			descriptionRu: "Финансовый акт оказанных услуг с подписями сторон",
			badgeRu: "Акт услуг",
			icon: FileCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("act"),
		},
		{
			id: "doc_tax_deduction_certificate",
			kind: "tax_deduction_certificate",
			titleRu: "Справка для налогового вычета (ФНС)",
			category: "finance_tax",
			descriptionRu: "Справка об оплате медуслуг для возврата 13% НДФЛ",
			badgeRu: "Справка ФНС",
			icon: Zap,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenTaxModal?.("form"),
		},
		{
			id: "doc_medical_card_extract",
			kind: "dental_medical_card_043u",
			titleRu: "Выписка из медицинской карты приёма",
			category: "clinical",
			descriptionRu: "Выписка диагнозов, анамнеза и проведённого лечения",
			badgeRu: "Выписка из карты",
			icon: ClipboardList,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("medical_card"),
		},
		{
			id: "doc_informed_consent_general",
			kind: "informed_consent",
			titleRu: "Информированное согласие на лечение",
			category: "intake",
			descriptionRu: "Добровольное согласие на осмотр, диагностику и анестезию",
			badgeRu: "Согласие",
			icon: ShieldCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("informed_consent"),
		},
		{
			id: "doc_personal_data_consent",
			kind: "personal_data_processing_consent",
			titleRu: "Согласие на обработку персональных данных",
			category: "intake",
			descriptionRu: "Согласие на ведение карты и сервисное информирование",
			badgeRu: "Персданные",
			icon: UserCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("personal_data"),
		},
		{
			id: "doc_treatment_plan",
			kind: "treatment_plan",
			titleRu: "План стоматологического лечения",
			category: "clinical",
			descriptionRu: "Поэтапный клинический график и финансовая смета",
			badgeRu: "План и смета",
			icon: FileText,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("treatment_plan"),
		},
		{
			id: "doc_xray_referral",
			kind: "xray_cbct_referral",
			titleRu: "Направление на рентгенодиагностику и КТ",
			category: "clinical",
			descriptionRu: "Направление на прицельный снимок, ОПТГ или 3D КЛКТ",
			badgeRu: "Рентген / КЛКТ",
			icon: Scan,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("xray_cbct_referral", "Направление на рентген и КТ"),
		},
		{
			id: "doc_post_visit_recommendations",
			kind: "post_visit_recommendations",
			titleRu: "Рекомендации пациенту после приёма",
			category: "clinical",
			descriptionRu: "Памятка по уходу после терапевтического или хирургического визита",
			badgeRu: "Памятка",
			icon: Sparkles,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("post_visit_recommendations", "Рекомендации после приёма"),
		},
		{
			id: "doc_payment_receipt",
			kind: "payment_receipt",
			titleRu: "Квитанция и подтверждение оплаты",
			category: "finance_tax",
			descriptionRu: "Подтверждение оплаты услуг в кассе клиники",
			badgeRu: "Касса и чек",
			icon: Receipt,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("payment_receipt", "Квитанция об оплате"),
		},
		{
			id: "doc_medical_intervention_refusal",
			kind: "medical_intervention_refusal",
			titleRu: "Отказ от медицинского вмешательства",
			category: "refusal",
			descriptionRu: "Бланк отказа пациента от предложенного обследования или лечения",
			badgeRu: "Бланк отказа",
			icon: ShieldAlert,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("medical_intervention_refusal", "Отказ от медицинского вмешательства"),
		},
		{
			id: "doc_pediatric_representative_consent",
			kind: "minor_legal_representative_consent",
			titleRu: "Согласие законного представителя ребёнка",
			category: "pediatric",
			descriptionRu: "Согласие родителя или опекуна на осмотр и лечение ребёнка",
			badgeRu: "Педиатрия",
			icon: Heart,
			isPediatric: true,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("informed_consent"),
		},
		{
			id: "doc_pediatric_bravery_diploma",
			titleRu: "Грамота за смелость (детский диплом)",
			category: "pediatric",
			descriptionRu: "Именной диплом маленькому пациенту за храбрость у кресла",
			badgeRu: "Грамота",
			icon: Award,
			isPediatric: true,
			printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("treatment_plan", "Грамота за смелость"),
		},
	];
}
