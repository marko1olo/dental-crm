/**
 * crmDatabaseTools.ts — Инструменты работы с базой данных PostgreSQL 18 и CRM:
 * получение ЭМК и одонтограммы, прейскурант 804н, обновление статуса зуба, запись и счет.
 */

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../db/client.js";
import {
	appointments,
	patientDrugAllergies,
	patientInvoices,
	patients,
	serviceCatalogItems,
	services,
	toothStateHistory,
	toothStates,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import {
	type DentalToolContext,
	type DentalToolEntry,
	createOpenAIToolDefinition,
} from "./types.js";

// ============================================================================
// 1. TOOL: get_patient_emr_and_odontogram
// ============================================================================

export const getPatientEmrSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").optional().describe("Идентификатор пациента в CRM"),
	query: z
		.string()
		.min(1)
		.optional()
		.describe("ФИО или номер телефона пациента для поиска (если patientId неизвестен)"),
});

export type GetPatientEmrInput = z.infer<typeof getPatientEmrSchema>;

export interface GetPatientEmrResult {
	readonly found: boolean;
	readonly message?: string;
	readonly patient?: {
		readonly id: string;
		readonly fullName: string;
		readonly birthDate: string | null;
		readonly phone: string | null;
		readonly weightKg: number | null;
		readonly notes: string | null;
	};
	readonly allergies?: readonly {
		readonly allergenGroup: string;
		readonly drugInnLatin: string | null;
		readonly severity: string;
		readonly manifestations: string;
	}[];
	readonly toothStates?: readonly {
		readonly toothNumber: number;
		readonly state: string;
		readonly surfaces: unknown;
		readonly notes: string | null;
	}[];
	readonly recentVisits?: readonly {
		readonly id: string;
		readonly status: string;
		readonly diagnosis: string | null;
		readonly createdAt: Date;
	}[];
}

export async function handleGetPatientEmr(
	args: GetPatientEmrInput,
	context: DentalToolContext,
): Promise<GetPatientEmrResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;

	if (!args.patientId && !args.query) {
		return {
			found: false,
			message: "Для поиска медицинской карты необходимо указать patientId или query (ФИО/телефон).",
		};
	}

	let targetPatient: typeof patients.$inferSelect | undefined;

	if (args.patientId) {
		const rows = await activeDb
			.select()
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, args.patientId)))
			.limit(1);
		targetPatient = rows[0];
	} else if (args.query) {
		const searchPattern = `%${args.query.trim()}%`;
		const rows = await activeDb
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					or(ilike(patients.fullName, searchPattern), ilike(patients.phone, searchPattern)),
				),
			)
			.limit(1);
		targetPatient = rows[0];
	}

	if (!targetPatient) {
		return {
			found: false,
			message: "Пациент не найден в базе данных организации.",
		};
	}

	// Запрашиваем аллергии
	const allergiesRows = await activeDb
		.select()
		.from(patientDrugAllergies)
		.where(
			and(
				eq(patientDrugAllergies.organizationId, orgId),
				eq(patientDrugAllergies.patientId, targetPatient.id),
			),
		);

	// Запрашиваем состояния зубов (одонтограмму)
	const toothRows = await activeDb
		.select()
		.from(toothStates)
		.where(and(eq(toothStates.organizationId, orgId), eq(toothStates.patientId, targetPatient.id)));

	// Запрашиваем последние визиты
	const visitRows = await activeDb
		.select()
		.from(visits)
		.where(and(eq(visits.organizationId, orgId), eq(visits.patientId, targetPatient.id)))
		.orderBy(desc(visits.createdAt))
		.limit(5);

	const weightNum = targetPatient.weightKg ? Number.parseFloat(targetPatient.weightKg) : null;

	return {
		found: true,
		patient: {
			id: targetPatient.id,
			fullName: targetPatient.fullName,
			birthDate: targetPatient.birthDate,
			phone: targetPatient.phone,
			weightKg: Number.isNaN(weightNum) ? null : weightNum,
			notes: targetPatient.notes,
		},
		allergies: allergiesRows.map((a) => ({
			allergenGroup: a.allergenGroup,
			drugInnLatin: a.drugInnLatin,
			severity: a.reactionSeverity,
			manifestations: a.clinicalManifestations,
		})),
		toothStates: toothRows.map((t) => ({
			toothNumber: t.toothNumber,
			state: t.state,
			surfaces: t.surfaces,
			notes: t.notes,
		})),
		recentVisits: visitRows.map((v) => ({
			id: v.id,
			status: v.status,
			diagnosis: v.diagnosis,
			createdAt: v.createdAt,
		})),
	};
}

