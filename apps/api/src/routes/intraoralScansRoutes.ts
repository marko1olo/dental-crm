/**
 * apps/api/src/routes/intraoralScansRoutes.ts — Universal Intraoral 3D Scans Fastify Routes.
 *
 * Exposes clinical endpoints for intraoral 3D scans ingestion, retrieval,
 * and high-performance mesh streaming:
 *   - POST /api/v1/scans/session
 *   - GET  /api/v1/scans/sessions/patient/:patientId
 *   - GET  /api/v1/scans/sessions/:id
 *   - GET  /api/v1/scans/files/:sessionId/:fileName
 *
 * Invariants: Zero Any, Strict Zod schemas, Clinical Medical Secrecy,
 * Multitenant RLS isolation, Path Traversal Jail.
 */

import { createReadStream } from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	INTRAORAL_SCANNER_VENDORS,
	type IntraoralScannerVendor,
} from "@dental/shared";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import {
	PathTraversalError,
	TenantIsolationError,
} from "../services/imaging/localPacsSanitizer.js";
import {
	UniversalScannerHub,
	type ScanFileInput,
} from "../services/scanner/universalScannerHub.js";

// ============================================================================
// 1. ZOD SCHEMAS & TYPES
// ============================================================================

const fdiToothSchema = z.number().int().min(11).max(85);

export const createScanSessionJsonSchema = z
	.object({
		patientId: z.string().uuid().optional(),
		visitId: z.string().uuid().optional(),
		labOrderId: z.string().uuid().optional(),
		vendor: z.enum(INTRAORAL_SCANNER_VENDORS).optional(),
		scannerModel: z.string().max(200).optional(),
		zipBase64: z.string().optional(),
		files: z
			.array(
				z
					.object({
						name: z.string().min(1),
						contentBase64: z.string(),
					})
					.strict(),
			)
			.optional(),
		folderPath: z.string().min(1).optional(),
		preparationTeethFdi: z.array(fdiToothSchema).optional(),
		implantTeethFdi: z.array(fdiToothSchema).optional(),
		materialsPlanned: z.record(z.string(), z.string()).optional(),
		vitaShade: z.string().max(32).optional(),
	})
	.strict();
export type CreateScanSessionJsonInput = z.infer<typeof createScanSessionJsonSchema>;

export const patientScansParamsSchema = z
	.object({
		patientId: z.string().uuid(),
	})
	.strict();

export const sessionByIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export const scanFileParamsSchema = z
	.object({
		sessionId: z.string().uuid(),
		fileName: z.string().min(1),
	})
	.strict();

interface MultipartFileCandidate {
	filename?: string;
	mimetype?: string;
	file: AsyncIterable<Buffer | string>;
	fields?: Record<string, { value?: string }>;
}

interface FastifyWithMultipart {
	file?: () => Promise<MultipartFileCandidate | undefined>;
	files?: () => AsyncIterable<MultipartFileCandidate>;
}

// ============================================================================
// 2. MULTIPART HELPERS
// ============================================================================

function stripMultipartWrapperFromBuffer(buffer: Buffer): {
	data: Buffer;
	filename?: string | undefined;
	mimeType?: string | undefined;
} {
	const headerEndCrLf = buffer.indexOf("\r\n\r\n");
	const headerEndLf = buffer.indexOf("\n\n");
	let startOffset = 0;
	let filename: string | undefined;
	let mimeType: string | undefined;

	if (headerEndCrLf !== -1 && headerEndCrLf < 4096) {
		const headerText = buffer.subarray(0, headerEndCrLf).toString("utf8");
		const matchFile = headerText.match(/filename="([^"]+)"/);
		if (matchFile) filename = matchFile[1];
		const matchMime = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
		if (matchMime) mimeType = matchMime[1]?.trim();
		startOffset = headerEndCrLf + 4;
	} else if (headerEndLf !== -1 && headerEndLf < 4096) {
		const headerText = buffer.subarray(0, headerEndLf).toString("utf8");
		const matchFile = headerText.match(/filename="([^"]+)"/);
		if (matchFile) filename = matchFile[1];
		const matchMime = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
		if (matchMime) mimeType = matchMime[1]?.trim();
		startOffset = headerEndLf + 2;
	}

	let endOffset = buffer.length;
	const lastBoundary = buffer.lastIndexOf("\r\n--");
	if (lastBoundary !== -1 && lastBoundary > startOffset) {
		endOffset = lastBoundary;
	}

	return {
		data: buffer.subarray(startOffset, endOffset),
		filename,
		mimeType,
	};
}

