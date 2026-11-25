import crypto from "node:crypto";
import { Transform, type TransformCallback } from "node:stream";
import {
	type CloudBackupMetadata,
	DENTE_ZK_MAGIC,
	GCM_TAG_LENGTH,
} from "./types.js";

export class GcmStreamCipher extends Transform {
	private cipher: crypto.CipherGCM;

	constructor(key: Buffer, iv: Buffer, aad?: Buffer) {
		super();
		this.cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
		if (aad && aad.length > 0) this.cipher.setAAD(aad);
	}

	override _transform(
		chunk: Buffer,
		_enc: BufferEncoding,
		done: TransformCallback,
	): void {
		try {
			const out = this.cipher.update(chunk);
			if (out.length > 0) this.push(out);
			done();
		} catch (error) {
			done(error as Error);
		}
	}

	override _flush(done: TransformCallback): void {
		try {
			const finalChunk = this.cipher.final();
			if (finalChunk.length > 0) this.push(finalChunk);
			this.push(this.cipher.getAuthTag());
			done();
		} catch (error) {
			done(error as Error);
		}
	}
}

export class GcmStreamDecipher extends Transform {
	private decipher: crypto.DecipherGCM;
	private tail = Buffer.alloc(0);

	constructor(key: Buffer, iv: Buffer, aad?: Buffer) {
		super();
		this.decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
		if (aad && aad.length > 0) this.decipher.setAAD(aad);
	}

	override _transform(
		chunk: Buffer,
		_enc: BufferEncoding,
		done: TransformCallback,
	): void {
		try {
			this.tail = Buffer.concat([this.tail, chunk]);
			if (this.tail.length > GCM_TAG_LENGTH) {
				const toProcess = this.tail.subarray(
					0,
					this.tail.length - GCM_TAG_LENGTH,
				);
				this.tail = this.tail.subarray(this.tail.length - GCM_TAG_LENGTH);
				const out = this.decipher.update(toProcess);
				if (out && out.length > 0) this.push(out);
			}
			done();
		} catch (error) {
			done(error as Error);
		}
	}

	override _flush(done: TransformCallback): void {
		try {
			if (this.tail.length !== GCM_TAG_LENGTH) {
				return done(
					new Error(
						`Invalid GCM payload: expected ${GCM_TAG_LENGTH} bytes tag, got ${this.tail.length}`,
					),
				);
			}
			this.decipher.setAuthTag(this.tail);
			const finalBytes = this.decipher.final();
			if (finalBytes && finalBytes.length > 0) this.push(finalBytes);
			done();
		} catch (error) {
			done(error as Error);
		}
	}
}

export function serializeContainerHeader(metadata: CloudBackupMetadata): Buffer {
	const jsonBuf = Buffer.from(JSON.stringify(metadata), "utf8");
	const magicBuf = Buffer.from(DENTE_ZK_MAGIC, "utf8");
	const lengthBuf = Buffer.alloc(4);
	lengthBuf.writeUInt32BE(jsonBuf.length, 0);
	return Buffer.concat([magicBuf, lengthBuf, jsonBuf]);
}

export function parseContainerHeader(buffer: Buffer): {
	header: CloudBackupMetadata;
	headerBuffer: Buffer;
	offset: number;
} {
	const magicBuf = Buffer.from(DENTE_ZK_MAGIC, "utf8");
	if (buffer.length < magicBuf.length + 4) {
		throw new Error(
			"Buffer too short to contain DENTE Zero-Knowledge backup header",
		);
	}
	const magic = buffer.subarray(0, magicBuf.length).toString("utf8");
	if (magic !== DENTE_ZK_MAGIC) {
		throw new Error(
			`Invalid backup magic header: expected '${DENTE_ZK_MAGIC.trim()}', got '${magic.trim()}'`,
		);
	}
	const jsonLength = buffer.readUInt32BE(magicBuf.length);
	if (jsonLength <= 0 || jsonLength > 1024 * 1024) {
		throw new Error("INVALID_HEADER_LENGTH");
	}
	const offset = magicBuf.length + 4 + jsonLength;
	if (buffer.length < offset) {
		throw new Error(
			`Incomplete backup header: expected ${offset} bytes, available ${buffer.length}`,
		);
	}
	const headerBuffer = buffer.subarray(0, offset);
	const jsonBytes = buffer.subarray(magicBuf.length + 4, offset);
	let header: CloudBackupMetadata;
	try {
		header = JSON.parse(jsonBytes.toString("utf8")) as CloudBackupMetadata;
	} catch {
		throw new Error("CORRUPTED_BACKUP_HEADER");
	}
	if (!header || typeof header !== "object") {
		throw new Error("CORRUPTED_BACKUP_HEADER");
	}
	if (
		!header.ivHex ||
		typeof header.ivHex !== "string" ||
		(header.ivHex.length !== 24 && header.ivHex.length !== 32)
	) {
		throw new Error("CORRUPTED_BACKUP_HEADER: invalid ivHex");
	}
	return { header, headerBuffer, offset };
}
