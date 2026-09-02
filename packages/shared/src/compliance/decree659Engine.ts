/**
 * decree659Engine.ts — Compliance Engine for RF Government Decree No. 659 of May 30, 2026
 * («Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»).
 *
 * Statutory Invariants & Legal Architecture (Decree 659 / Rules of 2026):
 * 1. Анонимный пациент (Anonymous Stealth Mode, п. 23 Правил №659):
 *    - Пациент вправе заключить договор и получать платные медицинские услуги анонимно.
 *    - Сведения фиксируются исключительно со слов пациента, предъявление паспорта РФ НЕ ТРЕБУЕТСЯ.
 *    - Присваивается уникальный идентификатор пациента: UUID_ANON-...
 * 2. Аппаратная блокировка ОМС (ст. 16 Федерального закона № 326-ФЗ):
 *    - Медицинская помощь по ОМС анонимным пациентам ЗАПРЕЩЕНА (требуется идентификация по паспорту, СНИЛС и полису ОМС).
 *    - Для анонимных пациентов разрешены ТОЛЬКО платные коммерческие расчеты (касса 54-ФЗ: наличные, банковская карта, СБП, безнал).
 *    - Запрещено прикрепление полиса ОМС, выбор источника финансирования ОМС, передача в ТФОМС/ЕГИСЗ и оформление справки на вычет КНД 1151156.
 * 3. Upsell Consent Shield (Защита от навязывания услуг, п. 21-23 Правил №659, ст. 16 Закона РФ «О защите прав потребителей»):
 *    - Исполнитель не вправе без письменного согласия потребителя оказывать дополнительные платные услуги,
 *      не предусмотренные первоначально утвержденной сметой (планом лечения).
 *    - При добавлении врачом новой платной услуги сверх утвержденной сметы система ОБЯЗАНА сформировать
 *      Дополнительное соглашение (Аддендум) к Договору с детализацией новых услуг и пересчетом итога сметы.
 *    - Пробитие фискального чека 54-ФЗ на дополнительные услуги БЛОКИРУЕТСЯ до подтверждения / подписания Аддендума.
 */

import { z } from "zod";

// ─── 1. STATUTORY METADATA ──────────────────────────────────────────────────

export const DECREE_659_METADATA = {
	decreeNumber: "659",
	decreeDate: "2026-05-30",
	decreeTitle: "Постановление Правительства РФ от 30.05.2026 № 659 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»",
	rulesTitle: "Правила предоставления медицинскими организациями платных медицинских услуг (утв. ПП РФ от 30.05.2026 № 659)",
	consumerProtectionArticle: "ст. 16 Закона РФ от 07.02.1992 № 2300-1 «О защите прав потребителей»",
	civilCodeBasis: "ст. 709, 711 Гражданского кодекса РФ (Смета и порядок оплаты)",
	healthLawBasis: "ст. 19, 20, 84 Федерального закона от 21.11.2011 № 323-ФЗ",
	omsProhibitionBasis: "ст. 16 Федерального закона от 29.11.2010 № 326-ФЗ «Об обязательном медицинском страховании в РФ»",
	fiscalLawBasis: "Федеральный закон от 22.05.2003 № 54-ФЗ (Применение ККТ)",
} as const;

// ─── 2. ANONYMOUS STEALTH MODE SCHEMAS & UTILITIES ──────────────────────────

export const decree659AnonymousComplianceSchema = z.object({
	isAnonymous: z.literal(true),
	anonymousCode: z.string().min(5).max(80),
	declarationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты: ГГГГ-ММ-ДД"),
	recordedFromWords: z.boolean().default(true),
	passportRefusalDocumented: z.boolean().default(true),
	omsExcludedUnderLaw326Fz: z.literal(true).default(true),
	taxDeductionForbidden: z.literal(true).default(true),
	legalNoticeAck: z.boolean().default(true),
	statutoryCitation: z
		.string()
		.default(
			"п. 23 Правил, утв. Постановлением Правительства РФ от 30.05.2026 № 659; ст. 16 Федерального закона № 326-ФЗ",
		),
});
export type Decree659AnonymousCompliance = z.infer<
	typeof decree659AnonymousComplianceSchema
