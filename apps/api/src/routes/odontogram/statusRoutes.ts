import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import {
	toothStateHistory,
	toothStates,
} from "../../db/schema.js";
import { getRequestIdentity, type RequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	areToothStatesSurfaceMergeable,
	isCariesState,
	isFillingState,
	isImplantOrCrownState,
	isTerminalIrreversibleState,
	normalizeSurfaces,
} from "../../services/sync/syncGateway/syncConflictResolver.js";
import {
	mergeToothSurfaceStates,
	type ToothSurfaceKey,
	type ToothSurfaceStateMap,
} from "@dental/shared";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import {
	EndoToothClinicalData,
	UUID_SHAPE,
	batchToothStateSchema,
	odontogramStatusMutationSchema,
	parseClinicalDataFromNotes,
} from "./types.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";

interface ExtendedRequestIdentity extends RequestIdentity {
	clinicalRole?: string | null;
	canSignMedicalRecords?: boolean;
}

interface AuthenticatedUserContext {
	role?: string | null;
	canSignMedicalRecords?: boolean;
	clinicalRole?: string | null;
}

function extractRequestUser(request: FastifyRequest): AuthenticatedUserContext | undefined {
	if ("user" in request && typeof request.user === "object" && request.user !== null) {
		return request.user as AuthenticatedUserContext;
	}
	return undefined;
}