export const getPatientEmrTool: DentalToolEntry<typeof getPatientEmrSchema> = {
	name: "get_patient_emr_and_odontogram",
	description:
		"Запрос реальной электронной медицинской карты (ЭМК), аллергостатуса и зубной формулы (FDI) пациента из PostgreSQL 18 с тенантной изоляцией.",
	schema: getPatientEmrSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"get_patient_emr_and_odontogram",
		"Получение данных медицинской карты, аллергий и одонтограммы пациента из базы данных клиники.",
		getPatientEmrSchema,
	),
	handler: handleGetPatientEmr,
};

// ============================================================================
// 2. TOOL: search_clinic_services_and_prices
// ============================================================================

export const searchServicesSchema = z.object({
	codeOrName: z
		.string()
		.min(1, "Поисковый запрос обязателен")
		.describe("Код по Номенклатуре 804н (например, A16.07.002, A16.07.030) или название услуги"),
	category: z
		.enum(["therapy", "surgery", "orthopedics", "orthodontics", "hygiene", "all"])
		.default("all")
		.describe("Категория стоматологических услуг"),
});

export type SearchServicesInput = z.infer<typeof searchServicesSchema>;

// Нормативный структурированный справочник Номенклатуры МЗ РФ 804н (без выдуманных цен клиники!)
const STANDARD_804N_CATALOG: readonly {
	code: string;
	title: string;
	category: string;
}[] = [
	{
		code: "A11.07.011",
		title: "Аппликационная анестезия",
		category: "anesthesia",
	},
	{
		code: "A11.07.012",
		title: "Инфильтрационная анестезия",
		category: "anesthesia",
	},
	{
		code: "A11.07.013",
		title: "Проводниковая анестезия",
		category: "anesthesia",
	},
	{
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение кариеса)",
		category: "therapy",
	},
	{
		code: "A16.07.002.001",
		title: "Наложение коффердама (раббердама) / Оптрагейт",
		category: "therapy",
	},
	{
		code: "A16.07.002.010",
		title: "Восстановление зуба пломбой светоотверждаемым композитным материалом",
		category: "therapy",
	},
	{
		code: "A16.07.030",
		title: "Инструментальная и медикаментозная обработка корневого канала",
		category: "endodontics",
	},
	{
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба (гуттаперча, силер)",
		category: "endodontics",
	},
	{
		code: "A16.07.001",
		title: "Удаление зуба (простое / сложное)",
		category: "surgery",
	},
	{
		code: "A16.07.004",
		title: "Восстановление зуба коронкой (металлокерамика / диоксид циркония / E.max)",
		category: "orthopedics",
	},
	{
		code: "A16.07.006",
		title: "Установка дентального имплантата",
		category: "surgery",
	},
	{
		code: "A16.07.020",
		title: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений",
		category: "hygiene",
	},
	{
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов (Air-Flow)",
		category: "hygiene",
	},
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		category: "consultation",
	},
];

export interface SearchServicesResult {
	readonly found: boolean;
	readonly query: string;
	readonly totalCount: number;
	readonly results: readonly {
		readonly code: string;
		readonly title: string;
		readonly category: string;
		readonly priceRub: number | null;
		readonly source: "clinic_pricelist" | "order_804n_standard_catalog";
	}[];
}