>;

/**
 * Генерирует уникальный аппаратный идентификатор анонимного пациента UUID_ANON.
 * Формат: UUID_ANON-2026-<случайный шестнадцатеричный токен>.
 */
export function generateAnonymousPatientCode(): string {
	const randomSegment = Math.random().toString(36).substring(2, 8).toUpperCase();
	const timeSegment = Date.now().toString(36).slice(-4).toUpperCase();
	return `UUID_ANON-2026-${randomSegment}${timeSegment}`;
}

/**
 * Формирует экранное имя анонимного пациента для амбулаторных журналов и расписания.
 */
export function formatAnonymousPatientName(
	anonymousCode: string,
	customAlias?: string | null,
): string {
	const trimmedAlias = (customAlias || "").trim();
	if (trimmedAlias && !trimmedAlias.toLowerCase().includes("пациент")) {
		return `${trimmedAlias} (${anonymousCode})`;
	}
	return `Пациент Анонимный (${anonymousCode})`;
}

/**
 * Проверяет, является ли пациент анонимным в соответствии с ПП РФ №659.
 */
export function isDecree659AnonymousPatient(patient: unknown): boolean {
	if (!patient || typeof patient !== "object") return false;
	const p = patient as Record<string, unknown>;

	if (p["isAnonymous"] === true) return true;

	const adminProfile = p["administrativeProfile"] as
		| Record<string, unknown>
		| undefined;
	if (adminProfile && adminProfile["isAnonymous"] === true) return true;
	if (
		adminProfile &&
		adminProfile["decree659Compliance"] &&
		(adminProfile["decree659Compliance"] as Record<string, unknown>)["isAnonymous"] === true
	) {
		return true;
	}

	const fullName = typeof p["fullName"] === "string" ? p["fullName"] : "";
	if (fullName.startsWith("UUID_ANON") || fullName.startsWith("Пациент Анонимный")) {
		return true;
	}

	return false;
}

/**
 * Ошибка аппаратной блокировки услуг по ОМС для анонимного пациента.
 */
export class Decree659OmsForbiddenError extends Error {
	public readonly code = "DECREE_659_OMS_FORBIDDEN";
	public readonly statusCode = 403;

	constructor(
		message = "Аппаратная блокировка по ПП РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: оказание медицинской помощи по ОМС и прикрепление полиса ОМС для анонимных пациентов категорически запрещены. Разрешены только платные расчеты (касса 54-ФЗ / безнал).",
	) {
		super(message);
		this.name = "Decree659OmsForbiddenError";
		Object.setPrototypeOf(this, Decree659OmsForbiddenError.prototype);
	}
}

/**
 * Аппаратная проверка запрета ОМС: выбрасывает исключение, если для анонимного
 * пациента предпринимается попытка использовать ОМС.
 */
export function assertDecree659OmsAllowed(
	patient: unknown,
	operationName = "медицинская операция",
): void {
	if (isDecree659AnonymousPatient(patient)) {
		throw new Decree659OmsForbiddenError(
			`Отказ в операции «${operationName}»: согласно Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ анонимный пациент не может обслуживаться по полису ОМС. Допустимы исключительно коммерческие расчеты через кассу 54-ФЗ.`,
		);
	}
}

// ─── 3. UPSELL CONSENT SHIELD SCHEMAS & TYPES ───────────────────────────────

export const upsellShieldServiceItemSchema = z.object({
	id: z.string().uuid().optional(),
	serviceId: z.string().uuid().optional().nullable(),
	catalogItemId: z.string().uuid().optional().nullable(),
	code804n: z.string().trim().max(32).optional().nullable(),
	name: z.string().trim().min(1).max(250),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	quantity: z.number().positive().default(1),
	unitPriceKopecks: z.number().int().nonnegative(),
	totalKopecks: z.number().int().nonnegative(),
	isUpsell: z.boolean().default(false),
	clinicalJustification: z.string().trim().max(500).optional().nullable(),
});
export type UpsellShieldServiceItem = z.infer<typeof upsellShieldServiceItemSchema>;

