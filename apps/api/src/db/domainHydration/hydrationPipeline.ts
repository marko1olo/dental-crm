/**
 * hydrationPipeline.ts — Канонический фасад пайплайна гидратации доменного состояния (Layer 5 Facade).
 * Декомпозирован в `./hydrationModules/` (hydrationPipelineTypes, hydrationDependencyGraph, hydrationQueryExecutor).
 * Строго соблюдает инвариант <= 250 строк.
 */

import { and, desc, eq } from "drizzle-orm";
import { inMemoryDomainState } from "../../sampleData.js";
import { db } from "../client.js";
import {
	projectServiceCatalogRows,
	SERVICE_CATALOG_EMPTY_MESSAGE,
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
} from "./sliceExtractors.js";
import { assertCriticalSlicesAvailable } from "./sliceValidators.js";
import type {
	DomainState,
	DomainStateHydrationReport,
	HydratedDomainState,
	HydrationOptions,
} from "./types.js";
import {
	applyActiveVisit,
	buildClinicProfile,
	emptyDomainState,
	NIL_UUID,
	NO_VISIT_TIMESTAMP,
	noVisitSkeleton,
	UNREADABLE_TIME_MARKER,
} from "./hydrationModules/hydrationPipelineTypes.js";
import { executeHydrationQueries } from "./hydrationModules/hydrationQueryExecutor.js";

export {
	NIL_UUID,
	NO_VISIT_TIMESTAMP,
	UNREADABLE_TIME_MARKER,
	noVisitSkeleton,
	applyActiveVisit,
	emptyDomainState,
};

export async function hydrateFromDatabase(
	organizationId: string,
	report: DomainStateHydrationReport,
): Promise<HydratedDomainState> {
	const slices = await executeHydrationQueries(organizationId, report);

	if (!slices.organization) {
		report.organizationFound = false;
		report.warnings.push(
			"Организация сессии не найдена в базе: данные клиники не читались и ответ отдавать нельзя. " +
				"Так бывает, когда база пересоздана, а ключ входа выдан для прежней или для другой установки программы.",
		);
		return { state: emptyDomainState(organizationId), report };
	}

	const clinicProfile = buildClinicProfile(
		slices.organization,
		slices.clinic,
		report,
	);

	// ── Экстракция срезов ────────────────────────────────────────────────────
	const staff = extractStaff(slices.userRows, report);
	const chairRecords = extractChairs(slices.chairRows, report);
	const patientRecords = extractPatients(
		slices.patientRows,
		slices.paymentRows,
		slices.treatmentItemRows,
		report,
	);
	const appointmentRecords = extractAppointments(
		slices.appointmentRows,
		report,
		slices.labOrderRows,
	);
	const visitRecords = extractVisits(slices.visitRows, report);
	const treatmentRecords = extractTreatmentItems(slices.treatmentItemRows, report);
	const paymentRecords = extractPayments(slices.paymentRows, report);
	const documentRecords = extractDocuments(slices.documentRows, report);
	const taskRecords = extractCommunicationTasks(slices.taskRows, report);
	const eventRecords = extractCommunicationEvents(slices.eventRows, report);
	const imagingRecords = extractImagingStudies(slices.imagingRows, report);

	// ── Прайс ─────────────────────────────────────────────────────────────────
	const serviceProjection = projectServiceCatalogRows(slices.serviceRows);
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

	const ruleRecords = extractClinicalRules(slices.ruleRows, report);
	const protocolRecords = extractProtocolTemplates(slices.protocolRows, report);
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
