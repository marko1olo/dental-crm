import crypto from "node:crypto";
import { createWriteStream, existsSync, openSync, readSync, closeSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import dicomParser from "dicom-parser";
import { and, eq, sql } from "drizzle-orm";
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

import {
	TAG_PATIENT_NAME,
	TAG_PATIENT_ID,
	TAG_PATIENT_BIRTH_DATE,
	cleanDicomPatientName,
	parseDicomBufferForStow,
	stripMultipartWrapperFromBuffer,
} from "./dicomwebHelpers.js";
import { matchPatientForDicom } from "./imaging/patientFioBindingEngine.js";

export {
	TAG_PATIENT_NAME,
	TAG_PATIENT_ID,
	TAG_PATIENT_BIRTH_DATE,
	cleanDicomPatientName,
	parseDicomBufferForStow,
	stripMultipartWrapperFromBuffer,
};

export interface StowStoreResult {
	studyUid: string;
	seriesUid: string;
	sopInstanceUid: string;
	storagePath: string;
	studyId: string;
	seriesId: string;
	instanceId: string;
	patientId: string | null;
	matchMethod: string;
	bindingStatus: string;
	bindingConfidence: number;
}


/**
 * Streams payload to a file on disk with safe multipart stripping
 * and strict memory ceiling (guarantees O(1) heap allocation for 500MB-2GB scans).
 */
export async function streamDicomPayloadToDisk(
	request: FastifyRequest,
	targetPath: string,
	maxBytes = 2 * 1024 * 1024 * 1024,
): Promise<{ bytesWritten: number }> {
	await fs.mkdir(path.dirname(targetPath), { recursive: true });

	const contentType = String(request.headers["content-type"] || "");
	const isMultipart = contentType.includes("multipart");

	// 1. Direct Buffer in request.body
	if (Buffer.isBuffer(request.body)) {
		let buf: Buffer = request.body;
		if (isMultipart) {
			buf = stripMultipartWrapperFromBuffer(buf);
		}
		if (buf.length > maxBytes) {
			throw new Error(`Размер файла превышает лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`);
		}
		await fs.writeFile(targetPath, buf);
		return { bytesWritten: buf.length };
	}

	// 2. Base64 payload in JSON
	if (
		request.body &&
		typeof request.body === "object" &&
		"fileBase64" in request.body &&
		typeof (request.body as { fileBase64: unknown }).fileBase64 === "string"
	) {
		const b64 = (request.body as { fileBase64: string }).fileBase64.replace(
			/^data:.*?;base64,/u,
			"",
		);
		const buf = Buffer.from(b64, "base64");
		if (buf.length > maxBytes) {
			throw new Error(`Размер файла превышает лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`);
		}
		await fs.writeFile(targetPath, buf);
		return { bytesWritten: buf.length };
	}

	// 3. Array of bytes in JSON
	if (
		request.body &&
		typeof request.body === "object" &&
		"data" in request.body &&
		Array.isArray((request.body as { data: unknown }).data)
	) {
		const buf = Buffer.from((request.body as { data: number[] }).data);
		if (buf.length > maxBytes) {
			throw new Error(`Размер файла превышает лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`);
		}
		await fs.writeFile(targetPath, buf);
		return { bytesWritten: buf.length };
	}

	// 4. Streaming: Readable stream from request.body or raw HTTP incoming socket
	const sourceStream: NodeJS.ReadableStream =
		request.body && typeof (request.body as any).pipe === "function"
			? (request.body as NodeJS.ReadableStream)
			: (request.raw as NodeJS.ReadableStream);

	const writeStream = createWriteStream(targetPath);
	let bytesWritten = 0;

	if (!isMultipart) {
		const sizeLimiter = new Transform({
			transform(chunk: Buffer, _encoding, callback) {
				bytesWritten += chunk.length;
				if (bytesWritten > maxBytes) {
					return callback(new Error(`Размер файла превышает лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`));
				}
				callback(null, chunk);
			},
		});

		try {
			await pipeline(sourceStream, sizeLimiter, writeStream);
		} catch (err) {
			await fs.unlink(targetPath).catch(() => {});
			throw err;
		}

		return { bytesWritten };
	}

	// Multipart stream: strip multipart headers and boundary trailer
	let headersStripped = false;
	let headerBuffer = Buffer.alloc(0);

	const multipartStripper = new Transform({
		transform(chunk: Buffer, _encoding, callback) {
			bytesWritten += chunk.length;
			if (bytesWritten > maxBytes) {
				return callback(new Error(`Размер файла превышает лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`));
			}

			if (!headersStripped) {
				headerBuffer = Buffer.concat([headerBuffer, chunk]);
				const headerEndCrLf = headerBuffer.indexOf("\r\n\r\n");
				const headerEndLf = headerBuffer.indexOf("\n\n");
				let headerEnd = -1;
				let delimiterLength = 4;
				if (headerEndCrLf !== -1) {
					headerEnd = headerEndCrLf;
					delimiterLength = 4;
				} else if (headerEndLf !== -1) {
					headerEnd = headerEndLf;
					delimiterLength = 2;
				}

				if (headerEnd !== -1) {
					headersStripped = true;
					const payloadStart = headerBuffer.subarray(headerEnd + delimiterLength);
					headerBuffer = Buffer.alloc(0);
					if (payloadStart.length > 0) {
						return callback(null, payloadStart);
					}
					return callback();
				}
				return callback();
			}

			callback(null, chunk);
		},
	});

	try {
		await pipeline(sourceStream, multipartStripper, writeStream);
	} catch (err) {
		await fs.unlink(targetPath).catch(() => {});
		throw err;
	}

	// Clean up potential trailing boundary from end of file
	try {
		const stat = await fs.stat(targetPath);
		if (stat.size > 256) {
			const tailSize = Math.min(stat.size, 1024);
			const tailBuf = Buffer.alloc(tailSize);
			const fd = await fs.open(targetPath, "r+");
			await fd.read(tailBuf, 0, tailSize, stat.size - tailSize);
			const lastBoundaryIndex = tailBuf.lastIndexOf("\r\n--");
			if (lastBoundaryIndex !== -1) {
				const truncateSize = stat.size - (tailSize - lastBoundaryIndex);
				await fd.truncate(truncateSize);
			}
			await fd.close();
		}
	} catch {
		// Non-fatal if trailing boundary clean-up is skipped
	}

	return { bytesWritten };
}

/**
 * Honest clinical resolution of patient for DICOM study.
 * Eliminates arbitrary firstPatient assignment and enforces 152-FZ / 323-FZ patient isolation.
 */
export async function resolvePatientForStow(options: {
	organizationId: string;
	explicitPatientId?: string | null;
	dicomPatientId?: string | null;
	dicomPatientName?: string | null;
	dicomBirthDate?: string | null;
}): Promise<{
	patientId: string;
	matchMethod: "explicit" | "dicom_patient_id" | "dicom_name_exact" | "dicom_name_birthdate";
} | null> {
	const { organizationId, explicitPatientId, dicomPatientId, dicomPatientName, dicomBirthDate } = options;

	// 1. Explicit patientId provided via query (?patientId=...) or headers (X-Patient-ID)
	if (explicitPatientId) {
		const trimmedId = explicitPatientId.trim();
		if (UUID_SHAPE.test(trimmedId)) {
			const [found] = await db
				.select({
					id: schema.patients.id,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						eq(schema.patients.id, trimmedId),
					),
				)
				.limit(1);

			if (found) {
				return {
					patientId: found.mergedIntoPatientId ?? found.id,
					matchMethod: "explicit",
				};
			}
		}
		// If explicit patientId was given but does not exist in DB -> do not fall back to guessing!
		return null;
	}

	// 2. DICOM tag PatientID (0010,0020)
	if (dicomPatientId) {
		const trimmedPatientId = dicomPatientId.trim();
		if (UUID_SHAPE.test(trimmedPatientId)) {
			const [found] = await db
				.select({
					id: schema.patients.id,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						eq(schema.patients.id, trimmedPatientId),
					),
				)
				.limit(1);

			if (found) {
				return {
					patientId: found.mergedIntoPatientId ?? found.id,
					matchMethod: "dicom_patient_id",
				};
			}
		}
	}

	// 3. DICOM tag PatientName (0010,0010)
	const cleanedName = cleanDicomPatientName(dicomPatientName);
	if (cleanedName) {
		const candidates = await db
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				birthDate: schema.patients.birthDate,
				mergedIntoPatientId: schema.patients.mergedIntoPatientId,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					sql`lower(trim(${schema.patients.fullName})) = lower(trim(${cleanedName}))`,
				),
			);

		if (candidates.length === 1) {
			const candidate = candidates[0]!;
			const dDate = (dicomBirthDate ?? "").replace(/\D/g, "");
			const pDate = (candidate.birthDate ?? "").replace(/\D/g, "");

			// If both birth dates are present and they conflict -> ambiguous/mismatch!
			if (dDate && pDate && dDate !== pDate) {
				return null;
			}

			return {
				patientId: candidate.mergedIntoPatientId ?? candidate.id,
				matchMethod: "dicom_name_exact",
			};
		}

		if (candidates.length > 1 && dicomBirthDate) {
			const dDate = dicomBirthDate.replace(/\D/g, "");
			const matchingByBirthDate = candidates.filter(
				(c) => (c.birthDate ?? "").replace(/\D/g, "") === dDate,
			);
			if (matchingByBirthDate.length === 1) {
				const matched = matchingByBirthDate[0]!;
				return {
					patientId: matched.mergedIntoPatientId ?? matched.id,
					matchMethod: "dicom_name_birthdate",
				};
			}
		}
	}

	return null;
}