export const decree659AddendumSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	addendumNumber: z.string().min(1).max(64),
	contractNumber: z.string().min(1).max(64),
	treatmentPlanId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	patientFullName: z.string().min(1),
	doctorFullName: z.string().min(1),
	clinicName: z.string().min(1),
	clinicInn: z.string().min(10).max(12),
	addedServices: z.array(upsellShieldServiceItemSchema).min(1),
	previousPlanTotalKopecks: z.number().int().nonnegative(),
	addendumTotalKopecks: z.number().int().positive(),
	newGrandTotalKopecks: z.number().int().positive(),
	clinicalReason: z
		.string()
		.min(1)
		.default(
			"Клиническая необходимость выполнения дополнительных манипуляций, выявленная в ходе лечебно-диагностического вмешательства",
		),
	status: z.enum(["draft", "signed", "rejected"]).default("draft"),
	signMethod: z.enum(["touch", "sms_otp", "manual", "ukep"]).default("manual"),
	touchSignatureBase64: z.string().optional().nullable(),
	signedAt: z.string().optional().nullable(),
	legalCitation: z
		.string()
		.default(
			"п. 21-23 Правил предоставления платных мед. услуг (ПП РФ от 30.05.2026 № 659), ст. 16 Закона РФ «О защите прав потребителей»",
		),
	createdAt: z.string().datetime(),
});
export type Decree659Addendum = z.infer<typeof decree659AddendumSchema>;

/**
 * Результат проверки навязывания услуг (Upsell Shield Check).
 */
export interface UpsellShieldDetectionResult {
	readonly requiresAddendum: boolean;
	readonly unapprovedServices: readonly UpsellShieldServiceItem[];
	readonly totalUnapprovedKopecks: number;
	readonly approvedServicesCount: number;
	readonly guidanceMessage: string | null;
}

/**
 * Ошибка попытки пробить фискальный чек на навязанные/несогласованные платные услуги.
 */
export class UpsellConsentShieldViolationError extends Error {
	public readonly code = "UPSELL_CONSENT_SHIELD_VIOLATION";
	public readonly statusCode = 422;
	public readonly details: {
		unapprovedServices: readonly UpsellShieldServiceItem[];
		totalUnapprovedKopecks: number;
		addendumRequired: boolean;
	};

	constructor(
		details: {
			unapprovedServices: readonly UpsellShieldServiceItem[];
			totalUnapprovedKopecks: number;
			addendumRequired: boolean;
		},
		message = "Блокировка кассы 54-ФЗ: Защита от навязывания платных услуг (Постановление Правительства РФ №659 от 30.05.2026). Обнаружены дополнительные платные услуги сверх утвержденной сметы, требующие подписания Дополнительного соглашения (Аддендума) до пробития фискального чека.",
	) {
		super(message);
		this.name = "UpsellConsentShieldViolationError";
		this.details = details;
		Object.setPrototypeOf(this, UpsellConsentShieldViolationError.prototype);
	}
}

// ─── 4. UPSELL DETECTION & ADDENDUM BUILDER ─────────────────────────────────

/**
 * Сравнивает позиции, заявленные к оплате/пробитию чека, с позициями утвержденного плана лечения.
 * Выявляет любые услуги, которые отсутствуют в утвержденной смете либо превышают согласованный объем.
 */