// ============================================================================
// 3. FASTIFY ROUTES REGISTRATION
// ============================================================================

export async function registerIntraoralScansRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * POST /api/v1/scans/session (and /api/scans/session)
	 * Ingests an intraoral scan session from ZIP archive, multi-mesh files, or JSON payload.
	 */
	const handleCreateScanSession = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// Clinical Mutation Access Check
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);

		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.scan.upload",
				role: staffRole,
				message:
					"Отказ в доступе: загрузка интраоральных сканов разрешена только клиническому персоналу.",
			});
		}

		let zipBuffer: Buffer | undefined;
		let inputFiles: ScanFileInput[] = [];
		let patientId: string | undefined;
		let visitId: string | undefined;
		let labOrderId: string | undefined;
		let vendor: IntraoralScannerVendor | undefined;
		let scannerModel: string | undefined;
		let preparationTeethFdi: number[] | undefined;
		let implantTeethFdi: number[] | undefined;
		let materialsPlanned: Record<string, string> | undefined;
		let vitaShade: string | undefined;
		let folderPath: string | undefined;

		const querySchema = z
			.object({
				patientId: z.string().uuid().optional(),
				visitId: z.string().uuid().optional(),
				labOrderId: z.string().uuid().optional(),
				vendor: z.enum(INTRAORAL_SCANNER_VENDORS).optional(),
				vitaShade: z.string().max(32).optional(),
				fileName: z.string().min(1).optional(),
			})
			.strict();
		const parsedQuery = querySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "InvalidPayload",
				message: "Некорректные параметры запроса скана.",
			});
		}
		const query = parsedQuery.data;
		const headers = request.headers;

		if (query.patientId) patientId = query.patientId;
		if (query.visitId) visitId = query.visitId;
		if (query.labOrderId) labOrderId = query.labOrderId;
		if (query.vendor) vendor = query.vendor;
		if (query.vitaShade) vitaShade = query.vitaShade;

		const uuidHeaderSchema = z.string().uuid();
		if (!patientId && typeof headers["x-patient-id"] === "string") {
			const pHead = uuidHeaderSchema.safeParse(headers["x-patient-id"]);
			if (!pHead.success) {
				return reply.code(400).send({
					error: "InvalidPayload",
					message: "Некорректный UUID в заголовке x-patient-id.",
				});
			}
			patientId = pHead.data;
		}
		if (!visitId && typeof headers["x-visit-id"] === "string") {
			const vHead = uuidHeaderSchema.safeParse(headers["x-visit-id"]);
			if (!vHead.success) {
				return reply.code(400).send({
					error: "InvalidPayload",
					message: "Некорректный UUID в заголовке x-visit-id.",
				});
			}
			visitId = vHead.data;
		}

		// 1. Check for standard multipart file stream
		const reqWithMultipart = request as FastifyRequest & FastifyWithMultipart;
		if (typeof reqWithMultipart.file === "function") {
			try {
				const part = await reqWithMultipart.file();
				if (part) {
					const chunks: Buffer[] = [];
					for await (const chunk of part.file) {
						chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
					}
					const fileBuffer = Buffer.concat(chunks);
					const partName = part.filename || "scan_session.zip";

					if (partName.endsWith(".zip") || (fileBuffer.length >= 4 && fileBuffer.readUInt32LE(0) === 0x04034b50)) {
						zipBuffer = fileBuffer;
					} else {
						inputFiles.push({ name: partName, buffer: fileBuffer });
					}

					const fields = part.fields;
					if (fields?.patientId?.value) {
						const parsedP = uuidHeaderSchema.safeParse(fields.patientId.value);
						if (!parsedP.success) {
							return reply.code(400).send({ error: "InvalidPayload", message: "Некорректный UUID patientId в multipart." });
						}
						patientId = parsedP.data;
					}
					if (fields?.visitId?.value) {
						const parsedV = uuidHeaderSchema.safeParse(fields.visitId.value);
						if (!parsedV.success) {
							return reply.code(400).send({ error: "InvalidPayload", message: "Некорректный UUID visitId в multipart." });
						}
						visitId = parsedV.data;
					}
					if (fields?.labOrderId?.value) {
						const parsedL = uuidHeaderSchema.safeParse(fields.labOrderId.value);
						if (!parsedL.success) {
							return reply.code(400).send({ error: "InvalidPayload", message: "Некорректный UUID labOrderId в multipart." });
						}
						labOrderId = parsedL.data;
					}
					if (fields?.vendor?.value) {
						const parsedVendor = z.enum(INTRAORAL_SCANNER_VENDORS).safeParse(fields.vendor.value);
						if (!parsedVendor.success) {
							return reply.code(400).send({ error: "InvalidPayload", message: "Неизвестный производитель сканера." });
						}
						vendor = parsedVendor.data;
					}
					if (fields?.scannerModel?.value) scannerModel = fields.scannerModel.value;
					if (fields?.vitaShade?.value) vitaShade = fields.vitaShade.value;
				}
			} catch (multipartErr: unknown) {
				request.log.warn({ err: multipartErr }, "Multipart stream parse fallback in intraoralScansRoutes");
				if (!Buffer.isBuffer(request.body)) {
					return reply.code(400).send({
						error: "InvalidMultipartPayload",
						message: "Не удалось прочитать multipart-поток файлов 3D-сканирования.",
					});
				}
			}
		}

		// 2. Check for Buffer in request.body (Raw binary ZIP or multipart buffer)
		if (!zipBuffer && inputFiles.length === 0 && Buffer.isBuffer(request.body)) {
			const contentType = request.headers["content-type"] || "";
			let rawBuffer = request.body;

			if (contentType.includes("multipart/form-data")) {
				const stripped = stripMultipartWrapperFromBuffer(rawBuffer);
				rawBuffer = stripped.data;
				const fileName = stripped.filename || "scan.zip";
				if (fileName.endsWith(".zip") || (rawBuffer.length >= 4 && rawBuffer.readUInt32LE(0) === 0x04034b50)) {
					zipBuffer = rawBuffer;
				} else {
					inputFiles.push({ name: fileName, buffer: rawBuffer });
				}
			} else {
				// Pure binary stream
				if (rawBuffer.length >= 4 && rawBuffer.readUInt32LE(0) === 0x04034b50) {
					zipBuffer = rawBuffer;
				} else {
					const rawName = (query.fileName as string) || "scan_model.stl";
					inputFiles.push({ name: rawName, buffer: rawBuffer });
				}
			}
		}

		// 3. Check for JSON Payload
		if (!zipBuffer && inputFiles.length === 0 && request.body && typeof request.body === "object") {
			const parsedResult = createScanSessionJsonSchema.safeParse(request.body);
			if (!parsedResult.success) {
				return reply.code(400).send({
					error: "InvalidPayload",
					message: "Некорректная структура параметров сессии сканирования.",
					details: parsedResult.error.flatten(),
				});
			}

			const data = parsedResult.data;
			if (data.patientId) patientId = data.patientId;
			if (data.visitId) visitId = data.visitId;
			if (data.labOrderId) labOrderId = data.labOrderId;
			if (data.vendor) vendor = data.vendor;
			if (data.scannerModel) scannerModel = data.scannerModel;
			if (data.folderPath) folderPath = data.folderPath;
			if (data.preparationTeethFdi) preparationTeethFdi = data.preparationTeethFdi;
			if (data.implantTeethFdi) implantTeethFdi = data.implantTeethFdi;
			if (data.materialsPlanned) materialsPlanned = data.materialsPlanned;
			if (data.vitaShade) vitaShade = data.vitaShade;

			if (data.zipBase64) {
				zipBuffer = Buffer.from(data.zipBase64, "base64");
			} else if (data.files && data.files.length > 0) {
				for (const f of data.files) {
					inputFiles.push({
						name: f.name,
						buffer: Buffer.from(f.contentBase64, "base64"),
					});
				}
			}
		}

		if (!zipBuffer && inputFiles.length === 0 && !folderPath) {
			return reply.code(400).send({
				error: "MissingScanFiles",
				message:
					"Файлы 3D-сканирования не получены. Передайте ZIP-архив, набор STL/PLY файлов или JSON base64 полезную нагрузку.",
			});
		}

		try {
			const session = await UniversalScannerHub.processIncomingScanSession({
				organizationId: orgId,
				patientId,
				visitId,
				labOrderId,
				vendor,
				scannerModel,
				zipBuffer,
				files: inputFiles.length > 0 ? inputFiles : undefined,
				folderPath,
				preparationTeethFdi,
				implantTeethFdi,
				materialsPlanned,
				vitaShade,
			});

			return reply.code(201).send({
				success: true,
				session,
			});
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			request.log.error({ err }, "Failed to process intraoral scan session");

			if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
				return reply.code(403).send({
					error: "PathTraversalDetected",
					message: "Доступ к указанному пути сканирования запрещен.",
				});
			}

			if (errorMessage.includes("Zip-бомбы") || errorMessage.includes("лимит")) {
				return reply.code(400).send({
					error: "ZipBombLimitExceeded",
					message: errorMessage,
				});
			}

			if (errorMessage.includes("Patient could not be linked") || errorMessage.includes("Missing patientId")) {
				return reply.code(400).send({
					error: "MissingPatientId",
					message:
						"Не удалось автоматически связать скан с пациентом. Укажите patientId явно.",
				});
			}

			if (errorMessage.includes("not found in this organization")) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Указанный пациент не найден в организации клиники.",
				});
			}

			return reply.code(500).send({
				error: "ScanProcessingError",
				message: "Ошибка обработки интраорального 3D-скана.",
			});
		}
	};

	app.post("/api/v1/scans/session", handleCreateScanSession);
	app.post("/api/scans/session", handleCreateScanSession);

	/**
	 * GET /api/v1/scans/sessions/patient/:patientId (and /api/scans/sessions/patient/:patientId)
	 * Lists all 3D scan sessions for a given patient.
	 */
	const handleListPatientScans = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.scan.read",
				role: staffRole,
				message: "Доступ к списку 3D-сканов разрешен только клиническому персоналу.",
			});
		}

		const parsedParams = patientScansParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный UUID пациента.",
			});
		}

		const sessions = await UniversalScannerHub.listScanSessionsByPatient(
			orgId,
			parsedParams.data.patientId,
		);

		return reply.send({
			success: true,
			count: sessions.length,
			sessions,
		});
	};

	app.get("/api/v1/scans/sessions/patient/:patientId", handleListPatientScans);
	app.get("/api/scans/sessions/patient/:patientId", handleListPatientScans);

	/**
	 * GET /api/v1/scans/sessions/:id (and /api/scans/sessions/:id)
	 * Retrieves an intraoral scan session record by ID.
	 */
	const handleGetScanSession = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.scan.read",
				role: staffRole,
				message: "Доступ к сессии 3D-сканирования разрешен только клиническому персоналу.",
			});
		}

		const parsedParams = sessionByIdParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "InvalidSessionId",
				message: "Некорректный UUID сессии сканирования.",
			});
		}

		const session = await UniversalScannerHub.getScanSessionById(
			orgId,
			parsedParams.data.id,
		);

		if (!session) {
			return reply.code(404).send({
				error: "ScanSessionNotFound",
				message: "Сессия интраорального 3D-сканирования не найдена.",
			});
		}

		return reply.send({
			success: true,
			session,
		});
	};

	app.get("/api/v1/scans/sessions/:id", handleGetScanSession);
	app.get("/api/scans/sessions/:id", handleGetScanSession);

	/**
	 * GET /api/v1/scans/files/:sessionId/:fileName (and /api/scans/files/:sessionId/:fileName)
	 * Streams raw STL/PLY/OBJ mesh or preview snapshot directly from disk with path jail.
	 */
	const handleGetScanFile = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// Clinical Read Access Check
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);

		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.scan.download",
				role: staffRole,
				message:
					"Отказ в доступе: скачивание файлов 3D-сканирования разрешено только клиническому персоналу.",
			});
		}

		const parsedParams = scanFileParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "InvalidFileRequest",
				message: "Некорректные параметры запроса файла 3D-скана.",
			});
		}

		const { sessionId, fileName } = parsedParams.data;
		const resolved = await UniversalScannerHub.resolveScanFile(orgId, sessionId, fileName);

		if (!resolved) {
			return reply.code(404).send({
				error: "ScanFileNotFound",
				message: "Файл 3D-скана не найден на сервере или доступ запрещен.",
			});
		}

		reply.header("Content-Type", resolved.mimeType);
		reply.header("Content-Length", resolved.sizeBytes);
		reply.header(
			"Content-Disposition",
			`inline; filename="${encodeURIComponent(path.basename(resolved.filePath))}"`,
		);
		reply.header("Cache-Control", "private, max-age=86400");

		return reply.send(createReadStream(resolved.filePath));
	};

	app.get("/api/v1/scans/files/:sessionId/:fileName", handleGetScanFile);
	app.get("/api/scans/files/:sessionId/:fileName", handleGetScanFile);
}
