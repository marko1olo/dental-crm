import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { FastifyRequest } from "fastify";
import { stripMultipartWrapperFromBuffer } from "../../dicomwebHelpers.js";

async function writeSyncBufferPayload(targetPath: string, buf: Buffer, maxBytes: number): Promise<number> {
	if (buf.length > maxBytes) {
		throw new Error(`Размер файла превышает лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`);
	}
	await fs.writeFile(targetPath, buf);
	return buf.length;
}

export async function streamDicomPayloadToDisk(
	request: FastifyRequest,
	targetPath: string,
	maxBytes = 2 * 1024 * 1024 * 1024,
): Promise<{ bytesWritten: number }> {
	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	const contentType = String(request.headers["content-type"] || "");
	const isMultipart = contentType.includes("multipart");

	if (Buffer.isBuffer(request.body)) {
		const buf = isMultipart ? stripMultipartWrapperFromBuffer(request.body) : request.body;
		return { bytesWritten: await writeSyncBufferPayload(targetPath, buf, maxBytes) };
	}
	const bodyObj = request.body as Record<string, unknown> | null;
	if (bodyObj && typeof bodyObj.fileBase64 === "string") {
		const b64 = bodyObj.fileBase64.replace(/^data:.*?;base64,/u, "");
		return { bytesWritten: await writeSyncBufferPayload(targetPath, Buffer.from(b64, "base64"), maxBytes) };
	}
	if (bodyObj && Array.isArray(bodyObj.data)) {
		return { bytesWritten: await writeSyncBufferPayload(targetPath, Buffer.from(bodyObj.data as number[]), maxBytes) };
	}

	const sourceStream = request.body && typeof (request.body as any).pipe === "function"
		? (request.body as NodeJS.ReadableStream)
		: (request.raw as NodeJS.ReadableStream);

	const writeStream = createWriteStream(targetPath);
	let bytesWritten = 0;

	if (!isMultipart) {
		const sizeLimiter = new Transform({
			transform(chunk: Buffer, _encoding, cb) {
				bytesWritten += chunk.length;
				if (bytesWritten > maxBytes) return cb(new Error(`Лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`));
				cb(null, chunk);
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

	let headersStripped = false;
	let headerBuffer = Buffer.alloc(0);
	const multipartStripper = new Transform({
		transform(chunk: Buffer, _encoding, cb) {
			bytesWritten += chunk.length;
			if (bytesWritten > maxBytes) return cb(new Error(`Лимит ${Math.round(maxBytes / (1024 * 1024))} МБ`));
			if (!headersStripped) {
				headerBuffer = Buffer.concat([headerBuffer, chunk]);
				const endCrLf = headerBuffer.indexOf("\r\n\r\n");
				const endLf = headerBuffer.indexOf("\n\n");
				const headerEnd = endCrLf !== -1 ? endCrLf : endLf;
				const delimLen = endCrLf !== -1 ? 4 : 2;
				if (headerEnd !== -1) {
					headersStripped = true;
					const payload = headerBuffer.subarray(headerEnd + delimLen);
					headerBuffer = Buffer.alloc(0);
					return payload.length > 0 ? cb(null, payload) : cb();
				}
				return cb();
			}
			cb(null, chunk);
		},
	});

	try {
		await pipeline(sourceStream, multipartStripper, writeStream);
	} catch (err) {
		await fs.unlink(targetPath).catch(() => {});
		throw err;
	}

	try {
		const stat = await fs.stat(targetPath);
		if (stat.size > 256) {
			const tailSize = Math.min(stat.size, 1024);
			const tailBuf = Buffer.alloc(tailSize);
			const fd = await fs.open(targetPath, "r+");
			await fd.read(tailBuf, 0, tailSize, stat.size - tailSize);
			const lastBoundary = tailBuf.lastIndexOf("\r\n--");
			if (lastBoundary !== -1) await fd.truncate(stat.size - (tailSize - lastBoundary));
			await fd.close();
		}
	} catch {
		// Non-fatal trailing boundary cleanup
	}

	return { bytesWritten };
}
