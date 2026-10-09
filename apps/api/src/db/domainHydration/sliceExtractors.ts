import {
	type Appointment,
	appointmentSchema,
	type Chair,
	type ClinicalRule,
	type CommunicationEvent,
	type CommunicationTask,
	chairSchema,
	clinicalRuleSchema,
	communicationEventSchema,
	communicationTaskSchema,
	dentalSpecialtySchema,
	type GeneratedDocument,
	generatedDocumentSchema,
	type ImagingStudy,
	imagingStudySchema,
	type Patient,
	type Payment,
	type ProtocolTemplate,
	patientSchema,
	paymentSchema,
	protocolTemplateSchema,
	type StaffMember,
	staffMemberSchema,
	staffRoleSchema,
	type TreatmentPlanItem,
	treatmentPlanItemSchema,
	type Visit,
	visitSchema,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import { browserRenderableImageMimeType } from "../../imaging/previewFormats.js";
import { staffAuthorityFlags } from "../../security/permissions.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { projectVisitRow } from "../visitsProjection.js";
import type { DomainStateHydrationReport } from "./types.js";

export function iso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Время, которое база отдала нечитаемым, — это НЕ «сейчас».
 */
export function reportUnreadableTime(
	table: string,
	rowId: string,
	column: string,
	value: Date | string | null | undefined,
	report: DomainStateHydrationReport,
): void {
	const shown =
		value === null
			? "NULL"
			: value === undefined
				? "колонки нет в строке"
				: `«${String(value)}»`;
	console.error(
		`[domainStateHydration] ${table} ${rowId} (клиника ${report.organizationId}): ` +
			`колонка ${column} прочитана как ${shown} — время неизвестно. Строка НЕ переносится в рабочее ` +
			"состояние клиники. Подставить сюда часы сервера значило бы передвинуть запись на момент " +
			"открытия страницы: приём попал бы в расписание на сейчас, платёж — в кассовый отчёт за сегодня. " +
			"Исправьте значение в базе, после чего строка вернётся сама.",
	);
	report.warnings.push(
		`${table} ${rowId}: колонка ${column} не читается как время (${shown}). Строка пропущена — ` +
			"её время неизвестно, а текущее время вместо него было бы выдумкой.",
	);
}

/**
 * Время строки или `null` с записью причины в журнал. Ни при каких условиях — не
 * текущие часы; разбор в докстринге `reportUnreadableTime` выше.
 */
export function isoOrSkipRow(
	value: Date | string | null | undefined,
	table: string,
	rowId: string,
	column: string,
	report: DomainStateHydrationReport,
): string | null {
	const parsed = iso(value);
	if (parsed !== null) return parsed;
	reportUnreadableTime(table, rowId, column, value, report);
	return null;
}

export function parseJsonArray(value: unknown): string[] {
	if (Array.isArray(value))
		return value.filter((entry): entry is string => typeof entry === "string");
	if (typeof value !== "string" || !value.trim()) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((entry): entry is string => typeof entry === "string")
			: [];
	} catch {
		// Не JSON — трактуем как список через запятую (так хранятся chairs.specializations).
		return value
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
}

export function parseJsonObject<T>(value: unknown, fallback: T): T {
	if (value && typeof value === "object") return value as T;
	if (typeof value !== "string" || !value.trim()) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/**
 * Проверяет строки по контракту и возвращает только валидные,
 * попутно считая отброшенные.
 */
export function collect<T>(
	rows: unknown[],
	validator: {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		safeParse: (input: unknown) => { success: boolean; data?: any };
	},
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

/**
 * Читает один срез клиники.
 */
export async function selectByOrganization<T>(
	// biome-ignore lint/suspicious/noExplicitAny: drizzle-таблицы типизируются по-разному
	table: any,
	organizationId: string,
	label: string,
	report: DomainStateHydrationReport,
): Promise<T[]> {
	try {
		return (await db
			.select()
			.from(table)
			.where(eq(table.organizationId, organizationId))) as T[];
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report.unavailable.push({ slice: label, message });
		report.warnings.push(
			`${label}: не удалось прочитать из базы (${message}).`,
		);
		console.error(
			`[DomainStateHydration] Срез "${label}" клиники ${organizationId} не прочитан:`,
			error,
		);
		return [];
	}
}

export function extractStaff(
	userRows: Array<typeof schema.users.$inferSelect>,
	report: DomainStateHydrationReport,
): StaffMember[] {
	return collect<StaffMember>(
		userRows.map((user) => ({
			id: user.id,
			organizationId: user.organizationId,
			fullName: user.fullName,
			role: staffRoleSchema.catch("doctor").parse(user.role),
			specialties: parseJsonArray(user.specialties)
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.filter((result) => result.success)
				.map((result) => result.data),
			phone: user.phone ?? null,
			email: user.email ?? null,
			active: user.isActive,
			...staffAuthorityFlags(user.role),
			color: "#1e293b",
			workingHours: user.workingHours ?? null,
			createdAt: isoOrSkipRow(
				user.createdAt,
				"users",
				user.id,
				"created_at",
				report,
			),
			updatedAt: isoOrSkipRow(
				user.createdAt,
				"users",
				user.id,
				"created_at",
				report,
			),
		})),
		staffMemberSchema,
		"staff",
		report,
	);
}

export function extractChairs(
	chairRows: Array<typeof schema.chairs.$inferSelect>,
	report: DomainStateHydrationReport,
): Chair[] {
	const equipmentOf = (value: string | null): string[] =>
		parseJsonArray(value).map((entry) => entry.toLowerCase());
	return collect<Chair>(
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
				hasXraySensor: equipment.some(
					(entry) => entry.includes("rvg") || entry.includes("рентген"),
				),
				hasMicroscope: equipment.some(
					(entry) =>
						entry.includes("microscope") || entry.includes("микроскоп"),
				),
				hasSurgeryKit: equipment.some(
					(entry) => entry.includes("surgery") || entry.includes("хирург"),
				),
				notes: null,
				workingHours: chair.workingHours ?? null,
			};
		}),
		chairSchema,
		"chairs",
		report,
	);
}

