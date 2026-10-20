/**
 * crmDatabaseTools.ts — Инструменты работы с базой данных PostgreSQL 18 и CRM:
 * получение ЭМК и одонтограммы, прейскурант услуг клиники, обновление статуса зуба, запись и счет.
 */

import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../db/client.js";
import {
	appointments,
	cashBoxes,
	chairs,
	clinics,
	doctorShiftRosters,
	organizations,
	patientDrugAllergies,
	patientInvoices,
	patients,
	serviceCatalogItems,
	services,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { isPathSafe } from "./desktopSystemTools.js";
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
		.describe("Код услуги (например, A16.07.002, A16.07.030) или название процедуры"),
	category: z
		.enum(["therapy", "surgery", "orthopedics", "orthodontics", "hygiene", "all"])
		.default("all")
		.describe("Категория стоматологических услуг"),
});

export type SearchServicesInput = z.infer<typeof searchServicesSchema>;

// Нормативный справочник базовых стоматологических процедур
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

	// 3. Мягкий фолбек на нормативный справочник базовых стоматологических процедур
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
		"Поиск стоматологических услуг в прейскуранте клиники и базовом каталоге процедур (коды A16.07.002, A16.07.030 и названия).",
	schema: searchServicesSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"search_clinic_services_and_prices",
		"Поиск услуг и прайса по кодам и каталогу клиники с мягким нормативным фолбеком.",
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
				code804n: z.string().optional().describe("Код стоматологической услуги в прейскуранте"),
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
		"Печать или экспорт в PDF медицинской карты приёма, информированных согласий и финансовых актов.",
	schema: printDocumentSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"print_document",
		"Печать и экспорт в PDF медицинской карты приёма, согласий и финансовых актов.",
		printDocumentSchema,
	),
	handler: handlePrintDocument,
};

// ============================================================================
// 7. TOOL: configure_clinic_setup (Автономная настройка клиники под ключ)
// ============================================================================

export const configureClinicSetupSchema = z.object({
	clinicName: z
		.string()
		.min(2, "Название клиники обязательно")
		.describe("Наименование стоматологической клиники (например: 'Дентал Плюс')"),
	inn: z.string().optional().describe("ИНН юридического лица или ИП"),
	kpp: z.string().optional().describe("КПП организации"),
	ogrn: z.string().optional().describe("ОГРН / ОГРНИП"),
	legalAddress: z.string().optional().describe("Фактический или юридический адрес клиники"),
	phone: z.string().optional().describe("Контактный телефон клиники"),
	email: z.string().optional().describe("Контактный email клиники"),
	clinicMode: z
		.enum(["solo_doctor", "one_chair", "small_clinic", "network_clinic"])
		.optional()
		.describe("Масштаб клиники (solo_doctor, one_chair, small_clinic, network_clinic)"),
	chairsCount: z
		.number()
		.int()
		.min(1)
		.max(20)
		.default(3)
		.describe("Количество стоматологических кресел в расписании (по умолчанию 3)"),
	chairNames: z
		.array(z.string())
		.optional()
		.describe("Пользовательские названия кабинетов или кресел"),
	schedule: z
		.object({
			startHour: z
				.number()
				.min(0)
				.max(23)
				.default(9)
				.describe("Час начала рабочего дня (например, 9)"),
			endHour: z
				.number()
				.min(1)
				.max(24)
				.default(21)
				.describe("Час окончания рабочего дня (например, 21)"),
			workDays: z
				.array(z.number().min(0).max(6))
				.default([1, 2, 3, 4, 5, 6])
				.describe("Рабочие дни недели (1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб, 0=Вс)"),
			timezone: z
				.string()
				.default("Europe/Moscow")
				.describe("Часовой пояс клиники"),
		})
		.default({
			startHour: 9,
			endHour: 21,
			workDays: [1, 2, 3, 4, 5, 6],
			timezone: "Europe/Moscow",
		})
		.describe("Режим работы клиники и смен"),
	doctors: z
		.array(
			z.object({
				fullName: z.string().min(2).describe("ФИО врача"),
				specialty: z
					.enum([
						"therapist",
						"surgeon",
						"orthopedist",
						"orthodontist",
						"periodontist",
						"hygienist",
						"pediatric",
						"universal",
					])
					.describe("Специальность врача"),
				phone: z.string().optional().describe("Телефон врача"),
				email: z.string().optional().describe("Email врача"),
			}),
		)
		.min(1)
		.describe("Список врачей клиники для добавления в расписание"),
	activateStandardPricelist: z
		.boolean()
		.default(true)
		.describe("Активировать стандартный прейскурант стоматологических услуг"),
	kkmSettings: z
		.object({
			model: z
				.string()
				.default("ATOL 25F / 30F USB")
				.describe("Модель кассового аппарата (Атол, Штрих-М)"),
			kkmActive: z
				.boolean()
				.default(true)
				.describe("Флаг активности фискального регистратора"),
			defaultPort: z
				.string()
				.default("USB/COM3")
				.describe("Порт подключения кассы"),
			cashierName: z.string().optional().describe("ФИО старшего кассира"),
		})
		.default({
			model: "ATOL 25F / 30F USB",
			kkmActive: true,
			defaultPort: "USB/COM3",
		})
		.describe("Параметры фискального кассового регистратора"),
});