export function detectUpsellServices(
	approvedPlanItems: readonly {
		serviceId?: string | null;
		catalogItemId?: string | null;
		nameRu?: string | null;
		name?: string | null;
		code804n?: string | null;
		quantity?: number;
		totalPriceKopecks?: number;
	}[],
	requestedReceiptItems: readonly {
		serviceId?: string | null;
		catalogItemId?: string | null;
		name: string;
		code804n?: string | null;
		medicalServiceCode804n?: string | null;
		quantity: number;
		priceKopecks?: number;
		amountKopecks: number;
		isUpsell?: boolean;
		requiresAddendum?: boolean;
		addendumConfirmed?: boolean;
	}[],
): UpsellShieldDetectionResult {
	const unapproved: UpsellShieldServiceItem[] = [];
	let totalUnapprovedKopecks = 0;

	// Создаем сет утвержденных идентификаторов и кодов услуг
	const approvedServiceIds = new Set<string>();
	const approvedCodes = new Set<string>();
	const approvedNames = new Set<string>();

	for (const item of approvedPlanItems) {
		if (item.serviceId) approvedServiceIds.add(item.serviceId);
		if (item.catalogItemId) approvedServiceIds.add(item.catalogItemId);
		if (item.code804n) approvedCodes.add(item.code804n.trim().toLowerCase());
		const n = (item.nameRu || item.name || "").trim().toLowerCase();
		if (n) approvedNames.add(n);
	}

	for (const reqItem of requestedReceiptItems) {
		// Если позиция уже имеет подтвержденный аддендум, она не считается блокирующим апселлом
		if (reqItem.addendumConfirmed === true) {
			continue;
		}

		// Если явно помечена как upsell или requiresAddendum
		if (reqItem.isUpsell === true || reqItem.requiresAddendum === true) {
			unapproved.push({
				serviceId: reqItem.serviceId ?? null,
				catalogItemId: reqItem.catalogItemId ?? null,
				code804n: reqItem.code804n ?? reqItem.medicalServiceCode804n ?? null,
				name: reqItem.name,
				quantity: reqItem.quantity,
				unitPriceKopecks:
					reqItem.priceKopecks ??
					Math.round(reqItem.amountKopecks / Math.max(1, reqItem.quantity)),
				totalKopecks: reqItem.amountKopecks,
				isUpsell: true,
			});
			totalUnapprovedKopecks += reqItem.amountKopecks;
			continue;
		}

		// Если план пуст — не с чем сравнивать (первичный прием без предварительного плана)
		if (approvedPlanItems.length === 0) {
			continue;
		}

		// Проверяем принадлежность к утвержденному плану
		const sId = reqItem.serviceId || reqItem.catalogItemId;
		const code = (reqItem.code804n || reqItem.medicalServiceCode804n || "")
			.trim()
			.toLowerCase();
		const name = reqItem.name.trim().toLowerCase();

		const matchesId = Boolean(sId && approvedServiceIds.has(sId));
		const matchesCode = Boolean(code && approvedCodes.has(code));
		const matchesName = Boolean(approvedNames.has(name));

		if (!matchesId && !matchesCode && !matchesName) {
			// Услуга отсутствует в утвержденной смете!
			unapproved.push({
				serviceId: sId ?? null,
				catalogItemId: reqItem.catalogItemId ?? null,
				code804n: reqItem.code804n ?? reqItem.medicalServiceCode804n ?? null,
				name: reqItem.name,
				quantity: reqItem.quantity,
				unitPriceKopecks:
					reqItem.priceKopecks ??
					Math.round(reqItem.amountKopecks / Math.max(1, reqItem.quantity)),
				totalKopecks: reqItem.amountKopecks,
				isUpsell: true,
			});
			totalUnapprovedKopecks += reqItem.amountKopecks;
		}
	}

	const requiresAddendum = unapproved.length > 0;
	let guidanceMessage: string | null = null;

	if (requiresAddendum) {
		const totalRub = (totalUnapprovedKopecks / 100).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
		});
		guidanceMessage = `Обнаружено ${unapproved.length} дополнительных услуг на сумму ${totalRub} ₽ сверх утвержденной сметы. Согласно ПП РФ №659 требуется оформление Дополнительного соглашения до пробития чека.`;
	}

	return {
		requiresAddendum,
		unapprovedServices: unapproved,
		totalUnapprovedKopecks,
		approvedServicesCount: approvedPlanItems.length,
		guidanceMessage,
	};
}

/**
 * Формирует объект Дополнительного соглашения (Аддендума) по ПП РФ №659.
 */