export function extractPatients(
	patientRows: Array<typeof schema.patients.$inferSelect>,
	paymentRows: Array<typeof schema.payments.$inferSelect>,
	treatmentItemRows: Array<typeof schema.treatmentItems.$inferSelect>,
	report: DomainStateHydrationReport,
): Patient[] {
	const paidByPatient = new Map<string, number>();
	for (const payment of paymentRows) {
		if (payment.status !== "paid") continue;
		paidByPatient.set(
			payment.patientId,
			(paidByPatient.get(payment.patientId) ?? 0) + payment.amountRub,
		);
	}
	const plannedByPatient = new Map<string, number>();
	for (const item of treatmentItemRows) {
		if (item.status === "cancelled") continue;
		const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
		const lineTotal = Math.max(
			0,
			item.unitPriceRub * quantity - item.discountRub,
		);
		plannedByPatient.set(
			item.patientId,
			(plannedByPatient.get(item.patientId) ?? 0) + lineTotal,
		);
	}
	return collect<Patient>(
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
			familyGroupId: patient.familyGroupId ?? null,
			mergedIntoPatientId: patient.mergedIntoPatientId ?? null,
			balanceRub: Math.round(
				(paidByPatient.get(patient.id) ?? 0) -
					(plannedByPatient.get(patient.id) ?? 0),
			),
			createdAt: isoOrSkipRow(
				patient.createdAt,
				"patients",
				patient.id,
				"created_at",
				report,
			),
			updatedAt: isoOrSkipRow(
				patient.updatedAt,
				"patients",
				patient.id,
				"updated_at",
				report,
			),
		})),
		patientSchema,
		"patients",
		report,
	);
}

export function extractAppointments(
	appointmentRows: Array<typeof schema.appointments.$inferSelect>,
	report: DomainStateHydrationReport,
): Appointment[] {
	return collect<Appointment>(
		appointmentRows.map((appointment) => ({
			id: appointment.id,
			organizationId: appointment.organizationId,
			patientId: appointment.patientId,
			doctorUserId: appointment.doctorUserId,
			assistantUserId: appointment.assistantUserId ?? null,
			chairId: appointment.chairId,
			status: appointment.status,
			startsAt: isoOrSkipRow(
				appointment.startsAt,
				"appointments",
				appointment.id,
				"starts_at",
				report,
			),
			endsAt: isoOrSkipRow(
				appointment.endsAt,
				"appointments",
				appointment.id,
				"ends_at",
				report,
			),
			reason: appointment.reason ?? null,
			comment: appointment.comment ?? null,
		})),
		appointmentSchema,
		"appointments",
		report,
	);
}

export function extractVisits(
	visitRows: Array<typeof schema.visits.$inferSelect>,
	report: DomainStateHydrationReport,
): Visit[] {
	return collect<Visit>(
		visitRows.map(projectVisitRow),
		visitSchema,
		"visits",
		report,
	);
}

