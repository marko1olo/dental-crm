import { randomUUID } from "node:crypto";
import type { DicomWorkbenchBundle, SaveDicomWorkbenchBundleRequest } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import { cloneDicomWorkbenchManifestForServerStorage } from "../../routes/imaging/workstationReadiness.js";
import { db } from "../client.js";
import { dicomWorkbenchBundles } from "../schema.js";

function mapWorkbenchBundle(b: typeof dicomWorkbenchBundles.$inferSelect): DicomWorkbenchBundle {
	return {
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

	return bundles.map(mapWorkbenchBundle);
}

export async function saveDicomWorkbenchBundle(
	organizationId: string,
	input: SaveDicomWorkbenchBundleRequest,
): Promise<DicomWorkbenchBundle> {
	const sanitizedManifest = cloneDicomWorkbenchManifestForServerStorage(input.manifest);
	const clientSavedAt = input.clientSavedAt ? new Date(input.clientSavedAt) : null;
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
		return mapWorkbenchBundle(updated);
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

	return mapWorkbenchBundle(newBundle);
}
