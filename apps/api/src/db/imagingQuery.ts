import type { ImagingStudy, ImagingViewerSessionState } from "@dental/shared";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { browserRenderableImageMimeType } from "../imaging/previewFormats.js";
import { cloneDicomWorkbenchManifestForServerStorage } from "../routes/imaging/workstationReadiness.js";
import { db } from "./client.js";
import * as schema from "./schema.js";

/**
 * Canonical default state for a freshly-created imaging viewer session.
 * Typed as ImagingViewerSessionState so the compiler enforces that every
 * required field is present and correctly typed.
 */
function createDefaultViewerSessionState(): ImagingViewerSessionState {
	return {
		mode: "two_d",
		activeTool: "pan",
		activeQuickActionId: null,
		windowPreset: "bone",
		windowCenter: null,
		windowWidth: null,
		brightness: 1,
		contrast: 1,
		inverted: false,
		rotationDeg: 0,
		flipHorizontal: false,
		zoom: 1,
		panX: 0,
		panY: 0,
		sliceIndex: null,
		projection: null,
		axisDeg: 0,
		slabMm: 1,
		crosshair: false,
		linkedPlanes: false,
		implantPlan: null,
	};
}

function mapImagingStudy(
	record: typeof schema.imagingStudies.$inferSelect,
	patientFullNameOrOptions?:
		| string
		| null
		| { patientFullName?: string | null },
): ImagingStudy {
	const patientFullName =
		typeof patientFullNameOrOptions === "string"
			? patientFullNameOrOptions
			: typeof patientFullNameOrOptions === "object" &&
					patientFullNameOrOptions !== null
				? patientFullNameOrOptions.patientFullName ?? null
				: null;
	return {
		id: record.id,
		organizationId: record.organizationId,
		patientId: record.patientId,
		visitId: record.visitId,
		doctorId: record.doctorId,
		kind: record.kind,
		title: record.title,
		toothCode: record.toothCode,
		region: record.region,
		capturedAt: record.capturedAt.toISOString(),
		sourceKind: record.sourceKind,
		sourceName: record.sourceName,
		storagePath: record.storagePath,
		dicomStudyUid: record.dicomStudyUid,
		studyInstanceUid: record.studyInstanceUid ?? record.dicomStudyUid,
		seriesInstanceUid: record.seriesInstanceUid,
		modality: record.modality,
		seriesDescription: record.seriesDescription,
		studyDate: record.studyDate,
		sliceCount: record.sliceCount,
		dimensions: record.dimensions,
		voxelSpacing: record.voxelSpacing,
		fileSizeBytes: record.fileSizeBytes,
		// biome-ignore lint/suspicious/noExplicitAny: domain schema contract
		bindingStatus: (record.bindingStatus as any) || "unassigned",
		bindingConfidence: record.bindingConfidence ?? 0,
		dicomPatientName: record.dicomPatientName,
		dicomPatientId: record.dicomPatientId,
		dicomBirthDate: record.dicomBirthDate,
		patientFullName: patientFullName ?? null,
		status: record.status,
		aiSummary: record.aiSummary,
		previewUrl: record.storagePath
			? (browserRenderableImageMimeType(record.storagePath)
				? `/api/imaging/studies/${record.id}/file`
				: `/api/imaging/studies/${record.id}/preview.svg`)
			: `/api/imaging/studies/${record.id}/preview.svg`,
		viewerUrl: record.storagePath
			? `/api/imaging/studies/${record.id}/file`
			: `/api/imaging/studies/${record.id}/preview.svg`,
	};
}

export interface ImagingStudiesQueryFilters {
	patientId?: string | null | undefined;
	modality?: string | null | undefined;
	bindingStatus?: string | null | undefined;
	search?: string | null | undefined;
	limit?: number | undefined;
	offset?: number | undefined;
}

