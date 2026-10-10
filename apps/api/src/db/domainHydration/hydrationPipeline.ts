import {
	clinicModeSchema,
	DEMO_SHOWCASE_ORG_ID,
	type Visit,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import {
	inMemoryDomainState,
	validScheduleTimeZone,
} from "../../sampleData.js";
import { db } from "../client.js";
import {
	projectServiceCatalogRows,
	SERVICE_CATALOG_EMPTY_MESSAGE,
	type ServiceCatalogRow,
} from "../pricelistQuery.js";
import { withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import {
	extractAppointments,
	extractChairs,
	extractClinicalRules,
	extractCommunicationEvents,
	extractCommunicationTasks,
	extractDocuments,
	extractImagingStudies,
	extractPatients,
	extractPayments,
	extractProtocolTemplates,
	extractStaff,
	extractTreatmentItems,
	extractVisits,
	iso,
	reportUnreadableTime,
	selectByOrganization,
} from "./sliceExtractors.js";
import { assertCriticalSlicesAvailable } from "./sliceValidators.js";
import type {
	DomainState,
	DomainStateHydrationReport,
	HydratedDomainState,
	HydrationOptions,
} from "./types.js";

/**
 * ОБЪЯВЛЕННАЯ МЕТКА «ПРИЁМА НЕТ», А НЕ ПРОСТО КОНСТАНТА.
 */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Время в заготовке «приёма нет». Постоянная величина, а НЕ `new Date()`.
 */
export const NO_VISIT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

/**
 * ОБЪЯВЛЕННАЯ МЕТКА «ВРЕМЯ ЭТОЙ СТРОКИ НЕИЗВЕСТНО».
 */
export const UNREADABLE_TIME_MARKER = "1970-01-01T00:00:00.000Z";

export function noVisitSkeleton(organizationId: string): Visit {
	return {
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
		createdAt: NO_VISIT_TIMESTAMP,
		updatedAt: NO_VISIT_TIMESTAMP,
	};
}

export function applyActiveVisit(
	organizationId: string,
	visitRecords: Visit[],
): Visit {
	const draft = visitRecords
		.filter((visit) => visit.status === "draft")
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
	const latest =
		draft ??
		visitRecords
			.slice()
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

	return latest ?? noVisitSkeleton(organizationId);
}

export function emptyDomainState(organizationId: string): DomainState {
	return {
		clinicProfile: { ...inMemoryDomainState.clinicProfile, organizationId },
		staffMembers: [],
		chairs: [],
		patients: [],
		appointments: [],
		activeVisit: noVisitSkeleton(organizationId),
		documents: [],
		serviceCatalog: [],
		treatmentPlanItems: [],
		treatmentPlanScenarios: [],
		clinicalRules: [],
		payments: [],
		communicationTemplates: [],
		communicationTasks: [],
		communicationEvents: [],
		imagingStudies: [],
		aiRecognitionJobs: [],
		importBatches: [],
		protocolTemplates: [],
		auditEvents: [],
		unavailableSlices: [],
	};
}

export async function hydrateFromDatabase(
	organizationId: string,
	report: DomainStateHydrationReport,
): Promise<HydratedDomainState> {
	let organizationRows = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);

	if (organizationRows.length === 0 && organizationId === DEMO_SHOWCASE_ORG_ID) {
		const { ensureDemoShowcaseTenant } = await import(
			"../../services/demo/deepDemoSeeder.js"
		);
		await ensureDemoShowcaseTenant();
		organizationRows = await db
			.select()
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
	}

	const clinicRows = await selectByOrganization<
		typeof schema.clinics.$inferSelect
	>(schema.clinics, organizationId, "clinics", report);
	const userRows = await selectByOrganization<typeof schema.users.$inferSelect>(
		schema.users,
		organizationId,
		"users",
		report,
	);
	const chairRows = await selectByOrganization<
		typeof schema.chairs.$inferSelect
	>(schema.chairs, organizationId, "chairs", report);
	const patientRows = await selectByOrganization<
		typeof schema.patients.$inferSelect
	>(schema.patients, organizationId, "patients", report);
	const appointmentRows = await selectByOrganization<
		typeof schema.appointments.$inferSelect
	>(schema.appointments, organizationId, "appointments", report);
	const visitRows = await selectByOrganization<
		typeof schema.visits.$inferSelect
	>(schema.visits, organizationId, "visits", report);
	const treatmentItemRows = await selectByOrganization<
		typeof schema.treatmentItems.$inferSelect
	>(schema.treatmentItems, organizationId, "treatmentItems", report);
	const paymentRows = await selectByOrganization<
		typeof schema.payments.$inferSelect
	>(schema.payments, organizationId, "payments", report);
	const documentRows = await selectByOrganization<
		typeof schema.generatedDocuments.$inferSelect
	>(schema.generatedDocuments, organizationId, "documents", report);
	let taskRows = await selectByOrganization<
		typeof schema.communicationTasks.$inferSelect
	>(schema.communicationTasks, organizationId, "communicationTasks", report);
	let eventRows = await selectByOrganization<
		typeof schema.communicationEvents.$inferSelect
	>(schema.communicationEvents, organizationId, "communicationEvents", report);

	if (
		organizationId === DEMO_SHOWCASE_ORG_ID &&
		taskRows.length === 0 &&
		patientRows.length > 0
	) {
		try {
			const now = new Date();
			const dueSoon = new Date(now.getTime() + 90 * 60_000);
			const dueLater = new Date(now.getTime() + 180 * 60_000);
			const clinicId = clinicRows[0]?.id ?? null;
			const p0 = patientRows[0]!;
			const p1 = patientRows[1] ?? p0;
			const p2 = patientRows[2] ?? p0;
			const p3 = patientRows[3] ?? p0;

			await db.insert(schema.communicationTasks).values([
				{
					organizationId,
					clinicId,
					botConfigId: "default",
					patientId: p1.id,
					appointmentId: appointmentRows[1]?.id ?? null,
					assignedRole: "administrator",
					channel: "whatsapp",
					intent: "appointment_confirmation",
					status: "queued",
					priority: "high",
					dueAt: dueSoon,
					title: `Подтверждение приёма — ${p1.fullName}`,
					body: "Эндодонтия зуба 36 под микроскопом (Д-р Соколов А. В.). Уточнить готовность к приёму и напомнить о 15-минутном запасе времени.",
				},
				{
					organizationId,
					clinicId,
					botConfigId: "default",
					patientId: p0.id,
					appointmentId: appointmentRows[0]?.id ?? null,
					assignedRole: "administrator",
					channel: "telegram",
					intent: "post_visit_instruction",
					status: "queued",
					priority: "normal",
					dueAt: dueLater,
					title: `Памятка после лечения — ${p0.fullName}`,
					body: "Отправить рекомендации после реставрации глубокого кариеса зуба 16 и согласовать дату контрольного осмотра.",
				},
				{
					organizationId,
					clinicId,
					botConfigId: "default",
					patientId: p2.id,
					appointmentId: appointmentRows[2]?.id ?? null,
					assignedRole: "administrator",
					channel: "whatsapp",
					intent: "recall",
					status: "scheduled",
					priority: "normal",
					dueAt: dueLater,
					title: `Плановый контроль ортодонта — ${p2.fullName}`,
					body: "Напомнить о выдаче следующего комплекта элайнеров Spark (этап 8/24) у ортодонта Д-ра Морозовой Е. И.",
				},
			]);

			if (eventRows.length === 0) {
				await db.insert(schema.communicationEvents).values([
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p2.id,
						channel: "telegram",
						direction: "outbound",
						status: "delivered",
						message: `Напоминание о приёме в 14:00 к ортодонту Д-ру Морозовой Е. И. доставлено (${p2.fullName}).`,
					},
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p2.id,
						channel: "telegram",
						direction: "inbound",
						status: "delivered",
						message: `Ответ пациента (${p2.fullName}): «Спасибо, приём подтверждаю, буду вовремя».`,
					},
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p3.id,
						channel: "whatsapp",
						direction: "outbound",
						status: "delivered",
						message: `Отправлена памятка перед хирургической консультацией и КЛКТ (${p3.fullName}).`,
					},
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p0.id,
						channel: "sms",
						direction: "outbound",
						status: "sent",
						message: `Сервисное уведомление о завершении приёма и гарантийном талоне отправлено (${p0.fullName}).`,
					},
				]);
			}

			taskRows = await selectByOrganization<
				typeof schema.communicationTasks.$inferSelect
			>(schema.communicationTasks, organizationId, "communicationTasks", report);
			eventRows = await selectByOrganization<
				typeof schema.communicationEvents.$inferSelect
			>(schema.communicationEvents, organizationId, "communicationEvents", report);
		} catch (seedErr) {
			console.warn("[DashboardHydration] Demo communications seed skipped:", seedErr);
		}
	}
	const imagingRows = await selectByOrganization<
		typeof schema.imagingStudies.$inferSelect
	>(schema.imagingStudies, organizationId, "imagingStudies", report);
	const serviceRows = await selectByOrganization<ServiceCatalogRow>(
		schema.serviceCatalogItems,
		organizationId,
		"serviceCatalog",
		report,
	);
	const ruleRows = await selectByOrganization<
		typeof schema.clinicalRules.$inferSelect
	>(schema.clinicalRules, organizationId, "clinicalRules", report);
	const protocolRows = await selectByOrganization<
		typeof schema.protocolTemplates.$inferSelect
	>(schema.protocolTemplates, organizationId, "protocolTemplates", report);

	const organization = organizationRows[0];
	const clinic = clinicRows[0];

	if (!organization) {
		report.organizationFound = false;
		report.warnings.push(
			"Организация сессии не найдена в базе: данные клиники не читались и ответ отдавать нельзя. " +
				"Так бывает, когда база пересоздана, а ключ входа выдан для прежней или для другой установки программы.",
		);
		return { state: emptyDomainState(organizationId), report };
	}

	// ── Профиль клиники ───────────────────────────────────────────────────────
	const clinicProfile: DomainState["clinicProfile"] = {
		...inMemoryDomainState.clinicProfile,
	};
	{
		clinicProfile.organizationId = organization.id;
		clinicProfile.clinicName = organization.name;
		clinicProfile.legalName = organization.name;
		clinicProfile.inn = organization.inn ?? null;
		clinicProfile.kpp = organization.kpp ?? null;
		clinicProfile.ogrn = organization.ogrn ?? null;
		clinicProfile.address =
			clinic?.address ?? organization.legalAddress ?? null;
		clinicProfile.phone = clinic?.phone ?? null;
		clinicProfile.email = organization.email ?? null;
		clinicProfile.website = organization.website ?? null;
		clinicProfile.medicalLicenseNumber =
			organization.medicalLicenseNumber ?? null;
		clinicProfile.medicalLicenseIssuedAt =
			organization.medicalLicenseIssuedAt ?? null;
		clinicProfile.medicalLicenseIssuer =
			organization.medicalLicenseIssuer ?? null;
		clinicProfile.bankDetails = organization.bankDetails ?? null;
		clinicProfile.signatoryName = organization.signatoryName ?? null;
		clinicProfile.signatoryTitle = organization.signatoryTitle ?? null;
		clinicProfile.mode = clinicModeSchema
			.catch("one_chair")
			.parse(organization.clinicMode);
		clinicProfile.timezone = validScheduleTimeZone(clinic?.timezone);

		const organizationUpdatedAt = iso(organization.updatedAt);
		if (organizationUpdatedAt === null) {
			reportUnreadableTime(
				"organizations",
				organization.id,
				"updated_at",
				organization.updatedAt,
				report,
			);
		}
		clinicProfile.updatedAt = organizationUpdatedAt ?? UNREADABLE_TIME_MARKER;
		report.counts.clinicProfile = 1;
	}

	// ── Экстракция срезов ────────────────────────────────────────────────────
	const staff = extractStaff(userRows, report);
	const chairRecords = extractChairs(chairRows, report);
	const patientRecords = extractPatients(
		patientRows,
		paymentRows,
		treatmentItemRows,
		report,
	);
	const appointmentRecords = extractAppointments(appointmentRows, report);
	const visitRecords = extractVisits(visitRows, report);
	const treatmentRecords = extractTreatmentItems(treatmentItemRows, report);
	const paymentRecords = extractPayments(paymentRows, report);
	const documentRecords = extractDocuments(documentRows, report);
	const taskRecords = extractCommunicationTasks(taskRows, report);
	const eventRecords = extractCommunicationEvents(eventRows, report);
	const imagingRecords = extractImagingStudies(imagingRows, report);

	// ── Прайс ─────────────────────────────────────────────────────────────────
	const serviceProjection = projectServiceCatalogRows(serviceRows);
	const serviceRecords = serviceProjection.items;
	report.counts.serviceCatalog = serviceRecords.length;
	if (serviceProjection.rejected.length > 0) {
		report.skipped.serviceCatalog = serviceProjection.rejected.length;
		for (const rejectedRow of serviceProjection.rejected) {
			report.warnings.push(
				`Прайс: услуга «${rejectedRow.title}» (код ${rejectedRow.code}) не принята — ${rejectedRow.reason}. ` +
					"Пока строка не исправлена, услугу не покажет ни один экран и не посчитает ни один документ.",
			);
		}
	}

	const ruleRecords = extractClinicalRules(ruleRows, report);
	const protocolRecords = extractProtocolTemplates(protocolRows, report);
	const activeVisit = applyActiveVisit(organizationId, visitRecords);

	// ── Критические срезы — отказ, если сорвались ─────────────────────────────
	assertCriticalSlicesAvailable(report);

	const state: DomainState = {
		clinicProfile,
		staffMembers: staff,
		chairs: chairRecords,
		patients: patientRecords,
		appointments: appointmentRecords,
		activeVisit,
		documents: documentRecords,
		serviceCatalog: serviceRecords,
		treatmentPlanItems: treatmentRecords,
		treatmentPlanScenarios: [],
		clinicalRules: ruleRecords,
		payments: paymentRecords,
		communicationTemplates: [],
		communicationTasks: taskRecords,
		communicationEvents: eventRecords,
		imagingStudies: imagingRecords,
		aiRecognitionJobs: [],
		importBatches: [],
		protocolTemplates: protocolRecords,
		auditEvents: [],
		unavailableSlices: report.unavailable.map((entry) => entry.slice),
	};

	if (serviceRecords.length === 0) {
		report.warnings.push(SERVICE_CATALOG_EMPTY_MESSAGE);
	}

	return { state, report };
}