async function applyToothStateMutation(
	organizationId: string,
	patientId: string,
	actorUserId: string | null,
	data: {
		toothNumbers: number[];
		state: string;
		surfaces?: string[] | null | undefined;
		notes?: string | null | undefined;
		canalMeasurements?: unknown[] | null | undefined;
		clinicalData?: EndoToothClinicalData | null | undefined;
		mobility?: number | null | undefined;
		mobilityDegree?: number | null | undefined;
		isPrimaryPediatric?: boolean | null | undefined;
		resorptionStage?: number | null | undefined;
		pediatricCrownPresent?: boolean | null | undefined;
		secondaryCariesUnderFilling?: boolean | null | undefined;
		visitId?: string | null | undefined;
		updatedAt?: string | null | undefined;
		version?: number | null | undefined;
		reason?: string | null | undefined;
	},
	skipBroadcast = false,
) {
	const toothNumbers = [...new Set<number>(data.toothNumbers)].sort((a, b) => a - b);
	if (toothNumbers.length === 0) return [];

	const now = new Date();
	const maxFutureSkewMs = 60 * 1000; // max 1 minute future tolerance for clock drift
	const incomingRawTime = data.updatedAt
		? new Date(data.updatedAt).getTime()
		: now.getTime();
	const boundedIncomingTime = Math.min(
		incomingRawTime,
		now.getTime() + maxFutureSkewMs,
	);
	const incomingUpdatedAt = new Date(boundedIncomingTime);
	const incomingVersion = data.version ?? 1;

	const inserted = await withTenantCtx(organizationId, async (tx) => {
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

		type PreviousToothState = {
			toothNumber: number;
			state: string;
			surfaces: unknown;
			notes: string | null;
			clinicalData: unknown | null;
			canalMeasurements: unknown | null;
			updatedAt: Date | null;
			version: number | null;
		};
		const previousByTooth = new Map<number, PreviousToothState>(
			(previousStates as PreviousToothState[]).map((row) => [
				row.toothNumber,
				row,
			]),
		);

		let incomingClinicalData: Record<string, unknown> | null =
			(data.clinicalData as Record<string, unknown> | undefined) ?? null;
		let incomingDoctorNotes: string | null | undefined = data.notes;
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
						(parsed as { notes?: unknown; doctorNotes?: unknown })
							.doctorNotes ??
						(parsed as { notes?: unknown; doctorNotes?: unknown }).notes;
					incomingDoctorNotes =
						typeof innerNotes === "string" &&
						!innerNotes.trim().startsWith("{")
							? innerNotes
							: null;
				}
			} catch {
				// not json
			}
		}

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

			if (incomingWins) {
				const prevClinical =
					(prev?.clinicalData as Record<string, unknown> | null) ||
					parseClinicalDataFromNotes(prev?.notes);
				const prevStateRaw = prev?.state ?? null;
				const prevStateLower = (prevStateRaw ?? "").toLowerCase();

				const isCompositeBase =
					prevStateLower === "filled" ||
					prevStateLower === "filling" ||
					Boolean(prevClinical?.hasFilling) ||
					Boolean(prevClinical?.fillingSurfaces);

				const isOrthopedicBase =
					prevStateLower === "crown" ||
					prevStateLower === "temporary_crown" ||
					prevStateLower === "planned_crown" ||
					prevStateLower === "bridge" ||
					prevStateLower === "bridge_abutment" ||
					prevStateLower === "implant" ||
					prevStateLower === "planned_implant" ||
					prevStateLower === "veneer" ||
					prevStateLower === "inlay" ||
					prevStateLower === "onlay" ||
					prevStateLower === "pin" ||
					prevStateLower === "root_canal_treated" ||
					Boolean(prevClinical?.hasCrown) ||
					Boolean(prevClinical?.hasImplant) ||
					(Boolean(prevClinical?.baseState) &&
						prevClinical?.baseState !== "Filled" &&
						prevClinical?.baseState !== "filling");

				const incomingLower = data.state.toLowerCase();
				const isPathologyDefect =
					incomingLower === "caries" ||
					incomingLower === "pulpitis" ||
					incomingLower === "periodontitis" ||
					incomingLower === "wedge" ||
					incomingLower === "attrition" ||
					incomingLower === "calculus" ||
					incomingLower === "crack" ||
					incomingLower === "fracture" ||
					incomingLower === "resorption" ||
					incomingLower.startsWith("mobility") ||
					incomingLower.startsWith("furcation");

				let effectiveState = data.state;
				let effectiveSurfaces = data.surfaces ? normalizeSurfaces(data.surfaces) : null;
				let effectiveClinicalData: Record<string, unknown> | null =
					incomingClinicalData ?? prevClinical ?? null;
				let effectiveNotes: string | null =
					incomingDoctorNotes !== undefined
						? incomingDoctorNotes
						: (prev?.notes && !prev.notes.trim().startsWith("{") ? prev.notes : null);

				let historyNewState = data.state;
				let historyReason = data.clinicalData
					? "Эндодонтический протокол / обработка каналов"
					: (data.reason || null);

				const rawPrevSurfaces = prev?.surfaces ? normalizeSurfaces(prev.surfaces) : [];
				const clinicalFillingSurfaces = Array.isArray(prevClinical?.fillingSurfaces)
					? normalizeSurfaces(prevClinical.fillingSurfaces as string[])
					: [];
				const prevSurfaces = rawPrevSurfaces.length > 0
					? rawPrevSurfaces
					: (clinicalFillingSurfaces.length > 0
						? clinicalFillingSurfaces
						: (isFillingState(prevStateLower) ? ["occlusal"] : []));
				const incomingSurfaces = data.surfaces ? normalizeSurfaces(data.surfaces) : [];
				const isSurfaceMergeable =
					prev &&
					!isOrthopedicBase &&
					areToothStatesSurfaceMergeable(data.state, prevStateLower) &&
					(incomingSurfaces.length > 0 || isCariesState(incomingLower)) &&
					prevSurfaces.length > 0;

				if (isOrthopedicBase && isPathologyDefect) {
					// Наложение сопутствующей патологии на зуб с ортопедическим базисом [CLN-03]
					const existingBaseState =
						typeof prevClinical?.baseState === "string" && prevClinical.baseState.trim().length > 0
							? prevClinical.baseState
							: null;
					const baseStateName =
						existingBaseState ||
						(prevStateLower === "crown" || prevClinical?.hasCrown
							? "Crown"
							: prevStateLower === "implant" || prevClinical?.hasImplant
								? "Implant"
								: prevStateLower === "bridge" || prevStateLower === "bridge_abutment"
									? "Bridge"
									: prevStateLower === "veneer"
										? "Veneer"
										: prevStateLower === "inlay" || prevStateLower === "onlay"
											? "Inlay"
											: prevStateLower === "root_canal_treated"
												? "Root_Canal_Treated"
												: prevStateRaw || "Crown");

					const existingConditions: string[] = Array.isArray(prevClinical?.conditions)
						? prevClinical.conditions.filter((c): c is string => typeof c === "string")
						: [];
					if (!existingConditions.includes(data.state)) {
						existingConditions.push(data.state);
					}

					const compositeClinicalData = {
						...(prevClinical || {}),
						...(data.clinicalData || {}),
						baseState: baseStateName,
						hasCrown:
							prevStateLower === "crown" ||
							Boolean(prevClinical?.hasCrown) ||
							baseStateName === "Crown",
						hasImplant:
							prevStateLower === "implant" ||
							Boolean(prevClinical?.hasImplant) ||
							baseStateName === "Implant",
						hasTreatedCanals:
							prevStateLower === "root_canal_treated" ||
							Boolean(prevClinical?.hasTreatedCanals),
						hasSecondaryCaries:
							incomingLower === "caries"
								? true
								: Boolean(prevClinical?.hasSecondaryCaries),
						condition: incomingLower === "caries" ? "defective" : (prevClinical?.condition || "adequate"),
						conditions: existingConditions,
						defectSurfaces: data.surfaces || prevClinical?.defectSurfaces || null,
						lastPathology: data.state,
						lastPathologyAt: incomingUpdatedAt.toISOString(),
					};

					effectiveState = baseStateName;
					effectiveClinicalData = compositeClinicalData;
					historyNewState = `${baseStateName} + ${data.state}`;
					historyReason =
						data.reason ||
						`Выявлена сопутствующая патология: ${data.state} на конструкции ${baseStateName} (базис сохранен)`;
				} else if (isSurfaceMergeable) {
					// Surface Union Merge [MODBL]: слияние непересекающихся поверхностей кариеса и пломб
					const intersection = incomingSurfaces.filter((s) => prevSurfaces.includes(s));
					const mergedSurfaces = normalizeSurfaces([...prevSurfaces, ...incomingSurfaces]);
					effectiveSurfaces = mergedSurfaces;

					const prevFillingSurfaces: string[] = Array.isArray(prevClinical?.fillingSurfaces)
						? normalizeSurfaces(prevClinical.fillingSurfaces)
						: (isFillingState(prevStateLower) ? prevSurfaces : []);
					const incomingFillingSurfaces: string[] = isFillingState(incomingLower) ? incomingSurfaces : [];
					const combinedFillingSurfaces = normalizeSurfaces([
						...(isCariesState(incomingLower)
							? prevFillingSurfaces.filter((s) => !intersection.includes(s))
							: prevFillingSurfaces),
						...incomingFillingSurfaces,
					]);

					const prevDefectSurfaces: string[] = Array.isArray(prevClinical?.defectSurfaces)
						? normalizeSurfaces(prevClinical.defectSurfaces)
						: (isCariesState(prevStateLower) ? prevSurfaces : []);
					const incomingDefectSurfaces: string[] = isCariesState(incomingLower) ? incomingSurfaces : [];
					const curedSurfaceSet = isFillingState(incomingLower)
						? new Set(incomingSurfaces)
						: new Set<string>();
					const combinedDefectSurfaces = normalizeSurfaces([
						...prevDefectSurfaces.filter((s) => !curedSurfaceSet.has(s)),
						...incomingDefectSurfaces,
					]);

					const hasFilling =
						combinedFillingSurfaces.length > 0 ||
						isFillingState(incomingLower) ||
						(isFillingState(prevStateLower) && !isCariesState(incomingLower));
					const hasCaries =
						combinedDefectSurfaces.length > 0 ||
						(isCariesState(incomingLower) && incomingDefectSurfaces.length === 0);
					const newSecondaryCariesDetected =
						intersection.length > 0 &&
						isCariesState(incomingLower) &&
						(isFillingState(prevStateLower) || prevFillingSurfaces.length > 0);
					const hasSecondaryCaries = isFillingState(incomingLower)
						? (combinedDefectSurfaces.length > 0 &&
							(Boolean(prevClinical?.hasSecondaryCaries) ||
								combinedDefectSurfaces.some((s) => prevFillingSurfaces.includes(s))))
						: (newSecondaryCariesDetected || Boolean(prevClinical?.hasSecondaryCaries));

					// Map surfaces into canonical ToothSurfaceStateMap using mergeToothSurfaceStates
					const prevSurfaceMap: ToothSurfaceStateMap = {};
					for (const s of prevFillingSurfaces) {
						const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
						if (key) prevSurfaceMap[key] = "filling";
					}
					for (const s of prevDefectSurfaces) {
						const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
						if (key) prevSurfaceMap[key] = "caries";
					}
					const incomingSurfaceMap: ToothSurfaceStateMap = {};
					if (isFillingState(incomingLower)) {
						for (const s of incomingSurfaces) {
							const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
							if (key) incomingSurfaceMap[key] = "filling";
						}
					} else if (isCariesState(incomingLower)) {
						for (const s of incomingSurfaces) {
							const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
							if (key) {
								incomingSurfaceMap[key] = intersection.includes(s) ? "secondary_caries" : "caries";
							}
						}
					}
					const surfaceStateMap = mergeToothSurfaceStates(prevSurfaceMap, incomingSurfaceMap);

					if (combinedFillingSurfaces.length > 0 && combinedDefectSurfaces.length > 0) {
						effectiveState = "Filled + Caries";
					} else if (isCariesState(incomingLower)) {
						effectiveState = data.state;
					} else if (isFillingState(incomingLower)) {
						effectiveState =
							combinedDefectSurfaces.length > 0
								? "Filled + Caries"
								: data.state;
					}

					const resolvedBaseState =
						isCompositeBase || isFillingState(incomingLower) || combinedFillingSurfaces.length > 0
							? "Filled"
							: (typeof prevClinical?.baseState === "string" ? prevClinical.baseState : undefined);

					const compositeClinicalData = {
						...(prevClinical || {}),
						...(data.clinicalData || {}),
						baseState: resolvedBaseState,
						fillingSurfaces: combinedFillingSurfaces.length > 0 ? combinedFillingSurfaces : undefined,
						defectSurfaces: combinedDefectSurfaces.length > 0 ? combinedDefectSurfaces : undefined,
						surfaceStateMap,
						hasFilling,
						hasCaries,
						hasSecondaryCaries,
						compositeCondition: hasSecondaryCaries ? "defective" : "adequate",
						lastPathology: isCariesState(incomingLower) ? data.state : prevClinical?.lastPathology,
						lastPathologyAt: incomingUpdatedAt.toISOString(),
					};

					effectiveClinicalData = compositeClinicalData;
					historyNewState = effectiveState === "Filled + Caries"
						? `Filled [${combinedFillingSurfaces.join(",")}] + Caries [${combinedDefectSurfaces.join(",")}]`
						: `${prevStateRaw} [${prevSurfaces.join(",")}] + ${data.state} [${incomingSurfaces.join(",")}]`;
					historyReason =
						data.reason ||
						`Surface Union Merge (MODBL): сохранена пломба на [${combinedFillingSurfaces.join(",")}], кариес на [${combinedDefectSurfaces.join(",")}] (состояние: ${effectiveState})`;
				} else if (
					!isPathologyDefect &&
					(incomingLower === "crown" ||
						incomingLower === "implant" ||
						incomingLower === "filled" ||
						incomingLower === "veneer" ||
						incomingLower === "inlay")
				) {
					// Установка новой ортопедической конструкции или пломбы
					const prevConditions = Array.isArray(prevClinical?.conditions)
						? prevClinical.conditions.filter((c): c is string => typeof c === "string")
						: [];
					const cured = [...prevConditions];
					if (prevStateRaw && isPathologyDefect && !cured.includes(prevStateRaw)) {
						cured.push(prevStateRaw);
					}

					const compositeClinicalData = {
						...(prevClinical || {}),
						...(data.clinicalData || {}),
						baseState: data.state,
						hasCrown: incomingLower === "crown",
						hasImplant: incomingLower === "implant",
						hasFilling: incomingLower === "filled",
						hasCaries: false,
						hasSecondaryCaries: false,
						defectSurfaces: undefined,
						condition: "adequate",
						compositeCondition: "adequate",
						conditions: [],
						curedConditions: cured,
						restoredAt: incomingUpdatedAt.toISOString(),
						fillingSurfaces: incomingLower === "filled" ? incomingSurfaces : undefined,
					};

					effectiveClinicalData = compositeClinicalData;
					historyReason =
						data.reason ||
						`Восстановление / ортопедическое лечение (${data.state})`;
				}

				const effectiveCanalMeasurements =
					data.canalMeasurements !== undefined
						? data.canalMeasurements
						: (prev?.canalMeasurements ?? null);

				// Обогащение канонического SSOT toothStates расширенными клиническими атрибутами (детство, подвижность, резорбция)
				const isPrimaryTooth = (toothNumber >= 51 && toothNumber <= 85) || Boolean(data.isPrimaryPediatric) || Boolean(prevClinical?.isPrimaryPediatric);
				const effectiveMobility = data.mobility ?? data.mobilityDegree ?? data.clinicalData?.mobility ?? data.clinicalData?.mobilityDegree ?? prevClinical?.mobility ?? prevClinical?.mobilityDegree;
				const effectiveResorption = data.resorptionStage ?? data.clinicalData?.resorptionStage ?? prevClinical?.resorptionStage;
				const effectivePediatricCrown = data.pediatricCrownPresent ?? data.clinicalData?.pediatricCrownPresent ?? prevClinical?.pediatricCrownPresent;
				const effectiveSecondaryCaries = data.secondaryCariesUnderFilling ?? data.clinicalData?.secondaryCariesUnderFilling ?? prevClinical?.secondaryCariesUnderFilling;

				if (isPrimaryTooth || effectiveMobility !== undefined || effectiveResorption !== undefined || effectivePediatricCrown !== undefined || effectiveSecondaryCaries !== undefined) {
					const existingObj = effectiveClinicalData || prevClinical || {};
					const enrichedClinicalData = {
						...existingObj,
						...(isPrimaryTooth ? { isPrimaryPediatric: true } : {}),
						...(effectiveMobility !== undefined ? { mobility: effectiveMobility, mobilityDegree: effectiveMobility } : {}),
						...(effectiveResorption !== undefined ? { resorptionStage: effectiveResorption } : {}),
						...(effectivePediatricCrown !== undefined ? { pediatricCrownPresent: effectivePediatricCrown } : {}),
						...(effectiveSecondaryCaries !== undefined ? { secondaryCariesUnderFilling: effectiveSecondaryCaries } : {}),
					};
					effectiveClinicalData = enrichedClinicalData;
				}

				// 1. Record transition into append-only tooth state history audit log
				historyToInsert.push({
					organizationId,
					patientId,
					visitId: data.visitId ?? null,
					toothNumber,
					previousState: prev?.state ?? null,
					newState: historyNewState,
					previousSurfaces: prev?.surfaces ?? null,
					newSurfaces: effectiveSurfaces || null,
					clinicalData: effectiveClinicalData,
					canalMeasurements: effectiveCanalMeasurements,
					changedByUserId: actorUserId,
					reason: historyReason,
					changedAt: incomingUpdatedAt,
				});

				statesToInsert.push({
					organizationId,
					patientId,
					toothNumber,
					state: effectiveState,
					surfaces: effectiveSurfaces || null,
					notes: effectiveNotes,
					clinicalData: effectiveClinicalData,
					canalMeasurements: effectiveCanalMeasurements,
					updatedAt: incomingUpdatedAt,
					isSynced: false,
					version: Math.max(prevVersion + 1, incomingVersion, 1),
				});
			} else {
				const effectiveCanalMeasurements =
					data.canalMeasurements !== undefined
						? data.canalMeasurements
						: (prev?.canalMeasurements ?? null);

				// Stale offline mutation: Server active state is newer and wins (LWW),
				// but offline mutation transition is STILL appended to toothStateHistory for full 043/u audit trail!
				historyToInsert.push({
					organizationId,
					patientId,
					visitId: data.visitId ?? null,
					toothNumber,
					previousState: null,
					newState: data.state,
					previousSurfaces: null,
					newSurfaces: data.surfaces || null,
					clinicalData: (data.clinicalData as Record<string, unknown> | null) ?? null,
					canalMeasurements: effectiveCanalMeasurements,
					changedByUserId: actorUserId,
					reason:
						data.reason ||
						"Оффлайн-синхронизация (LWW архив)",
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

		return currentStates.map((row) => {
			const clin =
				(row.clinicalData as Record<string, unknown> | null) ||
				parseClinicalDataFromNotes(row.notes);
			const cleanNotes =
				row.notes &&
				row.notes.trim().startsWith("{") &&
				row.notes.trim().endsWith("}")
					? null
					: row.notes;
			return {
				toothNumber: row.toothNumber,
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
		});
	});

	if (!skipBroadcast) {
		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_ODONTOGRAM",
				payload: { patientId, states: inserted },
			});
		});
	}

	return inserted;
}

