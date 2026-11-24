import { createReadStream, existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { imagingStudySchema, isValidToothFdi } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { xrayScans } from "../../../db/schema.js";
import {
	bindPatientToStudyInDb,
	getImagingStudyById,
	getImagingStudiesWithFilters,
	unbindPatientFromStudyInDb,
	updateImagingStudyInDb,
} from "../../../db/imagingQuery.js";
import {
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
} from "../../../services/imaging/localPacsStorageService.js";
import { autoBindUnassignedStudies } from "../patientFioBindingEngine.js";
import { getImagingOrganizationId, sendImagingStudyNotFound } from "../imagingHelpers.js";
import { parseDicomHeader, readFilePrefixAsync } from "../dicomParsing.js";
import { isDemoOperationAllowed } from "../../demo/demoRoutes.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import { recordStudySanpinDose } from "../../../services/dicom/ingest/metadataParser.js";

export async function bindPatientHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging bind patient"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const bindBodySchema = z.object({ patientId: z.string().uuid().or(z.string().trim().min(1).max(128)) });
	const parsed = bindBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Необходимо передать валидный ID пациента в поле patientId.", details: parsed.error.issues });
	}

	try {
		const updated = await db.transaction(async (tx) => {
			const study = await bindPatientToStudyInDb(orgId, id, parsed.data.patientId, tx);
			if (study) {
				const [existingXray] = await tx
					.select({ id: xrayScans.id })
					.from(xrayScans)
					.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
					.limit(1);

				if (existingXray) {
					await tx
						.update(xrayScans)
						.set({ patientId: parsed.data.patientId, updatedAt: new Date() })
						.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)));
				} else if (["periapical", "bitewing", "opg", "other"].includes(study.kind)) {
					await tx
						.insert(xrayScans)
						.values({
							id: study.id,
							organizationId: orgId,
							patientId: parsed.data.patientId,
							storagePath: study.storagePath ?? null,
							fileUrl: `/api/imaging/studies/${study.id}/file`,
							originalFilename: study.title,
							mimeType: "image/jpeg",
							kind: study.kind,
							toothCode: study.toothCode ?? null,
							notes: study.title,
							status: "done",
							capturedAt: study.capturedAt ? new Date(study.capturedAt) : new Date(),
						})
						.onConflictDoNothing();
				}

				if (study && parsed.data.patientId) {
					await recordStudySanpinDose(orgId, parsed.data.patientId, study, null, tx);
				}
			}
			return study;
		});
		if (!updated) return sendImagingStudyNotFound(reply);
		return reply.code(200).send(imagingStudySchema.parse(updated));
	} catch (err) {
		return reply.code(400).send({ error: "BindingFailed", message: err instanceof Error ? err.message : "Ошибка при привязке исследования к пациенту." });
	}
}

export async function bindToothHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging bind tooth"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const bindToothBodySchema = z.object({ toothCode: z.string().trim().max(16).nullable().optional() });
	const parsed = bindToothBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный номер зуба.", details: parsed.error.issues });
	}

	const formatted = parsed.data.toothCode?.trim() || null;
	if (formatted) {
		const num = Number(formatted);
		if (Number.isNaN(num) || !isValidToothFdi(num)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: `Некорректный номер зуба по стандарту FDI (ISO 3950): "${formatted}". Допустимы постоянные 11–48 и молочные 51–85.`,
			});
		}
	}

	const updated = await db.transaction(async (tx) => {
		const study = await updateImagingStudyInDb(
			orgId,
			id,
			{ toothCode: formatted, region: formatted ? `Зуб ${formatted}` : null },
			tx,
		);
		if (study) {
			await tx
				.update(xrayScans)
				.set({ toothCode: formatted, updatedAt: new Date() })
				.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)));
		}
		return study;
	});
	if (!updated) return sendImagingStudyNotFound(reply);
	return reply.code(200).send(imagingStudySchema.parse(updated));
}