export function extractTreatmentItems(
	treatmentItemRows: Array<typeof schema.treatmentItems.$inferSelect>,
	report: DomainStateHydrationReport,
): TreatmentPlanItem[] {
	return collect<TreatmentPlanItem>(
		treatmentItemRows.map((item) => ({
			id: item.id,
			organizationId: item.organizationId,
			patientId: item.patientId,
			visitId: item.visitId ?? null,
			serviceId: item.serviceId ?? "",
			snapshotServiceName: item.title,
			snapshotServiceCategory: null,
			toothCode: item.toothCode ?? null,
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
}

export function extractPayments(
	paymentRows: Array<typeof schema.payments.$inferSelect>,
	report: DomainStateHydrationReport,
): Payment[] {
	return collect<Payment>(
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
			createdAt: isoOrSkipRow(
				payment.createdAt,
				"payments",
				payment.id,
				"created_at",
				report,
			),
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
}

export function extractDocuments(
	documentRows: Array<typeof schema.generatedDocuments.$inferSelect>,
	report: DomainStateHydrationReport,
): GeneratedDocument[] {
	return collect<GeneratedDocument>(
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
			taxPaymentSnapshot: parseJsonObject(
				document.taxPaymentSnapshotJson,
				null,
			),
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
}

export function extractCommunicationTasks(
	taskRows: Array<typeof schema.communicationTasks.$inferSelect>,
	report: DomainStateHydrationReport,
): CommunicationTask[] {
	return collect<CommunicationTask>(
		taskRows.map((task) => ({
			id: task.id,
			organizationId: task.organizationId,
			patientId: task.patientId,
			appointmentId: task.appointmentId ?? null,
			visitId: task.visitId ?? null,
			documentId: task.documentId ?? null,
			assignedRole: staffRoleSchema
				.catch("administrator")
				.parse(task.assignedRole),
			channel: task.channel,
			intent: task.intent,
			status: task.status,
			priority: task.priority,
			dueAt: isoOrSkipRow(
				task.dueAt,
				"communication_tasks",
				task.id,
				"due_at",
				report,
			),
			title: task.title,
			body: task.body,
			workflowCode: task.workflowCode ?? null,
			lastEventAt: iso(task.lastEventAt),
			createdAt: isoOrSkipRow(
				task.createdAt,
				"communication_tasks",
				task.id,
				"created_at",
				report,
			),
		})),
		communicationTaskSchema,
		"communicationTasks",
		report,
	);
}

export function extractCommunicationEvents(
	eventRows: Array<typeof schema.communicationEvents.$inferSelect>,
	report: DomainStateHydrationReport,
): CommunicationEvent[] {
	return collect<CommunicationEvent>(
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
			createdAt: isoOrSkipRow(
				event.createdAt,
				"communication_events",
				event.id,
				"created_at",
				report,
			),
		})),
		communicationEventSchema,
		"communicationEvents",
		report,
	);
}

export function extractImagingStudies(
	imagingRows: Array<typeof schema.imagingStudies.$inferSelect>,
	report: DomainStateHydrationReport,
): ImagingStudy[] {
	return collect<ImagingStudy>(
		imagingRows.map((study) => ({
			id: study.id,
			organizationId: study.organizationId,
			patientId: study.patientId,
			visitId: study.visitId ?? null,
			kind: study.kind,
			title: study.title,
			toothCode: study.toothCode ?? null,
			region: study.region ?? null,
			capturedAt: isoOrSkipRow(
				study.capturedAt,
				"imaging_studies",
				study.id,
				"captured_at",
				report,
			),
			sourceKind: study.sourceKind,
			sourceName: study.sourceName,
			storagePath: study.storagePath ?? null,
			dicomStudyUid: study.dicomStudyUid ?? null,
			status: study.status,
			aiSummary: study.aiSummary ?? null,
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
}

export function extractClinicalRules(
	ruleRows: Array<typeof schema.clinicalRules.$inferSelect>,
	report: DomainStateHydrationReport,
): ClinicalRule[] {
	return collect<ClinicalRule>(
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
			requiresCompletedServiceIds: parseJsonArray(
				rule.requiresCompletedServiceIdsJson,
			),
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
}

export function extractProtocolTemplates(
	protocolRows: Array<typeof schema.protocolTemplates.$inferSelect>,
	report: DomainStateHydrationReport,
): ProtocolTemplate[] {
	return collect<ProtocolTemplate>(
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
			updatedAt: isoOrSkipRow(
				template.updatedAt,
				"protocol_templates",
				template.id,
				"updated_at",
				report,
			),
		})),
		protocolTemplateSchema,
		"protocolTemplates",
		report,
	);
}