export function registerStatusRoutes(app: FastifyInstance) {
	const getToothStatesHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"tooth states read",
		);
		if (!organizationId) return;
		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({ error: "InvalidPatientId" });
		}
		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Доступ к зубной формуле и диагнозам разрешен ТОЛЬКО клиническому персоналу
		const identity = getRequestIdentity(request) as ExtendedRequestIdentity;
		const reqUser = extractRequestUser(request);
		// Роль определяется ИСКЛЮЧИТЕЛЬНО из подписанного токена или проверенного контекста request.user.
		const staffRole = identity.role ?? reqUser?.role ?? null;

		// Fail-closed: если токен сотрудника отсутствует (голый токен клиники), немедленно 403 Forbidden!
		if (!staffRole) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis: "Попытка анонимного доступа к зубной формуле без токена медработника (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: null,
				message: "Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): требуется авторизованный токен медработника",
			});
		}

		const evalAccess = evaluateClinicalAccess(staffRole, {
			clinicalRole: identity.clinicalRole ?? reqUser?.clinicalRole ?? null,
			canSignMedicalRecords: identity.canSignMedicalRecords ?? reqUser?.canSignMedicalRecords ?? false,
		});

		if (!evalAccess.hasClinicalAccess) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis: "Попытка несанкционированного доступа к зубной формуле (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: staffRole,
				message: `Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const rawStates = await db
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
				),
			);

		// Фиксация правомерного доступа врача к зубной формуле в журнале аудита (152-ФЗ)
		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId,
			action: "VIEW_ODONTOGRAM",
			diagnosis: "Зубная формула и одонтограмма (32 зуба)",
		});

		const states = rawStates.map((row) => {
			const clin =
				(row.clinicalData as Record<string, unknown> | null) ||
				parseClinicalDataFromNotes(row.notes);
			const cleanNotes =
				row.notes &&
				row.notes.trim().startsWith("{") &&
				row.notes.trim().endsWith("}")
					? null
					: row.notes;
			return {
				toothNumber: row.toothNumber,
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
		});

		return reply.send({ success: true, states });
	};

	app.get("/api/patients/:patientId/tooth-states", getToothStatesHandler);
	app.get("/api/patients/:patientId/odontogram", getToothStatesHandler);
	app.get("/api/odontogram/patient/:patientId", getToothStatesHandler);

	const postToothStateMutationHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
		preResolvedOrgId?: string,
		preExtractedIdempotencyKey?: string | null,
	) => {
		const idempotencyKey =
			preExtractedIdempotencyKey !== undefined
				? preExtractedIdempotencyKey
				: extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

		const organizationId =
			preResolvedOrgId ??
			(await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"odontogram status mutation",
			));
		if (!organizationId) return;

		const parsed = odontogramStatusMutationSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ToothStateValidationError",
				message: "Ошибка валидации зубной формулы. Проверьте номер зуба и статус.",
				details: parsed.error.format(),
			});
		}

		const patientId = parsed.data.patientId;
		if (!patientId || !UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Требуется корректный идентификатор пациента (patientId UUID)",
			});
		}

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		const toothNumbers =
			parsed.data.toothNumbers ??
			(parsed.data.toothNumber !== undefined ? [parsed.data.toothNumber] : []);
		const actorUserId = getRequestIdentity(request).userId;

		const inserted = await applyToothStateMutation(
			organizationId,
			patientId,
			actorUserId,
			{
				...parsed.data,
				toothNumbers,
				surfaces: parsed.data.surfaces as string[] | undefined,
			},
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			states: inserted,
			status: inserted[0]?.state ?? parsed.data.state,
		});
	};

	// 1. Unified Canonical Routes: POST /api/odontogram/status & POST /api/odontogram/tooth-state
	app.post("/api/odontogram/status", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"odontogram status mutation",
		);
		if (!organizationId) return;
		return postToothStateMutationHandler(request, reply, organizationId, idempotencyKey);
	});

	app.post("/api/odontogram/tooth-state", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"odontogram tooth-state mutation",
		);
		if (!organizationId) return;
		return postToothStateMutationHandler(request, reply, organizationId, idempotencyKey);
	});

	// 2. Patient-scoped Route: POST /api/patients/:patientId/odontogram/status
	app.post("/api/patients/:patientId/odontogram/status", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"patient odontogram status mutation",
		);
		if (!organizationId) return;

		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({ error: "InvalidPatientId" });
		}
		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		const bodyObj =
			typeof request.body === "object" && request.body
				? (request.body as Record<string, unknown>)
				: {};
		const parsed = odontogramStatusMutationSchema.safeParse({
			...bodyObj,
			patientId,
		});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ToothStateValidationError",
				message: "Ошибка валидации зубной формулы.",
				details: parsed.error.format(),
			});
		}

		const toothNumbers =
			parsed.data.toothNumbers ??
			(parsed.data.toothNumber !== undefined ? [parsed.data.toothNumber] : []);
		const actorUserId = getRequestIdentity(request).userId;

		const inserted = await applyToothStateMutation(
			organizationId,
			patientId,
			actorUserId,
			{
				...parsed.data,
				toothNumbers,
				surfaces: parsed.data.surfaces as string[] | undefined,
			},
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			states: inserted,
			status: inserted[0]?.state ?? parsed.data.state,
		});
	});

	// 3. Backward-compatible Batch Route: POST /api/patients/:patientId/tooth-states/batch
	app.post(
		"/api/patients/:patientId/tooth-states/batch",
		async (request, reply) => {
			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
				});
			}

			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth states update",
			);
			if (!organizationId) return;
			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = batchToothStateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ToothStateValidationError",
					message: "Ошибка валидации зубной формулы. Проверьте номера зубов и статус.",
					details: parsed.error.format(),
				});
			}

			const actorUserId = getRequestIdentity(request).userId;

			const updates = parsed.data.updates;
			if (updates && updates.length > 0) {
				const sortedUpdates = [...updates].sort((a, b) => a.toothNumber - b.toothNumber);
				const allInserted: unknown[] = [];
				await withTenantCtx(organizationId, async () => {
					for (const u of sortedUpdates) {
						const res = await applyToothStateMutation(
							organizationId,
							patientId,
							actorUserId,
							{
								toothNumbers: [u.toothNumber],
								state: u.state ?? "Healthy",
								surfaces: u.surfaces,
								resorptionStage: u.resorptionStage,
								mobility: u.mobility ?? u.mobilityDegree,
								mobilityDegree: u.mobilityDegree ?? u.mobility,
								isPrimaryPediatric: u.isPrimaryPediatric ?? (u.toothNumber >= 51 && u.toothNumber <= 85),
								notes: u.notes,
								visitId: parsed.data.visitId,
								updatedAt: parsed.data.updatedAt,
								reason: parsed.data.reason || "Резорбция корней / подвижность молочного зуба",
							},
							true,
						);
						allInserted.push(...res);
					}
				});
				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "UPDATE_ODONTOGRAM",
						payload: { patientId, states: allInserted },
					});
				});
				if (idempotencyKey) {
					reply.header("Idempotency-Key", idempotencyKey);
				}
				return reply.send({ success: true, states: allInserted });
			}

			const toothNumbers =
				parsed.data.toothNumbers && parsed.data.toothNumbers.length > 0
					? parsed.data.toothNumbers
					: [];

			const inserted = await applyToothStateMutation(
				organizationId,
				patientId,
				actorUserId,
				{
					...parsed.data,
					toothNumbers,
					surfaces: parsed.data.surfaces as string[] | undefined,
				},
			);

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "UPDATE_ODONTOGRAM",
					payload: { patientId, states: inserted },
				});
			});
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}
			return reply.send({ success: true, states: inserted });
		},
	);
}