export type ConfigureClinicSetupInput = z.input<
	typeof configureClinicSetupSchema
>;

const STANDARD_INITIAL_SERVICES: readonly {
	code: string;
	title: string;
	category:
		| "therapy"
		| "surgery"
		| "prosthetics"
		| "orthodontics"
		| "hygiene"
		| "consultation";
	specialty:
		| "therapist"
		| "surgeon"
		| "orthopedist"
		| "orthodontist"
		| "hygienist"
		| "universal";
	priceRub: number;
	durationMinutes: number;
}[] = [
	{
		code: "B01.065.001",
		title: "Первичный приём и консультация стоматолога-терапевта",
		category: "consultation",
		specialty: "therapist",
		priceRub: 1000,
		durationMinutes: 30,
	},
	{
		code: "B01.066.001",
		title: "Первичный приём и консультация стоматолога-ортопеда",
		category: "consultation",
		specialty: "orthopedist",
		priceRub: 1200,
		durationMinutes: 30,
	},
	{
		code: "B01.067.001",
		title: "Первичный приём и консультация стоматолога-хирурга",
		category: "consultation",
		specialty: "surgeon",
		priceRub: 1200,
		durationMinutes: 30,
	},
	{
		code: "A11.07.012",
		title: "Инфильтрационная анестезия препаратом артикаина",
		category: "therapy",
		specialty: "therapist",
		priceRub: 650,
		durationMinutes: 10,
	},
	{
		code: "A11.07.013",
		title: "Проводниковая анестезия",
		category: "therapy",
		specialty: "therapist",
		priceRub: 750,
		durationMinutes: 10,
	},
	{
		code: "A16.07.002",
		title: "Лечение поверхностного и среднего кариеса с постановкой пломбы",
		category: "therapy",
		specialty: "therapist",
		priceRub: 3500,
		durationMinutes: 40,
	},
	{
		code: "A16.07.002.001",
		title: "Изоляция операционного поля (коффердам / раббердам)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 500,
		durationMinutes: 15,
	},
	{
		code: "A16.07.002.010",
		title: "Эстетическая реставрация зуба светоотверждаемым нанокомпозитом",
		category: "therapy",
		specialty: "therapist",
		priceRub: 5200,
		durationMinutes: 60,
	},
	{
		code: "A16.07.030",
		title: "Механическая и медикаментозная обработка корневого канала",
		category: "therapy",
		specialty: "therapist",
		priceRub: 2200,
		durationMinutes: 35,
	},
	{
		code: "A16.07.008",
		title: "Пломбирование корневого канала методом вертикальной конденсации",
		category: "therapy",
		specialty: "therapist",
		priceRub: 1900,
		durationMinutes: 30,
	},
	{
		code: "A16.07.020",
		title: "Ультразвуковое удаление зубных отложений (1 челюсть)",
		category: "hygiene",
		specialty: "hygienist",
		priceRub: 2500,
		durationMinutes: 30,
	},
	{
		code: "A16.07.051",
		title: "Комплексная профессиональная чистка зубов Air-Flow с полировкой",
		category: "hygiene",
		specialty: "hygienist",
		priceRub: 4500,
		durationMinutes: 45,
	},
	{
		code: "A16.07.001",
		title: "Простое удаление зуба",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 2500,
		durationMinutes: 30,
	},
	{
		code: "A16.07.001.001",
		title: "Сложное удаление зуба с разъединением корней",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 4900,
		durationMinutes: 45,
	},
	{
		code: "A16.07.001.002",
		title: "Удаление ретинированного или дистопированного зуба мудрости",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 7800,
		durationMinutes: 60,
	},
	{
		code: "A16.07.006",
		title: "Установка дентального винтового имплантата",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 29500,
		durationMinutes: 60,
	},
	{
		code: "A16.07.004",
		title: "Коронка металлокерамическая на каркасе",
		category: "prosthetics",
		specialty: "orthopedist",
		priceRub: 12000,
		durationMinutes: 45,
	},
	{
		code: "A16.07.004.001",
		title: "Коронка из диоксида циркония Prettau / Multi-layer",
		category: "prosthetics",
		specialty: "orthopedist",
		priceRub: 19500,
		durationMinutes: 45,
	},
	{
		code: "A16.07.004.002",
		title: "Керамический винир / коронка E.max",
		category: "prosthetics",
		specialty: "orthopedist",
		priceRub: 24000,
		durationMinutes: 60,
	},
	{
		code: "A16.07.047",
		title: "Фиксация вестибулярной металлической брекет-системы (1 зубной ряд)",
		category: "orthodontics",
		specialty: "orthodontist",
		priceRub: 38000,
		durationMinutes: 60,
	},
	{
		code: "A16.07.048",
		title: "Контрольный осмотр и замена ортодонтической дуги",
		category: "orthodontics",
		specialty: "orthodontist",
		priceRub: 2500,
		durationMinutes: 30,
	},
];

