/**
 * MessageTemplateEngine.ts
 *
 * Промышленный движок шаблонов сообщений и подстановки тегов для омниканальной коммуникации
 * с пациентами (Telegram, WhatsApp, SMS, VK) с аппаратной защитой 152-ФЗ и 323-ФЗ ст. 13 (врачебная тайна).
 *
 * КЛЮЧЕВЫЕ ТРЕБОВАНИЯ:
 * 1. Теги: {patient_name}, {doctor_name}, {clinic_name}, {clinic_phone}, {appointment_date}, {appointment_time}, {total_amount_rub}.
 * 2. Каналы: telegram, whatsapp, sms, vk.
 * 3. 152-ФЗ / 323-ФЗ ст. 13: Внешние сообщения пациентам в открытые каналы КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО
 *    наполнять клиническими диагнозами, кодами МКБ-10, описаниями зубов («пульпит зуба 46», «кариес 36»)
 *    или соматическими статусами.
 */

import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	messageTemplateCatalogs,
	patients,
	users,
	visits,
} from "../../db/schema.js";

export type CommunicationChannel = "telegram" | "whatsapp" | "sms" | "vk" | "email" | "max";

export interface MessageTemplateRecord {
	id: string;
	organizationId: string;
	title: string;
	channel: string;
	intent: string;
	templateText: string;
	variables: string[] | null;
	isActive: boolean;
	createdAt: Date;
}

export interface CreateTemplateInput {
	title: string;
	channel?: (CommunicationChannel | string) | undefined;
	intent?: string | undefined;
	templateText: string;
	variables?: string[] | undefined;
	isActive?: boolean | undefined;
}

export interface UpdateTemplateInput {
	title?: string | undefined;
	channel?: (CommunicationChannel | string) | undefined;
	intent?: string | undefined;
	templateText?: string | undefined;
	variables?: string[] | undefined;
	isActive?: boolean | undefined;
}

export interface RenderTemplateOptions {
	templateId?: string | undefined;
	templateText?: string | undefined;
	channel?: (CommunicationChannel | string) | undefined;
	patientId?: string | undefined;
	appointmentId?: string | undefined;
	visitId?: string | undefined;
	variables?: Record<string, string | number | null | undefined> | undefined;
	allowPreviewFallback?: boolean | undefined;
	violationHandling?: ("block" | "strip") | undefined;
}

export interface RenderTemplateResult {
	ok: boolean;
	renderedText: string;
	channel: string;
	characterCount: number;
	usedMacros: string[];
	missingMacros: string[];
	smsSegments?: number | undefined;
	smsEncoding?: ("gsm7" | "ucs2") | undefined;
	hasMedicalSecrecyViolation: boolean;
	detectedMedicalTerms: string[];
	warning?: string | undefined;
	error?: string | undefined;
	problems: string[];
}

/**
 * 152-ФЗ / 323-ФЗ ст. 13: Паттерны клинических терминов и диагнозов,
 * запрещенных к отправке в открытые каналы коммуникации (SMS/Мессенджеры).
 */