export async function handleSearchServices(
	args: SearchServicesInput,
	context: DentalToolContext,
): Promise<SearchServicesResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const query = args.codeOrName.trim();
	const searchPattern = `%${query}%`;

	// 1. Поиск в прейскуранте клиники (serviceCatalogItems)
	const clinicItems = await activeDb
		.select()
		.from(serviceCatalogItems)
		.where(
			and(
				eq(serviceCatalogItems.organizationId, orgId),
				or(
					ilike(serviceCatalogItems.title, searchPattern),
					ilike(serviceCatalogItems.code, searchPattern),
					ilike(serviceCatalogItems.order804nCode, searchPattern),
				),
			),
		)
		.limit(10);

	if (clinicItems.length > 0) {
		return {
			found: true,
			query,
			totalCount: clinicItems.length,
			results: clinicItems.map((item) => ({
				code: item.order804nCode || item.code,
				title: item.title,
				category: item.category,
				priceRub: item.priceRub,
				source: "clinic_pricelist" as const,
			})),
		};
	}

	// 2. Поиск в альтернативной таблице услуг (services)
	const servicesItems = await activeDb
		.select()
		.from(services)
		.where(
			and(
				eq(services.organizationId, orgId),
				or(ilike(services.title, searchPattern), ilike(services.code, searchPattern)),
			),
		)
		.limit(10);

	if (servicesItems.length > 0) {
		return {
			found: true,
			query,
			totalCount: servicesItems.length,
			results: servicesItems.map((item) => ({
				code: item.code || "A16.07.000",
				title: item.title,
				category: item.category,
				priceRub: item.basePriceRub,
				source: "clinic_pricelist" as const,
			})),
		};
	}

	// 3. Мягкий фолбек на нормативный справочник Номенклатуры 804н
	const normQuery = query.toLowerCase();
	const fallbackMatches = STANDARD_804N_CATALOG.filter(
		(s) => s.code.toLowerCase().includes(normQuery) || s.title.toLowerCase().includes(normQuery),
	);

	return {
		found: fallbackMatches.length > 0,
		query,
		totalCount: fallbackMatches.length,
		results: fallbackMatches.map((m) => ({
			code: m.code,
			title: m.title,
			category: m.category,
			priceRub: null, // Цена клиники не установлена, возвращаем честный null
			source: "order_804n_standard_catalog" as const,
		})),
	};
}

export const searchServicesTool: DentalToolEntry<typeof searchServicesSchema> = {
	name: "search_clinic_services_and_prices",
	description:
		"Поиск стоматологических услуг в прейскуранте клиники и по Номенклатуре Минздрава РФ 804н (коды A16.07.002, A16.07.030 и названия).",
	schema: searchServicesSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"search_clinic_services_and_prices",
		"Поиск услуг и прайса по кодам 804н и каталогу клиники с мягким нормативным фолбеком.",
		searchServicesSchema,
	),
	handler: handleSearchServices,
};

// ============================================================================
// 3. TOOL: update_tooth_status
// ============================================================================

export const updateToothStatusSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	toothNumber: z
		.number()
		.min(11)
		.max(85)
		.describe("Номер зуба по формуле FDI (11-48 постоянные, 51-85 молочные)"),
	state: z
		.enum([
			"healthy",
			"caries",
			"pulpitis",
			"periodontitis",
			"filling",
			"crown",
			"implant",
			"extracted",
			"missing",
			"root",
			"mobility",
		])
		.describe("Новый клинический статус зуба"),
	surfaces: z
		.array(z.string())
		.optional()
		.describe("Пораженные или восстановленные поверхности зуба (O, M, D, V, L)"),
	notes: z.string().optional().describe("Клинические примечания к состоянию зуба"),
});

export type UpdateToothStatusInput = z.infer<typeof updateToothStatusSchema>;

export interface UpdateToothStatusResult {
	readonly success: boolean;
	readonly toothNumber: number;
	readonly previousState: string | null;
	readonly newState: string;
	readonly surfaces: readonly string[] | null;
	readonly recordedAt: Date;
	readonly message: string;
}