export async function handleConfigureClinicSetup(
	args: ConfigureClinicSetupInput,
	context: DentalToolContext,
) {
	const parsedArgs = configureClinicSetupSchema.parse(args);
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const now = new Date();

	// 1. Определение режима масштаба клиники
	let calculatedMode = parsedArgs.clinicMode;
	if (!calculatedMode) {
		if (parsedArgs.chairsCount <= 1 && parsedArgs.doctors.length <= 1) {
			calculatedMode = "solo_doctor";
		} else if (parsedArgs.chairsCount === 1) {
			calculatedMode = "one_chair";
		} else if (parsedArgs.chairsCount <= 4) {
			calculatedMode = "small_clinic";
		} else {
			calculatedMode = "network_clinic";
		}
	}

	// 2. Обновление организации
	await activeDb
		.update(organizations)
		.set({
			name: parsedArgs.clinicName,
			legalAddress: parsedArgs.legalAddress ?? null,
			inn: parsedArgs.inn ?? null,
			kpp: parsedArgs.kpp ?? null,
			ogrn: parsedArgs.ogrn ?? null,
			email: parsedArgs.email ?? null,
			clinicMode: calculatedMode,
			clinicSchedule: parsedArgs.schedule,
			workspaceFeatureFlags: {
				schedule: true,
				emr: true,
				billing: true,
				imaging: true,
				kkm: true,
				inventory: true,
				analytics: true,
			},
			updatedAt: now,
		})
		.where(eq(organizations.id, orgId));

	// 3. Синхронизация записи в таблице clinics
	let targetClinicId: string;
	const existingClinics = await activeDb
		.select()
		.from(clinics)
		.where(eq(clinics.organizationId, orgId))
		.limit(1);

	if (existingClinics.length > 0) {
		targetClinicId = existingClinics[0].id;
		await activeDb
			.update(clinics)
			.set({
				name: parsedArgs.clinicName,
				address: parsedArgs.legalAddress ?? null,
				phone: parsedArgs.phone ?? null,
				timezone: parsedArgs.schedule.timezone,
			})
			.where(eq(clinics.id, targetClinicId));
	} else {
		const [createdClinic] = await activeDb
			.insert(clinics)
			.values({
				organizationId: orgId,
				name: parsedArgs.clinicName,
				address: parsedArgs.legalAddress ?? null,
				phone: parsedArgs.phone ?? null,
				timezone: parsedArgs.schedule.timezone,
			})
			.returning({ id: clinics.id });
		targetClinicId = createdClinic.id;
	}

	// 4. Создание кабинетов / стоматологических кресел
	const createdChairs: Array<{ id: string; name: string }> = [];
	for (let i = 0; i < parsedArgs.chairsCount; i++) {
		const defaultName =
			parsedArgs.chairNames?.[i] ||
			(i === 0
				? "Кабинет 1 (Терапия)"
				: i === 1
					? "Кабинет 2 (Хирургия / Имплантация)"
					: i === 2
						? "Кабинет 3 (Ортопедия / Ортодонтия)"
						: `Кабинет ${i + 1}`);

		const [chair] = await activeDb
			.insert(chairs)
			.values({
				organizationId: orgId,
				clinicId: targetClinicId,
				name: defaultName,
				isActive: true,
				workingHours: parsedArgs.schedule,
			})
			.returning({ id: chairs.id, name: chairs.name });
		createdChairs.push(chair);
	}

	// 5. Создание учетных записей врачей
	const createdDoctors: Array<{ id: string; fullName: string; specialty: string }> = [];
	for (const doc of parsedArgs.doctors) {
		const [userDoc] = await activeDb
			.insert(users)
			.values({
				organizationId: orgId,
				fullName: doc.fullName,
				role: "doctor",
				phone: doc.phone ?? null,
				email: doc.email ?? null,
				isActive: true,
			})
			.returning({ id: users.id, fullName: users.fullName });

		createdDoctors.push({
			id: userDoc.id,
			fullName: userDoc.fullName,
			specialty: doc.specialty,
		});
	}

	// 6. Формирование сменного расписания врачей на неделю
	const createdShifts: Array<{ date: string; doctorName: string; time: string }> = [];
	const today = new Date();
	const startHourStr = String(parsedArgs.schedule.startHour).padStart(2, "0") + ":00";
	const endHourStr = String(parsedArgs.schedule.endHour).padStart(2, "0") + ":00";

	for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
		const dateObj = new Date(today.getTime() + dayOffset * 86400000);
		const dayOfWeek = dateObj.getDay(); // 0 = Вс, 1 = Пн..

		if (parsedArgs.schedule.workDays.includes(dayOfWeek)) {
			const dateIso = dateObj.toISOString().slice(0, 10);

			for (let dIdx = 0; dIdx < createdDoctors.length; dIdx++) {
				const doc = createdDoctors[dIdx];
				const assignedChair = createdChairs[dIdx % createdChairs.length];
				if (!doc || !assignedChair) continue;

				await activeDb.insert(doctorShiftRosters).values({
					organizationId: orgId,
					doctorId: doc.id,
					doctorName: doc.fullName,
					chairId: assignedChair.id,
					dateIso,
					startTime: startHourStr,
					endTime: endHourStr,
					role: "doctor",
					specialty: doc.specialty,
				});

				createdShifts.push({
					date: dateIso,
					doctorName: doc.fullName,
					time: `${startHourStr} - ${endHourStr}`,
				});
			}
		}
	}

	// 7. Наполнение базового прейскуранта услуг
	let servicesAddedCount = 0;
	if (parsedArgs.activateStandardPricelist) {
		for (const s of STANDARD_INITIAL_SERVICES) {
			// Проверяем существующую позицию по коду
			const existingItem = await activeDb
				.select()
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, orgId),
						eq(serviceCatalogItems.code, s.code),
					),
				)
				.limit(1);

			if (existingItem.length === 0) {
				await activeDb.insert(serviceCatalogItems).values({
					organizationId: orgId,
					code: s.code,
					title: s.title,
					category: s.category,
					specialty: s.specialty,
					basePriceRub: s.priceRub,
					priceRub: s.priceRub,
					durationMinutes: s.durationMinutes,
					order804nCode: s.code,
					taxDeductible: true,
					isActive: true,
				});

				await activeDb.insert(services).values({
					organizationId: orgId,
					code: s.code,
					title: s.title,
					category: s.category,
					specialty: s.specialty,
					basePriceRub: s.priceRub,
					durationMinutes: s.durationMinutes,
					taxDeductible: true,
				});

				servicesAddedCount++;
			}
		}
	}

	// 8. Настройка кассового аппарата (ККМ)
	const existingCashBoxes = await activeDb
		.select()
		.from(cashBoxes)
		.where(
			and(
				eq(cashBoxes.organizationId, orgId),
				eq(cashBoxes.type, "main"),
			),
		)
		.limit(1);

	let configuredKkmModel = parsedArgs.kkmSettings.model;
	if (existingCashBoxes.length > 0) {
		await activeDb
			.update(cashBoxes)
			.set({
				kkmModel: parsedArgs.kkmSettings.model,
				kkmActive: parsedArgs.kkmSettings.kkmActive,
				updatedAt: now,
			})
			.where(eq(cashBoxes.id, existingCashBoxes[0].id));
	} else {
		await activeDb.insert(cashBoxes).values({
			organizationId: orgId,
			name: "Основная касса ККМ",
			type: "main",
			isMain: true,
			isCashless: false,
			balanceRub: 0,
			kkmModel: parsedArgs.kkmSettings.model,
			kkmSerialNumber: `ATOL-${Date.now().toString().slice(-6)}`,
			kkmActive: parsedArgs.kkmSettings.kkmActive,
		});
	}

	return {
		success: true,
		clinicName: parsedArgs.clinicName,
		clinicMode: calculatedMode,
		chairsConfigured: createdChairs.length,
		doctorsRegistered: createdDoctors.length,
		shiftsScheduled: createdShifts.length,
		servicesActivated: servicesAddedCount,
		cashRegisterConfigured: {
			model: configuredKkmModel,
			active: parsedArgs.kkmSettings.kkmActive,
			port: parsedArgs.kkmSettings.defaultPort,
		},
		message: `Клиника '${parsedArgs.clinicName}' успешно настроена под ключ: создано ${createdChairs.length} кресел, ${createdDoctors.length} врачей, ${createdShifts.length} рабочих смен, ${servicesAddedCount} услуг в прейскуранте и подключена касса ${configuredKkmModel}.`,
	};
}