export async function getImagingStudiesWithFilters(
	organizationId: string,
	filters: ImagingStudiesQueryFilters = {},
): Promise<ImagingStudy[]> {
	const conditions = [eq(schema.imagingStudies.organizationId, organizationId)];

	if (filters.patientId) {
		conditions.push(eq(schema.imagingStudies.patientId, filters.patientId));
	}

	if (filters.modality) {
		conditions.push(
			sql`lower(${schema.imagingStudies.modality}) = lower(${filters.modality})`,
		);
	}

	if (filters.bindingStatus) {
		conditions.push(
			eq(schema.imagingStudies.bindingStatus, filters.bindingStatus),
		);
	}

	if (filters.search && filters.search.trim().length > 0) {
		const searchPattern = `%${filters.search.trim().toLowerCase()}%`;
		conditions.push(
			or(
				sql`lower(${schema.imagingStudies.title}) LIKE ${searchPattern}`,
				sql`lower(${schema.imagingStudies.dicomPatientName}) LIKE ${searchPattern}`,
				sql`lower(${schema.patients.fullName}) LIKE ${searchPattern}`,
			)!,
		);
	}

	const baseQuery = db
		.select({
			study: schema.imagingStudies,
			patientFullName: schema.patients.fullName,
		})
		.from(schema.imagingStudies)
		.leftJoin(
			schema.patients,
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, schema.imagingStudies.patientId),
			),
		)
		.where(and(...conditions))
		.orderBy(desc(schema.imagingStudies.capturedAt));

	const limitVal = typeof filters.limit === "number" && filters.limit > 0 ? filters.limit : undefined;
	const offsetVal = typeof filters.offset === "number" && filters.offset > 0 ? filters.offset : undefined;

	let rows: Array<{
		study: typeof schema.imagingStudies.$inferSelect;
		patientFullName: string | null;
	}>;

	if (limitVal !== undefined && offsetVal !== undefined) {
		rows = await baseQuery.limit(limitVal).offset(offsetVal);
	} else if (limitVal !== undefined) {
		rows = await baseQuery.limit(limitVal);
	} else if (offsetVal !== undefined) {
		rows = await baseQuery.offset(offsetVal);
	} else {
		rows = await baseQuery;
	}

	return rows.map((r) => mapImagingStudy(r.study, r.patientFullName));
}

export async function getImagingStudiesForPatient(
	organizationId: string,
	patientId: string,
): Promise<ImagingStudy[]> {
	return getImagingStudiesWithFilters(organizationId, { patientId });
}

export async function getAllImagingStudies(
	organizationId: string,
): Promise<ImagingStudy[]> {
	return getImagingStudiesWithFilters(organizationId);
}

export async function bindPatientToStudyInDb(
	organizationId: string,
	studyId: string,
	patientId: string,
): Promise<ImagingStudy | null> {
	const [patient] = await db
		.select({ id: schema.patients.id, fullName: schema.patients.fullName })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, patientId),
			),
		)
		.limit(1);

	if (!patient) {
		throw new Error("Пациент не найден в базе организации");
	}

	const [updated] = await db
		.update(schema.imagingStudies)
		.set({
			patientId: patient.id,
			bindingStatus: "manual_bound",
			bindingConfidence: 100,
			aiSummary: `Вручную привязано врачом к пациенту: ${patient.fullName}`,
		})
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, studyId),
			),
		)
		.returning();

	return updated ? mapImagingStudy(updated, patient.fullName) : null;
}

export async function unbindPatientFromStudyInDb(
	organizationId: string,
	studyId: string,
): Promise<ImagingStudy | null> {
	const [updated] = await db
		.update(schema.imagingStudies)
		.set({
			patientId: null,
			bindingStatus: "unassigned",
			bindingConfidence: 0,
			aiSummary: "Исследование отвязано от пациента врачом",
		})
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, studyId),
			),
		)
		.returning();

	return updated ? mapImagingStudy(updated, null) : null;
}

export async function getImagingStudyById(
	organizationId: string,
	id: string,
	targetDb: typeof db = db,
): Promise<ImagingStudy | null> {
	const [record] = await targetDb
		.select()
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, id),
			),
		)
		.limit(1);
	return record ? mapImagingStudy(record) : null;
}

