import { and, eq, inArray, sql } from "drizzle-orm";
import { onTenantTxCommit, withTenantWriteCtx, type TenantDb } from "../../db/rls.js";
import { toothStateHistory, toothStates } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	resolveMergedToothState,
	type PreviousToothStateRecord,
	type ToothStateTransitionInput,
} from "./odontogramStateMerge.js";
import { TOOTH_NUMBER_TO_JAW_CODE, parseClinicalDataFromNotes } from "./types.js";

export type { ToothStateTransitionInput };

export interface FormattedToothStateRow {
	toothNumber: number;
	jawCode?: "JU" | "JL" | "C" | undefined;
	state: string;
	surfaces: unknown;
	notes: string | null;
	canalMeasurements: unknown;
	updatedAt: string | null;
	clinicalData: Record<string, unknown> | null;
	rootResorptionStage: unknown;
	rootResorption: unknown;
	mobility: number | undefined;
}

export function formatToothStateRow(row: {
	toothNumber: number;
	state: string;
	surfaces: unknown;
	notes: string | null;
	clinicalData: unknown;
	canalMeasurements: unknown;
	updatedAt: Date | null;
}): FormattedToothStateRow {
	const clin =
		(row.clinicalData as Record<string, unknown> | null) ||
		parseClinicalDataFromNotes(row.notes);
	const cleanNotes =
		row.notes &&
		row.notes.trim().startsWith("{") &&
		row.notes.trim().endsWith("}")
			? null
			: row.notes;
	const jawCode = TOOTH_NUMBER_TO_JAW_CODE[row.toothNumber];
	return {
		toothNumber: row.toothNumber,
		...(jawCode ? { jawCode } : {}),
		state: row.state,
		surfaces: row.surfaces,
		notes: cleanNotes,
		canalMeasurements: row.canalMeasurements ?? null,
		updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
		clinicalData: clin,
		rootResorptionStage: clin?.resorptionStage ?? undefined,
		rootResorption: clin?.resorptionStage ?? undefined,
		mobility: (clin?.mobility ?? clin?.mobilityDegree) as number | undefined,
	};
}

function parseIncomingNotesAndClinical(
	clinicalData: ToothStateTransitionInput["clinicalData"],
	notes: ToothStateTransitionInput["notes"],
): {
	incomingClinicalData: Record<string, unknown> | null;
	incomingDoctorNotes: string | null | undefined;
} {
	let incomingClinicalData: Record<string, unknown> | null =
		(clinicalData as Record<string, unknown> | undefined) ?? null;
	let incomingDoctorNotes: string | null | undefined = notes;

	if (
		typeof incomingDoctorNotes === "string" &&
		incomingDoctorNotes.trim().startsWith("{") &&
		incomingDoctorNotes.trim().endsWith("}")
	) {
		try {
			const parsed = JSON.parse(incomingDoctorNotes);
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				if (!incomingClinicalData) {
					incomingClinicalData = parsed as Record<string, unknown>;
				}
				const innerNotes =
					(parsed as { notes?: unknown; doctorNotes?: unknown }).doctorNotes ??
					(parsed as { notes?: unknown; doctorNotes?: unknown }).notes;
				incomingDoctorNotes =
					typeof innerNotes === "string" && !innerNotes.trim().startsWith("{")
						? innerNotes
						: null;
			}
		} catch (err) {
			void err;
		}
	}

	return { incomingClinicalData, incomingDoctorNotes };
}

