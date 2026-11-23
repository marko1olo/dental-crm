import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { computePayloadHash, generateUuidV7 } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import { idempotencyKeys, patientRecalls, warrantyCertificates } from "../../db/schema.js";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { createCertificateBodySchema } from "./types.js";

export function registerCreateCertificateRoute(app: FastifyInstance) {
	app.post("/api/warranty/certificates", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"warranty certificates creation",
		);
		if (!context) return;

		// Поддержка Idempotency-Key по стандарту Мандата 8bo & 8zp
		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotency-key"] as string | undefined) ??
			(request.headers["Idempotency-Key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
				: undefined);

		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: generateUuidV7();

		reply.header("Idempotency-Key", idempotencyKey);

		// Проверка кэша идемпотентности
		const existingRecord = await withTenantCtx(context.organizationId, async (tx) => {
			const [rec] = await tx
				.select()
				.from(idempotencyKeys)
				.where(and(eq(idempotencyKeys.clinicId, context.organizationId), eq(idempotencyKeys.key, idempotencyKey)))
				.limit(1);
			return rec ?? null;
		});

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).header("Retry-After", "1").send({
					error: "Conflict",
					message: "Операция оформления гарантийного сертификата с данным Idempotency-Key уже выполняется.",
				});
			}
		}

		const parsed = createCertificateBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные гарантийного паспорта.",
				issues: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const issuedAtDate = data.issuedAt ? new Date(data.issuedAt) : new Date();

		// Точное календарное добавление месяцев без потери дней (Мандат 8e / Defect 4)
		let expiresAtDate: Date;
		if (data.expiresAt) {
			expiresAtDate = new Date(data.expiresAt);
		} else {
			expiresAtDate = new Date(issuedAtDate.getTime());
			expiresAtDate.setMonth(expiresAtDate.getMonth() + data.warrantyMonths);
		}

		const nextRecallDate = data.nextRecallDate
			? new Date(data.nextRecallDate)
			: new Date(issuedAtDate.getTime() + 180 * 24 * 60 * 60 * 1000);

		const identity = getRequestIdentity(request);

		const normalizedItems = data.items.map((it) => {
			const title = it.clinicalWorkTitle || it.name || it.restorationType || "Стоматологическая работа";
			const tooth = it.toothNumber !== undefined ? String(it.toothNumber) : (it.tooth !== undefined ? String(it.tooth) : "—");
			const mat = it.material || it.materialName || "Конструкционный материал";
			const shade = it.color || it.shade || it.vitaShade || "По прейскуранту";
			const lot = it.lot || it.lotNumber || it.batchCode || data.certificateNumber;
			return {
				id: it.id || generateUuidV7(),
				name: title,
				clinicalWorkTitle: title,
				category: it.category || "orthopedics",
				tooth,
				toothNumber: tooth,
				surface: it.surface,
				material: mat,
				materialName: mat,
				color: shade,
				shade,
				vitaShade: shade,
				shadeStump: it.shadeStump ?? null,
				lot,
				lotNumber: lot,
				batchCode: lot,
				restorationType: it.restorationType || title,
				laboratoryName: it.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
				cementationProtocol: it.cementationProtocol || "Адгезивный протокол двойного отверждения (композитный цемент)",
				warrantyMonths: it.warrantyMonths ?? data.warrantyMonths,
				serviceLifeMonths: it.serviceLifeMonths ?? data.serviceLifeMonths,
				notes: it.notes,
			};
		});

		const { createdCert, createdRecall } = await withTenantCtx(context.organizationId, async (tx) => {
			const [cert] = await tx
				.insert(warrantyCertificates)
				.values({
					organizationId: context.organizationId,
					patientId: data.patientId,
					visitId: data.visitId || null,
					certificateNumber: data.certificateNumber,
					status: data.status,
					itemsJson: normalizedItems,
					warrantyMonths: data.warrantyMonths,
					serviceLifeMonths: data.serviceLifeMonths,
					issuedAt: issuedAtDate,
					expiresAt: expiresAtDate,
					nextRecallDate,
					integritySha256: data.integritySha256,
					notes: data.notes || null,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: warrantyCertificates.certificateNumber,
					set: {
						status: data.status,
						itemsJson: normalizedItems,
						warrantyMonths: data.warrantyMonths,
						serviceLifeMonths: data.serviceLifeMonths,
						expiresAt: expiresAtDate,
						nextRecallDate,
						integritySha256: data.integritySha256,
						notes: data.notes || null,
						updatedAt: new Date(),
					},
				})
				.returning();

			const [rec] = await tx
				.insert(patientRecalls)
				.values({
					organizationId: context.organizationId,
					patientId: data.patientId,
					doctorId: identity.userId || null,
					reason: `Контрольный осмотр по гарантийному паспорту ${data.certificateNumber}`,
					cohortType: "orthopedic_warranty",
					status: "pending",
					dueDate: nextRecallDate,
					notes: `Автоматически запланирован при выдаче гарантийного паспорта ${data.certificateNumber}`,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			return { createdCert: cert, createdRecall: rec ?? null };
		});

		if (createdRecall) {
			wsBroker.broadcastToOrganization(context.organizationId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					recallId: createdRecall.id,
					patientId: data.patientId,
					status: "pending",
					dueDate: nextRecallDate.toISOString(),
					updatedAt: new Date().toISOString(),
				},
			});
		}

		const responsePayload = {
			success: true,
			data: {
				certificate: createdCert,
				recall: createdRecall,
			},
			certificate: createdCert,
			recall: createdRecall,
		};

		// Кэширование ответа для обеспечения строгой идемпотентности (Мандат 8bo)
		await withTenantCtx(context.organizationId, async (tx) => {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: context.organizationId,
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
		});

		return reply.code(201).send(responsePayload);
	});
}