export async function createImagingStudiesInDb(
	organizationId: string,
	inputs: Array<{
		patientId: string;
		visitId?: string | null | undefined;
		doctorId?: string | null | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		kind: any;
		title: string;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		sourceKind: any;
		sourceName: string;
		storagePath?: string | null | undefined;
		dicomStudyUid?: string | null | undefined;
		capturedAt?: string | null | undefined;
		aiSummary?: string | null | undefined;
	}>,
): Promise<ImagingStudy[]> {
	if (inputs.length === 0) return [];

	const patientIds = Array.from(new Set(inputs.map((i) => i.patientId)));

	const ownedPatients = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				inArray(schema.patients.id, patientIds),
			),
		);

	if (ownedPatients.length !== patientIds.length) {
		throw new Error("Не все пациенты принадлежат организации: создание снимка отклонено");
	}

	const records = await db
		.insert(schema.imagingStudies)
		.values(
			inputs.map((input) => ({
				organizationId,
				patientId: input.patientId,
				visitId: input.visitId || null,
				doctorId: input.doctorId || null,
				kind: input.kind,
				title: input.title.length > 180 ? input.title.slice(0, 180) : input.title,
				toothCode: input.toothCode || null,
				region: input.region || null,
				capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
				sourceKind: input.sourceKind,
				sourceName:
					input.sourceName.length > 160
						? input.sourceName.slice(0, 160)
						: input.sourceName,
				storagePath: input.storagePath || null,
				dicomStudyUid: input.dicomStudyUid || null,
				status: "needs_review" as const,
				aiSummary: input.aiSummary || null,
			})),
		)
		.returning();

	return records.map((r) => mapImagingStudy(r));
}

export async function createImagingStudyInDb(
	organizationId: string,
	input: {
		patientId: string;
		visitId?: string | null | undefined;
		doctorId?: string | null | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		kind: any;
		title: string;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		sourceKind: any;
		sourceName: string;
		storagePath?: string | null | undefined;
		dicomStudyUid?: string | null | undefined;
		capturedAt?: string | null | undefined;
		aiSummary?: string | null | undefined;
	},
): Promise<ImagingStudy> {
	// Ownership assert: patient (and optional visit) must belong to caller org.
	const [ownedPatient] = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, input.patientId),
			),
		)
		.limit(1);
	if (!ownedPatient) {
		throw new Error("Пациент не принадлежит организации: создание снимка отклонено");
	}
	if (input.visitId) {
		const [ownedVisit] = await db
			.select({ id: schema.visits.id })
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.patientId, input.patientId),
				),
			)
			.limit(1);
		if (!ownedVisit) {
			throw new Error(
				"Приём не принадлежит организации или пациенту: создание снимка отклонено",
			);
		}
	}
	const [record] = await db
		.insert(schema.imagingStudies)
		.values({
			organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			doctorId: input.doctorId || null,
			kind: input.kind,
			title: input.title.length > 180 ? input.title.slice(0, 180) : input.title,
			toothCode: input.toothCode || null,
			region: input.region || null,
			capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
			sourceKind: input.sourceKind,
			sourceName:
				input.sourceName.length > 160
					? input.sourceName.slice(0, 160)
					: input.sourceName,
			storagePath: input.storagePath || null,
			dicomStudyUid: input.dicomStudyUid || null,
			status: "needs_review",
			aiSummary: input.aiSummary || null,
		})
		.returning();

	if (!record) {
		throw new Error("Не удалось создать запись исследования");
	}

	return mapImagingStudy(record);
}

export async function updateImagingStudyAiSummaryInDb(
	organizationId: string,
	id: string,
	summary: string,
	targetDb: typeof db = db,
): Promise<ImagingStudy> {
	const [record] = await targetDb
		.update(schema.imagingStudies)
		.set({ aiSummary: summary })
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, id),
			),
		)
		.returning();

	if (!record) {
		throw new Error("Не удалось обновить исследование");
	}

	return mapImagingStudy(record);
}

export async function updateImagingStudyInDb(
	organizationId: string,
	id: string,
	updates: {
		visitId?: string | null | undefined;
		kind?: typeof schema.imagingStudies.$inferInsert["kind"] | undefined;
		title?: string | undefined;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		status?: typeof schema.imagingStudies.$inferInsert["status"] | undefined;
		aiSummary?: string | null | undefined;
		storagePath?: string | null | undefined;
	},
	targetDb: typeof db = db,
): Promise<ImagingStudy | null> {
	const [record] = await targetDb
		.update(schema.imagingStudies)
		.set(updates)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, id),
			),
		)
		.returning();

	return record ? mapImagingStudy(record) : null;
}

async function _getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

import { randomUUID } from "node:crypto";
import type {
	DicomWorkbenchBundle,
	ImagingViewerSession,
	SaveDicomWorkbenchBundleRequest,
	SaveImagingViewerSessionRequest,
} from "@dental/shared";
import { dicomWorkbenchBundles, imagingViewerSessions } from "./schema.js";

