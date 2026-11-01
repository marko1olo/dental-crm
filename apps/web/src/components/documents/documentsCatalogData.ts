/**
 * apps/web/src/components/documents/documentsCatalogData.ts
 *
 * Канонический SSOT документооборота, информированных согласий и юридических справок DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-практика), 8x (Живой русский клинический язык), 8ap (Анти-вранье).
 * Целевой размер: 320–360 строк (Sweet Spot). 0 float-ошибок (Мандат 8wy).
 */

import type { DocumentKind } from "@dental/shared";
import type React from "react";
import {
	Building2,
	ClipboardList,
	FileCheck,
	FileText,
	Heart,
	Receipt,
	ShieldCheck,
	Sparkles,
	UserCheck,
	Zap,
} from "lucide-react";

export type DocumentPackageKey =
	| "intake"
	| "informed_consent"
	| "tax_certificate"
	| "card_extract";

export type ConsentSubKind =
	| "therapy"
	| "surgery"
	| "implant"
	| "orthopedics"
	| "anesthesia";

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
	readonly code?: string | undefined;
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
	readonly consentSubKind?: ConsentSubKind | undefined;
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
 * Целочисленное форматирование копеек в рубли (Мандат 8wy, 0 float-ошибок).
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
// 4 КАНОНИЧЕСКИХ ПАКЕТА КЛИНИКИ РФ (SSOT FIRST PRINCIPLES)
// ---------------------------------------------------------------------------

export interface ClinicalPackageMeta {
	readonly id: DocumentPackageKey;
	readonly titleRu: string;
	readonly badgeRu: string;
	readonly descriptionRu: string;
	readonly includes: readonly string[];
}

export const CANONICAL_CLINIC_PACKAGES: readonly ClinicalPackageMeta[] = [
	{
		id: "intake",
		titleRu: "Первичный приём",
		badgeRu: "Пакет пациента",
		descriptionRu: "Договор на стоматологические услуги, согласие на обработку данных и анкета здоровья",
		includes: [
			"Договор на оказание медицинских услуг",
			"Согласие на обработку персональных данных",
			"Анкета общего соматического здоровья пациента",
		],
	},
	{
		id: "informed_consent",
		titleRu: "Информированное согласие на лечение",
		badgeRu: "Клиническое ИДС",
		descriptionRu: "Добровольное согласие на терапию, хирургию, имплантацию, ортопедию и анестезию",
		includes: [
			"План терапевтического / хирургического вмешательства",
			"Информирование о возможных рисках и гарантиях",
			"Согласие на местное обезболивание",
		],
	},
	{
		id: "tax_certificate",
		titleRu: "Справка для налогового вычета",
		badgeRu: "Налоговый вычет",
		descriptionRu: "Справка об оплате медицинских услуг для ФНС с расчетом суммы в рублях и копейках",
		includes: [
			"Официальная справка для налоговых органов РФ",
			"Подтверждение расходов на лечение (13% НДФЛ)",
			"Реквизиты лицензии и плательщика",
		],
	},
	{
		id: "card_extract",
		titleRu: "Медицинская карта приёма и выписка",
		badgeRu: "Клиническая карта",
		descriptionRu: "Дневник осмотра по стандарту SOAP, выполненные работы и гарантийный талон",
		includes: [
			"Клинический дневник осмотра (SOAP)",
			"Акт выполненных стоматологических работ",
			"Гарантийный талон и рекомендации врача",
		],
	},
];

// ---------------------------------------------------------------------------
// ГЕНЕРАТОРЫ ШАБЛОНОВ БЕЗ СОВЕТСКОГО КАНЦЕЛЯРИТА (МАНДАТЫ 8x, 8ap)
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

