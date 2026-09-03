import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { attachments, patients, visitDiaries, visits } from "../db/schema.js";
import { decodeServerHeicImage } from "../services/imaging/serverHeicDecoder.js";
import { isHeicFileNameOrMime } from "@dental/shared";
import { getRequestIdentity } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

type MultipartFilePayload = {
	filename: string;
	mimetype: string;
	file: NodeJS.ReadableStream;
};

export async function registerFilesRoutes(app: FastifyInstance) {
	// Ensure uploads directory exists
	await fs.mkdir(UPLOADS_DIR, { recursive: true });

	/*
	 * Список вложений карточки пациента (не приёма).
	 *
	 * POST ниже писал на диск и в attachments с patient_id, но списка не было —
	 * оператор загружал «в никуда»: скачать и проверить нельзя. Зеркало
	 * GET /api/files/visits/:visitId/attachments, фильтр по patient_id + org.
	 * visit_id не трогаем: фото дневника живут на приёме; здесь — паспорт,
	 * направление, скан договора и прочие файлы именно карточки.
	 */
	const getPatientAttachmentsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;
			const { patientId } = request.params as { patientId: string };

			const [patient] = await db
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);

			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в этой клинике.",
				});
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Защита вложений архивированного пациента
			if (patient.status === "archived") {
				const identity = getRequestIdentity(request);
				const reqAny = request as unknown as { user?: { role?: string | null } };
				const staffRole = identity.role ?? reqAny.user?.role ?? null;
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.attachments",
						role: staffRole,
						message:
							"Отказ в доступе к вложениям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение файлов списанного в архив пациента неклиническим персоналом запрещено.",
					});
				}
			}

			const rows = await db
				.select()
				.from(attachments)
				.where(
					and(
						eq(attachments.patientId, patientId),
						eq(attachments.organizationId, orgId),
					),
				);

			return reply.send({
				files: rows.map((a) => ({
					id: a.id,
					url: `/api/attachments/${a.id}/download`,
					name: a.fileName,
					type: a.mimeType,
				})),
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении списка вложений пациента.",
			});
		}
	};

	app.get("/api/patients/:patientId/attachments", getPatientAttachmentsHandler);
	app.get("/api/files/patients/:patientId/attachments", getPatientAttachmentsHandler);

	const postPatientAttachmentsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;
			const { patientId } = request.params as { patientId: string };

			const [patient] = await db
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);

			if (!patient) {
				return reply.code(403).send({
					error: "Forbidden",
					message:
						"Пациент не найден в этой клинике или относится к другой организации.",
				});
			}

			// 152-ФЗ / 323-ФЗ: Защита от модификации вложений архивированного пациента
			if (patient.status === "archived") {
				const identity = getRequestIdentity(request);
				const reqAny = request as unknown as { user?: { role?: string | null } };
				const staffRole = identity.role ?? reqAny.user?.role ?? null;
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.attachments",
						role: staffRole,
						message:
							"Отказ в загрузке вложений архивированному пациенту (152-ФЗ / 323-ФЗ ст. 13): модификация файлов списанного в архив пациента неклиническим персоналом запрещена.",
					});
				}
			}

			const data = await (
				request as unknown as {
					file: () => Promise<MultipartFilePayload | undefined>;
				}
			).file();
			if (!data) {
				return reply.code(400).send({
					error: "MissingFilePayload",
					message: "Файл не получен: выберите снимок и повторите загрузку.",
				});
			}

			const uniqueSuffix = crypto.randomUUID();
			const safeFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
			const filename = `${uniqueSuffix}-${safeFilename}`;
			const storagePath = path.join(UPLOADS_DIR, filename);

			// Stream file to disk and calculate sha256
			const hash = crypto.createHash("sha256");
			let sha256 = "";

			// Create a write stream
			const writeStream = createWriteStream(storagePath);

			data.file.on("data", (chunk: Buffer) => hash.update(chunk));

			await pipeline(data.file, writeStream);
			sha256 = hash.digest("hex");

			const [attachment] = await db
				.insert(attachments)
				.values({
					organizationId: orgId,
					patientId,
					fileName: data.filename,
					mimeType: data.mimetype,
					storagePath: filename,
					sha256,
				})
				.returning();

			if (!attachment) {
				return reply.code(500).send({
					error: "AttachmentNotSaved",
					message:
						"Файл не сохранён: сервер не записал вложение. Повторите загрузку; если снова не выйдет — сообщите администратору клиники.",
				});
			}

			/*
			 * Ответ в том же виде, что visit-upload: web-панель ждёт file.id/url/name/type
			 * и не разбирает сырой attachment из БД (storagePath/sha256).
			 */
			return reply.code(201).send({
				success: true,
				attachment,
				file: {
					id: attachment.id,
					url: `/api/attachments/${attachment.id}/download`,
					name: attachment.fileName,
					type: attachment.mimeType,
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при сохранении вложения карточки пациента.",
			});
		}
	};

	app.post("/api/patients/:patientId/attachments", postPatientAttachmentsHandler);
	app.post("/api/files/patients/:patientId/attachments", postPatientAttachmentsHandler);

	/*
	 * Выдача файла вложения.
	 *
	 * ПОЧЕМУ ЗДЕСЬ ЯВНЫЙ withTenantCtx И tenantTxSelfManaged. Тело ответа —
	 * поток файла с диска: он передаётся столько, сколько занимает передача, и
	 * скорость задаёт клиент. Автоматическая обёртка из server.ts держала бы
	 * транзакцию и соединение из пула (их 10) всё это время; десяти
	 * одновременных выгрузок хватало, чтобы обычные запросы к базе перестали
	 * получать соединение вовсе. Строка вложения читается под контекстом
	 * арендатора, транзакция закрывается, и только потом открывается поток.
	 * Обход RLS не применяется: строка ищется по organization_id из
	 * проверенного токена и под политикой арендатора.
	 */
	app.get(
		"/api/attachments/:attachmentId/download",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;
			const { attachmentId } = request.params as { attachmentId: string };

			const [attachment] = await withTenantCtx(orgId, (tx) =>
				tx
					.select()
					.from(attachments)
					.where(
						and(
							eq(attachments.id, attachmentId),
							eq(attachments.organizationId, orgId),
						),
					)
					.limit(1),
			);

			if (!attachment) {
				return reply.code(404).send({
					error: "AttachmentNotFound",
					message: "Вложение не найдено в этой клинике.",
				});
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Защита при скачивании вложений
			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);

			// Если вложение привязано к приёму — это медицинские фото/снимки лечебного процесса
			if (attachment.visitId && !evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.attachment.download",
					role: staffRole,
					message:
						"Отказ в доступе к клиническому снимку приёма (152-ФЗ / 323-ФЗ ст. 13): скачивание файлов лечебного процесса неклиническим персоналом запрещено.",
				});
			}

			// Если вложение привязано к пациенту, проверяем архивный статус пациента
			if (attachment.patientId) {
				const [patient] = await db
					.select({ id: patients.id, status: patients.status })
					.from(patients)
					.where(
						and(
							eq(patients.id, attachment.patientId),
							eq(patients.organizationId, orgId),
						),
					)
					.limit(1);

				if (patient?.status === "archived" && !evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.attachment.download",
						role: staffRole,
						message:
							"Отказ в доступе к вложению архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): скачивание файлов списанного в архив пациента неклиническим персоналом запрещено.",
					});
				}

				if (attachment.visitId || patient?.status === "archived") {
					await auditMedicalAccessFromRequest(request, {
						organizationId: orgId,
						patientId: attachment.patientId,
						action: "DOWNLOAD_MEDICAL_ATTACHMENT",
						metadata: {
							attachmentId: attachment.id,
							fileName: attachment.fileName,
							visitId: attachment.visitId,
						},
					});
				}
			}

			const filePath = path.join(UPLOADS_DIR, attachment.storagePath);
			try {
				await fs.access(filePath);
				reply.header(
					"Content-Disposition",
					`attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
				);
				reply.type(attachment.mimeType);
				return reply.send(createReadStream(filePath));
			} catch (_e) {
				return reply.code(404).send({
					error: "FileNotFoundOnDisk",
					message:
						"Файл вложения отсутствует на диске сервера. Сообщите администратору клиники.",
				});
			}
		},
	);

	app.get("/api/files/visits/:visitId/attachments", async (request, reply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;
			const { visitId } = request.params as { visitId: string };

			/*
			 * БЫЛО: только filter attachments.visitId + org — чужой/несуществующий
			 * visitId давал files:[] как «снимков нет». Врач не отличал пустой
			 * приём от чужого UUID / опечатки. Пациентский GET уже 404.
			 */
			const [visitRow] = await db
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1);
			if (!visitRow) {
				return reply.code(404).send({
					error: "VisitNotFound",
					message: "Приём не найден в этой клинике.",
				});
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Вложения приёма (снимки, фото зубов) доступны только клиническому персоналу
			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.visit.attachments.read",
					role: staffRole,
					message:
						"Доступ к клиническим фото и снимкам приёма ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
				});
			}

			if (visitRow.patientId) {
				await auditMedicalAccessFromRequest(request, {
					organizationId: orgId,
					patientId: visitRow.patientId,
					action: "VIEW_VISIT_ATTACHMENTS",
					metadata: { visitId },
				});
			}

			const visitAttachments = await db
				.select()
				.from(attachments)
				.where(
					and(
						eq(attachments.visitId, visitId),
						eq(attachments.organizationId, orgId),
					),
				);

			return reply.send({
				files: visitAttachments.map((a) => ({
					id: a.id,
					url: `/api/attachments/${a.id}/download`,
					name: a.fileName,
					type: a.mimeType,
				})),
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при чтении снимков и вложений приёма.",
			});
		}
	});

	app.post("/api/files/visits/:visitId/attachments", async (request, reply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;
			const { visitId } = request.params as { visitId: string };

			/*
			 * БЫЛО: insert attachments с organizationId=org вызывающего и visitId
			 * из URL без проверки. FK visits.id глобальный — UUID приёма другой
			 * клиники принимался; строка жила в org атакующего, а visit_id
			 * указывал на чужой приём. Несуществующий UUID → 500 FK, не 404.
			 * СТАЛО: как у patient attachments — 403/404 до записи на диск.
			 */
			const [visitRow] = await db
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1);
			if (!visitRow) {
				return reply.code(403).send({
					error: "Forbidden",
					message:
						"Приём не найден в этой клинике или относится к другой организации.",
				});
			}

			/*
			 * DEFECT #45: refuse photo attach to locked 043/у.
			 * БЫЛО: client VisitDiaryPhotoUpload блокировал UI при isLocked,
			 * но POST /api/files/visits/:visitId/attachments принимал файл
			 * без проверки visit_diaries.is_locked. curl/Postman с токеном
			 * кабинета мог прикрепить снимок к уже подписанной 043/у —
			 * юридическая карта менялась после ЭЦП без ревизии.
			 * СТАЛО: если у приёма есть locked diary в этой org → 409.
			 * Приёмы без дневника (ещё не создан) — upload разрешён.
			 */
			const [lockedDiary] = await db
				.select({ id: visitDiaries.id })
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, visitId),
						eq(visitDiaries.organizationId, orgId),
						eq(visitDiaries.isLocked, true),
					),
				)
				.limit(1);
			if (lockedDiary) {
				return reply.code(409).send({
					error: "DiaryLocked",
					message:
						"Дневник приёма уже подписан — новые фото к закрытой 043/у не прикрепляются. Правку вносит администратор через ревизию; снимки к подписанной карте не добавляются.",
				});
			}

			const data = await (
				request as unknown as {
					file: () => Promise<MultipartFilePayload | undefined>;
				}
			).file();
			if (!data) {
				return reply.code(400).send({
					error: "MissingFilePayload",
					message: "Файл не получен: выберите снимок и повторите загрузку.",
				});
			}

			const uniqueSuffix = crypto.randomUUID();
			const safeFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
			const filename = `${uniqueSuffix}-${safeFilename}`;
			const storagePath = path.join(UPLOADS_DIR, filename);

			const hash = crypto.createHash("sha256");
			let sha256 = "";
			const writeStream = createWriteStream(storagePath);
			data.file.on("data", (chunk: Buffer) => hash.update(chunk));
			await pipeline(data.file, writeStream);
			sha256 = hash.digest("hex");

			const [attachment] = await db
				.insert(attachments)
				.values({
					organizationId: orgId,
					visitId,
					patientId: visitRow.patientId,
					fileName: data.filename,
					mimeType: data.mimetype,
					storagePath: filename,
					sha256,
				})
				.returning();

			if (!attachment) {
				return reply.code(500).send({
					error: "AttachmentNotSaved",
					message:
						"Файл не сохранён: сервер не записал вложение. Повторите загрузку; если снова не выйдет — сообщите администратору клиники.",
				});
			}

			return reply.code(201).send({
				success: true,
				file: {
					id: attachment.id,
					url: `/api/attachments/${attachment.id}/download`,
					name: attachment.fileName,
					type: attachment.mimeType,
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при прикреплении снимка к приёму.",
			});
		}
	});

	/*
	 * Серверное декодирование Apple HEIC / HEIF в WebP с калибровкой Display P3 -> sRGB.
	 */
	app.post("/api/imaging/decode-heic", async (request, reply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const data = await (
				request as unknown as {
					file: () => Promise<MultipartFilePayload | undefined>;
				}
			).file();

			if (!data) {
				return reply.code(400).send({
					error: "MissingFilePayload",
					message: "Файл HEIC не получен для декодирования.",
				});
			}

			const chunks: Buffer[] = [];
			for await (const chunk of data.file) {
				chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
			}
			const inputBuffer = Buffer.concat(chunks);

			const result = await decodeServerHeicImage(inputBuffer, {
				targetFormat: "webp",
				quality: 92,
				maxDimension: 2048,
				generateThumbnail: true,
				thumbnailSize: 200,
			});

			const dataUrl = `data:image/webp;base64,${result.buffer.toString("base64")}`;
			const thumbnailDataUrl = result.thumbnailBuffer
				? `data:image/webp;base64,${result.thumbnailBuffer.toString("base64")}`
				: dataUrl;

			return reply.code(200).send({
				success: true,
				width: result.width,
				height: result.height,
				format: result.format,
				colorSpace: result.colorSpace,
				exif: result.exif,
				dataUrl,
				thumbnailWebpDataUrl: thumbnailDataUrl,
				sizeBytes: result.sizeBytes,
				originalSizeBytes: result.originalSizeBytes,
				durationMs: result.durationMs,
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "HeicDecodingFailed",
				message: "Не удалось декодировать HEIC-снимок на сервере.",
			});
		}
	});
}