export function buildDecree659Addendum(params: {
	id?: string;
	organizationId: string;
	contractNumber: string;
	planId?: string | null;
	patientId: string;
	patientFullName: string;
	doctorFullName: string;
	clinicName: string;
	clinicInn: string;
	addedServices: readonly UpsellShieldServiceItem[];
	previousPlanTotalKopecks: number;
	clinicalReason?: string;
}): Decree659Addendum {
	const addendumId = params.id || crypto.randomUUID();
	const addendumTotalKopecks = params.addedServices.reduce(
		(sum, item) => sum + item.totalKopecks,
		0,
	);
	const newGrandTotalKopecks =
		params.previousPlanTotalKopecks + addendumTotalKopecks;
	const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const addendumNumber = `ДС-${dateCode}-${addendumId.slice(0, 6).toUpperCase()}`;

	return {
		id: addendumId,
		organizationId: params.organizationId,
		addendumNumber,
		contractNumber: params.contractNumber,
		treatmentPlanId: params.planId ?? null,
		patientId: params.patientId,
		patientFullName: params.patientFullName,
		doctorFullName: params.doctorFullName,
		clinicName: params.clinicName,
		clinicInn: params.clinicInn,
		addedServices: [...params.addedServices],
		previousPlanTotalKopecks: params.previousPlanTotalKopecks,
		addendumTotalKopecks,
		newGrandTotalKopecks,
		clinicalReason:
			params.clinicalReason ||
			"Клиническая необходимость выполнения дополнительных медицинских манипуляций, выявленная в процессе осмотра и лечения",
		status: "draft",
		signMethod: "manual",
		touchSignatureBase64: null,
		signedAt: null,
		legalCitation:
			"п. 21-23 Правил предоставления платных мед. услуг (ПП РФ от 30.05.2026 № 659), ст. 16 Закона РФ «О защите прав потребителей»",
		createdAt: new Date().toISOString(),
	};
}

/**
 * Рендерит юридический HTML печатного бланка Дополнительного соглашения (А4)
 * для подписания пациентом в кресле или на стойке регистратуры.
 */
