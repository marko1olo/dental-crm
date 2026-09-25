import fs from "node:fs/promises";
import path from "node:path";
import dicomParser from "dicom-parser";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import * as schema from "../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import {
	TAG_COLUMNS,
	TAG_ROWS,
	TAG_SERIES_INSTANCE_UID,
	TAG_SOP_INSTANCE_UID,
	TAG_STUDY_INSTANCE_UID,
	UUID_SHAPE,
	normalizeUid,
	organizationExists,
} from "./dicomwebHelpers.js";

export interface StowStoreResult {
	studyUid: string;
	seriesUid: string;
	sopInstanceUid: string;
	storagePath: string;
	studyId: string;
	seriesId: string;
	instanceId: string;
}

/**
 * Parses raw DICOM buffer and extracts required UIDs and dimensions.
 */
export function parseDicomBufferForStow(buffer: Buffer): {
	studyUid: string | null;
	seriesUid: string | null;
	sopInstanceUid: string | null;
	rows: number | null;
	columns: number | null;
} {
	if (buffer.length < 132) {
		return {
			studyUid: null,
			seriesUid: null,
			sopInstanceUid: null,
			rows: null,
			columns: null,
		};
	}

	try {
		const dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
		return {
			studyUid: normalizeUid(dataSet.string(TAG_STUDY_INSTANCE_UID)),
			seriesUid: normalizeUid(dataSet.string(TAG_SERIES_INSTANCE_UID)),
			sopInstanceUid: normalizeUid(dataSet.string(TAG_SOP_INSTANCE_UID)),
			rows: dataSet.uint16(TAG_ROWS) ?? null,
			columns: dataSet.uint16(TAG_COLUMNS) ?? null,
		};
	} catch {
		return {
			studyUid: null,
			seriesUid: null,
			sopInstanceUid: null,
			rows: null,
			columns: null,
		};
	}
}

/**
 * Registers STOW-RS (Store Over the Web) routes per DICOM PS3.18 Section 10.
 * POST /api/dicomweb/studies
 * POST /api/dicomweb/studies/:studyUid
 */
