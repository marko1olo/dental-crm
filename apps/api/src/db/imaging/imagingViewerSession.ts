import { randomUUID } from "node:crypto";
import type { ImagingStudy, ImagingViewerSession, SaveImagingViewerSessionRequest } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db, type TenantDb } from "../client.js";
import { withTenantCtx } from "../rls.js";
import { imagingViewerSessions } from "../schema.js";
import { createDefaultViewerSessionState, mapViewerSessionRecord } from "./imagingViewerState.js";

export async function getOrCreateImagingViewerSession(
	organizationId: string,
	study: ImagingStudy,
	targetDb: TenantDb = db,
): Promise<ImagingViewerSession> {
	const runOp = async (tx: TenantDb) => {
		const [session] = await tx
			.select()
			.from(imagingViewerSessions)
			.where(
				and(
					eq(imagingViewerSessions.organizationId, organizationId),
					eq(imagingViewerSessions.studyId, study.id),
				),
			)
			.limit(1);

		if (session) return mapViewerSessionRecord(session);

		const [newSession] = await tx
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

		return mapViewerSessionRecord(newSession);
	};

	if (targetDb !== db) return runOp(targetDb);
	return withTenantCtx(organizationId, async (tx) => runOp(tx));
}

export async function saveImagingViewerSession(
	organizationId: string,
	studyId: string,
	input: SaveImagingViewerSessionRequest,
	targetDb: TenantDb = db,
): Promise<ImagingViewerSession> {
	const runSave = async (tx: TenantDb) => {
		const [existing] = await tx
			.select()
			.from(imagingViewerSessions)
			.where(
				and(
					eq(imagingViewerSessions.organizationId, organizationId),
					eq(imagingViewerSessions.studyId, studyId),
				),
			)
			.limit(1);

		const clientSavedAt = input.clientSavedAt ? new Date(input.clientSavedAt) : null;
		const now = new Date();

		if (existing) {
			const [updated] = await tx
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
			return mapViewerSessionRecord(updated);
		}

		const [newSession] = await tx
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

		return mapViewerSessionRecord(newSession);
	};

	if (targetDb !== db) return runSave(targetDb);
	return withTenantCtx(organizationId, async (tx) => runSave(tx));
}