export async function getOrCreateImagingViewerSession(
	organizationId: string,
	study: ImagingStudy,
): Promise<ImagingViewerSession> {
	const [session] = await db
		.select()
		.from(imagingViewerSessions)
		.where(
			and(
				eq(imagingViewerSessions.organizationId, organizationId),
				eq(imagingViewerSessions.studyId, study.id),
			),
		)
		.limit(1);

	if (session) {
		return {
			id: session.id,
			organizationId: session.organizationId,
			studyId: session.studyId,
			patientId: session.patientId,
			visitId: session.visitId,
			state: session.state,
			annotations: session.annotations,
			clientSavedAt: session.clientSavedAt?.toISOString() ?? null,
			serverSavedAt: session.serverSavedAt.toISOString(),
			createdAt: session.createdAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
			warnings: session.warnings,
		};
	}

	const [newSession] = await db
		.insert(imagingViewerSessions)
		.values({
			id: randomUUID(),
			organizationId,
			studyId: study.id,
			patientId: study.patientId,
			state: createDefaultViewerSessionState(),
			annotations: [],
			warnings: [],
		})
		.returning();
	if (!newSession) throw new Error("Не удалось создать сессию в базе данных");

	return {
		id: newSession.id,
		organizationId: newSession.organizationId,
		studyId: newSession.studyId,
		patientId: newSession.patientId,
		visitId: newSession.visitId,
		state: newSession.state,
		annotations: newSession.annotations,
		clientSavedAt: newSession.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: newSession.serverSavedAt.toISOString(),
		createdAt: newSession.createdAt.toISOString(),
		updatedAt: newSession.updatedAt.toISOString(),
		warnings: newSession.warnings,
	};
}

export async function saveImagingViewerSession(
	organizationId: string,
	studyId: string,
	input: SaveImagingViewerSessionRequest,
): Promise<ImagingViewerSession> {
	const [existing] = await db
		.select()
		.from(imagingViewerSessions)
		.where(
			and(
				eq(imagingViewerSessions.organizationId, organizationId),
				eq(imagingViewerSessions.studyId, studyId),
			),
		)
		.limit(1);

	const clientSavedAt = input.clientSavedAt
		? new Date(input.clientSavedAt)
		: null;
	const now = new Date();

	if (existing) {
		/*
		 * БЫЛО: UPDATE imaging_viewer_sessions ... WHERE id=existing.id
		 * (organizationId только в SELECT выше). SELECT-then-UPDATE по одному id
		 * ломает multi-tenant defense-in-depth: чужая клиника с тем же UUID
		 * могла перезаписать сессию просмотра снимка.
		 * СТАЛО: organizationId + id в WHERE; пустой RETURNING → ошибка.
		 */
		const [updated] = await db
			.update(imagingViewerSessions)
			.set({
				patientId: input.patientId,
				visitId: input.visitId ?? null,
				state: input.state,
				annotations: input.annotations,
				clientSavedAt,
				serverSavedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(imagingViewerSessions.id, existing.id),
					eq(imagingViewerSessions.organizationId, organizationId),
				),
			)
			.returning();
		if (!updated) throw new Error("Не удалось обновить сессию");

		return {
			id: updated.id,
			organizationId: updated.organizationId,
			studyId: updated.studyId,
			patientId: updated.patientId,
			visitId: updated.visitId,
			state: updated.state,
			annotations: updated.annotations,
			clientSavedAt: updated.clientSavedAt?.toISOString() ?? null,
			serverSavedAt: updated.serverSavedAt.toISOString(),
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			warnings: updated.warnings,
		};
	}

	const [newSession] = await db
		.insert(imagingViewerSessions)
		.values({
			id: randomUUID(),
			organizationId,
			studyId,
			patientId: input.patientId,
			visitId: input.visitId ?? null,
			state: input.state,
			annotations: input.annotations,
			clientSavedAt,
			serverSavedAt: now,
			warnings: [],
		})
		.returning();
	if (!newSession) throw new Error("Не удалось создать сессию в базе данных");

	return {
		id: newSession.id,
		organizationId: newSession.organizationId,
		studyId: newSession.studyId,
		patientId: newSession.patientId,
		visitId: newSession.visitId,
		state: newSession.state,
		annotations: newSession.annotations,
		clientSavedAt: newSession.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: newSession.serverSavedAt.toISOString(),
		createdAt: newSession.createdAt.toISOString(),
		updatedAt: newSession.updatedAt.toISOString(),
		warnings: newSession.warnings,
	};
}