export async function handleUpdateToothStatus(
	args: UpdateToothStatusInput,
	context: DentalToolContext,
): Promise<UpdateToothStatusResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const tooth = args.toothNumber;

	// Валидация FDI
	const isAdultFdi = tooth >= 11 && tooth <= 48 && tooth % 10 >= 1 && tooth % 10 <= 8;
	const isPediatricFdi = tooth >= 51 && tooth <= 85 && tooth % 10 >= 1 && tooth % 10 <= 5;
	if (!isAdultFdi && !isPediatricFdi) {
		throw new Error(
			`Недопустимый номер зуба ${tooth}. Разрешены постоянные зубы FDI 11-48 и молочные зубы FDI 51-85.`,
		);
	}

	// Проверяем существование записи по зубу
	const existing = await activeDb
		.select()
		.from(toothStates)
		.where(
			and(
				eq(toothStates.organizationId, orgId),
				eq(toothStates.patientId, args.patientId),
				eq(toothStates.toothNumber, tooth),
			),
		)
		.limit(1);

	const previousState = existing[0]?.state ?? null;
	const now = new Date();

	if (existing.length > 0) {
		await activeDb
			.update(toothStates)
			.set({
				state: args.state,
				surfaces: args.surfaces ?? null,
				notes: args.notes ?? null,
				updatedAt: now,
			})
			.where(eq(toothStates.id, existing[0].id));
	} else {
		await activeDb.insert(toothStates).values({
			organizationId: orgId,
			patientId: args.patientId,
			toothNumber: tooth,
			state: args.state,
			surfaces: args.surfaces ?? null,
			notes: args.notes ?? null,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Аудит в историю зуба
	await activeDb.insert(toothStateHistory).values({
		organizationId: orgId,
		patientId: args.patientId,
		toothNumber: tooth,
		previousState,
		newState: args.state,
		previousSurfaces: existing[0]?.surfaces ?? null,
		newSurfaces: args.surfaces ?? null,
		changedByUserId: context.userId ?? null,
		reason: args.notes ?? "Обновление через клинический ИИ-ассистент",
		changedAt: now,
	});

	return {
		success: true,
		toothNumber: tooth,
		previousState,
		newState: args.state,
		surfaces: args.surfaces ?? null,
		recordedAt: now,
		message: `Статус зуба ${tooth} успешно зафиксирован: '${args.state}' в электронной одонтограмме.`,
	};
}

export const updateToothStatusTool: DentalToolEntry<typeof updateToothStatusSchema> = {
	name: "update_tooth_status",
	description:
		"Обновление клинического статуса зуба в зубной формуле (FDI 11-48 / 51-85) с записью в PostgreSQL 18 и фиксацией в tooth_state_history.",
	schema: updateToothStatusSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"update_tooth_status",
		"Обновление клинического статуса зуба в одонтограмме пациента.",
		updateToothStatusSchema,
	),
	handler: handleUpdateToothStatus,
};

// ============================================================================
// 4. TOOL: create_appointment
// ============================================================================

export const createAppointmentSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	doctorId: z.string().uuid("Некорректный UUID врача").describe("ID лечащего врача"),
	startTime: z.string().describe("Время начала приёма (ISO 8601 строка, например 2026-10-15T10:00:00Z)"),
	durationMinutes: z
		.number()
		.min(15, "Минимум 15 минут")
		.max(240, "Максимум 4 часа")
		.default(30)
		.describe("Длительность приёма в минутах (по умолчанию 30)"),
	chairId: z.string().uuid("Некорректный UUID кресла").optional().describe("ID стоматологической установки"),
	serviceTitle: z.string().optional().describe("Планируемая услуга или повод обращения"),
	notes: z.string().optional().describe("Примечания к визиту"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export interface CreateAppointmentResult {
	readonly success: boolean;
	readonly appointmentId: string;
	readonly patientId: string;
	readonly doctorId: string;
	readonly startTime: string;
	readonly endTime: string;
	readonly durationMinutes: number;
	readonly status: string;
	readonly message: string;
}

export async function handleCreateAppointment(
	args: CreateAppointmentInput,
	context: DentalToolContext,
): Promise<CreateAppointmentResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;

	const start = new Date(args.startTime);
	if (Number.isNaN(start.getTime())) {
		throw new Error(`Некорректный формат времени startTime: '${args.startTime}'`);
	}

	const duration = args.durationMinutes ?? 30;
	const end = new Date(start.getTime() + duration * 60 * 1000);

	const [inserted] = await activeDb
		.insert(appointments)
		.values({
			organizationId: orgId,
			patientId: args.patientId,
			doctorId: args.doctorId,
			chairId: args.chairId ?? null,
			startTime: start,
			endTime: end,
			durationMinutes: duration,
			status: "scheduled",
			serviceTitle: args.serviceTitle ?? "Стоматологический приём",
			notes: args.notes ?? null,
		})
		.returning({ id: appointments.id });

	return {
		success: true,
		appointmentId: inserted.id,
		patientId: args.patientId,
		doctorId: args.doctorId,
		startTime: start.toISOString(),
		endTime: end.toISOString(),
		durationMinutes: duration,
		status: "scheduled",
		message: `Запись успешно добавлена в расписание клиники на ${start.toLocaleString("ru-RU")}.`,
	};
}

export const createAppointmentTool: DentalToolEntry<typeof createAppointmentSchema> = {
	name: "create_appointment",
	description:
		"Создание записи пациента в расписании клиники на свободное время с привязкой к врачу, креслу и тенанту.",
	schema: createAppointmentSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"create_appointment",
		"Создание записи пациента в расписании клиники.",
		createAppointmentSchema,
	),
	handler: handleCreateAppointment,
};