export async function hydrateDomainStateFromDb(
	organizationId: string,
	options?: HydrationOptions,
): Promise<HydratedDomainState> {
	const isInMemory = Boolean(options?.isInMemory);
	const report: DomainStateHydrationReport = {
		organizationId,
		mode: isInMemory ? "in_memory" : "database",
		organizationFound: true,
		counts: {},
		skipped: {},
		warnings: [],
		unavailable: [],
	};
	if (report.mode === "in_memory") {
		return { state: inMemoryDomainState, report };
	}
	return withTenantCtx(organizationId, async () => {
		return hydrateFromDatabase(organizationId, report);
	});
}

export async function _withHydratedDomainState<T>(
	organizationId: string,
	use: (
		state: DomainState,
		report: DomainStateHydrationReport,
	) => T | Promise<T>,
	options?: HydrationOptions,
): Promise<T> {
	const { state, report } = await hydrateDomainStateFromDb(
		organizationId,
		options,
	);
	return use(state, report);
}

export async function _findLatestVisitIdForPatient(
	organizationId: string,
	patientId: string,
	options?: HydrationOptions,
): Promise<string | null> {
	if (options?.isInMemory) return null;
	const rows = await db
		.select({ id: schema.visits.id })
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.patientId, patientId),
			),
		)
		.orderBy(desc(schema.visits.updatedAt))
		.limit(1);
	return rows[0]?.id ?? null;
}
