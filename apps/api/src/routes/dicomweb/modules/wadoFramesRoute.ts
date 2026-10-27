import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { requireOrganizationId } from "../../../security/identity.js";
import {
	enforceClinicalDicomAccess,
	normalizeUid,
	organizationExists,
	readDicomIdentity,
	resolveInstanceFilePath,
	streamDicomFileResponse,
	UUID_SHAPE,
} from "../../dicomwebHelpers.js";

export async function handleWadoRetrieveFrames(
	request: FastifyRequest<{ Params: { studyUid: string; seriesUid: string; instanceUid: string; frame: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom frame read"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	if (!enforceClinicalDicomAccess(request, reply, "кадрам КТ / DICOM")) return;

	const studyUid = normalizeUid(request.params.studyUid);
	const seriesUid = normalizeUid(request.params.seriesUid);
	const instanceUid = normalizeUid(request.params.instanceUid);
	const frameNumber = Number.parseInt(request.params.frame, 10);

	if (!UUID_SHAPE.test(organizationId)) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует." });
	}

	if (Number.isNaN(frameNumber) || frameNumber < 1) {
		return reply.code(400).send({ error: "InvalidFrameNumber", message: "Номер кадра должен быть положительным целым числом (1-indexed)." });
	}

	const resolution = await withTenantCtx(organizationId, async () => {
		const orgKnown = await organizationExists(organizationId);
		if (!orgKnown || !studyUid || !seriesUid || !instanceUid) return { orgKnown, filePath: null };
		return { orgKnown: true, filePath: await resolveInstanceFilePath(organizationId, studyUid, seriesUid, instanceUid) };
	});

	if (!resolution.orgKnown) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует." });
	}

	const filePath = resolution.filePath;
	if (!filePath) {
		return reply.code(404).send({ error: "DicomInstanceNotFound", message: "Снимок с таким UID в этой клинике не найден." });
	}

	const identity = await readDicomIdentity(filePath);
	if (!identity) {
		return reply.code(404).send({ error: "DicomInstanceFileUnreadable", message: "Не удалось разобрать структуру DICOM-файла." });
	}

	let fileSize = 0;
	try {
		fileSize = (await fs.stat(filePath)).size;
	} catch {
		return reply.code(404).send({ error: "DicomInstanceFileNotFound", message: "Файл снимка не найден на сервере." });
	}

	if (frameNumber > identity.numberOfFrames) {
		return reply.code(404).send({
			error: "FrameNotFound", message: `Запрошенный кадр ${frameNumber} превышает число кадров в объекте (${identity.numberOfFrames}).`,
		});
	}

	const frameIndex = frameNumber - 1;
	const rows = identity.rows ?? 512;
	const columns = identity.columns ?? 512;
	const bitsAllocated = identity.bitsAllocated ?? 16;
	const bytesPerSample = Math.ceil(bitsAllocated / 8);
	const samplesPerPixel = identity.samplesPerPixel ?? 1;
	const frameSizeBytes = rows * columns * bytesPerSample * samplesPerPixel;

	if (identity.pixelDataOffset !== null && frameSizeBytes > 0) {
		const frameStart = identity.pixelDataOffset + frameIndex * frameSizeBytes;
		if (frameStart < fileSize) {
			const frameEnd = Math.min(frameStart + frameSizeBytes - 1, fileSize - 1);
			const actualLength = frameEnd - frameStart + 1;
			reply.code(200);
			reply.header("Content-Type", "application/octet-stream");
			reply.header("Content-Length", actualLength);
			return reply.send(createReadStream(filePath, { start: frameStart, end: frameEnd }));
		}
		if (frameNumber > 1) {
			return reply.code(422).send({ error: "FrameOutOfBounds", message: "Смещение запрашиваемого кадра выходит за пределы файла DICOM." });
		}
	}

	if (frameNumber === 1) {
		return streamDicomFileResponse(request, reply, filePath, "application/octet-stream");
	}

	return reply.code(422).send({ error: "FramePixelDataUnavailable", message: "Не удалось определить смещение пиксельных данных для запрошенного кадра КТ." });
}