export async function bindVisitHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging bind visit"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const bindVisitBodySchema = z.object({
		visitId: z.string().uuid().nullable().optional(),
		toothCode: z.string().trim().max(16).nullable().optional(),
	});
	const parsed = bindVisitBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры привязки к приёму.",
			details: parsed.error.issues,
		});
	}

	const { visitId, toothCode } = parsed.data;
	let formattedTooth: string | null = null;
	if (toothCode) {
		const num = Number(toothCode.trim());
		if (Number.isNaN(num) || !isValidToothFdi(num)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: `Некорректный номер зуба по стандарту FDI (ISO 3950): "${toothCode}". Допустимы постоянные 11–48 и молочные 51–85.`,
			});
		}
		formattedTooth = String(num);
	}

	try {
		const updated = await db.transaction(async (tx) => {
			const updatePayload: {
				visitId?: string | null | undefined;
				toothCode?: string | null | undefined;
				region?: string | null | undefined;
			} = {};

			if (visitId !== undefined) {
				updatePayload.visitId = visitId;
			}
			if (formattedTooth !== null) {
				updatePayload.toothCode = formattedTooth;
				updatePayload.region = `Зуб ${formattedTooth}`;
			}

			const study = await updateImagingStudyInDb(orgId, id, updatePayload, tx);
			if (study) {
				const xrayUpdates: Partial<typeof xrayScans.$inferInsert> = {};
				if (visitId !== undefined) xrayUpdates.visitId = visitId;
				if (formattedTooth !== null) xrayUpdates.toothCode = formattedTooth;

				if (Object.keys(xrayUpdates).length > 0) {
					await tx
						.update(xrayScans)
						.set({ ...xrayUpdates, updatedAt: new Date() })
						.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)));
				}
			}
			return study;
		});

		if (!updated) return sendImagingStudyNotFound(reply);
		return reply.code(200).send(imagingStudySchema.parse(updated));
	} catch (err) {
		return reply.code(400).send({
			error: "BindingFailed",
			message: err instanceof Error ? err.message : "Ошибка при привязке исследования к приёму.",
		});
	}
}

export async function unbindPatientHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging unbind patient"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	try {
		const updated = await db.transaction(async (tx) => {
			const study = await unbindPatientFromStudyInDb(orgId, id, tx);
			if (study) {
				await tx
					.delete(xrayScans)
					.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)));
			}
			return study;
		});
		if (!updated) return sendImagingStudyNotFound(reply);
		return reply.code(200).send(imagingStudySchema.parse(updated));
	} catch (err) {
		return reply.code(400).send({ error: "UnbindingFailed", message: err instanceof Error ? err.message : "Ошибка при отвязке исследования от пациента." });
	}
}

export async function autoBindHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging auto bind scan"))) return;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const summary = await autoBindUnassignedStudies(orgId);
	return reply.code(200).send(summary);
}

const cbctTunerQuerySchema = z.object({
	demo: z.string().optional(),
	id: z.string().optional(),
}).strict();

export async function cbctTunerPatientsHandler(request: FastifyRequest, reply: FastifyReply) {
	const parsedQuery = cbctTunerQuerySchema.safeParse(request.query ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса тюнера КЛКТ.",
			details: parsedQuery.error.issues,
		});
	}
	const query = parsedQuery.data;
	const isDemo = (query.demo === "true" || process.env.DENTE_DEMO_MODE === "true") && isDemoOperationAllowed(request);
	if (isDemo) {
		return reply.send({
			ok: true,
			patients: [{ id: "sample", name: "Демо Пациент", badge: "CBCT", type: "series", description: "Демонстрационный снимок КТ", available: true }],
		});
	}

	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply.send({ ok: true, patients: [] });

	try {
		const studies = await getImagingStudiesWithFilters(orgId, { limit: 50 });
		const ctStudies = studies.filter(
			(s) => s.kind === "cbct" || s.kind === "opg" || s.modality === "CT" || s.modality === "CBCT" || s.modality === "PAN",
		);

		const patientList = ctStudies.map((s) => ({
			id: s.id,
			name: s.patientFullName || s.dicomPatientName || "Пациент без имени",
			badge: s.kind === "cbct" ? "CBCT" : s.kind === "opg" ? "OPG" : "X-RAY",
			type: s.kind === "cbct" ? "series" : "single",
			description: s.title || (s.toothCode ? `Зуб #${s.toothCode}` : "3D КЛКТ / Панорама"),
			available: Boolean(s.storagePath),
			storagePath: s.storagePath ?? null,
		}));

		return reply.send({
			ok: true,
			patients: patientList,
		});
	} catch {
		return reply.send({ ok: true, patients: [] });
	}
}

