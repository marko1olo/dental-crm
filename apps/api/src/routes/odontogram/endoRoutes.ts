import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { onTenantTxCommit, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	toothStateHistory,
	toothStates,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import {
	type EndoToothClinicalData,
	clinicalToothStateSchema,
	endoCanalMeasurementSchema,
	parseClinicalDataFromNotes,
	UUID_SHAPE,
} from "./types.js";
import { z } from "zod";

function isDbUnavailable(err: unknown): boolean {
	const collect = (e: unknown): string => {
		if (!e) return "";
		if (e instanceof Error) {
			const cause = "cause" in e && e.cause ? ` ${collect(e.cause)}` : "";
			return `${e.message}${cause}`;
		}
		return String(e);
	};
	const msg = collect(err);
	return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|password authentication failed|connection refused/i.test(msg);
}

/**
 * Допустимые показания апекслокатора (включая микроны, миллиметры и рентгенологические отметки)
 * Устраняет 400 Bad Request при выборе любых вариантов в UI (Мандаты 8e, 8n).
 */
export const validApexReadings: ReadonlySet<string> = new Set([
	"0.0 (Apex)",
	"0.0 Apex",
	"0.0",
	"-0.5 мм",
	"-0.5 mm",
	"-0.5 Apex",
	"-0.5",
	"+0.5 мм",
	"+0.5 mm",
	"+0.5 Apex",
	"+0.5",
	"-1.0 мм",
	"-1.0 mm",
	"-1.0 Apex",
	"-1.0",
	"-1.5 мм",
	"-1.5 mm",
	"-1.5 Apex",
	"-1.5",
	"+1.0 мм",
	"+1.0 mm",
	"+1.0 Apex",
	"+1.0",
	"+1.5 мм",
	"+1.5 mm",
	"+1.5 Apex",
	"+1.5",
	"За апексом",
	"Over-apex",
	"Apex 0.0",
	"0.0 Apex (Raypex 6)",
]);

/**
 * Расширенная схема для сохранения эндодонтического протокола каналов зуба
 * Включает машинные инструменты NiTi (WaveOne/ProTaper), ирригацию, апекс-ориентиры, силер и Ca(OH)2.
 */
export const endoUpsertPayloadSchema = z
	.object({
		toothNumber: z.number().int().min(11).max(85).optional().nullable(),
		canals: z.array(endoCanalMeasurementSchema).default([]),
		irrigation: z.string().trim().max(1000).optional().nullable(),
		rotarySystem: z.string().trim().max(1000).optional().nullable(),
		radiologyControl: z.string().trim().max(1000).optional().nullable(),
		apexLocator: z.string().trim().max(1000).optional().nullable(),
		notes: z.string().trim().max(2000).optional().nullable(),
		stageStamp: z.enum(["COMPLETED", "TEMP_CAOH2", "DRAFT"]).optional().nullable().default("COMPLETED"),
		state: clinicalToothStateSchema.optional(),
		surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
		visitId: z
			.string()
			.optional()
			.nullable()
			.transform((v) => (v && UUID_SHAPE.test(v) ? v : null)),
	})
	.strict();

export type EndoUpsertPayload = z.infer<typeof endoUpsertPayloadSchema>;

const endoParamsSchema = z
	.object({
		patientId: z.string().optional(),
		toothNumber: z.string().optional(),
		tooth: z.string().optional(),
	})
	.strict();

function parseEndoParams(rawParams: unknown) {
	const parsed = endoParamsSchema.safeParse(rawParams ?? {});
	return parsed.success ? parsed.data : {};
}

/**
 * Fastify-плагин для эндодонтических измерений корневых каналов и обтурации зуба
 * Обеспечивает честное сохранение в PostgreSQL 18, аудит 152-ФЗ и автономию врача (Мандат 8e).
 */
export function registerEndoRoutes(app: FastifyInstance): void {
	// Хендлер чтения эндодонтии (GET)
	const getEndoHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"tooth endo read",
		);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ ст. 13: Врачебная тайна
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			request.user?.role ??
			null;

		const params = parseEndoParams(request.params);

		// Fail-closed для анонимов без токена сотрудника
		if (!staffRole) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId: params.patientId || "unknown",
				action: "ACCESS_DENIED_ENDO",
				diagnosis: "Попытка анонимного доступа к эндодонтической карте (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.endo.read",
				role: null,
				message: "Отказ в доступе к эндодонтической карте (152-ФЗ / 323-ФЗ ст. 13): требуется авторизованный токен медработника",
			});
		}

		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId: params.patientId || "unknown",
				action: "ACCESS_DENIED_ENDO",
				diagnosis: "Попытка несанкционированного доступа к эндодонтической карте неклиническим персоналом",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.endo.read",
				role: staffRole,
				message: `Отказ в доступе к эндодонтической карте (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const patientId = params.patientId;
		const toothParam = params.toothNumber ?? params.tooth;
		const toothNumber = parseInt(String(toothParam), 10);

		if (
			!patientId ||
			typeof patientId !== "string" ||
			patientId.trim().length === 0 ||
			!UUID_SHAPE.test(patientId.trim()) ||
			Number.isNaN(toothNumber) ||
			toothNumber < 11 ||
			toothNumber > 85
		) {
			return reply.code(400).send({ error: "InvalidParameters", message: "Некорректный ID пациента или номер зуба" });
		}

		let patientExists: { id: string } | null = null;
		let firstRow: {
			toothNumber: number;
			state: string;
			surfaces: unknown;
			notes: string | null;
			canalMeasurements: unknown;
			clinicalData: unknown;
		} | undefined;
		try {
			const loaded = await withTenantReadCtx(organizationId, async (tx) => {
				const foundPatient = await ensurePatientInOrganization(
					patientId,
					organizationId,
					tx,
				);
				if (!foundPatient) {
					return { patientExists: null, firstRow: undefined };
				}
				const [row] = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
						canalMeasurements: toothStates.canalMeasurements,
						clinicalData: toothStates.clinicalData,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							eq(toothStates.toothNumber, toothNumber),
						),
					)
					.limit(1);
				return { patientExists: foundPatient, firstRow: row };
			});
			patientExists = loaded.patientExists;
			firstRow = loaded.firstRow;
		} catch (dbErr) {
			if (isDbUnavailable(dbErr)) {
				return reply.code(503).send({
					error: "ServiceUnavailable",
					message: "База данных временно недоступна. Параметры корневых каналов недоступны.",
				});
			}
			throw dbErr;
		}

		if (!patientExists) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		let tooth: {
			toothNumber: number;
			state: string;
			surfaces: string[] | null;
			notes: string | null;
			canalMeasurements: EndoToothClinicalData["canals"] | null;
			clinicalData: EndoToothClinicalData | null;
		} | undefined;
		if (firstRow) {
			tooth = {
				toothNumber: firstRow.toothNumber,
				state: firstRow.state,
				surfaces: Array.isArray(firstRow.surfaces) ? (firstRow.surfaces as string[]) : null,
				notes: firstRow.notes,
				canalMeasurements: Array.isArray(firstRow.canalMeasurements)
					? (firstRow.canalMeasurements as EndoToothClinicalData["canals"])
					: null,
				clinicalData: (firstRow.clinicalData && typeof firstRow.clinicalData === "object")
					? (firstRow.clinicalData as EndoToothClinicalData)
					: null,
			};
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId,
			action: "VIEW_ENDO_CHART",
			diagnosis: `Просмотр параметров корневых каналов зуба #${toothNumber}`,
		});

		if (!tooth) {
			const emptyPayload = {
				toothNumber,
				state: "Healthy",
				clinicalData: null,
				canalMeasurements: [],
			};
			return reply.send({
				success: true,
				data: emptyPayload,
				...emptyPayload,
			});
		}

		let resolvedClinicalData: EndoToothClinicalData | null =
			tooth.clinicalData || parseClinicalDataFromNotes(tooth.notes);
		if (tooth.canalMeasurements && Array.isArray(tooth.canalMeasurements) && tooth.canalMeasurements.length > 0) {
			const firstCanalMeta = (tooth.canalMeasurements[0] && typeof tooth.canalMeasurements[0] === "object")
				? (tooth.canalMeasurements[0] as Record<string, unknown>)
				: undefined;

			resolvedClinicalData = {
				toothNumber: tooth.toothNumber,
				canals: tooth.canalMeasurements,
				irrigation: (resolvedClinicalData?.irrigation as string | undefined) ?? (firstCanalMeta?.irrigation as string | undefined) ?? null,
				rotarySystem: (resolvedClinicalData?.rotarySystem as string | undefined) ?? (firstCanalMeta?.rotarySystem as string | undefined) ?? null,
				radiologyControl: (resolvedClinicalData?.radiologyControl as string | undefined) ?? (firstCanalMeta?.radiologyControl as string | undefined) ?? null,
				apexLocator: (resolvedClinicalData?.apexLocator as string | undefined) ?? (firstCanalMeta?.apexLocator as string | undefined) ?? (tooth.canalMeasurements[0]?.apexLocatorReading || null),
				notes: tooth.notes && !tooth.notes.startsWith("{") ? tooth.notes : (resolvedClinicalData?.notes || ""),
				stageStamp: (resolvedClinicalData?.stageStamp as "COMPLETED" | "TEMP_CAOH2" | "DRAFT" | undefined) ?? (firstCanalMeta?.stageStamp as "COMPLETED" | "TEMP_CAOH2" | "DRAFT" | undefined) ?? (tooth.state === "Pulpitis" ? "TEMP_CAOH2" : "COMPLETED"),
				updatedAt: resolvedClinicalData?.updatedAt || new Date().toISOString(),
			};
		}

		const payload = {
			toothNumber: tooth.toothNumber,
			state: tooth.state,
			surfaces: tooth.surfaces,
			notes: tooth.notes && !tooth.notes.startsWith("{") ? tooth.notes : (resolvedClinicalData?.notes || ""),
			canalMeasurements: tooth.canalMeasurements || resolvedClinicalData?.canals || [],
			clinicalData: resolvedClinicalData,
		};

		return reply.send({
			success: true,
			data: payload,
			...payload,
		});
	};

	// Хендлер записи эндодонтии (POST)
	const postEndoHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"tooth endo save",
		);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ ст. 13: Врачебная тайна и запись
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			request.user?.role ??
			null;

		const params = parseEndoParams(request.params);

		if (!staffRole) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId: params.patientId || "unknown",
				action: "ACCESS_DENIED_ENDO_WRITE",
				diagnosis: "Попытка анонимной записи эндодонтических данных (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.endo.write",
				role: null,
				message: "Отказ в записи эндодонтических данных: требуется авторизованный токен медработника",
			});
		}

		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId: params.patientId || "unknown",
				action: "ACCESS_DENIED_ENDO_WRITE",
				diagnosis: "Попытка записи эндодонтических данных неклиническим персоналом",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.endo.write",
				role: staffRole,
				message: `Отказ в изменении эндодонтических данных (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const patientId = params.patientId;
		const toothParam = params.toothNumber ?? params.tooth;
		const toothNumber = parseInt(String(toothParam), 10);

		if (
			!patientId ||
			typeof patientId !== "string" ||
			patientId.trim().length === 0 ||
			!UUID_SHAPE.test(patientId.trim()) ||
			Number.isNaN(toothNumber) ||
			toothNumber < 11 ||
			toothNumber > 85
		) {
			return reply.code(400).send({ error: "InvalidParameters", message: "Некорректный ID пациента или номер зуба" });
		}

		const parsed = endoUpsertPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "EndoValidationError",
				message: "Некорректные параметры корневых каналов.",
				details: parsed.error.format(),
			});
		}

		const actorUserId = getRequestIdentity(request).userId;
		const now = new Date();

		// Нормализация каналов с сохранением флага облитерации, апекслокатора и клинической защитой молочного прикуса 51–85 (Мандаты 8e, 8n, 8bj)
		const isDeciduous = toothNumber >= 51 && toothNumber <= 85;
		const sanitizedCanals = parsed.data.canals.map((c) => {
			const isObliterated = Boolean(c.isObliterated);
			let workingLength: number;
			if (isObliterated) {
				workingLength = 0;
			} else {
				const raw = c.workingLengthMm;
				const parsedWl =
					typeof raw === "number"
						? raw
						: Number.parseFloat(String(raw || "").replace(",", "."));
				if (Number.isNaN(parsedWl) || !Number.isFinite(parsedWl) || parsedWl <= 0) {
					workingLength = 0;
				} else {
					// Валидация строго в физиологическом диапазоне (от 5 мм для молочных зубов 51-85, от 10 мм для постоянных 11-48) с шагом 0.5 мм
					const minWl = isDeciduous ? 5 : 10;
					const clamped = Math.max(minWl, Math.min(35, Math.round(parsedWl * 2) / 2));
					workingLength = clamped;
				}
			}

			const rawApex = (c.apexLocatorReading || parsed.data.apexLocator || "0.0 (Apex)").trim();
			const apexLocatorReading = rawApex || "0.0 (Apex)";

			// Клиническая защита молочных зубов 51–85: категорический запрет постоянной гуттаперчи
			const defaultCone = isDeciduous ? "Резорбируемая паста" : "Гуттаперча 0.04";
			const rawMasterCone = c.masterCone || defaultCone;
			const safeMasterCone = isDeciduous && /гуттаперч|gutta/i.test(rawMasterCone)
				? "Резорбируемая паста"
				: rawMasterCone;

			const rawObt = c.obturationTechnique || (isDeciduous ? "Резорбируемая паста (гидроксид кальция / цинкоксидэвгенол)" : "Гуттаперча + эпоксидный полимерный силер");
			const safeObt = isDeciduous && /гуттаперч|gutta|латеральн|вертикальн/i.test(rawObt)
				? "Резорбируемая паста (гидроксид кальция / цинкоксидэвгенол)"
				: rawObt;

			const rawSealer = c.sealer || (isDeciduous ? "Резорбируемый герметик" : "Эпоксидный полимерный силер");
			const safeSealer = isDeciduous && /ah\s*plus|bioroot|adseal|sealapex|эпоксид/i.test(rawSealer)
				? "Резорбируемый герметик"
				: rawSealer;

			return {
				...c,
				isObliterated,
				workingLengthMm: workingLength,
				apexLocatorReading,
				masterFile: c.masterFile || c.masterApicalFile || "#25.04",
				masterCone: safeMasterCone,
				obturationTechnique: safeObt,
				sealer: safeSealer,
				referencePoint: c.referencePoint || "Бугор зуба",
			};
		});

		const clinicalNotesText = parsed.data.notes || "";
		const finalIrrigation = parsed.data.irrigation ?? null;
		const finalRotary = parsed.data.rotarySystem ?? null;
		const finalRadiology = parsed.data.radiologyControl ?? null;
		const finalApex = parsed.data.apexLocator ?? sanitizedCanals[0]?.apexLocatorReading ?? null;
		const finalStageStamp = parsed.data.stageStamp ?? "COMPLETED";

		const enrichedCanals = sanitizedCanals.map((c, idx) => ({
			...c,
			...(idx === 0
				? {
						irrigation: finalIrrigation,
						rotarySystem: finalRotary,
						radiologyControl: finalRadiology,
						apexLocator: finalApex,
						stageStamp: finalStageStamp,
					}
				: {}),
		}));

		const clinicalData: EndoToothClinicalData = {
			toothNumber,
			canals: sanitizedCanals,
			irrigation: finalIrrigation,
			rotarySystem: finalRotary,
			radiologyControl: finalRadiology,
			apexLocator: finalApex,
			notes: clinicalNotesText,
			stageStamp: finalStageStamp,
			updatedAt: now.toISOString(),
		};

		try {
			const txResult = await withTenantWriteCtx(organizationId, async (tx) => {
				if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
					return { kind: "patient_not_found" as const };
				}
				const [existing] = await tx
					.select({
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
						canalMeasurements: toothStates.canalMeasurements,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							eq(toothStates.toothNumber, toothNumber),
						),
					)
					.limit(1);

				// Ликвидация подлога диагноза: если у пациента пульпит (K04.0), диагноз сохраняется!
				// При наложении Ca(OH)2 не навязываем принудительно Periodontitis, если исходно был Pulpitis.
				const isPulpitis = existing?.state === "Pulpitis" || (parsed.data.state && /pulpitis/i.test(parsed.data.state));
				const defaultStateByStage = parsed.data.stageStamp === "TEMP_CAOH2"
					? (isPulpitis ? "Pulpitis" : (existing?.state || "Pulpitis"))
					: "Root_Canal_Treated";

				const targetState =
					parsed.data.state ||
					existing?.state ||
					defaultStateByStage;

				const targetSurfaces = parsed.data.surfaces || existing?.surfaces || null;

				// Защита заметок врача: если notes не передан или пустой — сохраняем существующий existing.notes
				const finalNotesText = clinicalNotesText.trim().length > 0 ? clinicalNotesText : (existing?.notes ?? "");

				const canalSummary = sanitizedCanals
					.map((c) => {
						const obli = c.isObliterated ? " [облитерирован]" : "";
						const apex = c.apexLocatorReading ? ` [Apex: ${c.apexLocatorReading}]` : "";
						return `${c.canalName}: WL ${c.workingLengthMm || "—"} мм (${c.masterFile || c.masterApicalFile || "MAF"}/${c.taper || ""}, ${c.obturationTechnique || "обтурация"})${apex}${obli}`;
					})
					.join("; ");

				const endoReason = `Эндодонтия #${toothNumber} [${sanitizedCanals.length} к.]: ${canalSummary || "обработка и обтурация"}`;

				await tx.insert(toothStateHistory).values({
					organizationId,
					patientId,
					visitId: parsed.data.visitId ?? null,
					toothNumber,
					previousState: existing?.state ?? null,
					newState: targetState,
					previousSurfaces: existing?.surfaces ?? null,
					newSurfaces: targetSurfaces,
					clinicalData: clinicalData,
					canalMeasurements: enrichedCanals,
					changedByUserId: actorUserId && UUID_SHAPE.test(actorUserId) ? actorUserId : null,
					reason: endoReason,
					changedAt: now,
				});

				// Атомарный Drizzle Upsert без деструктивного delete (Мандат 8bk / SEV-1)
				const [upsertedRow] = await tx
					.insert(toothStates)
					.values({
						organizationId,
						patientId,
						toothNumber,
						state: targetState,
						surfaces: targetSurfaces,
						notes: finalNotesText,
						clinicalData: clinicalData,
						canalMeasurements: enrichedCanals,
						updatedAt: now,
						isSynced: false,
						version: 1,
					})
					.onConflictDoUpdate({
						target: [toothStates.organizationId, toothStates.patientId, toothStates.toothNumber],
						set: {
							state: targetState,
							surfaces: targetSurfaces,
							notes: finalNotesText,
							clinicalData: clinicalData,
							canalMeasurements: enrichedCanals,
							updatedAt: now,
							isSynced: false,
							version: sql`${toothStates.version} + 1`,
						},
					})
					.returning({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
						clinicalData: toothStates.clinicalData,
						canalMeasurements: toothStates.canalMeasurements,
					});

				const resolvedClinicalData: EndoToothClinicalData = {
					...clinicalData,
					notes: finalNotesText,
				};

				const responsePayload = {
					toothNumber: upsertedRow?.toothNumber ?? toothNumber,
					state: upsertedRow?.state ?? targetState,
					surfaces: upsertedRow?.surfaces ?? targetSurfaces,
					notes: upsertedRow?.notes ?? finalNotesText,
					canalMeasurements: upsertedRow?.canalMeasurements ?? sanitizedCanals,
					clinicalData: resolvedClinicalData,
				};

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "UPDATE_ODONTOGRAM",
						payload: { patientId, states: [responsePayload] },
					});
				});

				return { kind: "ok" as const, payload: responsePayload };
			});

			if (txResult.kind === "patient_not_found") {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
			}
			const updated = txResult.payload;

			return reply.send({ success: true, data: updated, ...updated });
		} catch (dbErr) {
			if (isDbUnavailable(dbErr)) {
				return reply.code(503).send({
					error: "ServiceUnavailable",
					message: "База данных временно недоступна. Параметры корневых каналов не сохранены.",
				});
			}
			throw dbErr;
		}
	};

	// Регистрация канонического пути (в хендлере поддержан алиас :tooth)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/patients/:patientId/tooth-states/:toothNumber/endo",
		permission: "public",
		handler: async ({ request, reply }) => getEndoHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/patients/:patientId/tooth-states/:toothNumber/endo",
		permission: "public",
		handler: async ({ request, reply }) => postEndoHandler(request, reply),
	});
}

export default registerEndoRoutes;
