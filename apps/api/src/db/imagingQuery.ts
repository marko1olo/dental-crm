import type { ImagingStudy } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

function mapImagingStudy(
	record: typeof schema.imagingStudies.$inferSelect,
): ImagingStudy {
	return {
		id: record.id,
		organizationId: record.organizationId,
		patientId: record.patientId,
		visitId: record.visitId,
		kind: record.kind as any,
		title: record.title,
		toothCode: record.toothCode,
		region: record.region,
		capturedAt: record.capturedAt.toISOString(),
		sourceKind: record.sourceKind as any,
		sourceName: record.sourceName,
		storagePath: record.storagePath,
		dicomStudyUid: record.dicomStudyUid,
		status: record.status as any,
		aiSummary: record.aiSummary,
		previewUrl: `/api/imaging/studies/${record.id}/preview.svg`,
		viewerUrl: `/api/imaging/studies/${record.id}/preview.svg`,
	};
}

export async function getImagingStudiesForPatient(
	organizationId: string,
	patientId: string,
): Promise<ImagingStudy[]> {
	const records = await db
		.select()
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.patientId, patientId),
			),
		);
	return records.map(mapImagingStudy);
}

export async function getAllImagingStudies(
	organizationId: string,
): Promise<ImagingStudy[]> {
	const records = await db
		.select()
		.from(schema.imagingStudies)
		.where(eq(schema.imagingStudies.organizationId, organizationId));
	return records.map(mapImagingStudy);
}

export async function getImagingStudyById(
	organizationId: string,
	id: string,
): Promise<ImagingStudy | null> {
	const [record] = await db
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

export async function createImagingStudyInDb(
	organizationId: string,
	input: {
		patientId: string;
		visitId?: string | null | undefined;
		kind: any;
		title: string;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		sourceKind: any;
		sourceName: string;
		storagePath?: string | null | undefined;
		dicomStudyUid?: string | null | undefined;
		capturedAt?: string | null | undefined;
		aiSummary?: string | null | undefined;
	},
): Promise<ImagingStudy> {
	const [record] = await db
		.insert(schema.imagingStudies)
		.values({
			organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
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
		throw new Error("Failed to create imaging study");
	}

	return mapImagingStudy(record);
}

export async function updateImagingStudyAiSummaryInDb(
	organizationId: string,
	id: string,
	summary: string,
): Promise<ImagingStudy> {
	const [record] = await db
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
		throw new Error("Failed to update imaging study");
	}

	return mapImagingStudy(record);
}

export async function getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

import type {
	DicomWorkbenchBundle,
	ImagingViewerSession,
	SaveDicomWorkbenchBundleRequest,
	SaveImagingViewerSessionRequest,
} from "@dental/shared";
import { randomUUID } from "crypto";
import { desc } from "drizzle-orm";
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
			state: session.state as any,
			annotations: session.annotations as any,
			clientSavedAt: session.clientSavedAt?.toISOString() ?? null,
			serverSavedAt: session.serverSavedAt.toISOString(),
			createdAt: session.createdAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
			warnings: session.warnings as any,
		};
	}

	const [newSession] = await db
		.insert(imagingViewerSessions)
		.values({
			id: randomUUID(),
			organizationId,
			studyId: study.id,
			patientId: study.patientId,
			state: { version: 1, layout: "1x1", currentTool: "pan" },
			annotations: [],
			warnings: [],
		})
		.returning();
	if (!newSession) throw new Error("Failed to insert session");

	return {
		id: newSession.id,
		organizationId: newSession.organizationId,
		studyId: newSession.studyId,
		patientId: newSession.patientId,
		visitId: newSession.visitId,
		state: newSession.state as any,
		annotations: newSession.annotations as any,
		clientSavedAt: newSession.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: newSession.serverSavedAt.toISOString(),
		createdAt: newSession.createdAt.toISOString(),
		updatedAt: newSession.updatedAt.toISOString(),
		warnings: newSession.warnings as any,
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
		const [updated] = await db
			.update(imagingViewerSessions)
			.set({
				patientId: input.patientId,
				visitId: input.visitId ?? null,
				state: input.state as any,
				annotations: input.annotations as any,
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
		if (!updated) throw new Error("Failed to update session");

		return {
			id: updated.id,
			organizationId: updated.organizationId,
			studyId: updated.studyId,
			patientId: updated.patientId,
			visitId: updated.visitId,
			state: updated.state as any,
			annotations: updated.annotations as any,
			clientSavedAt: updated.clientSavedAt?.toISOString() ?? null,
			serverSavedAt: updated.serverSavedAt.toISOString(),
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			warnings: updated.warnings as any,
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
			state: input.state as any,
			annotations: input.annotations as any,
			clientSavedAt,
			serverSavedAt: now,
			warnings: [],
		})
		.returning();
	if (!newSession) throw new Error("Failed to insert session");

	return {
		id: newSession.id,
		organizationId: newSession.organizationId,
		studyId: newSession.studyId,
		patientId: newSession.patientId,
		visitId: newSession.visitId,
		state: newSession.state as any,
		annotations: newSession.annotations as any,
		clientSavedAt: newSession.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: newSession.serverSavedAt.toISOString(),
		createdAt: newSession.createdAt.toISOString(),
		updatedAt: newSession.updatedAt.toISOString(),
		warnings: newSession.warnings as any,
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
		sourceKind: b.sourceKind as any,
		pixelPolicy: b.pixelPolicy as any,
		manifest: b.manifest as any,
		clientSavedAt: b.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: b.serverSavedAt.toISOString(),
		createdAt: b.createdAt.toISOString(),
		updatedAt: b.updatedAt.toISOString(),
		warnings: b.warnings as any,
	}));
}

export async function saveDicomWorkbenchBundle(
	organizationId: string,
	input: SaveDicomWorkbenchBundleRequest,
): Promise<DicomWorkbenchBundle> {
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
		const [updated] = await db
			.update(dicomWorkbenchBundles)
			.set({
				manifest: input.manifest as any,
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
		if (!updated) throw new Error("Failed to update bundle");

		return {
			id: updated.id,
			organizationId: updated.organizationId,
			seriesKey: updated.seriesKey,
			patientId: updated.patientId,
			studyInstanceUid: updated.studyInstanceUid,
			seriesInstanceUid: updated.seriesInstanceUid,
			sourceName: updated.sourceName,
			sourceKind: updated.sourceKind as any,
			pixelPolicy: updated.pixelPolicy as any,
			manifest: updated.manifest as any,
			clientSavedAt: updated.clientSavedAt?.toISOString() ?? null,
			serverSavedAt: updated.serverSavedAt.toISOString(),
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			warnings: updated.warnings as any,
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
			manifest: input.manifest as any,
			clientSavedAt,
			serverSavedAt: now,
			warnings: [],
		})
		.returning();
	if (!newBundle) throw new Error("Failed to insert bundle");

	return {
		id: newBundle.id,
		organizationId: newBundle.organizationId,
		seriesKey: newBundle.seriesKey,
		patientId: newBundle.patientId,
		studyInstanceUid: newBundle.studyInstanceUid,
		seriesInstanceUid: newBundle.seriesInstanceUid,
		sourceName: newBundle.sourceName,
		sourceKind: newBundle.sourceKind as any,
		pixelPolicy: newBundle.pixelPolicy as any,
		manifest: newBundle.manifest as any,
		clientSavedAt: newBundle.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: newBundle.serverSavedAt.toISOString(),
		createdAt: newBundle.createdAt.toISOString(),
		updatedAt: newBundle.updatedAt.toISOString(),
		warnings: newBundle.warnings as any,
	};
}