/**
 * Registers STOW-RS (Store Over the Web) routes per DICOM PS3.18 Section 10.
 * POST /api/dicomweb/studies
 * POST /api/dicomweb/studies/:studyUid
 */
export function registerDicomwebStowRoutes(app: FastifyInstance) {
	const parsersToAdd: string[] = [];
	for (const ct of [
		"application/dicom",
		"application/octet-stream",
		"multipart/related",
		"multipart/form-data",
	]) {
		if (!app.hasContentTypeParser(ct)) {
			parsersToAdd.push(ct);
		}
	}
	if (parsersToAdd.length > 0) {
		app.addContentTypeParser(
			parsersToAdd,
			(_req, payload, done) => {
				done(null, payload);
			},
		);
	}

	const handler = async (
		request: FastifyRequest<{
			Params?: { studyUid?: string };
			Querystring?: {
				patientId?: string;
				patient_id?: string;
				visitId?: string;
				visit_id?: string;
				doctorId?: string;
				doctor_id?: string;
			};
		}>,
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

		// Stage incoming payload into a temporary isolated file to avoid Node heap bloat
		const tempId = crypto.randomUUID();
		const tempDir = path.resolve(process.cwd(), "uploads", "temp_stow");
		await fs.mkdir(tempDir, { recursive: true });
		const tempFilePath = path.join(tempDir, `stow_${tempId}.dcm`);

		try {
			await streamDicomPayloadToDisk(request, tempFilePath);
		} catch (err) {
			await fs.unlink(tempFilePath).catch(() => {});
			return reply.code(400).send({
				error: "InvalidDicomPayload",
				message: err instanceof Error ? err.message : "Ошибка при чтении потока DICOM.",
			});
		}

		// Probe DICOM header from disk (first 128 KB)
		let headerBuf: Buffer;
		try {
			const fd = openSync(tempFilePath, "r");
			headerBuf = Buffer.alloc(131072);
			const bytesRead = readSync(fd, headerBuf, 0, headerBuf.length, 0);
			closeSync(fd);
			headerBuf = headerBuf.subarray(0, bytesRead);
		} catch {
			await fs.unlink(tempFilePath).catch(() => {});
			return reply.code(400).send({
				error: "InvalidDicomPayload",
				message: "Не удалось прочитать заголовок временного файла снимка.",
			});
		}

		if (headerBuf.length < 132) {
			await fs.unlink(tempFilePath).catch(() => {});
			return reply.code(400).send({
				error: "InvalidDicomPayload",
				message:
					"Тело запроса должно содержать валидный бинарный буфер DICOM (минимум 132 байта с DICM сигнатурой).",
			});
		}

		const parsed = parseDicomBufferForStow(headerBuf);
		if (!parsed.studyUid || !parsed.seriesUid || !parsed.sopInstanceUid) {
			await fs.unlink(tempFilePath).catch(() => {});
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
			await fs.unlink(tempFilePath).catch(() => {});
			return reply.code(409).send({
				error: "StudyUidMismatch",
				message: `StudyInstanceUID в URL (${pathStudyUid}) не совпадает со значением в файле (${parsed.studyUid}).`,
			});
		}

		// Honest patient resolution & auto-binding engine:
		// Explicit query/header -> smart FIO translit & Levenshtein matching -> unassigned PACS queue
		const explicitPatientId =
			request.query?.patientId ||
			request.query?.patient_id ||
			(request.headers["x-patient-id"] as string | undefined) ||
			(request.headers["x-dente-patient-id"] as string | undefined) ||
			null;

		let resolvedPatientId: string | null = null;
		let matchMethod = "unassigned";
		let bindingStatus: "auto_bound" | "manual_bound" | "pending_review" | "unassigned" = "unassigned";
		let bindingConfidence = 0;
		let matchDetailsText = "Неразобранное исследование";

		if (explicitPatientId && UUID_SHAPE.test(explicitPatientId.trim())) {
			const [found] = await db
				.select({
					id: schema.patients.id,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
					fullName: schema.patients.fullName,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						eq(schema.patients.id, explicitPatientId.trim()),
					),
				)
				.limit(1);

			if (found) {
				resolvedPatientId = found.mergedIntoPatientId ?? found.id;
				matchMethod = "explicit";
				bindingStatus = "manual_bound";
				bindingConfidence = 100;
				matchDetailsText = `Явная привязка по параметру patientId к ${found.fullName}`;
			}
		}

		if (!resolvedPatientId) {
			const autoBindRes = await matchPatientForDicom(organizationId, {
				dicomPatientName: parsed.dicomPatientName,
				dicomPatientId: parsed.dicomPatientId,
				dicomBirthDate: parsed.dicomBirthDate,
			});

			resolvedPatientId = autoBindRes.patientId;
			matchMethod = autoBindRes.matchMethod;
			bindingStatus = autoBindRes.status;
			bindingConfidence = autoBindRes.confidence;
			matchDetailsText = autoBindRes.matchDetails;
		}

		// Permanent normalized relative POSIX path in uploads/dicom/...
		const normalizedRelativePath = path.posix.join(
			"uploads",
			"dicom",
			organizationId,
			parsed.studyUid,
			parsed.seriesUid,
			`${parsed.sopInstanceUid}.dcm`,
		);
		const permanentDiskPath = path.resolve(process.cwd(), normalizedRelativePath);
		await fs.mkdir(path.dirname(permanentDiskPath), { recursive: true });
		await fs.rename(tempFilePath, permanentDiskPath);

		let fileSizeOnDisk: number | undefined;
		try {
			const st = await fs.stat(permanentDiskPath);
			fileSizeOnDisk = st.size;
		} catch {
			// fallback
		}

		// Authenticated doctor/staff context
		const explicitDoctorId =
			request.query?.doctorId ||
			request.query?.doctor_id ||
			(request.headers["x-doctor-id"] as string | undefined) ||
			identity.userId ||
			null;
		const validDoctorId =
			explicitDoctorId && UUID_SHAPE.test(explicitDoctorId.trim())
				? explicitDoctorId.trim()
				: null;

		const explicitVisitId =
			request.query?.visitId ||
			request.query?.visit_id ||
			(request.headers["x-visit-id"] as string | undefined) ||
			null;
		const validVisitId =
			explicitVisitId && UUID_SHAPE.test(explicitVisitId.trim())
				? explicitVisitId.trim()
				: null;

		const doctorId = validDoctorId ?? identity.userId ?? null;
		const staffId =
			(request as unknown as { user?: { staffId?: string | null } }).user?.staffId ??
			doctorId;
		const operatorLabel = identity.fullName
			? ` [${identity.role === "doctor" ? "Врач" : "Сотрудник"}: ${identity.fullName}]`
			: doctorId
				? ` [ID: ${doctorId}]`
				: "";

		// Record in DB with tenant isolation
		const result: StowStoreResult = await withTenantCtx(organizationId, async () => {
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
				const [createdStudy] = await db
					.insert(schema.imagingStudies)
					.values({
						organizationId,
						patientId: resolvedPatientId,
						doctorId: validDoctorId,
						visitId: validVisitId,
						kind: "cbct",
						title: `Исследование КЛКТ ${parsed.studyUid}`,
						capturedAt: new Date(),
						sourceKind: "dicomweb",
						sourceName: `STOW-RS${operatorLabel}`,
						status: "available",
						dicomStudyUid: parsed.studyUid!,
						studyInstanceUid: parsed.studyUid!,
						seriesInstanceUid: parsed.seriesUid!,
						modality: "CT",
						seriesDescription: "STOW-RS CBCT Series",
						dimensions:
							parsed.rows && parsed.columns
								? `${parsed.columns}x${parsed.rows}`
								: null,
						bindingStatus,
						bindingConfidence,
						dicomPatientName: parsed.dicomPatientName,
						dicomPatientId: parsed.dicomPatientId,
						dicomBirthDate: parsed.dicomBirthDate,
						storagePath: normalizedRelativePath,
						fileSizeBytes: fileSizeOnDisk,
						aiSummary: `Загружено через STOW-RS. Врач/Оператор: ${staffId ?? doctorId ?? "Клинический персонал"}. Сопоставление: ${matchMethod} (${matchDetailsText}).`,
					})
					.returning({ id: schema.imagingStudies.id });
				if (!createdStudy) {
					throw new Error("Не удалось создать запись исследования");
				}
				study = createdStudy;
			} else {
				await db
					.update(schema.imagingStudies)
					.set({
						storagePath: normalizedRelativePath,
						studyInstanceUid: parsed.studyUid!,
						seriesInstanceUid: parsed.seriesUid!,
						modality: "CT",
						fileSizeBytes: fileSizeOnDisk,
						dimensions:
							parsed.rows && parsed.columns
								? `${parsed.columns}x${parsed.rows}`
								: undefined,
					})
					.where(
						and(
							eq(schema.imagingStudies.id, study.id),
							eq(schema.imagingStudies.organizationId, organizationId),
						),
					);
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
						storagePath: normalizedRelativePath,
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
					.set({
						storagePath: normalizedRelativePath,
						rows: parsed.rows,
						columns: parsed.columns,
					})
					.where(
						and(
							eq(schema.imagingInstances.id, instance.id),
							eq(schema.imagingInstances.organizationId, organizationId),
						),
					);
			}

			return {
				studyUid: parsed.studyUid!,
				seriesUid: parsed.seriesUid!,
				sopInstanceUid: parsed.sopInstanceUid!,
				storagePath: normalizedRelativePath,
				studyId: study.id,
				seriesId: series.id,
				instanceId: instance.id,
				patientId: resolvedPatientId,
				matchMethod,
				bindingStatus,
				bindingConfidence,
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
				patientId: result.patientId ?? undefined,
				doctorId: doctorId ?? undefined,
				staffId: staffId ?? undefined,
				matchMethod: result.matchMethod,
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
			patientId: result.patientId,
			bindingStatus: result.bindingStatus,
			bindingConfidence: result.bindingConfidence,
			matchMethod: result.matchMethod,
			status: "stored",
		});
	};

	const stowRouteOptions = {
		bodyLimit: Number(process.env.DICOM_BODY_LIMIT_BYTES ?? 2 * 1024 * 1024 * 1024),
		config: { tenantTxSelfManaged: true },
	};

	app.post("/api/dicomweb/studies", stowRouteOptions, handler);
	app.post(
		"/api/dicomweb/studies/:studyUid",
		stowRouteOptions,
		handler,
	);
}