export async function cbctTunerVolumeHandler(request: FastifyRequest, reply: FastifyReply) {
	const parsedQuery = cbctTunerQuerySchema.safeParse(request.query ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса объема КЛКТ.",
			details: parsedQuery.error.issues,
		});
	}
	const query = parsedQuery.data;
	const isDemo = (query.demo === "true" || process.env.DENTE_DEMO_MODE === "true") && isDemoOperationAllowed(request);
	if (isDemo) {
		const emptyCube = Buffer.alloc(512 * 512 * 2);
		return reply
			.header("Content-Type", "application/octet-stream")
			.header("x-dente-demo-showcase", "true")
			.header("x-cbct-dim-x", "512").header("x-cbct-dim-y", "512").header("x-cbct-dim-z", "1")
			.header("x-cbct-sp-x", "0.25").header("x-cbct-sp-y", "0.25").header("x-cbct-sp-z", "0.25")
			.header("x-cbct-min-hu", "-1000").header("x-cbct-max-hu", "3000")
			.send(emptyCube);
	}

	if (!query.id) {
		return reply.code(400).send({ error: "BadRequest", message: "Параметр id обязателен для получения КТ-объема." });
	}

	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply.code(401).send({ error: "Unauthorized", message: "Требуется авторизация." });

	let study;
	try {
		study = await getImagingStudyById(orgId, query.id);
	} catch {
		return reply.code(404).send({ error: "NotFound", message: "КТ-исследование не найдено." });
	}
	if (!study || !study.storagePath) {
		return reply.code(404).send({ error: "NotFound", message: "КТ-исследование не найдено." });
	}

	try {
		const filePath = LocalPacsStorageService.validateAndResolveLocalFilePath(orgId, study.storagePath);
		await access(filePath);

		let dimX = 512;
		let dimY = 512;
		let dimZ = study.sliceCount && study.sliceCount > 0 ? study.sliceCount : 1;
		if (study.dimensions) {
			const parts = study.dimensions.toLowerCase().split(/[x×]/).map((p) => Number.parseInt(p.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0);
			if (parts.length >= 2) {
				dimX = parts[0]!;
				dimY = parts[1]!;
				if (parts.length >= 3) dimZ = parts[2]!;
			}
		}

		let spX = 0.25;
		let spY = 0.25;
		let spZ = 0.25;
		if (study.voxelSpacing) {
			const spParts = study.voxelSpacing.toLowerCase().replace(/mm/g, "").split(/[x×]/).map((p) => Number.parseFloat(p.trim())).filter((n) => !Number.isNaN(n) && n > 0);
			if (spParts.length >= 1) {
				spX = spParts[0]!;
				spY = spParts[1] ?? spParts[0]!;
				spZ = spParts[2] ?? spParts[1] ?? spParts[0]!;
			}
		}

		if (!study.dimensions) {
			try {
				const prefix = await readFilePrefixAsync(filePath, 65536);
				const meta = parseDicomHeader(prefix);
				if (meta.imageColumns && meta.imageRows) {
					dimX = meta.imageColumns;
					dimY = meta.imageRows;
				}
			} catch {
				// best-effort fallback
			}
		}

		reply.header("Content-Type", "application/octet-stream");
		reply.header("x-cbct-dim-x", String(dimX)).header("x-cbct-dim-y", String(dimY)).header("x-cbct-dim-z", String(dimZ));
		reply.header("x-cbct-sp-x", String(spX)).header("x-cbct-sp-y", String(spY)).header("x-cbct-sp-z", String(spZ));
		reply.header("x-cbct-min-hu", "-1000").header("x-cbct-max-hu", "3000");
		return reply.send(createReadStream(filePath));
	} catch (err) {
		if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
			return reply.code(403).send({ error: "Forbidden", message: "Доступ к файлу КТ заблокирован." });
		}
		return reply.code(404).send({ error: "NotFound", message: "Файл КТ-исследования не найден на диске." });
	}
}