export function renderDecree659AddendumHtml(addendum: Decree659Addendum): string {
	const prevRub = (addendum.previousPlanTotalKopecks / 100).toLocaleString(
		"ru-RU",
		{ minimumFractionDigits: 2 },
	);
	const addRub = (addendum.addendumTotalKopecks / 100).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
	});
	const newGrandRub = (addendum.newGrandTotalKopecks / 100).toLocaleString(
		"ru-RU",
		{ minimumFractionDigits: 2 },
	);

	const serviceRows = addendum.addedServices
		.map((item, idx) => {
			const unitRub = (item.unitPriceKopecks / 100).toLocaleString("ru-RU", {
				minimumFractionDigits: 2,
			});
			const totalItemRub = (item.totalKopecks / 100).toLocaleString("ru-RU", {
				minimumFractionDigits: 2,
			});
			const toothLabel = item.toothNumber ? ` (зуб ${item.toothNumber})` : "";
			const codeLabel = item.code804n ? `[${item.code804n}] ` : "";
			return `<tr>
				<td style="text-align: center;">${idx + 1}</td>
				<td>${codeLabel}${escapeHtml(item.name)}${toothLabel}</td>
				<td style="text-align: center;">${item.quantity}</td>
				<td style="text-align: right;">${unitRub} ₽</td>
				<td style="text-align: right; font-weight: bold;">${totalItemRub} ₽</td>
			</tr>`;
		})
		.join("\n");

	const signatureSection =
		addendum.status === "signed"
			? `<div style="margin-top: 16px; padding: 12px; border: 1px solid #10b981; background: #ecfdf5; border-radius: 6px;">
					<strong style="color: #065f46;">✓ ПОДПИСАНО ПАЦИЕНТОМ</strong><br/>
					Способ: ${addendum.signMethod} | Дата: ${addendum.signedAt || "зафиксировано"}
					${addendum.touchSignatureBase64 ? `<br/><img src="${addendum.touchSignatureBase64}" style="max-height: 48px; margin-top: 4px;" alt="Подпись"/>` : ""}
				</div>`
			: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 11px;">
					<div>
						<strong>ИСПОЛНИТЕЛЬ:</strong><br/>
						${escapeHtml(addendum.clinicName)}<br/>
						ИНН: ${escapeHtml(addendum.clinicInn)}<br/>
						Врач: _________________ / ${escapeHtml(addendum.doctorFullName)} /<br/>
						М.П.
					</div>
					<div>
						<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br/>
						${escapeHtml(addendum.patientFullName)}<br/>
						С изменением объема и стоимости услуг согласен(сна):<br/>
						Подпись: _________________ / _________________ /<br/>
						Дата: «_____» _______________ 2026 г.
					</div>
				</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8"/>
	<title>Дополнительное соглашение № ${escapeHtml(addendum.addendumNumber)}</title>
	<style>
		body { font-family: 'PT Astra Serif', 'Times New Roman', serif; font-size: 12px; line-height: 1.4; color: #0f172a; margin: 20mm 15mm; }
		h1 { font-size: 14px; text-align: center; margin: 0 0 4px 0; text-transform: uppercase; }
		h2 { font-size: 12px; text-align: center; margin: 0 0 16px 0; font-weight: normal; }
		.meta-bar { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
		.legal-note { font-size: 10px; color: #475569; background: #f8fafc; border-left: 3px solid #0284c7; padding: 6px 10px; margin-bottom: 12px; }
		table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
		th, td { border: 1px solid #94a3b8; padding: 6px 8px; }
		th { background: #f1f5f9; text-align: left; }
		.total-row { font-weight: bold; background: #f8fafc; }
		p { text-align: justify; margin-bottom: 8px; }
	</style>
</head>
<body>
	<h1>ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ${escapeHtml(addendum.addendumNumber)}</h1>
	<h2>к Договору на оказание платных медицинских услуг № ${escapeHtml(addendum.contractNumber)}</h2>

	<div class="meta-bar">
		<span>г. Москва</span>
		<span>«_____» _______________ 2026 г.</span>
	</div>

	<div class="legal-note">
		<strong>Правовое основание:</strong> ${escapeHtml(addendum.legalCitation)}.
		Предоставление дополнительных медицинских услуг на платной основе допускается исключительно с согласия потребителя.
	</div>

	<p>
		<strong>${escapeHtml(addendum.clinicName)}</strong> (ИНН ${escapeHtml(addendum.clinicInn)}), именуемое в дальнейшем «Исполнитель», с одной стороны, и гражданин(ка) <strong>${escapeHtml(addendum.patientFullName)}</strong>, именуемый(ая) в дальнейшем «Пациент (Заказчик)», с другой стороны, заключили настоящее Дополнительное соглашение о нижеследующем:
	</p>

	<p>
		1. В связи с возникшей клинической необходимостью (${escapeHtml(addendum.clinicalReason)}) Стороны пришли к соглашению дополнить согласованный перечень медицинских услуг следующими позициями:
	</p>

	<table>
		<thead>
			<tr>
				<th style="width: 30px; text-align: center;">№</th>
				<th>Наименование услуги / код 804н</th>
				<th style="width: 50px; text-align: center;">Кол-во</th>
				<th style="width: 80px; text-align: right;">Цена</th>
				<th style="width: 90px; text-align: right;">Стоимость</th>
			</tr>
		</thead>
		<tbody>
			${serviceRows}
			<tr class="total-row">
				<td colspan="4">Сумма дополнительного соглашения:</td>
				<td style="text-align: right; color: #0284c7;">+ ${addRub} ₽</td>
			</tr>
		</tbody>
	</table>

	<p>
		2. Первоначальная стоимость сметы составляла <strong>${prevRub} ₽</strong>. С учетом настоящего Дополнительного соглашения общая сумма договора составляет <strong>${newGrandRub} ₽</strong>.
	</p>

	<p>
		3. Пациент подтверждает, что уведомлен о стоимости, медицинских показаниях и добровольно согласен на оплату указанных дополнительных услуг.
	</p>

	${signatureSection}
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
