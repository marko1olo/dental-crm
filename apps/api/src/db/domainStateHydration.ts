import { browserRenderableImageMimeType } from "../imaging/previewFormats.js";
/**
 * domainStateHydration.ts — наполнение доменного состояния данными из Postgres.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ СУЩЕСТВУЕТ
 *
 * В приложении два слоя:
 *   • Postgres — где на самом деле лежат пациенты, записи, приёмы, платежи и
 *     документы (db/*Query.ts пишут туда);
 *   • sampleData.ts — где живут ВСЕ производные расчёты: готовность приёма,
 *     чек-лист закрытия, рекомендации, сводка по деньгам, нагрузка смены,
 *     очередь Telegram-отправок.
 *
 * Эти слои не были связаны. Производные расчёты считались по демонстрационным
 * массивам, которые заполняются один раз при старте модуля и не получают ни
 * одной реальной строки из базы. Отсюда два следствия:
 *
 *   1. /api/dashboard в режиме Postgres собирался отдельным кодом, который не
 *      умел считать эти разделы и отдавал их пустыми (а из-за несовпадения с
 *      контрактом — вообще падал; см. dashboardQuery.ts).
 *   2. Очередь Telegram строилась по демонстрационным приёмам. Пациент,
 *      привязавший бота, получал напоминания о чужих выдуманных визитах, а о
 *      своём настоящем приёме — не получал.
 *
 * Здесь строки из Postgres переносятся в доменные коллекции, после чего все
 * существующие расчёты работают уже на реальных данных.
 *
 * ВАЖНО: снимок в .data/dental-crm-state.json НЕ обновляется. Данные из базы —
 * не «изменение состояния», сохранять их в файл значило бы завести третью копию
 * тех же сведений.
 */