export function generateInformedConsentTemplate(
	ctx: DocumentLegalContext,
	subKind: ConsentSubKind = "therapy",
): string {
	const titles: Record<ConsentSubKind, { label: string; desc: string; risks: string }> = {
		therapy: {
			label: "ТЕРАПЕВТИЧЕСКОЕ ЛЕЧЕНИЕ И ПЛОМБИРОВАНИЕ ЗУБОВ",
			desc: "Препарирование кариозной полости, изоляция рабочего поля, адгезивная подготовка и послойная реставрация светоотверждаемым композитом.",
			risks: "Кратковременная постпломбировочная чувствительность на температурные раздражители в течение 3–7 дней.",
		},
		surgery: {
			label: "ХИРУРГИЧЕСКОЕ ЛЕЧЕНИЕ И УДАЛЕНИЕ ЗУБОВ",
			desc: "Проведение инфильтрационной/проводниковой анестезии, атравматичное удаление зуба, ревизия лунки, гемостаз и наложение швов.",
			risks: "Послеоперационный отек мягких тканей до 3 суток, болезненность при открывании рта, формирование кровяного сгустка.",
		},
		implant: {
			label: "ДЕНТАЛЬНУЮ ИМПЛАНТАЦИЮ И ОСТЕОПЛАСТИКУ",
			desc: "Формирование костного ложа с охлаждением физраствором, установка титанового имплантата с заглушкой или формирователем десны.",
			risks: "Временный отек мягких тканей, необходимость щадящего жевательного режима и антибактериальной терапии.",
		},
		orthopedics: {
			label: "ОРТОПЕДИЧЕСКОЕ ЛЕЧЕНИЕ И ПРОТЕЗИРОВАНИЕ",
			desc: "Препарирование опорных зубов, снятие оптических/силиконовых оттисков, изготовление и постоянная фиксация коронок или виниров.",
			risks: "Период привыкания к ортопедической конструкции (от 3 до 14 дней), необходимость контрольной коррекции окклюзии.",
		},
		anesthesia: {
			label: "МЕСТНОЕ ОБЕЗБОЛИВАНИЕ В СТОМАТОЛОГИИ",
			desc: "Введение современного карпульного анестетика артикаинового ряда с целью полного устранения болевых ощущений при лечении.",
			risks: "Онемение мягких тканей губы, щеки и языка на 2–4 часа. Запрещается употребление горячей пищи до полного отхождения анестезии.",
		},
	};

	const cur = titles[subKind] || titles.therapy;

	return `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА ${cur.label}
К медицинской карте пациента: ${ctx.patient.fullName}

г. Москва                                                              Дата: ${ctx.documentDate}

Я, ${ctx.patient.fullName}, ${ctx.patient.birthDate} г.р., проживающий по адресу: ${ctx.patient.address},
уполномочиваю клинику «${ctx.clinic.name}» и лечащего врача ${ctx.doctor.fullName} провести стоматологическое вмешательство.

1. СУТЬ И ЦЕЛЬ ВМЕШАТЕЛЬСТВА:
${cur.desc}

2. ОСВЕДОМЛЕННОСТЬ О ВОЗМОЖНЫХ РИСКАХ И РЕАКЦИЯХ:
${cur.risks}

3. ОБЯЗАТЕЛЬСТВА ПАЦИЕНТА:
Я обязуюсь строго выполнять клинические назначения врача, соблюдать рекомендации по уходу и являться на назначенные контрольные осмотры.

Врач: _________________ / ${ctx.doctor.fullName} /          Пациент: _________________ / ${ctx.patient.fullName} /`;
}

export function generateIntakePackageTemplate(ctx: DocumentLegalContext): string {
	return `ПАКЕТ ДОКУМЕНТОВ ПЕРВИЧНОГО ПРИЁМА ПАЦИЕНТА
Клиника: ${ctx.clinic.name}
Пациент: ${ctx.patient.fullName} (${ctx.patient.birthDate} г.р.)
Дата оформления: ${ctx.documentDate}

[ДОКУМЕНТ 1: ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ]
Договор регулирует взаимные права и обязанности сторон. Исполнитель оказывает качественную стоматологическую помощь, Пациент производит оплату согласно прейскуранту.

[ДОКУМЕНТ 2: СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ]
Пациент разрешает клинике обработку персональных данных для ведения медицинской карты, координации приёма и сервисных напоминаний. Сведения защищены врачебной тайной.

[ДОКУМЕНТ 3: АНКЕТА ОБЩЕГО СОМАТИЧЕСКОГО ЗДОРОВЬЯ]
Аллергические реакции на препараты: не выявлены.
Сопутствующие хронические заболевания: отрицает.
Артериальное давление в норме. Противопоказаний к приёму не установлено.

Подпись пациента: _________________ / ${ctx.patient.fullName} /          Подпись врача: _________________ / ${ctx.doctor.fullName} /`;
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
6. Проведенное лечение (дневник SOAP):
${ctx.services.map((s, i) => `${i + 1}) ${s.title} (${s.quantity} ед.)`).join("\n") || "Препарирование кариозной полости, медикаментозная обработка, постановка светоотверждаемой пломбы."}
7. Исход лечения, гарантия и рекомендации: ${ctx.epicrisisRu || "Зуб восстановлен анатомически и функционально. Санация завершена. Гарантия клиники: 12 месяцев. Контрольный осмотр через 6 месяцев."}

Врач: _________________ / ${ctx.doctor.fullName} /          М.П. Клиники
Дата: ${ctx.documentDate}`;
}

// ---------------------------------------------------------------------------
// РЕЕСТР ИНДИВИДУАЛЬНЫХ БЛАНКОВ (СОВМЕСТИМОСТЬ И БЫСТРЫЙ ДОСТУП)
// ---------------------------------------------------------------------------

export type DocumentCatalogCategory = "all" | "intake" | "clinical" | "finance_tax" | "refusal" | "pediatric" | "registry";

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
	];
}