export const CLINICAL_SECRECY_PATTERNS: readonly { pattern: RegExp; description: string }[] = [
	{ pattern: /\b[Kk]0[0-9](\.[0-9]+)?\b/gi, description: "Код МКБ-10 стоматологии (K00-K09)" },
	{ pattern: /\b[Bb]2[0-4](\.[0-9]+)?\b/gi, description: "Код МКБ-10 ВИЧ-инфекции (B20-B24)" },
	{ pattern: /\b[Bb]1[5-9](\.[0-9]+)?\b/gi, description: "Код МКБ-10 вирусных гепатитов (B15-B19)" },
	{ pattern: /пульпит\S*/gi, description: "Диагноз: Пульпит" },
	{ pattern: /кариес\S*/gi, description: "Диагноз: Кариес" },
	{ pattern: /периодонтит\S*/gi, description: "Диагноз: Периодонтит" },
	{ pattern: /пародонтит\S*/gi, description: "Диагноз: Пародонтит" },
	{ pattern: /гингивит\S*/gi, description: "Диагноз: Гингивит" },
	{ pattern: /альвеолит\S*/gi, description: "Диагноз: Альвеолит" },
	{ pattern: /остеомиелит\S*/gi, description: "Диагноз: Остеомиелит" },
	{ pattern: /стоматит\S*/gi, description: "Диагноз: Стоматит" },
	{ pattern: /перикоронит\S*/gi, description: "Диагноз: Перикоронит" },
	{ pattern: /гранул[её]м\S*/gi, description: "Диагноз: Гранулема" },
	{ pattern: /периимплантит\S*/gi, description: "Диагноз: Периимплантит" },
	{ pattern: /депульпировани\S*/gi, description: "Медицинское вмешательство: Депульпирование" },
	{ pattern: /экстирпаци\S*/gi, description: "Медицинское вмешательство: Экстирпация пульпы" },
	{ pattern: /препарировани\S*/gi, description: "Медицинское вмешательство: Препарирование" },
	{ pattern: /удалени\S*\s*нерв\S*/gi, description: "Клиническая процедура: Удаление нерва (депульпирование)" },
	{ pattern: /синус-лифтинг\S*/gi, description: "Хирургическая операция: Синус-лифтинг" },
	{ pattern: /остеотоми\S*/gi, description: "Хирургическая операция: Остеотомия" },
	{ pattern: /кюретаж\S*/gi, description: "Пародонтологическое вмешательство: Кюретаж" },
	{ pattern: /резекци\S*\s*верхушк\S*/gi, description: "Хирургическая операция: Резекция верхушки корня" },
	{
		pattern: /(?:зуб[а-я]*|зуба|зубе|зубов|зубы)\s*(?:№\s*)?(?:[1-4][1-8]|[5-8][1-5]|\d{1,2})/gi,
		description: "Клиническая локализация: указание номера зуба",
	},
	{
		pattern: /(?:полост[а-я]*)\s*(?:I{1,3}|IV|V|VI)\s*класс\S*/gi,
		description: "Клиническое описание кариозной полости по Блэку",
	},
	{
		pattern: /класс\S*\s*(?:по\s*Блэку|по\s*Black)/gi,
		description: "Классификация кариозной полости по Блэку",
	},
	{
		pattern: /(?:ВИЧ\S*|гепатит\S*|туберкул[её]з\S*|сифилис\S*|онкологи\S*|злокачественн\S*|сахарн\S*\s*диабет\S*)/gi,
		description: "Соматический диагноз / особый статус здоровья",
	},
];

/**
 * Словарь алиасов стандартных макросов.
 */
export const MACRO_KEY_ALIASES: Record<string, string> = {
	patient: "patient_name",
	patientname: "patient_name",
	patient_full_name: "patient_name",
	patientfullname: "patient_name",
	patientfirstname: "patient_first_name",
	patient_first: "patient_first_name",
	doctor: "doctor_name",
	doctorname: "doctor_name",
	doctor_full_name: "doctor_name",
	clinic: "clinic_name",
	clinicname: "clinic_name",
	phone: "clinic_phone",
	clinicphone: "clinic_phone",
	clinic_phone_number: "clinic_phone",
	address: "clinic_address",
	clinicaddress: "clinic_address",
	date: "appointment_date",
	appointmentdate: "appointment_date",
	time: "appointment_time",
	appointmenttime: "appointment_time",
	amount: "total_amount_rub",
	total_amount: "total_amount_rub",
	amount_rub: "total_amount_rub",
	sum_rub: "total_amount_rub",
	cost_rub: "total_amount_rub",
	price_rub: "total_amount_rub",
	chair: "chair_number",
	cabinet: "chair_number",
	portal: "portal_link",
	sbp: "sbp_payment_link",
};

/**
 * Защищенный движок работы с шаблонами сообщений (152-ФЗ / 323-ФЗ).
 */
export class MessageTemplateEngine {
	/**
	 * Проверяет текст на наличие сведений, составляющих врачебную тайну (323-ФЗ ст. 13).
	 */
	public static detectMedicalSecrecyLeaks(text: string): {
		hasLeak: boolean;
		detectedTerms: string[];
		reasons: string[];
	} {
		const detectedTerms: string[] = [];
		const reasons: string[] = [];

		for (const rule of CLINICAL_SECRECY_PATTERNS) {
			const matches = text.match(rule.pattern);
			if (matches && matches.length > 0) {
				for (const match of matches) {
					if (!detectedTerms.includes(match)) {
						detectedTerms.push(match);
						reasons.push(`${rule.description} («${match}»)`);
					}
				}
			}
		}

		return {
			hasLeak: detectedTerms.length > 0,
			detectedTerms,
			reasons,
		};
	}

