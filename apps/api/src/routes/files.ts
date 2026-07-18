import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { and, eq, desc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { attachments, patients } from "../db/schema.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function registerFilesRoutes(app: FastifyInstance) {
	// Ensure uploads directory exists
	await fs.mkdir(UPLOADS_DIR, { recursive: true });

	app.get("/api/patients/:patientId/attachments", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		const patientAttachments = await db
			.select({
				id: attachments.id,
				name: attachments.fileName,
				type: attachments.mimeType,
				visitId: attachments.visitId,
				createdAt: attachments.createdAt,
			})
			.from(attachments)
			.where(
				and(
					eq(attachments.patientId, patientId),
					eq(attachments.organizationId, orgId)
				)
			)
			.orderBy(desc(attachments.createdAt));

		return reply.send({ files: patientAttachments });
	});

	app.post("/api/patients/:patientId/attachments", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			return reply.code(403).send({
				error: "Forbidden",
				message:
					"Patient does not belong to this organization or does not exist.",
			});
		}

		const data = await (request as any).file();
		if (!data) {
			return reply.code(400).send({ error: "Missing file payload" });
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
			return reply.code(500).send({ error: "Failed to insert attachment" });
		}

		return reply.code(201).send({ success: true, attachment });
	});

	app.get("/api/attachments/:attachmentId/download", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { attachmentId } = request.params as { attachmentId: string };

		const [attachment] = await db
			.select()
			.from(attachments)
			.where(
				and(
					eq(attachments.id, attachmentId),
					eq(attachments.organizationId, orgId),
				),
			)
			.limit(1);

		if (!attachment) {
			return reply.code(404).send({ error: "AttachmentNotFound" });
		}

		const filePath = path.join(UPLOADS_DIR, attachment.storagePath);
		try {
			const buffer = await fs.readFile(filePath);
			reply.header(
				"Content-Disposition",
				`attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
			);
			reply.type(attachment.mimeType);
			return reply.send(buffer);
		} catch (e) {
			return reply.code(404).send({ error: "FileNotFoundOnDisk" });
		}
	});
	app.get("/api/files/visits/:visitId/attachments", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { visitId } = request.params as { visitId: string };

		const visitAttachments = await db
			.select()
			.from(attachments)
			.where(
				and(
					eq(attachments.visitId, visitId),
					eq(attachments.organizationId, orgId),
				),
			);

		return reply.send({ files: visitAttachments.map(a => ({
			id: a.id,
			url: `/api/attachments/${a.id}/download`,
			name: a.fileName,
			type: a.mimeType
		}))});
	});

	app.post("/api/files/visits/:visitId/attachments", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { visitId } = request.params as { visitId: string };

		const data = await (request as any).file();
		if (!data) {
			return reply.code(400).send({ error: "Missing file payload" });
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
				fileName: data.filename,
				mimeType: data.mimetype,
				storagePath: filename,
				sha256,
			})
			.returning();

		if (!attachment) {
			return reply.code(500).send({ error: "Failed to insert attachment" });
		}

		return reply.code(201).send({ 
			success: true, 
			file: {
				id: attachment.id,
				url: `/api/attachments/${attachment.id}/download`,
				name: attachment.fileName,
				type: attachment.mimeType
			} 
		});
	});
}
