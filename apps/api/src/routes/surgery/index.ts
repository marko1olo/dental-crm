/**
 * apps/api/src/routes/surgery/index.ts
 *
 * Dedicated Fastify route plugin for Outpatient Surgery & Dental Implantology.
 * Standards:
 * - Mandate 8e: Doctor & nurse autonomy at the dental chair (zero blocking disabled buttons, 1-click write-offs).
 * - Mandate 8i: Strictly outpatient dental chair bounded context (no hospital bed-days, laparotomy, ICU, transfusion bloat).
 * - Mandate 8s: Universal anti-bloat (single canonical source, zero fake procedural dioramas).
 * - Mandate 8n: Solo doctor & small clinic sovereignty (soft warehouse overdraft, no 3-person commissions).
 * - SanPiN 3.3686-21: Carpule anesthetics are Class B medical waste, disposed in 1 click without narcotic PKU.
 */

import {
	CANONICAL_SURGICAL_OPERATION_NORMS,
	createSurgicalProtocolSchema,
	surgicalQuickDeductSchema,
	evaluateWarehouseOverdraft,
	rublesToKopecks,
	kopecksToRubles,
	parseKopecks,
	computePayloadHash,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import {
	patientInvoices,
	patients,
	toothStateHistory,
	toothStates,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { TreatmentConsumablesService, type UnifiedStockDeductionResult } from "../../services/treatmentConsumablesService.js";

export async function registerSurgeryRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. GET /api/surgery/protocols/templates
	 * Возвращает шаблоны хирургических протоколов с физиологической нормой по умолчанию
	 * (Код услуги прейскуранта, Медицинская карта приёма, Мандаты 8e, 8i).
	 */
	app.get("/api/surgery/protocols/templates", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		return reply.send({
			success: true,
			count: CANONICAL_SURGICAL_OPERATION_NORMS.length,
			templates: CANONICAL_SURGICAL_OPERATION_NORMS,
		});
	});

	/**
	 * 2. POST /api/surgery/protocols
	 * Регистрация протокола амбулаторной операции в медицинской карте приёма и дневнике приёма (Мандаты 8e, 8i).
	 * Автоматически вносит дневник операции без бюрократических барьеров.
	 */
	app.post("/api/surgery/protocols", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.surgery.write",
				role: staffRole,
				message: `Отказ в записи протокола операции (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		// Дедупликация и проверка Idempotency-Key (Мандаты 8d, 8bo, 8zp)
		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotence-key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
				: undefined);

		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: null;

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const existingRecord = await withTenantCtx(orgId, async (tx) => {
				const [rec] = await tx
					.select()
					.from(idempotencyKeys)
					.where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey)))
					.limit(1);
				return rec ?? null;
			});

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция хирургического протокола с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const parsed = createSurgicalProtocolSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SurgicalProtocolValidationError",
				message: "Некорректные параметры хирургического протокола.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Автономный фоллбек пациента (Мандат 8e: врач никогда не блокируется из-за нестыковки id)
		let targetPatientId = input.patientId;
		const [patient] = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, targetPatientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в текущей клинике.",
			});
		}

		const SCENARIO_NORM_ALIASES: Record<string, string> = {
			"scen-extraction": "surgery_extraction_simple",
			"scen-resection": "surgery_periostotomy",
			"scen-sinus-gbr": "surgery_sinus_lift_gbr",
			"scen-implant": "surgery_implant_standard",
		};
		const effectiveNormId = SCENARIO_NORM_ALIASES[input.normId] || input.normId;
		const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find(
			(n) => n.id === effectiveNormId || n.id === input.normId,
		);

		const isImplant =
			effectiveNormId.toLowerCase().includes("implant") || norm?.category === "implant";

		// [SEV-1] Анатомический гейт: блокировка имплантации в молочные зубы (FDI 51–85)
		const rawBody =
			typeof request.body === "object" && request.body !== null
				? (request.body as Record<string, unknown>)
				: {};
		const targetTeeth: number[] = [];
		if (input.toothNumberFdi) {
			targetTeeth.push(input.toothNumberFdi);
		}
		if (Array.isArray(rawBody.teeth)) {
			for (const t of rawBody.teeth) {
				if (typeof t === "number" && !targetTeeth.includes(t)) {
					targetTeeth.push(t);
				}
			}
		}

		if (isImplant) {
			for (const toothNum of targetTeeth) {
				if (toothNum >= 51 && toothNum <= 85) {
					return reply.code(422).send({
						error: "DeciduousToothImplantForbidden",
						message: `Установка дентального имплантата в область молочного зуба (#${toothNum}) категорически запрещена анатомическим протоколом`,
					});
				}
			}
		}

		const result = await db.transaction(async (tx) => {
			let visitUpdated = false;
			let targetVisitId = input.visitId ?? null;

			if (!targetVisitId) {
				const [lastVisit] = await tx
					.select({ id: visits.id, objectiveStatus: visits.objectiveStatus })
					.from(visits)
					.where(and(eq(visits.patientId, targetPatientId), eq(visits.organizationId, orgId)))
					.orderBy(desc(visits.createdAt))
					.limit(1);
				if (lastVisit) targetVisitId = lastVisit.id;
			}

			// Обновляем объективный статус / дневник операции приёма EMR (Мандат 8wy)
			if (targetVisitId) {
				const [visit] = await tx
					.select()
					.from(visits)
					.where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)))
					.limit(1);

				if (visit) {
					const existingObj = visit.objectiveStatus || "";
					const teethSuffix = targetTeeth.length > 0 ? ` (FDI #${targetTeeth.join(", #")})` : "";
					const formattedEntry = `[ПРОТОКОЛ ОПЕРАЦИИ: ${norm?.title || effectiveNormId}${teethSuffix}]\n${input.protocolText}`;
					const updatedObj = existingObj ? `${existingObj}\n\n${formattedEntry}` : formattedEntry;

					await tx
						.update(visits)
						.set({
							objectiveStatus: updatedObj,
							updatedAt: new Date(),
						})
						.where(and(eq(visits.id, visit.id), eq(visits.organizationId, orgId)));

					visitUpdated = true;
				}
			}

			// Если указаны номера зубов, фиксируем факт вмешательства в состоянии зубов
			const isExtraction =
				effectiveNormId.toLowerCase().includes("extract") || norm?.category === "extraction";
			const newState = isImplant ? "Implant" : isExtraction ? "Extracted" : "Treated";
			const newSurfaces = isImplant
				? ["implant_site"]
				: isExtraction
					? ["extracted_socket"]
					: ["cured_apical"];

			for (const currentToothNum of targetTeeth) {
				const [existingTooth] = await tx
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, orgId),
							eq(toothStates.patientId, targetPatientId),
							eq(toothStates.toothNumber, currentToothNum),
						),
					)
					.limit(1);

				const existingSurfaces = Array.isArray(existingTooth?.surfaces)
					? (existingTooth.surfaces as string[])
					: [];
				const mergedSurfaces = Array.from(new Set([...existingSurfaces, ...newSurfaces]));

				const opNote = `Хирургическая операция: ${norm?.title || effectiveNormId}`;
				const mergedNotes = existingTooth?.notes
					? `${existingTooth.notes}; ${opNote}`
					: opNote;

				if (existingTooth) {
					await tx
						.update(toothStates)
						.set({
							state: newState,
							surfaces: mergedSurfaces,
							notes: mergedNotes,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(toothStates.organizationId, orgId),
								eq(toothStates.patientId, targetPatientId),
								eq(toothStates.toothNumber, currentToothNum),
							),
						);
				} else {
					await tx.insert(toothStates).values({
						organizationId: orgId,
						patientId: targetPatientId,
						toothNumber: currentToothNum,
						state: newState,
						surfaces: mergedSurfaces,
						notes: mergedNotes,
					});
				}

				await tx.insert(toothStateHistory).values({
					organizationId: orgId,
					patientId: targetPatientId,
					toothNumber: currentToothNum,
					newState,
					newSurfaces: mergedSurfaces,
					reason: `Хирургическая операция: ${norm?.title || effectiveNormId}`,
				});
			}

			// Фиксация в счете/смете пациента (Мандат 8wy, 8bm, SSOT)
			const candidateServices: Array<{
				code: string;
				nameRu: string;
				priceRub: number;
				quantity: number;
				toothNumber?: number | undefined;
				isPrimary?: boolean | undefined;
			}> = [];

			const incomingServices =
				input.services && input.services.length > 0
					? input.services
					: input.services804n && input.services804n.length > 0
						? input.services804n
						: null;

			if (incomingServices && incomingServices.length > 0) {
				for (const s of incomingServices) {
					candidateServices.push({
						code: s.code,
						nameRu: s.nameRu ?? s.name ?? norm?.title ?? "Хирургическая манипуляция",
						priceRub:
							s.priceRub ??
							s.suggestedPriceRub ??
							(s.priceKopecks != null
								? typeof s.priceKopecks === "bigint"
									? Number(s.priceKopecks) / 100
									: s.priceKopecks / 100
								: 0),
						quantity: s.quantity && s.quantity > 0 ? s.quantity : 1,
						toothNumber: s.toothNumber ?? undefined,
						isPrimary: s.isPrimary,
					});
				}
			} else {
				const fallbackCatalog =
					norm?.order804nServices && norm.order804nServices.length > 0
						? norm.order804nServices
						: norm?.catalogServices && norm.catalogServices.length > 0
							? norm.catalogServices
							: [];

				if (fallbackCatalog.length > 0) {
					for (const s of fallbackCatalog) {
						candidateServices.push({
							code: s.code,
							nameRu: s.nameRu ?? s.name ?? norm?.title ?? "Хирургическая манипуляция",
							priceRub:
								s.priceRub ??
								s.suggestedPriceRub ??
								(s.priceKopecks != null
									? typeof s.priceKopecks === "bigint"
										? Number(s.priceKopecks) / 100
										: s.priceKopecks / 100
									: 0),
							quantity: s.quantity && s.quantity > 0 ? s.quantity : 1,
							toothNumber: s.toothNumber ?? undefined,
							isPrimary: s.isPrimary,
						});
					}
				} else {
					const defaultPriceRub =
						norm?.order804nServices?.[0]?.priceRub ??
						norm?.catalogServices?.[0]?.priceRub ??
						3500;
					candidateServices.push({
						code: norm?.code804n ?? "A16.07.001",
						nameRu: norm?.title ?? "Амбулаторная хирургическая операция",
						priceRub: defaultPriceRub,
						quantity: 1,
						isPrimary: true,
					});
				}
			}

			interface SurgeryTreatmentItemToInsert {
				toothCode: string | null;
				title: string;
				priceRub: number;
				unitPriceRub: number;
				priceKopecks: bigint;
				unitPriceKopecks: bigint;
				quantity: string;
				notes: string;
			}

			const itemsToInsert: SurgeryTreatmentItemToInsert[] = [];
			let operationPriceKopecks = 0n;

			for (let idx = 0; idx < candidateServices.length; idx++) {
				const srv = candidateServices[idx];
				if (!srv) continue;
				const srvUnitPriceKopecks = BigInt(rublesToKopecks(srv.priceRub));
				const srvUnitPriceRub = kopecksToRubles(srvUnitPriceKopecks);
				const isPrimaryOp = srv.isPrimary ?? idx === 0;

				if (targetTeeth.length > 0 && isPrimaryOp && !srv.toothNumber) {
					for (const currentToothNum of targetTeeth) {
						const qty = srv.quantity > 0 ? srv.quantity : 1;
						const linePriceKopecks = srvUnitPriceKopecks * BigInt(qty);
						operationPriceKopecks += linePriceKopecks;
						itemsToInsert.push({
							toothCode: String(currentToothNum),
							title: `${srv.nameRu} (Зуб FDI #${currentToothNum})`,
							priceRub: kopecksToRubles(linePriceKopecks),
							unitPriceRub: srvUnitPriceRub,
							priceKopecks: linePriceKopecks,
							unitPriceKopecks: srvUnitPriceKopecks,
							quantity: String(qty),
							notes: `Хирургический протокол зафиксирован у кресла. Диагноз: ${norm?.icd10 ?? "K05"}. Код услуги: ${srv.code}.`,
						});
					}
				} else {
					const assignedTooth =
						srv.toothNumber != null
							? String(srv.toothNumber)
							: targetTeeth.length === 1
								? String(targetTeeth[0])
								: null;
					const qty = srv.quantity > 0 ? srv.quantity : 1;
					const linePriceKopecks = srvUnitPriceKopecks * BigInt(qty);
					operationPriceKopecks += linePriceKopecks;
					const toothSuffix = assignedTooth ? ` (Зуб FDI #${assignedTooth})` : "";
					itemsToInsert.push({
						toothCode: assignedTooth,
						title: `${srv.nameRu}${toothSuffix}`,
						priceRub: kopecksToRubles(linePriceKopecks),
						unitPriceRub: srvUnitPriceRub,
						priceKopecks: linePriceKopecks,
						unitPriceKopecks: srvUnitPriceKopecks,
						quantity: String(qty),
						notes: `Хирургический протокол зафиксирован у кресла. Диагноз: ${norm?.icd10 ?? "K05"}. Код услуги: ${srv.code}.`,
					});
				}
			}

			const operationPriceRub = kopecksToRubles(operationPriceKopecks);

			let linkedInvoiceId: string | null = null;
			if (targetVisitId) {
				const [existingInvoice] = await tx
					.select()
					.from(patientInvoices)
					.where(and(eq(patientInvoices.organizationId, orgId), eq(patientInvoices.visitId, targetVisitId)))
					.limit(1);
				if (existingInvoice) {
					linkedInvoiceId = existingInvoice.id;
					const currentTotalKopecks = BigInt(parseKopecks(existingInvoice.totalAmountRub ?? existingInvoice.totalRub ?? 0));
					const newTotalKopecks = currentTotalKopecks + operationPriceKopecks;
					const updatedTotalRub = kopecksToRubles(newTotalKopecks);
					await tx
						.update(patientInvoices)
						.set({
							totalAmountRub: updatedTotalRub,
							totalRub: String(updatedTotalRub),
							totalPriceKopecks: newTotalKopecks,
						})
						.where(and(eq(patientInvoices.id, existingInvoice.id), eq(patientInvoices.organizationId, orgId)));
				}
			}

			if (!linkedInvoiceId) {
				const invoiceTotalRub = kopecksToRubles(operationPriceKopecks);
				const [newInvoice] = await tx
					.insert(patientInvoices)
					.values({
						organizationId: orgId,
						patientId: targetPatientId,
						visitId: targetVisitId ?? null,
						totalAmountRub: invoiceTotalRub,
						totalRub: String(invoiceTotalRub),
						totalPriceKopecks: operationPriceKopecks,
						status: "issued",
						issuedAt: new Date(),
					})
					.returning({ id: patientInvoices.id });
				linkedInvoiceId = newInvoice?.id ?? null;
			}

			for (const item of itemsToInsert) {
				await tx.insert(treatmentItems).values({
					organizationId: orgId,
					patientId: targetPatientId,
					visitId: targetVisitId ?? null,
					invoiceId: linkedInvoiceId ?? null,
					toothCode: item.toothCode,
					title: item.title,
					priceRub: item.priceRub,
					unitPriceRub: item.unitPriceRub,
					priceKopecks: item.priceKopecks,
					unitPriceKopecks: item.unitPriceKopecks,
					quantity: item.quantity,
					status: "completed",
					notes: item.notes,
				});
			}

			const protocolResult = {
				patientId: targetPatientId,
				visitId: targetVisitId,
				invoiceId: linkedInvoiceId,
				operationPriceRub,
				operationPriceKopecks: operationPriceKopecks.toString(),
				amountKopecks: operationPriceKopecks.toString(),
				normId: input.normId,
				toothNumberFdi: input.toothNumberFdi ?? targetTeeth[0] ?? null,
				teeth: targetTeeth,
				protocolText: input.protocolText,
				visitUpdated,
				isOverdraftActive: input.isOverdraftActive,
				savedAt: new Date().toISOString(),
			};

			const responsePayload: Record<string, unknown> = {
				success: true,
				protocol: protocolResult,
			};

			// Запись в таблицу idempotencyKeys для неделимого кэширования внутри единой ACID-транзакции (Мандат 8bo)
			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 201,
						},
					});
			}

			return { protocol: protocolResult, responsePayload };
		});

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: targetPatientId,
			action: "RECORD_SURGICAL_OPERATION_PROTOCOL",
			diagnosis: norm?.title || effectiveNormId,
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "UPDATE_SURGICAL_PROTOCOL",
			payload: {
				patientId: targetPatientId,
				toothNumberFdi: input.toothNumberFdi ?? targetTeeth[0] ?? null,
				teeth: targetTeeth,
				protocol: result.protocol,
			},
		});

		return reply.code(201).send(result.responsePayload);
	});

	/**
	 * 3. POST /api/surgery/materials/quick-deduct
	 * Экспресс-списание хирургических комплектов у кресла (Мандаты 8e, 8s, 8n).
	 * Пустые карпулы анестетиков — отходы Класса Б (СанПиН 3.3686-21) без комиссий.
	 * Мягкий овердрафт склада: задержка накладной никогда не блокирует операцию врача!
	 */
	app.post("/api/surgery/materials/quick-deduct", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		// Дедупликация и проверка Idempotency-Key (Мандаты 8bo, 8zp)
		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotence-key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
				: undefined);

		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: null;

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const existingRecord = await withTenantCtx(orgId, async (tx) => {
				const [rec] = await tx
					.select()
					.from(idempotencyKeys)
					.where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey)))
					.limit(1);
				return rec ?? null;
			});

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция списания материалов с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const identity = getRequestIdentity(request);
		const parsed = surgicalQuickDeductSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SurgicalDeductValidationError",
				message: "Некорректные параметры списания расходных материалов.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		const responsePayload = await db.transaction(async (tx) => {
			let res: UnifiedStockDeductionResult;
			if (input.bundleType === "anesthesia_carpule") {
				// Списание карпул анестетиков медсестрой (Класс Б, СанПиН 3.3686-21, без комиссий)
				res = await TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId: orgId,
					carpulesCount: input.carpulesCount,
					drugName: input.drugBrandName,
					userId: identity.userId,
					visitId: input.visitId,
					notes: input.notes ?? `Списание ${input.carpulesCount} карпул(ы) ${input.drugBrandName} (отходы Класса Б, СанПиН 3.3686-21, протокол по умолчанию)`,
				});
			} else {
				// Маппинг хирургических бандлов на TreatmentConsumablesService
				let visitType: "therapy" | "surgery" | "implant" | "sinus_gbr" = "surgery";
				if (input.bundleType === "implant") {
					visitType = "implant";
				} else if (input.bundleType === "sinus_gbr") {
					visitType = "sinus_gbr";
				} else {
					visitType = "surgery";
				}

				res = await TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId: orgId,
					visitType,
					userId: identity.userId,
					visitId: input.visitId,
					notes: input.notes ?? `Списание набора «${visitType}»`,
				});
			}

			const payload = {
				bundleType: input.bundleType,
				success: res.success,
				isOverdraft: res.isOverdraft,
				deductedItemsCount: res.deductedItems.length,
				messageRu: res.message,
				deductedItems: res.deductedItems,
				warnings: res.warnings,
			};

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: payload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: payload,
							responseCode: 200,
						},
					});
			}

			return payload;
		});

		return reply.send(responsePayload);
	});

	/**
	 * 4. GET /api/surgery/materials/overdraft-status
	 * Проверка статуса мягкого овердрафта хирургических материалов.
	 * canProceed ВСЕГДА true — врач оперирует без искусственных блокировок.
	 */
	app.get("/api/surgery/materials/overdraft-status", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const items = await inventoryQuery.getInventoryItems(orgId);

		const overdraftItems = items
			.filter((i) => Number(i.currentQty ?? i.stockQuantity ?? 0) <= 0)
			.map((i) => i.name);

		const status = evaluateWarehouseOverdraft(
			CANONICAL_SURGICAL_OPERATION_NORMS[0]?.requiredMaterials ?? [],
			overdraftItems.length > 0,
		);

		return reply.send({
			success: true,
			overdraftStatus: status,
			overdraftItemsCount: overdraftItems.length,
			overdraftItemNames: overdraftItems.slice(0, 10),
			canProceed: true,
		});
	});
}