	/**
	 * Вырезает термины врачебной тайны, заменяя их на безопасный нейтральный маркер.
	 */
	public static sanitizeMedicalSecrecy(text: string): {
		sanitizedText: string;
		strippedTerms: string[];
	} {
		let result = text;
		const strippedTerms: string[] = [];

		for (const rule of CLINICAL_SECRECY_PATTERNS) {
			result = result.replace(rule.pattern, (match) => {
				strippedTerms.push(match);
				return "[информация защищена 152-ФЗ]";
			});
		}

		return {
			sanitizedText: result,
			strippedTerms,
		};
	}

	/**
	 * Извлекает имена макросов из текста шаблона вида `{patient_name}`.
	 */
	public static extractMacroKeys(templateText: string): string[] {
		const matches = templateText.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
		const keys = new Set<string>();
		for (const raw of matches) {
			const key = raw.slice(1, -1).trim();
			if (key) {
				const canonical = MACRO_KEY_ALIASES[key.toLowerCase()] || key;
				keys.add(canonical);
			}
		}
		return Array.from(keys);
	}

	/**
	 * Подсчет SMS-сегментов и кодировки (UCS-2 / GSM-7).
	 */
	public static calculateSmsSegments(text: string): {
		segments: number;
		encoding: "gsm7" | "ucs2";
		charCount: number;
	} {
		const isUcs2 = /[^\u0020-\u007E\r\n]/.test(text);
		const charCount = text.length;

		if (isUcs2) {
			// Кириллица (UCS-2): 70 знаков в первой SMS, по 67 в составных
			const segments = charCount <= 70 ? (charCount > 0 ? 1 : 0) : Math.ceil(charCount / 67);
			return { segments, encoding: "ucs2", charCount };
		}

		// GSM-7 (Латиница): 160 знаков в первой SMS, по 153 в составных
		const segments = charCount <= 160 ? (charCount > 0 ? 1 : 0) : Math.ceil(charCount / 153);
		return { segments, encoding: "gsm7", charCount };
	}

	/**
	 * Валидация ограничений канала коммуникации.
	 */
	public static checkChannelLimits(
		channel: string,
		text: string,
	): { ok: boolean; problems: string[] } {
		const problems: string[] = [];
		const len = text.length;

		switch (channel) {
			case "sms": {
				const { segments } = this.calculateSmsSegments(text);
				if (segments > 5) {
					problems.push(`Сообщение слишком длинное для SMS (${segments} сегментов, лимит: 5 сегментов)`);
				}
				break;
			}
			case "telegram":
			case "whatsapp":
			case "vk":
				if (len > 4096) {
					problems.push(`Превышен лимит символов для канала ${channel} (${len}/4096 символов)`);
				}
				break;
			default:
				break;
		}

		return {
			ok: problems.length === 0,
			problems,
		};
	}

	/**
	 * Загружает контекст сущностей из базы данных (Пациент, Прием, Клиника, Врач).
	 */
	public static async resolveContextVariables(
		organizationId: string,
		patientId?: string,
		appointmentId?: string,
		visitId?: string,
	): Promise<Record<string, string>> {
		const ctx: Record<string, string> = {};

		// 1. Клиника
		const [clinic] = await db
			.select({
				name: clinics.name,
				address: clinics.address,
				phone: clinics.phone,
			})
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);

		if (clinic) {
			if (clinic.name) ctx.clinic_name = clinic.name;
			if (clinic.phone) ctx.clinic_phone = clinic.phone;
			if (clinic.address) ctx.clinic_address = clinic.address;
		}

		// 2. Пациент
		if (patientId) {
			const [patient] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (patient) {
				ctx.patient_name = patient.fullName;
				const parts = patient.fullName.trim().split(/\s+/);
				ctx.patient_first_name = parts[1] || parts[0] || "";
				if (!ctx.clinic_phone && patient.phone) {
					ctx.patient_phone = patient.phone;
				}
				ctx.portal_link = `https://dente.clinic/portal/${patient.id.slice(0, 8)}`;
				ctx.sbp_payment_link = `https://sbp.nspk.ru/pay?id=dente-${patient.id.slice(0, 8)}`;
			}
		}