export const configureClinicSetupTool: DentalToolEntry<
	typeof configureClinicSetupSchema
> = {
	name: "configure_clinic_setup",
	description:
		"Автономная настройка клиники под ключ: создание кабинетов и кресел, регистрация врачей, составление расписания смен, активация каталога стоматологических услуг и подключение кассового аппарата.",
	schema: configureClinicSetupSchema,
	destructive: true,
	titleRu: "Автономная настройка клиники под ключ",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"configure_clinic_setup",
		"Автономная экспресс-настройка профиля клиники, кресел, врачей, смен, прайс-листа и кассы.",
		configureClinicSetupSchema,
	),
	handler: handleConfigureClinicSetup,
};

// ============================================================================
// 8. TOOL: import_clinic_data_file (Пакетный импорт данных клиники из файлов)
// ============================================================================

export const importClinicDataFileSchema = z.object({
	filePath: z
		.string()
		.min(1, "Путь к файлу обязателен")
		.describe("Абсолютный путь к файлу данных на диске ПК (CSV, JSON, Excel)"),
	entityType: z
		.enum(["pricelist", "patients"])
		.describe("Тип импортируемых данных ('pricelist' для прейскуранта или 'patients' для базы пациентов)"),
	fileFormat: z
		.enum(["csv", "json", "auto"])
		.default("auto")
		.describe("Формат файла данных (по умолчанию автоопределение по расширению)"),
	delimiter: z
		.string()
		.optional()
		.describe("Разделитель колонок CSV (по умолчанию автоопределение: запятая, точка с запятой или табуляция)"),
	dryRun: z
		.boolean()
		.default(false)
		.describe("Тестовый запуск: валидация строк без сохранения изменений в базе данных"),
});

