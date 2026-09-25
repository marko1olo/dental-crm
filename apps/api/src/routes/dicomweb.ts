import { createReadStream } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
import dicomParser from "dicom-parser";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import * as schema from "../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";

import {
	TAG_STUDY_INSTANCE_UID,
	TAG_NUMBER_OF_FRAMES,
	TAG_ROWS,
	TAG_COLUMNS,
	TAG_BITS_ALLOCATED,
	TAG_SAMPLES_PER_PIXEL,
	TAG_PIXEL_DATA,
	UUID_SHAPE,
	type DicomFileIdentity,
	type RangeSpecification,
	normalizeUid,
	parseHttpRange,
	readDicomIdentity,
	organizationExists,
	resolveInstanceFilePath,
	streamDicomFileResponse,
} from "./dicomwebHelpers.js";
import { registerDicomwebStowRoutes } from "./dicomwebStow.js";

// Re-export public helpers for test suites and external consumers
export { normalizeUid, parseHttpRange, readDicomIdentity };
export type { DicomFileIdentity, RangeSpecification };

export async function registerDicomwebRoutes(app: FastifyInstance) {
	// STOW-RS (DICOM PS3.18 Section 10 Store Over the Web)
	registerDicomwebStowRoutes(app);
	/**
	 * QIDO-RS: Search for Studies (DICOM PS3.18 Section 8.3)
	 * GET /api/dicomweb/studies
	 */
	app.get<{
		Querystring: {
			StudyInstanceUID?: string;
			PatientID?: string;
			PatientName?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>(
		"/api/dicomweb/studies",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom qido studies",
				))
			)
				return;
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ ст. 13: Доступ к КТ / DICOM исследованиям разрешен только клиническому персоналу
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.dicom.read",
					role: staffRole,
					message:
						"Доступ к реестру КТ / DICOM исследований ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
				});
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId,
				action: "VIEW_DICOM_STUDIES",
				diagnosis: "Поиск КТ / DICOM исследований (QIDO-RS)",
			});

			if (!UUID_SHAPE.test(organizationId)) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			const queryStudyUid = normalizeUid(request.query.StudyInstanceUID);
			const queryPatientId = request.query.PatientID?.trim();
			const limit = Math.min(
				Math.max(1, Number(request.query.limit) || 25),
				100,
			);
			const offset = Math.max(0, Number(request.query.offset) || 0);

			const results = await withTenantCtx(organizationId, async () => {
				const orgKnown = await organizationExists(organizationId);
				if (!orgKnown) return null;

				const conditions = [
					eq(schema.imagingStudies.organizationId, organizationId),
					isNotNull(schema.imagingStudies.dicomStudyUid),
				];

				if (queryStudyUid) {
					conditions.push(
						eq(schema.imagingStudies.dicomStudyUid, queryStudyUid),
					);
				}
				if (queryPatientId && UUID_SHAPE.test(queryPatientId)) {
					conditions.push(
						eq(schema.imagingStudies.patientId, queryPatientId),
					);
				}

				return db
					.select({
						studyId: schema.imagingStudies.id,
						dicomStudyUid: schema.imagingStudies.dicomStudyUid,
						patientId: schema.imagingStudies.patientId,
						capturedAt: schema.imagingStudies.capturedAt,
						title: schema.imagingStudies.title,
						kind: schema.imagingStudies.kind,
					})
					.from(schema.imagingStudies)
					.where(and(...conditions))
					.orderBy(desc(schema.imagingStudies.capturedAt))
					.limit(limit)
					.offset(offset);
			});

			if (results === null) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			// Format into standard DICOM JSON Model (PS3.18 F.1)
			const dicomJson = results.map((row) => {
				const dateObj = new Date(row.capturedAt);
				const studyDate = dateObj
					.toISOString()
					.slice(0, 10)
					.replace(/-/g, "");
				const studyTime = dateObj
					.toISOString()
					.slice(11, 19)
					.replace(/:/g, "");
				return {
					"0020000D": { vr: "UI", Value: [row.dicomStudyUid] },
					"00100020": { vr: "LO", Value: [row.patientId] },
					"00080020": { vr: "DA", Value: [studyDate] },
					"00080030": { vr: "TM", Value: [studyTime] },
					"00080060": {
						vr: "CS",
						Value: [row.kind?.toUpperCase() ?? "OT"],
					},
					"00081030": { vr: "LO", Value: [row.title] },
				};
			});

			reply.header("Content-Type", "application/dicom+json");
			return reply.code(200).send(dicomJson);
		},
	);

	/**
	 * WADO-RS: Retrieve Instance (DICOM PS3.18 Section 9.5)
	 * GET /api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid
	 */
	app.get<{
		Params: { studyUid: string; seriesUid: string; instanceUid: string };
	}>(
		"/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom instance read",
				))
			)
				return;
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ ст. 13: Доступ к КТ / DICOM снимку разрешен только клиническому персоналу
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.dicom.read",
					role: staffRole,
					message:
						"Доступ к КТ / DICOM снимку ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
				});
			}

			const studyUid = normalizeUid(request.params.studyUid);
			const seriesUid = normalizeUid(request.params.seriesUid);
			const instanceUid = normalizeUid(request.params.instanceUid);

			if (!UUID_SHAPE.test(organizationId)) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message:
						"Снимок не выдан: организация из токена не существует.",
				});
			}

			const resolution = await withTenantCtx(organizationId, async () => {
				let organizationKnown: boolean;
				try {
					organizationKnown =
						await organizationExists(organizationId);
				} catch (lookupError) {
					return {
						organizationCheckFailed: true as const,
						lookupError,
						organizationKnown: false,
						filePath: null,
					};
				}
				if (
					!organizationKnown ||
					!studyUid ||
					!seriesUid ||
					!instanceUid
				) {
					return {
						organizationCheckFailed: false as const,
						lookupError: null,
						organizationKnown,
						filePath: null,
					};
				}
				return {
					organizationCheckFailed: false as const,
					lookupError: null,
					organizationKnown,
					filePath: await resolveInstanceFilePath(
						organizationId,
						studyUid,
						seriesUid,
						instanceUid,
					),
				};
			});

			if (resolution.organizationCheckFailed) {
				return reply.code(503).send({
					error: "OrganizationCheckUnavailable",
					message:
						"Снимок не выдан: не удалось проверить организацию запроса.",
				});
			}
			if (!resolution.organizationKnown) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message:
						"Снимок не выдан: организация из токена не существует.",
				});
			}

			if (!studyUid || !seriesUid || !instanceUid) {
				return reply.code(400).send({
					error: "DicomInstanceUidMissing",
					message:
						"В адресе должны быть указаны UID исследования, серии и объекта.",
				});
			}

			const filePath = resolution.filePath;
			if (!filePath) {
				return reply.code(404).send({
					error: "DicomInstanceNotFound",
					message: "Снимок с таким UID в этой клинике не найден.",
					studyUid,
					seriesUid,
					instanceUid,
				});
			}

			return streamDicomFileResponse(
				request,
				reply,
				filePath,
				"application/dicom",
			);
		},
	);

	/**
	 * WADO-RS: Retrieve Frames (DICOM PS3.18 Section 9.5 Frame Pixel Data)
	 * GET /api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame
	 */
	app.get<{
		Params: {
			studyUid: string;
			seriesUid: string;
			instanceUid: string;
			frame: string;
		};
	}>(
		"/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom frame read",
				))
			)
				return;
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ ст. 13: Доступ к кадрам КТ / DICOM разрешен только клиническому персоналу
			const reqIdentity = getRequestIdentity(request);
			const staffRole =
				reqIdentity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.dicom.read",
					role: staffRole,
					message:
						"Доступ к кадрам КТ / DICOM ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
				});
			}

			const studyUid = normalizeUid(request.params.studyUid);
			const seriesUid = normalizeUid(request.params.seriesUid);
			const instanceUid = normalizeUid(request.params.instanceUid);
			const frameNumber = Number.parseInt(request.params.frame, 10);

			if (!UUID_SHAPE.test(organizationId)) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			if (Number.isNaN(frameNumber) || frameNumber < 1) {
				return reply.code(400).send({
					error: "InvalidFrameNumber",
					message:
						"Номер кадра должен быть положительным целым числом (1-indexed).",
				});
			}

			const resolution = await withTenantCtx(organizationId, async () => {
				const orgKnown = await organizationExists(organizationId);
				if (!orgKnown || !studyUid || !seriesUid || !instanceUid) {
					return { orgKnown, filePath: null };
				}
				return {
					orgKnown: true,
					filePath: await resolveInstanceFilePath(
						organizationId,
						studyUid,
						seriesUid,
						instanceUid,
					),
				};
			});

			if (!resolution.orgKnown) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			const filePath = resolution.filePath;
			if (!filePath) {
				return reply.code(404).send({
					error: "DicomInstanceNotFound",
					message: "Снимок с таким UID в этой клинике не найден.",
				});
			}

			const identity = await readDicomIdentity(filePath);
			if (!identity) {
				return reply.code(404).send({
					error: "DicomInstanceFileUnreadable",
					message: "Не удалось разобрать структуру DICOM-файла.",
				});
			}

			let fileSize = 0;
			try {
				const stat = await fs.stat(filePath);
				fileSize = stat.size;
			} catch {
				return reply.code(404).send({
					error: "DicomInstanceFileNotFound",
					message: "Файл снимка не найден на сервере.",
				});
			}

			if (frameNumber > identity.numberOfFrames) {
				return reply.code(404).send({
					error: "FrameNotFound",
					message: `Запрошенный кадр ${frameNumber} превышает число кадров в объекте (${identity.numberOfFrames}).`,
				});
			}

			const frameIndex = frameNumber - 1;
			const rows = identity.rows ?? 512;
			const columns = identity.columns ?? 512;
			const bitsAllocated = identity.bitsAllocated ?? 16;
			const bytesPerSample = Math.ceil(bitsAllocated / 8);
			const samplesPerPixel = identity.samplesPerPixel ?? 1;
			const frameSizeBytes =
				rows * columns * bytesPerSample * samplesPerPixel;

			if (identity.pixelDataOffset !== null && frameSizeBytes > 0) {
				const frameStart =
					identity.pixelDataOffset + frameIndex * frameSizeBytes;

				if (frameStart < fileSize) {
					const frameEnd = Math.min(
						frameStart + frameSizeBytes - 1,
						fileSize - 1,
					);
					const actualLength = frameEnd - frameStart + 1;

					reply.code(200);
					reply.header("Content-Type", "application/octet-stream");
					reply.header("Content-Length", actualLength);
					return reply.send(
						createReadStream(filePath, { start: frameStart, end: frameEnd }),
					);
				}

				if (frameNumber > 1) {
					return reply.code(422).send({
						error: "FrameOutOfBounds",
						message: "Смещение запрашиваемого кадра выходит за пределы файла DICOM.",
					});
				}
			}

			if (frameNumber === 1) {
				return streamDicomFileResponse(
					request,
					reply,
					filePath,
					"application/octet-stream",
				);
			}

			return reply.code(422).send({
				error: "FramePixelDataUnavailable",
				message: "Не удалось определить смещение пиксельных данных для запрошенного кадра КТ.",
			});
		},
	);
}