export async function applyToothStateMutation(
	organizationId: string,
	patientId: string,
	actorUserId: string | null,
	data: ToothStateTransitionInput,
	skipBroadcast = false,
	externalTx?: TenantDb,
): Promise<FormattedToothStateRow[]> {
	const toothNumbers = [...new Set<number>(data.toothNumbers)].sort(
		(a, b) => a - b,
	);
	if (toothNumbers.length === 0) return [];

	const now = new Date();
	const maxFutureSkewMs = 60 * 1000;
	const incomingRawTime = data.updatedAt
		? new Date(data.updatedAt).getTime()
		: now.getTime();
	const boundedIncomingTime = Math.min(
		incomingRawTime,
		now.getTime() + maxFutureSkewMs,
	);
	const incomingUpdatedAt = new Date(boundedIncomingTime);
	const incomingVersion = data.version ?? 1;

	const runInTx = async (tx: TenantDb): Promise<FormattedToothStateRow[]> => {
		const previousStates = await tx
			.select({
				toothNumber: toothStates.toothNumber,
				state: toothStates.state,
				surfaces: toothStates.surfaces,
				notes: toothStates.notes,
				clinicalData: toothStates.clinicalData,
				canalMeasurements: toothStates.canalMeasurements,
				updatedAt: toothStates.updatedAt,
				version: toothStates.version,
			})
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, organizationId),
					eq(toothStates.patientId, patientId),
					inArray(toothStates.toothNumber, toothNumbers),
				),
			)
			.orderBy(toothStates.toothNumber)
			.for("update");

		const previousByTooth = new Map<number, PreviousToothStateRecord>(
			(previousStates as PreviousToothStateRecord[]).map((row) => [
				row.toothNumber,
				row,
			]),
		);

		const { incomingClinicalData, incomingDoctorNotes } =
			parseIncomingNotesAndClinical(data.clinicalData, data.notes);

		const historyToInsert: (typeof toothStateHistory.$inferInsert)[] = [];
		const statesToInsert: (typeof toothStates.$inferInsert)[] = [];

		for (const toothNumber of toothNumbers) {
			const prev = previousByTooth.get(toothNumber);
			const prevTime = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
			const prevVersion = prev?.version ?? 0;
			const incomingTime = incomingUpdatedAt.getTime();

			const incomingWins =
				!prev ||
				incomingTime > prevTime ||
				(incomingTime === prevTime && incomingVersion >= prevVersion);

			const effectiveCanalMeasurements =
				data.canalMeasurements !== undefined
					? data.canalMeasurements
					: prev?.canalMeasurements ?? null;

			if (incomingWins) {
				const prevClinical =
					(prev?.clinicalData as Record<string, unknown> | null) ||
					parseClinicalDataFromNotes(prev?.notes);
				const merged = resolveMergedToothState({
					toothNumber,
					prev,
					prevClinical,
					incomingClinicalData,
					incomingDoctorNotes,
					incomingUpdatedAt,
					data,
				});

				historyToInsert.push({
					organizationId,
					patientId,
					visitId: data.visitId ?? null,
					toothNumber,
					previousState: prev?.state ?? null,
					newState: merged.historyNewState,
					previousSurfaces: prev?.surfaces ?? null,
					newSurfaces: merged.effectiveSurfaces || null,
					clinicalData: merged.effectiveClinicalData,
					canalMeasurements: effectiveCanalMeasurements,
					changedByUserId: actorUserId,
					reason: merged.historyReason,
					changedAt: incomingUpdatedAt,
				});

				statesToInsert.push({
					organizationId,
					patientId,
					toothNumber,
					state: merged.effectiveState,
					surfaces: merged.effectiveSurfaces || null,
					notes: merged.effectiveNotes,
					clinicalData: merged.effectiveClinicalData,
					canalMeasurements: effectiveCanalMeasurements,
					updatedAt: incomingUpdatedAt,
					isSynced: false,
					version: Math.max(prevVersion + 1, incomingVersion, 1),
				});
			} else {
				historyToInsert.push({
					organizationId,
					patientId,
					visitId: data.visitId ?? null,
					toothNumber,
					previousState: null,
					newState: data.state,
					previousSurfaces: null,
					newSurfaces: data.surfaces || null,
					clinicalData:
						(data.clinicalData as Record<string, unknown> | null) ?? null,
					canalMeasurements: effectiveCanalMeasurements,
					changedByUserId: actorUserId,
					reason: data.reason || "Оффлайн-синхронизация (LWW архив)",
					changedAt: incomingUpdatedAt,
				});
			}
		}

		if (historyToInsert.length > 0) {
			await tx.insert(toothStateHistory).values(historyToInsert);
		}
		if (statesToInsert.length > 0) {
			await tx
				.insert(toothStates)
				.values(statesToInsert)
				.onConflictDoUpdate({
					target: [
						toothStates.organizationId,
						toothStates.patientId,
						toothStates.toothNumber,
					],
					set: {
						state: sql`excluded.state`,
						surfaces: sql`excluded.surfaces`,
						notes: sql`excluded.notes`,
						clinicalData: sql`excluded.clinical_data`,
						canalMeasurements: sql`excluded.canal_measurements`,
						updatedAt: sql`excluded.updated_at`,
						isSynced: sql`excluded.is_synced`,
						version: sql`excluded.version`,
					},
				});
		}

		const currentStates = await tx
			.select({
				toothNumber: toothStates.toothNumber,
				state: toothStates.state,
				surfaces: toothStates.surfaces,
				notes: toothStates.notes,
				clinicalData: toothStates.clinicalData,
				canalMeasurements: toothStates.canalMeasurements,
				updatedAt: toothStates.updatedAt,
			})
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, organizationId),
					eq(toothStates.patientId, patientId),
					inArray(toothStates.toothNumber, toothNumbers),
				),
			);

		const formatted = currentStates.map(formatToothStateRow);
		if (!skipBroadcast) {
			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "UPDATE_ODONTOGRAM",
					payload: { patientId, states: formatted },
				});
			});
		}
		return formatted;
	};

	return externalTx
		? await runInTx(externalTx)
		: await withTenantWriteCtx(organizationId, runInTx);
}