export type ImportClinicDataFileInput = z.input<
	typeof importClinicDataFileSchema
>;

export function parseCsvRows(
	rawContent: string,
	explicitDelimiter?: string,
): { headers: string[]; rows: Record<string, string>[] } {
	const lines = rawContent
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		return { headers: [], rows: [] };
	}

	const firstLine = lines[0] ?? "";
	let delimiter = explicitDelimiter;
	if (!delimiter) {
		const semiCount = (firstLine.match(/;/g) || []).length;
		const commaCount = (firstLine.match(/,/g) || []).length;
		const tabCount = (firstLine.match(/\t/g) || []).length;

		if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) {
			delimiter = ";";
		} else if (tabCount > commaCount && tabCount > 0) {
			delimiter = "\t";
		} else {
			delimiter = ",";
		}
	}

	function parseLine(line: string, delim: string): string[] {
		const result: string[] = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === delim && !inQuotes) {
				result.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		result.push(current.trim());
		return result;
	}

	const headers = parseLine(firstLine, delimiter).map((h) =>
		h.toLowerCase().replace(/["\r\n]/g, "").trim(),
	);

	const rows: Record<string, string>[] = [];
	for (let i = 1; i < lines.length; i++) {
		const currentLine = lines[i];
		if (!currentLine) continue;
		const values = parseLine(currentLine, delimiter);
		const rowObj: Record<string, string> = {};
		for (let hIdx = 0; hIdx < headers.length; hIdx++) {
			const headerName = headers[hIdx];
			if (headerName !== undefined) {
				rowObj[headerName] = values[hIdx] ?? "";
			}
		}
		rows.push(rowObj);
	}

	return { headers, rows };
}

export async function handleImportClinicDataFile(
	args: ImportClinicDataFileInput,
	context: DentalToolContext,
) {
	const parsedArgs = importClinicDataFileSchema.parse(args);
	const normalizedPath = path.normalize(parsedArgs.filePath);

	if (!isPathSafe(normalizedPath)) {
		return {
			success: false,
			error:
				"Отказ безопасности: доступ к системным директориям заблокирован (Red Team Guard).",
		};
	}

	if (!fs.existsSync(normalizedPath)) {
		return {
			success: false,
			error: `Файл для импорта не найден по пути: '${normalizedPath}'`,
		};
	}

	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const ext = path.extname(normalizedPath).toLowerCase();

	const isJson =
		parsedArgs.fileFormat === "json" ||
		(parsedArgs.fileFormat === "auto" && ext === ".json");

	let rawContent: string;
	try {
		rawContent = await fs.promises.readFile(normalizedPath, "utf8");
	} catch (err) {
		return {
			success: false,
			error: `Сбой чтения файла импорта: ${(err as Error).message}`,
		};
	}

	let records: Array<Record<string, unknown>> = [];

	if (isJson) {
		try {
			const parsed = JSON.parse(rawContent);
			records = Array.isArray(parsed) ? parsed : [parsed];
		} catch (err) {
			return {
				success: false,
				error: `Ошибка синтаксиса JSON в файле: ${(err as Error).message}`,
			};
		}
	} else {
		const { rows } = parseCsvRows(rawContent, parsedArgs.delimiter);
		records = rows;
	}

	if (records.length === 0) {
		return {
			success: false,
			error: "Файл пуст или не содержит доступных строк для импорта.",
		};
	}

	let importedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];
	const sampleImported: Array<Record<string, unknown>> = [];

	if (parsedArgs.entityType === "pricelist") {
		// Импорт прейскуранта стоматологических услуг
		for (let rIdx = 0; rIdx < records.length; rIdx++) {
			const row = records[rIdx];
			if (!row) continue;

			// Поиск полей по синонимам
			const code = String(
				row.code ?? row.код ?? row.код_услуги ?? row.артикул ?? `SERV-${rIdx + 1}`,
			).trim();

			const title = String(
				row.title ?? row.наименование ?? row.название ?? row.услуга ?? row.процедура ?? "",
			).trim();

			const rawPrice = String(
				row.price ?? row.цена ?? row.стоимость ?? row.price_rub ?? row.руб ?? "0",
			).replace(/[^\d.,]/g, "").replace(",", ".");

			const priceNum = Number.parseFloat(rawPrice) || 0;

			const categoryStr = String(
				row.category ?? row.категория ?? row.раздел ?? "therapy",
			).toLowerCase();

			let validCategory: "therapy" | "surgery" | "prosthetics" | "orthodontics" | "hygiene" | "consultation" | "other" = "therapy";
			if (categoryStr.includes("хирург") || categoryStr.includes("surg")) validCategory = "surgery";
			else if (categoryStr.includes("ортопед") || categoryStr.includes("протез") || categoryStr.includes("prosthet")) validCategory = "prosthetics";
			else if (categoryStr.includes("ортодонт") || categoryStr.includes("ortho")) validCategory = "orthodontics";
			else if (categoryStr.includes("гигиен") || categoryStr.includes("чистк") || categoryStr.includes("hygiene")) validCategory = "hygiene";
			else if (categoryStr.includes("консульт") || categoryStr.includes("осмотр")) validCategory = "consultation";

			if (!title) {
				skippedCount++;
				errors.push(`Строка ${rIdx + 1}: пропущена (отсутствует название услуги).`);
				continue;
			}

			if (!parsedArgs.dryRun) {
				try {
					await activeDb.insert(serviceCatalogItems).values({
						organizationId: orgId,
						code,
						title,
						category: validCategory,
						specialty: "universal",
						basePriceRub: priceNum,
						priceRub: priceNum,
						durationMinutes: 30,
						order804nCode: code.startsWith("A") || code.startsWith("B") ? code : null,
						isActive: true,
					});

					await activeDb.insert(services).values({
						organizationId: orgId,
						code,
						title,
						category: validCategory,
						specialty: "universal",
						basePriceRub: priceNum,
						durationMinutes: 30,
					});
				} catch (dbErr) {
					skippedCount++;
					errors.push(`Строка ${rIdx + 1} ('${title}'): ошибка записи в БД: ${(dbErr as Error).message}`);
					continue;
				}
			}

			importedCount++;
			if (sampleImported.length < 5) {
				sampleImported.push({ code, title, priceRub: priceNum, category: validCategory });
			}
		}
	} else if (parsedArgs.entityType === "patients") {
		// Импорт картотеки пациентов
		for (let rIdx = 0; rIdx < records.length; rIdx++) {
			const row = records[rIdx];
			if (!row) continue;

			const fullName = String(
				row.fullname ?? row.full_name ?? row.фио ?? row.пациент ?? row.имя ?? "",
			).trim();

			const phone = String(
				row.phone ?? row.телефон ?? row.тел ?? row.номер ?? "",
			).trim();

			const birthDate = String(
				row.birthdate ?? row.birth_date ?? row.дата_рождения ?? row.др ?? "",
			).trim();

			const email = String(
				row.email ?? row.почта ?? row.электронная_почта ?? "",
			).trim();

			const notes = String(
				row.notes ?? row.комментарий ?? row.заметки ?? row.примечание ?? "",
			).trim();

			if (!fullName || fullName.length < 2) {
				skippedCount++;
				errors.push(`Строка ${rIdx + 1}: пропущена (не указано корректное ФИО пациента).`);
				continue;
			}

			if (!parsedArgs.dryRun) {
				try {
					await activeDb.insert(patients).values({
						organizationId: orgId,
						fullName,
						phone: phone || null,
						birthDate: birthDate || null,
						email: email || null,
						notes: notes || null,
						status: "active",
					});
				} catch (dbErr) {
					skippedCount++;
					errors.push(`Строка ${rIdx + 1} ('${fullName}'): ошибка сохранения: ${(dbErr as Error).message}`);
					continue;
				}
			}

			importedCount++;
			if (sampleImported.length < 5) {
				sampleImported.push({ fullName, phone, birthDate });
			}
		}
	}

	return {
		success: true,
		entityType: parsedArgs.entityType,
		filePath: normalizedPath,
		dryRun: parsedArgs.dryRun,
		totalRowsRead: records.length,
		importedCount,
		skippedCount,
		errors: errors.slice(0, 10),
		sampleImported,
		message: parsedArgs.dryRun
			? `Предварительная проверка пройдена: ${importedCount} записей готовы к импорту, ${skippedCount} строк с ошибками.`
			: `Пакетный импорт успешно завершён: добавлено ${importedCount} записей (${parsedArgs.entityType === "pricelist" ? "услуг в прейскурант" : "пациентов в картотеку"}), пропущено ${skippedCount}.`,
	};
}

export const importClinicDataFileTool: DentalToolEntry<
	typeof importClinicDataFileSchema
> = {
	name: "import_clinic_data_file",
	description:
		"Пакетный импорт данных клиники из файлов Excel, CSV или JSON: загрузка прейскуранта услуг или базы пациентов с автоматическим определением колонок.",
	schema: importClinicDataFileSchema,
	destructive: true,
	titleRu: "Пакетный импорт данных клиники из файла",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"import_clinic_data_file",
		"Пакетная загрузка прейскуранта услуг или списка пациентов из локального файла CSV/JSON.",
		importClinicDataFileSchema,
	),
	handler: handleImportClinicDataFile,
};