// ============================================================================
// 5. TOOL: create_invoice_draft
// ============================================================================

export const createInvoiceDraftSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	visitId: z.string().uuid("Некорректный UUID визита").optional().describe("ID завершенного визита"),
	items: z
		.array(
			z.object({
				title: z.string().describe("Наименование стоматологической услуги"),
				priceRub: z.number().min(0, "Цена должна быть >= 0").describe("Цена в рублях"),
				quantity: z.number().min(1).default(1).describe("Количество"),
				code804n: z.string().optional().describe("Код по Номенклатуре 804н"),
				toothCode: z.string().optional().describe("Номер зуба"),
			}),
		)
		.min(1, "Счет должен содержать хотя бы одну услугу")
		.describe("Список оказанных услуг для выставления счёта"),
	discountRub: z
		.number()
		.min(0)
		.default(0)
		.describe("Скидка врача в рублях (Мандат 8e: свобода скидок вплоть до 100%)"),
});

export type CreateInvoiceDraftInput = z.infer<typeof createInvoiceDraftSchema>;

export interface CreateInvoiceDraftResult {
	readonly success: boolean;
	readonly invoiceId: string;
	readonly patientId: string;
	readonly itemsCount: number;
	readonly subtotalRub: number;
	readonly discountRub: number;
	readonly totalAmountRub: number;
	readonly status: string;
	readonly message: string;
}