export async function listDicomWorkbenchBundles(
	organizationId: string,
	limit: number,
): Promise<DicomWorkbenchBundle[]> {
	const bundles = await db
		.select()
		.from(dicomWorkbenchBundles)
		.where(eq(dicomWorkbenchBundles.organizationId, organizationId))
		.orderBy(desc(dicomWorkbenchBundles.createdAt))
		.limit(limit);

	return bundles.map((b) => ({
		id: b.id,
		organizationId: b.organizationId,
		seriesKey: b.seriesKey,
		patientId: b.patientId,
		studyInstanceUid: b.studyInstanceUid,
		seriesInstanceUid: b.seriesInstanceUid,
		sourceName: b.sourceName,
		sourceKind: b.sourceKind,
		pixelPolicy: b.pixelPolicy,
		manifest: b.manifest,
		clientSavedAt: b.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: b.serverSavedAt.toISOString(),
		createdAt: b.createdAt.toISOString(),
		updatedAt: b.updatedAt.toISOString(),
		warnings: b.warnings,
	}));
}

export async function saveDicomWorkbenchBundle(
	organizationId: string,
	input: SaveDicomWorkbenchBundleRequest,
): Promise<DicomWorkbenchBundle> {
	const sanitizedManifest = cloneDicomWorkbenchManifestForServerStorage(input.manifest);
	const clientSavedAt = input.clientSavedAt
		? new Date(input.clientSavedAt)
		: null;
	const now = new Date();

	const existingSeriesKey = input.seriesKey ?? `series_${randomUUID()}`;

	const [existing] = await db
		.select()
		.from(dicomWorkbenchBundles)
		.where(
			and(
				eq(dicomWorkbenchBundles.organizationId, organizationId),
				eq(dicomWorkbenchBundles.seriesKey, existingSeriesKey),
			),
		)
		.limit(1);

	if (existing) {
		/*
		 * БЫЛО: UPDATE dicom_workbench_bundles ... WHERE id only после SELECT
		 * с organizationId+seriesKey. organizationId не в WHERE мутации —
		 * тот же класс дыры, что visits/family wallet.
		 * СТАЛО: organizationId + id; RETURNING обязателен (уже был).
		 */
		const [updated] = await db
			.update(dicomWorkbenchBundles)
			.set({
				manifest: sanitizedManifest,
				clientSavedAt,
				serverSavedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(dicomWorkbenchBundles.id, existing.id),
					eq(dicomWorkbenchBundles.organizationId, organizationId),
				),
			)
			.returning();
		if (!updated) throw new Error("Не удалось обновить пакет исследований");

		return {
			id: updated.id,
			organizationId: updated.organizationId,
			seriesKey: updated.seriesKey,
			patientId: updated.patientId,
			studyInstanceUid: updated.studyInstanceUid,
			seriesInstanceUid: updated.seriesInstanceUid,
			sourceName: updated.sourceName,
			sourceKind: updated.sourceKind,
			pixelPolicy: updated.pixelPolicy,
			manifest: updated.manifest,
			clientSavedAt: updated.clientSavedAt?.toISOString() ?? null,
			serverSavedAt: updated.serverSavedAt.toISOString(),
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			warnings: updated.warnings,
		};
	}

	const [newBundle] = await db
		.insert(dicomWorkbenchBundles)
		.values({
			id: randomUUID(),
			organizationId,
			seriesKey: existingSeriesKey,
			sourceName: "API Upload",
			sourceKind: "manual_upload",
			pixelPolicy: "metadata_and_tool_state_only_no_pixels",
			manifest: sanitizedManifest,
			clientSavedAt,
			serverSavedAt: now,
			warnings: [],
		})
		.returning();
	if (!newBundle) throw new Error("Не удалось создать пакет исследований");

	return {
		id: newBundle.id,
		organizationId: newBundle.organizationId,
		seriesKey: newBundle.seriesKey,
		patientId: newBundle.patientId,
		studyInstanceUid: newBundle.studyInstanceUid,
		seriesInstanceUid: newBundle.seriesInstanceUid,
		sourceName: newBundle.sourceName,
		sourceKind: newBundle.sourceKind,
		pixelPolicy: newBundle.pixelPolicy,
		manifest: newBundle.manifest,
		clientSavedAt: newBundle.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: newBundle.serverSavedAt.toISOString(),
		createdAt: newBundle.createdAt.toISOString(),
		updatedAt: newBundle.updatedAt.toISOString(),
		warnings: newBundle.warnings,
	};
}