export function registerDicomwebStowRoutes(app: FastifyInstance) {
	if (!app.hasContentTypeParser("application/dicom")) {
		app.addContentTypeParser(
			["application/dicom", "application/octet-stream"],
			{ parseAs: "buffer" },
			(_req, body, done) => {
				done(null, body);
			},
		);
	}

	const handler = async (
		request: FastifyRequest<{ Params?: { studyUid?: string } }>,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"dicom stow store",
			))
		) {
			return;
		}

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Доступ к сохранению КТ / DICOM разрешён только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.dicom.store",
				role: staffRole,
				message:
					"Сохранение КТ / DICOM снимка ограничено 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		if (!UUID_SHAPE.test(organizationId)) {
			return reply.code(403).send({
				error: "OrganizationUnknown",
				message: "Организация из токена не существует.",
			});
		}

		const orgValid = await organizationExists(organizationId);
		if (!orgValid) {
			return reply.code(403).send({
				error: "OrganizationUnknown",
				message: "Организация из токена не существует в базе.",
			});
		}

		// Extract raw binary buffer or base64 from payload
		let dicomBuffer: Buffer | null = null;
		const rawBody = request.body;

		if (Buffer.isBuffer(rawBody)) {
			dicomBuffer = rawBody;
		} else if (
			rawBody &&
			typeof rawBody === "object" &&
			"fileBase64" in rawBody &&
			typeof (rawBody as { fileBase64: unknown }).fileBase64 === "string"
		) {
			const b64 = (rawBody as { fileBase64: string }).fileBase64.replace(
				/^data:.*?;base64,/u,
				"",
			);
			dicomBuffer = Buffer.from(b64, "base64");
		} else if (
			rawBody &&
			typeof rawBody === "object" &&
			"data" in rawBody &&
			Array.isArray((rawBody as { data: unknown }).data)
		) {
			dicomBuffer = Buffer.from((rawBody as { data: number[] }).data);
		}

		if (!dicomBuffer || dicomBuffer.length < 132) {
			return reply.code(400).send({
				error: "InvalidDicomPayload",
				message:
					"Тело запроса должно содержать валидный бинарный буфер DICOM (минимум 132 байта с DICM сигнатурой).",
			});
		}

		const parsed = parseDicomBufferForStow(dicomBuffer);
		if (!parsed.studyUid || !parsed.seriesUid || !parsed.sopInstanceUid) {
			return reply.code(422).send({
				error: "UnprocessableDicomInstance",
				message:
					"Файл не содержит обязательных DICOM-тегов идентификации: StudyInstanceUID, SeriesInstanceUID или SOPInstanceUID.",
			});
		}

		const pathStudyUid = request.params?.studyUid
			? normalizeUid(request.params.studyUid)
			: null;
		if (pathStudyUid && pathStudyUid !== parsed.studyUid) {
			return reply.code(409).send({
				error: "StudyUidMismatch",
				message: `StudyInstanceUID в URL (${pathStudyUid}) не совпадает со значением в файле (${parsed.studyUid}).`,
			});
		}

		// Store file in PACS directory
		const relativeDir = path.join(
			".data",
			"pacs",
			organizationId,
			parsed.studyUid,
			parsed.seriesUid,
		);
		const baseDir = path.resolve(process.cwd(), relativeDir);
		await fs.mkdir(baseDir, { recursive: true });
		const targetPath = path.join(baseDir, `${parsed.sopInstanceUid}.dcm`);
		await fs.writeFile(targetPath, dicomBuffer);

		// Record in DB with tenant isolation
		const result = await withTenantCtx(organizationId, async () => {
			// 1. Study
			let [study] = await db
				.select({ id: schema.imagingStudies.id })
				.from(schema.imagingStudies)
				.where(
					and(
						eq(schema.imagingStudies.organizationId, organizationId),
						eq(schema.imagingStudies.dicomStudyUid, parsed.studyUid!),
					),
				)
				.limit(1);

			if (!study) {
				// Resolve dummy/system patient if none specified
				const [firstPatient] = await db
					.select({ id: schema.patients.id })
					.from(schema.patients)
					.where(eq(schema.patients.organizationId, organizationId))
					.limit(1);

				const [createdStudy] = await db
					.insert(schema.imagingStudies)
					.values({
						organizationId,
						patientId: firstPatient?.id ?? organizationId, // fallback
						kind: "cbct",
						title: `Исследование КЛКТ ${parsed.studyUid}`,
						capturedAt: new Date(),
						sourceKind: "dicomweb",
						sourceName: "STOW-RS",
						status: "available",
						dicomStudyUid: parsed.studyUid!,
						storagePath: targetPath,
					})
					.returning({ id: schema.imagingStudies.id });
				if (!createdStudy) {
					throw new Error("Не удалось создать запись исследования");
				}
				study = createdStudy;
			}

			// 2. Series
			let [series] = await db
				.select({ id: schema.imagingSeries.id })
				.from(schema.imagingSeries)
				.where(
					and(
						eq(schema.imagingSeries.organizationId, organizationId),
						eq(schema.imagingSeries.studyId, study.id),
						eq(schema.imagingSeries.dicomSeriesUid, parsed.seriesUid!),
					),
				)
				.limit(1);

			if (!series) {
				const [createdSeries] = await db
					.insert(schema.imagingSeries)
					.values({
						organizationId,
						studyId: study.id,
						dicomSeriesUid: parsed.seriesUid!,
						modality: "CT",
						seriesDescription: "STOW-RS Series",
					})
					.returning({ id: schema.imagingSeries.id });
				if (!createdSeries) {
					throw new Error("Не удалось создать запись серии");
				}
				series = createdSeries;
			}

			// 3. Instance
			let [instance] = await db
				.select({ id: schema.imagingInstances.id })
				.from(schema.imagingInstances)
				.where(
					and(
						eq(schema.imagingInstances.organizationId, organizationId),
						eq(schema.imagingInstances.seriesId, series.id),
						eq(
							schema.imagingInstances.dicomSopInstanceUid,
							parsed.sopInstanceUid!,
						),
					),
				)
				.limit(1);

			if (!instance) {
				const [createdInstance] = await db
					.insert(schema.imagingInstances)
					.values({
						organizationId,
						seriesId: series.id,
						dicomSopInstanceUid: parsed.sopInstanceUid!,
						storagePath: targetPath,
						rows: parsed.rows,
						columns: parsed.columns,
					})
					.returning({ id: schema.imagingInstances.id });
				if (!createdInstance) {
					throw new Error("Не удалось создать запись экземпляра");
				}
				instance = createdInstance;
			} else {
				await db
					.update(schema.imagingInstances)
					.set({ storagePath: targetPath, rows: parsed.rows, columns: parsed.columns })
					.where(eq(schema.imagingInstances.id, instance.id));
			}

			return {
				studyUid: parsed.studyUid!,
				seriesUid: parsed.seriesUid!,
				sopInstanceUid: parsed.sopInstanceUid!,
				storagePath: targetPath,
				studyId: study.id,
				seriesId: series.id,
				instanceId: instance.id,
			};
		});

		await auditMedicalAccessFromRequest(request, {
			organizationId,
			action: "dicom_stow_stored",
			metadata: {
				resource: "imaging_instances",
				resourceId: result.instanceId,
				studyUid: result.studyUid,
				seriesUid: result.seriesUid,
				sopInstanceUid: result.sopInstanceUid,
			},
		});

		// DICOM PS3.18 Section 10 STOW-RS standard response
		return reply.code(200).send({
			"00081199": {
				vr: "SQ",
				Value: [
					{
						"00081150": { vr: "UI", Value: ["1.2.840.10008.5.1.4.1.1.1"] },
						"00081155": { vr: "UI", Value: [result.sopInstanceUid] },
						"00081190": {
							vr: "UR",
							Value: [
								`/api/dicomweb/studies/${result.studyUid}/series/${result.seriesUid}/instances/${result.sopInstanceUid}`,
							],
						},
					},
				],
			},
			studyId: result.studyId,
			instanceId: result.instanceId,
			status: "stored",
		});
	};

	app.post("/api/dicomweb/studies", { config: { tenantTxSelfManaged: true } }, handler);
	app.post(
		"/api/dicomweb/studies/:studyUid",
		{ config: { tenantTxSelfManaged: true } },
		handler,
	);
}