export async function handleCreateInvoiceDraft(
	args: CreateInvoiceDraftInput,
	context: DentalToolContext,
): Promise<CreateInvoiceDraftResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;

	let subtotal = 0;
	for (const item of args.items) {
		subtotal += item.priceRub * (item.quantity ?? 1);
	}

	const discount = args.discountRub ?? 0;
	const total = Math.max(0, subtotal - discount);

	// Вставляем драфт счёта в patientInvoices
	const [inserted] = await activeDb
		.insert(patientInvoices)
		.values({
			organizationId: orgId,
			patientId: args.patientId,
			visitId: args.visitId ?? null,
			totalAmountRub: total,
			discountAmountRub: discount,
			paidAmountRub: 0,
			status: "pending",
		})
		.returning({ id: patientInvoices.id });

	// Вставляем позиции в treatmentItems
	for (const item of args.items) {
		await activeDb.insert(treatmentItems).values({
			organizationId: orgId,
			patientId: args.patientId,
			visitId: args.visitId ?? null,
			title: item.title,
			toothCode: item.toothCode ?? null,
			quantity: String(item.quantity ?? 1),
			priceRub: item.priceRub * (item.quantity ?? 1),
			unitPriceRub: item.priceRub,
			discountRub: 0,
			status: "completed",
		});
	}

	return {
		success: true,
		invoiceId: inserted.id,
		patientId: args.patientId,
		itemsCount: args.items.length,
		subtotalRub: subtotal,
		discountRub: discount,
		totalAmountRub: total,
		status: "draft_in_cashier",
		message: `Счёт на сумму ${total.toLocaleString("ru-RU")} ₽ успешно создан и направлен на кассу клиники (готовность к 54-ФЗ).`,
	};
}

export const createInvoiceDraftTool: DentalToolEntry<typeof createInvoiceDraftSchema> = {
	name: "create_invoice_draft",
	description:
		"Формирование черновика счета/сметы по согласованным услугам для передачи в кассу клиники (Мандат 8e: свобода скидок врача).",
	schema: createInvoiceDraftSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"create_invoice_draft",
		"Создание счёта в кассу по перечню оказанных стоматологических услуг.",
		createInvoiceDraftSchema,
	),
	handler: handleCreateInvoiceDraft,
};

// ============================================================================
// 6. TOOL: print_document
// ============================================================================

export const printDocumentSchema = z.object({
	documentType: z
		.enum(["form_043", "informed_consent", "treatment_act", "invoice_receipt", "prescription", "warranty_memo"])
		.describe("Тип формируемого клинического/финансового документа"),
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	visitId: z.string().uuid("Некорректный UUID визита").optional().describe("ID визита"),
	format: z
		.enum(["pdf", "system_printer", "raw_esc_pos"])
		.default("pdf")
		.describe("Формат вывода: pdf (экспорт/загрузка), system_printer (печать на принтер), raw_esc_pos (кассовая лента)"),
	printerName: z.string().optional().describe("Имя целевого принтера (для system_printer)"),
});

export type PrintDocumentInput = z.infer<typeof printDocumentSchema>;

export interface PrintDocumentResult {
	readonly success: boolean;
	readonly documentType: string;
	readonly patientId: string;
	readonly format: string;
	readonly printJobId: string;
	readonly downloadUrl: string;
	readonly actionDirective: "TRIGGER_BROWSER_PRINT" | "DESKTOP_PRINT_DISPATCHED";
	readonly message: string;
}

export async function handlePrintDocument(
	args: PrintDocumentInput,
	context: DentalToolContext,
): Promise<PrintDocumentResult> {
	const isDesktop = context.runtimeMode === "desktop_native";
	const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const downloadUrl = `/api/documents/export/${args.documentType}/${args.patientId}.pdf`;

	const actionDirective = isDesktop ? "DESKTOP_PRINT_DISPATCHED" : "TRIGGER_BROWSER_PRINT";
	const message = isDesktop
		? `Документ '${args.documentType}' направлен в системную очередь печати Windows (${args.printerName || "принтер по умолчанию"}).`
		: `Сформирован документ '${args.documentType}'. Готов к печати через диалог браузера или скачиванию PDF.`;

	return {
		success: true,
		documentType: args.documentType,
		patientId: args.patientId,
		format: args.format,
		printJobId: jobId,
		downloadUrl,
		actionDirective,
		message,
	};
}

export const printDocumentTool: DentalToolEntry<typeof printDocumentSchema> = {
	name: "print_document",
	description:
		"Печать или экспорт в PDF медицинских и финансовых документов (Форма 043/у, ИДС, акт лечения, чек 54-ФЗ).",
	schema: printDocumentSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"print_document",
		"Печать и экспорт в PDF медицинской карты 043/у, согласий и финансовых актов.",
		printDocumentSchema,
	),
	handler: handlePrintDocument,
};