		// 3. Запись расписания (Appointment)
		if (appointmentId) {
			const [appointment] = await db
				.select({
					id: appointments.id,
					startsAt: appointments.startsAt,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.id, appointmentId),
						eq(appointments.organizationId, organizationId),
					),
				)
				.limit(1);

			if (appointment) {
				if (appointment.startsAt) {
					const dateObj = new Date(appointment.startsAt);
					ctx.appointment_date = dateObj.toLocaleDateString("ru-RU", {
						day: "numeric",
						month: "long",
					});
					ctx.appointment_time = dateObj.toLocaleTimeString("ru-RU", {
						hour: "2-digit",
						minute: "2-digit",
					});
				}

				if (appointment.doctorUserId) {
					const [doc] = await db
						.select({ fullName: users.fullName })
						.from(users)
						.where(eq(users.id, appointment.doctorUserId))
						.limit(1);
					if (doc?.fullName) {
						ctx.doctor_name = doc.fullName;
					}
				}

				if (appointment.chairId) {
					const [chair] = await db
						.select({ name: chairs.name })
						.from(chairs)
						.where(eq(chairs.id, appointment.chairId))
						.limit(1);
					if (chair?.name) {
						ctx.chair_number = chair.name;
					}
				}
			}
		}

		// 4. Прием (Visit) — для врача через appointment
		if (visitId) {
			const [visitRow] = await db
				.select({
					id: visits.id,
					appointmentId: visits.appointmentId,
				})
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, organizationId),
					),
				)
				.limit(1);

			if (visitRow?.appointmentId && !ctx.doctor_name) {
				const [appRow] = await db
					.select({ doctorUserId: appointments.doctorUserId })
					.from(appointments)
					.where(eq(appointments.id, visitRow.appointmentId))
					.limit(1);

				if (appRow?.doctorUserId) {
					const [doc] = await db
						.select({ fullName: users.fullName })
						.from(users)
						.where(eq(users.id, appRow.doctorUserId))
						.limit(1);
					if (doc?.fullName) {
						ctx.doctor_name = doc.fullName;
					}
				}
			}
		}

		return ctx;
	}

	/**
	 * Выполняет безопасный рендеринг текста с подстановкой макросов и защитой 152-ФЗ.
	 */
	public static async render(
		organizationId: string,
		options: RenderTemplateOptions,
	): Promise<RenderTemplateResult> {
		let rawText = options.templateText ?? "";
		let channel = options.channel ?? "telegram";

		// 1. Если передан templateId, загружаем шаблон из справочника
		if (options.templateId) {
			const [existing] = await db
				.select()
				.from(messageTemplateCatalogs)
				.where(
					and(
						eq(messageTemplateCatalogs.id, options.templateId),
						eq(messageTemplateCatalogs.organizationId, organizationId),
					),
				)
				.limit(1);

			if (existing) {
				rawText = existing.templateText;
				channel = options.channel || existing.channel;
			}
		}

		if (!rawText.trim()) {
			return {
				ok: false,
				renderedText: "",
				channel,
				characterCount: 0,
				usedMacros: [],
				missingMacros: [],
				hasMedicalSecrecyViolation: false,
				detectedMedicalTerms: [],
				error: "Текст шаблона не передан или шаблон не найден",
				problems: ["Текст шаблона не передан или шаблон не найден"],
			};
		}

		// 2. Разрешаем переменные из БД и явных параметров
		const dbContext = await this.resolveContextVariables(
			organizationId,
			options.patientId,
			options.appointmentId,
			options.visitId,
		);

		const mergedValues: Record<string, string> = {
			...dbContext,
		};

		if (options.variables) {
			for (const [k, v] of Object.entries(options.variables)) {
				if (v !== undefined && v !== null) {
					mergedValues[k] = String(v);
					const canonical = MACRO_KEY_ALIASES[k.toLowerCase()];
					if (canonical) {
						mergedValues[canonical] = String(v);
					}
				}
			}
		}

		// Fallback значения для предпросмотра
		if (options.allowPreviewFallback ?? true) {
			if (!mergedValues.patient_name) mergedValues.patient_name = "Иван Иванович И.";
			if (!mergedValues.patient_first_name) mergedValues.patient_first_name = "Иван";
			if (!mergedValues.doctor_name) mergedValues.doctor_name = "Смирнов Алексей Викторович";
			if (!mergedValues.clinic_name) mergedValues.clinic_name = "Стоматология ДЕНТЕ";
			if (!mergedValues.clinic_phone) mergedValues.clinic_phone = "+7 (495) 000-00-00";
			if (!mergedValues.clinic_address) mergedValues.clinic_address = "ул. Ленина, д. 10";
			if (!mergedValues.appointment_date) mergedValues.appointment_date = "15 мая";
			if (!mergedValues.appointment_time) mergedValues.appointment_time = "14:30";
			if (!mergedValues.chair_number) mergedValues.chair_number = "Кабинет №1, Кресло №1";
			if (!mergedValues.total_amount_rub) mergedValues.total_amount_rub = "3 500 ₽";
			if (!mergedValues.portal_link) mergedValues.portal_link = "https://dente.clinic/portal";
			if (!mergedValues.sbp_payment_link) mergedValues.sbp_payment_link = "https://sbp.nspk.ru/pay";
		}

		// 3. Подстановка тегов вида {macro_name}
		const usedMacros: string[] = [];
		const missingMacros: string[] = [];

		let rendered = rawText.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
			const canonicalKey = MACRO_KEY_ALIASES[key.toLowerCase()] || key;
			if (mergedValues[canonicalKey] !== undefined) {
				usedMacros.push(canonicalKey);
				return String(mergedValues[canonicalKey]);
			}
			if (mergedValues[key] !== undefined) {
				usedMacros.push(key);
				return String(mergedValues[key]);
			}
			missingMacros.push(key);
			return match;
		});

		// 4. Проверка 152-ФЗ / 323-ФЗ: Защита врачебной тайны в открытых каналах
		const leakCheck = this.detectMedicalSecrecyLeaks(rendered);
		const handling = options.violationHandling ?? "block";

		let hasMedicalSecrecyViolation = false;
		let warning: string | undefined;
		let error: string | undefined;

		if (leakCheck.hasLeak) {
			hasMedicalSecrecyViolation = true;
			if (handling === "block") {
				error = `Отказ в отправке сообщения в открытый канал связи (${channel}): обнаружена врачебная тайна (152-ФЗ / 323-ФЗ ст. 13): ${leakCheck.reasons.join(", ")}. Сообщения пациентам в SMS и мессенджерах не должны содержать медицинские диагнозы, формулы зубов или детали полостей.`;
			} else {
				const sanitized = this.sanitizeMedicalSecrecy(rendered);
				rendered = sanitized.sanitizedText;
				warning = `Текст сообщения автоматически санирован по 152-ФЗ: исключены термины врачебной тайны (${sanitized.strippedTerms.join(", ")}).`;
			}
		}

		// 5. Оценка лимитов канала
		const channelLimits = this.checkChannelLimits(channel, rendered);
		const problems = [...channelLimits.problems];
		if (missingMacros.length > 0 && !options.allowPreviewFallback) {
			problems.push(`Не заполнены обязательные макросы: ${missingMacros.map((m) => `{${m}}`).join(", ")}`);
		}
		if (error) {
			problems.push(error);
		}

		const smsDetails =
			channel === "sms" ? this.calculateSmsSegments(rendered) : undefined;

		return {
			ok: problems.length === 0 && !error,
			renderedText: rendered,
			channel,
			characterCount: rendered.length,
			usedMacros: Array.from(new Set(usedMacros)),
			missingMacros: Array.from(new Set(missingMacros)),
			smsSegments: smsDetails?.segments,
			smsEncoding: smsDetails?.encoding,
			hasMedicalSecrecyViolation,
			detectedMedicalTerms: leakCheck.detectedTerms,
			warning,
			error,
			problems,
		};
	}

	/**
	 * Получение списка шаблонов организации.
	 */
	public static async listTemplates(
		organizationId: string,
		filter: {
			channel?: string | undefined;
			intent?: string | undefined;
			isActive?: boolean | undefined;
		} = {},
	): Promise<MessageTemplateRecord[]> {
		const conditions: SQL[] = [eq(messageTemplateCatalogs.organizationId, organizationId)];

		if (filter.channel && filter.channel !== "all") {
			conditions.push(eq(messageTemplateCatalogs.channel, filter.channel));
		}
		if (filter.intent && filter.intent !== "all") {
			conditions.push(eq(messageTemplateCatalogs.intent, filter.intent));
		}
		if (filter.isActive !== undefined) {
			conditions.push(eq(messageTemplateCatalogs.isActive, filter.isActive));
		}

		const rows = await db
			.select()
			.from(messageTemplateCatalogs)
			.where(and(...conditions))
			.orderBy(asc(messageTemplateCatalogs.intent), asc(messageTemplateCatalogs.title));

		return rows as MessageTemplateRecord[];
	}

	/**
	 * Получение одного шаблона по ID.
	 */
	public static async getTemplateById(
		organizationId: string,
		templateId: string,
	): Promise<MessageTemplateRecord | null> {
		const [row] = await db
			.select()
			.from(messageTemplateCatalogs)
			.where(
				and(
					eq(messageTemplateCatalogs.id, templateId),
					eq(messageTemplateCatalogs.organizationId, organizationId),
				),
			)
			.limit(1);

		return (row as MessageTemplateRecord) ?? null;
	}

	/**
	 * Создание нового шаблона сообщения с валидацией 152-ФЗ.
	 */
	public static async createTemplate(
		organizationId: string,
		input: CreateTemplateInput,
	): Promise<MessageTemplateRecord> {
		// 152-ФЗ / 323-ФЗ: Запрещаем создание шаблонов с жестко зашитой врачебной тайной
		const leakCheck = this.detectMedicalSecrecyLeaks(input.templateText);
		if (leakCheck.hasLeak) {
			throw new Error(
				`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${leakCheck.detectedTerms.join(", ")}). Шаблоны рассылок не должны содержать медицинские диагнозы.`,
			);
		}

		const extractedVariables =
			input.variables && input.variables.length > 0
				? input.variables
				: this.extractMacroKeys(input.templateText);

		const [row] = await db
			.insert(messageTemplateCatalogs)
			.values({
				organizationId,
				title: input.title.trim(),
				channel: input.channel ?? "telegram",
				intent: input.intent ?? "general",
				templateText: input.templateText,
				variables: extractedVariables as any,
				isActive: input.isActive ?? true,
			})
			.returning();

		if (!row) {
			throw new Error("Не удалось создать шаблон сообщения");
		}

		return row as MessageTemplateRecord;
	}

	/**
	 * Обновление существующего шаблона сообщения с валидацией 152-ФЗ.
	 */
	public static async updateTemplate(
		organizationId: string,
		templateId: string,
		input: UpdateTemplateInput,
	): Promise<MessageTemplateRecord> {
		if (input.templateText !== undefined) {
			const leakCheck = this.detectMedicalSecrecyLeaks(input.templateText);
			if (leakCheck.hasLeak) {
				throw new Error(
					`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${leakCheck.detectedTerms.join(", ")}).`,
				);
			}
		}

		const updateData: Record<string, unknown> = {};
		if (input.title !== undefined) updateData.title = input.title.trim();
		if (input.channel !== undefined) updateData.channel = input.channel;
		if (input.intent !== undefined) updateData.intent = input.intent;
		if (input.templateText !== undefined) {
			updateData.templateText = input.templateText;
			updateData.variables =
				input.variables && input.variables.length > 0
					? input.variables
					: this.extractMacroKeys(input.templateText);
		}
		if (input.isActive !== undefined) updateData.isActive = input.isActive;

		const [row] = await db
			.update(messageTemplateCatalogs)
			.set(updateData)
			.where(
				and(
					eq(messageTemplateCatalogs.id, templateId),
					eq(messageTemplateCatalogs.organizationId, organizationId),
				),
			)
			.returning();

		if (!row) {
			throw new Error("Шаблон сообщения не найден или не принадлежит вашей клинике");
		}

		return row as MessageTemplateRecord;
	}

	/**
	 * Удаление шаблона сообщения.
	 */
	public static async deleteTemplate(
		organizationId: string,
		templateId: string,
	): Promise<void> {
		const [row] = await db
			.delete(messageTemplateCatalogs)
			.where(
				and(
					eq(messageTemplateCatalogs.id, templateId),
					eq(messageTemplateCatalogs.organizationId, organizationId),
				),
			)
			.returning();

		if (!row) {
			throw new Error("Шаблон сообщения не найден или не удалось удалить");
		}
	}
}