import { and, desc, eq } from "drizzle-orm";
import {
	appointmentSchema,
	chairSchema,
	clinicalRuleSchema,
	clinicModeSchema,
	communicationEventSchema,
	communicationTaskSchema,
	dentalSpecialtySchema,
	generatedDocumentSchema,
	imagingStudySchema,
	patientSchema,
	paymentSchema,
	protocolTemplateSchema,
	serviceCatalogItemSchema,
	staffMemberSchema,
	staffRoleSchema,
	treatmentPlanItemSchema,
	visitSchema,
	type Appointment,
	type Chair,
	type ClinicalRule,
	type CommunicationEvent,
	type CommunicationTask,
	type GeneratedDocument,
	type ImagingStudy,
	type Patient,
	type Payment,
	type ProtocolTemplate,
	type ServiceCatalogItem,
	type StaffMember,
	type TreatmentPlanItem,
	type Visit,
} from "@dental/shared";
import {
	activeVisit,
	appointments,
	chairs,
	clinicProfile,
	clinicalRules,
	communicationEvents,
	communicationTasks,
	documents,
	imagingStudies,
	patients,
	payments,
	protocolTemplates,
	serviceCatalog,
	serviceCatalogMap,
	staffMembers,
	treatmentPlanItems,
	validScheduleTimeZone,
} from "../sampleData.js";
import { db } from "./client.js";
import * as schema from "./schema.js";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/** В режиме "off" источник истины — сами доменные массивы, синхронизировать нечего. */
function inMemoryMode(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

function iso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isoOrNow(value: Date | string | null | undefined): string {
	return iso(value) ?? new Date().toISOString();
}

function parseJsonArray(value: unknown): string[] {
	if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
	if (typeof value !== "string" || !value.trim()) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
	} catch {
		// Не JSON — трактуем как список через запятую (так хранятся chairs.specializations).
		return value
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
	if (value && typeof value === "object") return value as T;
	if (typeof value !== "string" || !value.trim()) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/**
 * Отчёт о том, что удалось перенести. Строки, не прошедшие проверку контракта,
 * пропускаются поимённо, а не роняют весь ответ: одна кривая запись в базе не
 * должна гасить рабочий день всей клиники.
 */
export interface DomainStateHydrationReport {
	organizationId: string;
	mode: "in_memory" | "database";
	counts: Record<string, number>;
	skipped: Record<string, number>;
	warnings: string[];
}

/**
 * Проверяет строки по контракту и возвращает только валидные,
 * попутно считая отброшенные.
 */
function collect<T>(
	rows: unknown[],
	// biome-ignore lint/suspicious/noExplicitAny: zod-схемы из @dental/shared имеют разные дженерики
	validator: { safeParse: (input: unknown) => { success: boolean; data?: any } },
	label: string,
	report: DomainStateHydrationReport,
): T[] {
	const accepted: T[] = [];
	let skipped = 0;
	for (const row of rows) {
		const result = validator.safeParse(row);
		if (result.success) accepted.push(result.data as T);
		else skipped += 1;
	}
	report.counts[label] = accepted.length;
	if (skipped > 0) {
		report.skipped[label] = skipped;
		report.warnings.push(
			`${label}: ${skipped} строк(и) не соответствуют контракту и пропущены — проверьте данные в базе.`,
		);
	}
	return accepted;
}

async function selectByOrganization<T>(
	// biome-ignore lint/suspicious/noExplicitAny: drizzle-таблицы типизируются по-разному
	table: any,
	organizationId: string,
	label: string,
	report: DomainStateHydrationReport,
): Promise<T[]> {
	try {
		return (await db.select().from(table).where(eq(table.organizationId, organizationId))) as T[];
	} catch (error) {
		// Таблицы может не быть (миграция не применена) — это не повод ронять весь ответ.
		report.warnings.push(
			`${label}: не удалось прочитать из базы (${error instanceof Error ? error.message : String(error)}).`,
		);
		return [];
	}
}

// Гидратация меняет разделяемые массивы, поэтому параллельные запросы
// выстраиваются в очередь: иначе ответ для одной клиники мог бы собраться
// из наполовину заменённых данных другой.
let hydrationChain: Promise<unknown> = Promise.resolve();

export function hydrateDomainStateFromDb(organizationId: string): Promise<DomainStateHydrationReport> {
	const run = hydrationChain.then(
		() => hydrateDomainStateFromDbUnsynchronized(organizationId),
		() => hydrateDomainStateFromDbUnsynchronized(organizationId),
	);
	hydrationChain = run.catch(() => undefined);
	return run;
}

async function hydrateDomainStateFromDbUnsynchronized(
	organizationId: string,
): Promise<DomainStateHydrationReport> {
	const report: DomainStateHydrationReport = {
		organizationId,
		mode: inMemoryMode() ? "in_memory" : "database",
		counts: {},
		skipped: {},
		warnings: [],
	};
	if (report.mode === "in_memory") return report;

	const [
		organizationRows,
		clinicRows,
		userRows,
		chairRows,
		patientRows,
		appointmentRows,
		visitRows,
		treatmentItemRows,
		paymentRows,
		documentRows,
		taskRows,
		eventRows,
		imagingRows,
		serviceRows,
		ruleRows,
		protocolRows,
	] = await Promise.all([
		db
			.select()
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1)
			.catch(() => []),
		selectByOrganization<typeof schema.clinics.$inferSelect>(schema.clinics, organizationId, "clinics", report),
		selectByOrganization<typeof schema.users.$inferSelect>(schema.users, organizationId, "users", report),
		selectByOrganization<typeof schema.chairs.$inferSelect>(schema.chairs, organizationId, "chairs", report),
		selectByOrganization<typeof schema.patients.$inferSelect>(schema.patients, organizationId, "patients", report),
		selectByOrganization<typeof schema.appointments.$inferSelect>(
			schema.appointments,
			organizationId,
			"appointments",
			report,
		),
		selectByOrganization<typeof schema.visits.$inferSelect>(schema.visits, organizationId, "visits", report),
		selectByOrganization<typeof schema.treatmentItems.$inferSelect>(
			schema.treatmentItems,
			organizationId,
			"treatmentItems",
			report,
		),
		selectByOrganization<typeof schema.payments.$inferSelect>(schema.payments, organizationId, "payments", report),
		selectByOrganization<typeof schema.generatedDocuments.$inferSelect>(
			schema.generatedDocuments,
			organizationId,
			"documents",
			report,
		),
		selectByOrganization<typeof schema.communicationTasks.$inferSelect>(
			schema.communicationTasks,
			organizationId,
			"communicationTasks",
			report,
		),
		selectByOrganization<typeof schema.communicationEvents.$inferSelect>(
			schema.communicationEvents,
			organizationId,
			"communicationEvents",
			report,
		),
		selectByOrganization<typeof schema.imagingStudies.$inferSelect>(
			schema.imagingStudies,
			organizationId,
			"imagingStudies",
			report,
		),
		selectByOrganization<typeof schema.services.$inferSelect>(schema.services, organizationId, "serviceCatalog", report),
		selectByOrganization<typeof schema.clinicalRules.$inferSelect>(
			schema.clinicalRules,
			organizationId,
			"clinicalRules",
			report,
		),
		selectByOrganization<typeof schema.protocolTemplates.$inferSelect>(
			schema.protocolTemplates,
			organizationId,
			"protocolTemplates",
			report,
		),
	]);

	const organization = organizationRows[0];
	const clinic = clinicRows[0];

	// ── Профиль клиники ───────────────────────────────────────────────────────
	// БЫЛО: ИНН "1234567890", адрес "Default Address", телефон "+70000000000" —
	// выдуманные реквизиты, которые попадали в договоры и справки для ФНС.
	if (organization) {
		clinicProfile.organizationId = organization.id;
		clinicProfile.clinicName = organization.name;
		clinicProfile.legalName = organization.name;
		clinicProfile.inn = organization.inn ?? null;
		clinicProfile.kpp = organization.kpp ?? null;
		clinicProfile.ogrn = organization.ogrn ?? null;
		clinicProfile.address = clinic?.address ?? organization.legalAddress ?? null;
		clinicProfile.phone = clinic?.phone ?? null;
		clinicProfile.email = organization.email ?? null;
		clinicProfile.website = organization.website ?? null;
		clinicProfile.medicalLicenseNumber = organization.medicalLicenseNumber ?? null;
		clinicProfile.medicalLicenseIssuedAt = organization.medicalLicenseIssuedAt ?? null;
		clinicProfile.medicalLicenseIssuer = organization.medicalLicenseIssuer ?? null;
		clinicProfile.bankDetails = organization.bankDetails ?? null;
		clinicProfile.signatoryName = organization.signatoryName ?? null;
		clinicProfile.signatoryTitle = organization.signatoryTitle ?? null;
		// В базе clinic_mode по умолчанию "demo" — такого режима в контракте нет,
		// поэтому неизвестное значение сводим к «один кабинет».
		clinicProfile.mode = clinicModeSchema.catch("one_chair").parse(organization.clinicMode);
		clinicProfile.timezone = validScheduleTimeZone(clinic?.timezone);
		clinicProfile.updatedAt = isoOrNow(organization.updatedAt);
		report.counts.clinicProfile = 1;
	} else {
		report.warnings.push(
			"Организация не найдена в базе: реквизиты клиники остались прежними. Документы могут уйти с чужими данными.",
		);
	}

	// ── Сотрудники ────────────────────────────────────────────────────────────
	const staff = collect<StaffMember>(
		userRows.map((user) => ({
			id: user.id,
			organizationId: user.organizationId,
			fullName: user.fullName,
			role: staffRoleSchema.catch("doctor").parse(user.role),
			// БЫЛО: specialties всегда []. Специальности хранятся в базе и нужны
			// для подбора кресла и протокола приёма.
			specialties: parseJsonArray(user.specialties)
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.filter((result) => result.success)
				.map((result) => result.data),
			phone: user.phone ?? null,
			email: user.email ?? null,
			active: user.isActive,
			canSignMedicalRecords: user.role === "doctor" || user.role === "owner",
			canManageMoney: user.role === "owner" || user.role === "administrator",
			canManageImports: user.role === "owner" || user.role === "administrator",
			color: "#1e293b",
			workingHours: user.workingHours ?? null,
			createdAt: isoOrNow(user.createdAt),
			updatedAt: isoOrNow(user.createdAt),
		})),
		staffMemberSchema,
		"staff",
		report,
	);

	// ── Кресла ────────────────────────────────────────────────────────────────
	const equipmentOf = (value: string | null): string[] =>
		parseJsonArray(value).map((entry) => entry.toLowerCase());
	const chairRecords = collect<Chair>(
		chairRows.map((chair) => {
			const equipment = equipmentOf(chair.equipment);
			const specializations = parseJsonArray(chair.specializations);
			const specialization = specializations
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.find((result) => result.success);
			return {
				id: chair.id,
				organizationId: chair.organizationId,
				name: chair.name,
				room: null,
				specialization: specialization ? specialization.data : null,
				active: chair.isActive,
				// БЫЛО: оснащение всегда false. Из-за этого приём, требующий снимка,
				// не мог быть назначен на кресло с рентген-датчиком осознанно.
				hasXraySensor: equipment.some((entry) => entry.includes("rvg") || entry.includes("рентген")),
				hasMicroscope: equipment.some((entry) => entry.includes("microscope") || entry.includes("микроскоп")),
				hasSurgeryKit: equipment.some((entry) => entry.includes("surgery") || entry.includes("хирург")),
				notes: null,
				workingHours: chair.workingHours ?? null,
			};
		}),
		chairSchema,
		"chairs",
		report,
	);

	// ── Пациенты ──────────────────────────────────────────────────────────────
	// Баланс считается по фактическим платежам и позициям плана, а не нулём.
	const paidByPatient = new Map<string, number>();
	for (const payment of paymentRows) {
		if (payment.status !== "paid") continue;
		paidByPatient.set(payment.patientId, (paidByPatient.get(payment.patientId) ?? 0) + payment.amountRub);
	}
	const plannedByPatient = new Map<string, number>();
	for (const item of treatmentItemRows) {
		if (item.status === "cancelled") continue;
		const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
		const lineTotal = Math.max(0, item.unitPriceRub * quantity - item.discountRub);
		plannedByPatient.set(item.patientId, (plannedByPatient.get(item.patientId) ?? 0) + lineTotal);
	}
	const patientRecords = collect<Patient>(
		patientRows.map((patient) => ({
			id: patient.id,
			organizationId: patient.organizationId,
			status: patient.status,
			fullName: patient.fullName,
			birthDate: patient.birthDate ?? null,
			phone: patient.phone ?? null,
			email: patient.email ?? null,
			notes: patient.notes ?? null,
			administrativeProfile: patient.administrativeProfile ?? null,
			balanceRub: Math.round(
				(paidByPatient.get(patient.id) ?? 0) - (plannedByPatient.get(patient.id) ?? 0),
			),
			createdAt: isoOrNow(patient.createdAt),
			updatedAt: isoOrNow(patient.updatedAt),
		})),
		patientSchema,
		"patients",
		report,
	);

	// ── Записи ────────────────────────────────────────────────────────────────
	// БЫЛО: поля назывались doctorId/startAt/endAt — контракт ждёт
	// doctorUserId/startsAt/endsAt, поэтому НИ ОДНА запись не проходила проверку.
	const appointmentRecords = collect<Appointment>(
		appointmentRows.map((appointment) => ({
			id: appointment.id,
			organizationId: appointment.organizationId,
			patientId: appointment.patientId,
			doctorUserId: appointment.doctorUserId,
			assistantUserId: appointment.assistantUserId ?? null,
			chairId: appointment.chairId,
			status: appointment.status,
			startsAt: isoOrNow(appointment.startsAt),
			endsAt: isoOrNow(appointment.endsAt),
			reason: appointment.reason ?? null,
			comment: appointment.comment ?? null,
		})),
		appointmentSchema,
		"appointments",
		report,
	);

	// ── Приёмы ────────────────────────────────────────────────────────────────
	const visitRecords = collect<Visit>(
		visitRows.map((visit) => ({
			id: visit.id,
			organizationId: visit.organizationId,
			patientId: visit.patientId,
			appointmentId: visit.appointmentId ?? null,
			status: visit.status,
			revision: visit.revision,
			complaint: visit.complaint ?? null,
			anamnesis: visit.anamnesis ?? null,
			objectiveStatus: visit.objectiveStatus ?? null,
			diagnosis: visit.diagnosis ?? null,
			treatmentPlan: visit.treatmentPlan ?? null,
			doctorSummary: visit.doctorSummary ?? null,
			createdAt: isoOrNow(visit.createdAt),
			updatedAt: isoOrNow(visit.updatedAt),
		})),
		visitSchema,
		"visits",
		report,
	);

	// ── Позиции плана лечения ─────────────────────────────────────────────────
	const treatmentRecords = collect<TreatmentPlanItem>(
		treatmentItemRows.map((item) => ({
			id: item.id,
			organizationId: item.organizationId,
			patientId: item.patientId,
			visitId: item.visitId ?? null,
			serviceId: item.serviceId ?? "",
			snapshotServiceName: item.title,
			snapshotServiceCategory: null,
			toothCode: item.toothCode ?? null,
			// quantity в базе — numeric, драйвер отдаёт строку.
			quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
			unitPriceRub: Math.max(0, item.unitPriceRub),
			discountRub: Math.max(0, item.discountRub),
			status: item.status,
			plannedDoctorUserId: item.plannedDoctorUserId ?? null,
			plannedChairId: item.plannedChairId ?? null,
			notes: item.notes ?? null,
		})),
		treatmentPlanItemSchema,
		"treatmentPlanItems",
		report,
	);

	// ── Платежи ───────────────────────────────────────────────────────────────
	const paymentRecords = collect<Payment>(
		paymentRows.map((payment) => ({
			id: payment.id,
			organizationId: payment.organizationId,
			patientId: payment.patientId,
			visitId: payment.visitId ?? null,
			documentId: payment.documentId ?? null,
			amountRub: payment.amountRub,
			method: payment.method,
			status: payment.status,
			paidAt: iso(payment.paidAt),
			createdAt: isoOrNow(payment.createdAt),
			fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
			fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
			fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
			fiscalReceipt: payment.fiscalReceipt ?? null,
			clientMutationId: payment.clientMutationId ?? null,
			payerFullName: payment.payerFullName ?? null,
			payerInn: payment.payerInn ?? null,
			payerBirthDate: payment.payerBirthDate ?? null,
			payerIdentityDocument: payment.payerIdentityDocument ?? null,
			payerRelationship: payment.payerRelationship ?? null,
			taxDeductionCode:
				payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2"
					? payment.taxDeductionCode
					: null,
			note: payment.note ?? null,
		})),
		paymentSchema,
		"payments",
		report,
	);

	// ── Документы ─────────────────────────────────────────────────────────────
	const documentRecords = collect<GeneratedDocument>(
		documentRows.map((document) => ({
			id: document.id,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId ?? null,
			kind: document.kind,
			title: document.title,
			status: document.status,
			issuedAt: iso(document.issuedAt),
			totalAmountRub: document.totalAmountRub ?? null,
			taxYear: document.taxYear ?? null,
			taxPayerInn: document.taxPayerInn ?? null,
			taxPaymentSnapshot: parseJsonObject(document.taxPaymentSnapshotJson, null),
			payload: parseJsonObject(document.payloadJson, null),
			signatureAttestation: document.signatureAttestation ?? null,
			voidAttestation: document.voidAttestation ?? null,
			releaseJournalEntry: document.releaseJournalEntry ?? null,
			taxXmlSourceSnapshot: document.taxXmlSourceSnapshot ?? null,
			taxXmlSnapshot: document.taxXmlSnapshot ?? null,
			storagePath: document.storagePath ?? null,
			issuedSnapshotSha256: document.issuedSnapshotSha256 ?? null,
			issuedSnapshotCreatedAt: iso(document.issuedSnapshotCreatedAt),
			issuedByUserId: document.issuedByUserId ?? null,
			voidedAt: iso(document.voidedAt),
			voidedByUserId: document.voidedByUserId ?? null,
		})),
		generatedDocumentSchema,
		"documents",
		report,
	);

	// ── Задачи и события коммуникаций ─────────────────────────────────────────
	const taskRecords = collect<CommunicationTask>(
		taskRows.map((task) => ({
			id: task.id,
			organizationId: task.organizationId,
			patientId: task.patientId,
			appointmentId: task.appointmentId ?? null,
			visitId: task.visitId ?? null,
			documentId: task.documentId ?? null,
			assignedRole: staffRoleSchema.catch("administrator").parse(task.assignedRole),
			channel: task.channel,
			intent: task.intent,
			status: task.status,
			priority: task.priority,
			dueAt: isoOrNow(task.dueAt),
			title: task.title,
			body: task.body,
			workflowCode: task.workflowCode ?? null,
			lastEventAt: iso(task.lastEventAt),
			createdAt: isoOrNow(task.createdAt),
		})),
		communicationTaskSchema,
		"communicationTasks",
		report,
	);
	const eventRecords = collect<CommunicationEvent>(
		eventRows.map((event) => ({
			id: event.id,
			organizationId: event.organizationId,
			taskId: event.taskId ?? null,
			patientId: event.patientId,
			actorUserId: event.actorUserId ?? null,
			channel: event.channel,
			direction: event.direction,
			status: event.status,
			message: event.message,
			createdAt: isoOrNow(event.createdAt),
		})),
		communicationEventSchema,
		"communicationEvents",
		report,
	);

	// ── Снимки ────────────────────────────────────────────────────────────────
	// БЫЛО: previewUrl и viewerUrl всегда null. previewUrl в контракте —
	// обязательная строка, поэтому ни один снимок не проходил проверку и
	// вкладка «Снимки» оставалась пустой даже при заполненной базе.
	const imagingRecords = collect<ImagingStudy>(
		imagingRows.map((study) => ({
			id: study.id,
			organizationId: study.organizationId,
			patientId: study.patientId,
			visitId: study.visitId ?? null,
			kind: study.kind,
			title: study.title,
			toothCode: study.toothCode ?? null,
			region: study.region ?? null,
			capturedAt: isoOrNow(study.capturedAt),
			sourceKind: study.sourceKind,
			sourceName: study.sourceName,
			storagePath: study.storagePath ?? null,
			dicomStudyUid: study.dicomStudyUid ?? null,
			status: study.status,
			aiSummary: study.aiSummary ?? null,
			/*
			 * Второе место, где строится ссылка на снимок, — именно оно питает
			 * дашборд. Правило то же, что в db/imagingQuery.ts: настоящий файл,
			 * когда браузер способен его показать, иначе заглушка. Держать оба
			 * места в одном правиле обязательно, иначе экран снова покажет
			 * нарисованную челюсть вместо рентгена.
			 */
			previewUrl: browserRenderableImageMimeType(study.storagePath)
				? `/api/imaging/studies/${study.id}/file`
				: `/api/imaging/studies/${study.id}/preview.svg`,
			viewerUrl: browserRenderableImageMimeType(study.storagePath)
				? `/api/imaging/studies/${study.id}/file`
				: `/api/imaging/studies/${study.id}/preview.svg`,
		})),
		imagingStudySchema,
		"imagingStudies",
		report,
	);

	// ── Прайс ─────────────────────────────────────────────────────────────────
	const serviceRecords = collect<ServiceCatalogItem>(
		serviceRows.map((service) => ({
			id: service.id,
			organizationId: service.organizationId,
			code: service.code ?? "",
			title: service.title,
			aliases: [],
			category: service.category,
			specialty: service.specialty,
			// base_price_rub — numeric, драйвер отдаёт строку вида "1200.00".
			basePriceRub: Math.max(0, Math.round(Number(service.basePriceRub) || 0)),
			durationMinutes: Math.max(1, service.durationMinutes),
			taxDeductible: service.taxDeductible,
			active: service.active,
		})),
		serviceCatalogItemSchema,
		"serviceCatalog",
		report,
	);

	// ── Клинические правила ───────────────────────────────────────────────────
	const ruleRecords = collect<ClinicalRule>(
		ruleRows.map((rule) => ({
			id: rule.id,
			organizationId: rule.organizationId,
			title: rule.title,
			category: rule.category,
			specialty: rule.specialty,
			action: rule.action,
			severity: rule.severity,
			ownerRole: staffRoleSchema.catch("doctor").parse(rule.ownerRole),
			triggerServiceIds: parseJsonArray(rule.triggerServiceIdsJson),
			requiredServiceIds: parseJsonArray(rule.requiredServiceIdsJson),
			requiresCompletedServiceIds: parseJsonArray(rule.requiresCompletedServiceIdsJson),
			blockedServiceIds: parseJsonArray(rule.blockedServiceIdsJson),
			condition: rule.condition ?? null,
			warningText: rule.warningText,
			patientText: rule.patientText,
			active: rule.isActive,
		})),
		clinicalRuleSchema,
		"clinicalRules",
		report,
	);

	// ── Протоколы приёма ──────────────────────────────────────────────────────
	const protocolRecords = collect<ProtocolTemplate>(
		protocolRows.map((template) => ({
			id: template.id,
			organizationId: template.organizationId,
			specialty: template.specialty,
			title: template.title,
			visitReason: template.visitReason,
			defaultDurationMinutes: Math.max(1, template.defaultDurationMinutes),
			complaintPrompt: template.complaintPrompt,
			objectiveTemplate: template.objectiveTemplate,
			diagnosisHints: parseJsonArray(template.diagnosisHints),
			treatmentPlanTemplate: template.treatmentPlanTemplate,
			requiredDocuments: parseJsonArray(template.requiredDocuments),
			suggestedImaging: parseJsonArray(template.suggestedImaging),
			safetyWarnings: parseJsonArray(template.safetyWarnings),
			updatedAt: isoOrNow(template.updatedAt),
		})),
		protocolTemplateSchema,
		"protocolTemplates",
		report,
	);

	// ── Перенос в доменные коллекции ──────────────────────────────────────────
	// Только после того, как ВСЕ выборки прошли: при ошибке на середине состояние
	// осталось бы наполовину заменённым.
	replaceAll(staffMembers, staff);
	replaceAll(chairs, chairRecords);
	replaceAll(patients, patientRecords);
	replaceAll(appointments, appointmentRecords);
	replaceAll(treatmentPlanItems, treatmentRecords);
	replaceAll(payments, paymentRecords);
	replaceAll(documents, documentRecords);
	replaceAll(communicationTasks, taskRecords);
	replaceAll(communicationEvents, eventRecords);
	replaceAll(imagingStudies, imagingRecords);
	if (serviceRecords.length > 0) {
		replaceAll(serviceCatalog, serviceRecords);
		// Индекс прайса строится один раз при загрузке модуля. Если его не
		// перестроить, поиск услуги возвращал бы демонстрационную позицию с
		// другой ценой — и она попала бы в договор и в чек.
		serviceCatalogMap.clear();
		for (const service of serviceRecords) serviceCatalogMap.set(service.id, service);
	}
	if (ruleRecords.length > 0) replaceAll(clinicalRules, ruleRecords);
	if (protocolRecords.length > 0) replaceAll(protocolTemplates, protocolRecords);

	applyActiveVisit(organizationId, visitRecords);

	return report;
}

function replaceAll<T>(target: T[], source: T[]): void {
	target.splice(0, target.length, ...source);
}

/**
 * Текущий приём: последний незакрытый черновик клиники. Если черновиков нет —
 * пустая заготовка с нулевым идентификатором, чтобы карточка приёма открывалась
 * пустой, а не показывала чужой демонстрационный визит.
 */
function applyActiveVisit(organizationId: string, visitRecords: Visit[]): void {
	const draft = visitRecords
		.filter((visit) => visit.status === "draft")
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
	const latest =
		draft ??
		visitRecords.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

	const nowIso = new Date().toISOString();
	const next: Visit = latest ?? {
		id: NIL_UUID,
		organizationId,
		patientId: NIL_UUID,
		appointmentId: null,
		status: "draft",
		revision: 1,
		complaint: null,
		anamnesis: null,
		objectiveStatus: null,
		diagnosis: null,
		treatmentPlan: null,
		doctorSummary: null,
		createdAt: nowIso,
		updatedAt: nowIso,
	};
	Object.assign(activeVisit, next);
}

/** Последний приём пациента — нужен маршрутам, которые открывают карточку. */
export async function findLatestVisitIdForPatient(
	organizationId: string,
	patientId: string,
): Promise<string | null> {
	if (inMemoryMode()) return null;
	try {
		const rows = await db
			.select({ id: schema.visits.id })
			.from(schema.visits)
			.where(and(eq(schema.visits.organizationId, organizationId), eq(schema.visits.patientId, patientId)))
			.orderBy(desc(schema.visits.updatedAt))
			.limit(1);
		return rows[0]?.id ?? null;
	} catch {
		return null;
	}
}
