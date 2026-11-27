import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import { createApiLogger } from "../../observability/index.js";
import {
	GcmStreamCipher,
	GcmStreamDecipher,
	parseContainerHeader,
	serializeContainerHeader,
} from "./backupCryptoContainer.js";
import { buildClinicSalt, deriveMasterKey } from "./bip39AndKdf.js";
import { resolveS3Storage } from "./s3VaultAdapter.js";
import {
	type CloudBackupMetadata,
	type CloudBackupObjectInfo,
	type CloudBackupType,
	DENTE_ZK_VERSION,
	GCM_IV_LENGTH,
	type IS3StorageAdapter,
	SCRYPT_N,
	SCRYPT_P,
	SCRYPT_R,
} from "./types.js";

const logger = createApiLogger("gfsRotationAndRestore");

async function cleanupTempBackupFile(filePath: string): Promise<void> {
	try {
		await fsPromises.unlink(filePath);
	} catch (err: unknown) {
		const code =
			typeof err === "object" && err !== null && "code" in err
				? String(err.code)
				: "";
		if (code !== "ENOENT") {
			logger.warn({ err, filePath }, "Failed to remove temporary cloud backup file");
		}
	}
}

export const GFS_RETENTION_LIMITS: Record<CloudBackupType, number> = {
	daily: 7,
	weekly: 4,
	monthly: 12,
};

export interface RotationResult {
	orgId: string;
	retained: string[];
	deleted: string[];
}

export async function rotateCloudBackups(
	storage: IS3StorageAdapter,
	orgId: string,
): Promise<RotationResult> {
	const all = await storage.list(`backups/${orgId}/`);
	const grouped: Record<CloudBackupType, CloudBackupObjectInfo[]> = {
		daily: [],
		weekly: [],
		monthly: [],
	};
	for (const obj of all) {
		const type: CloudBackupType =
			obj.key.includes("/monthly/") || obj.backupType === "monthly"
				? "monthly"
				: obj.key.includes("/weekly/") || obj.backupType === "weekly"
					? "weekly"
					: "daily";
		grouped[type].push(obj);
	}
	const retained: string[] = [];
	const deleted: string[] = [];
	for (const [typeKey, list] of Object.entries(grouped) as [
		CloudBackupType,
		CloudBackupObjectInfo[],
	][]) {
		list.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
		const maxKeep = GFS_RETENTION_LIMITS[typeKey];
		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			if (!item) continue;
			if (i < maxKeep) retained.push(item.key);
			else {
				await storage.delete(item.key);
				deleted.push(item.key);
			}
		}
	}
	return { orgId, retained, deleted };
}

export interface CreateCloudBackupOptions {
	mnemonic: string;
	orgId: string;
	ogrn: string;
	payload: Buffer | Readable | string;
	backupType?: CloudBackupType | undefined;
	storage?: IS3StorageAdapter | undefined;
	dumpStats?: CloudBackupMetadata["dumpStats"] | undefined;
	meta?: Record<string, unknown> | undefined;
	compression?: "gzip" | "none" | undefined;
}

export interface CreateCloudBackupResult {
	backupId: string;
	key: string;
	size: number;
	header: CloudBackupMetadata;
	rotation: RotationResult;
}

export async function createCloudBackup(
	options: CreateCloudBackupOptions,
): Promise<CreateCloudBackupResult> {
	const { mnemonic, orgId, ogrn, payload } = options;
	const masterKey = await deriveMasterKey(mnemonic, ogrn, orgId);
	const backupType = options.backupType ?? resolveBackupTypeFromDate(new Date());
	const iv = crypto.randomBytes(GCM_IV_LENGTH);
	const nowIso = new Date().toISOString();
	const backupId = `dente_${backupType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
	const storage = options.storage ?? resolveS3Storage();
	const compression = options.compression ?? "gzip";

	const metadata: CloudBackupMetadata = {
		magic: "DENTE_ZK_BACKUP_V1",
		version: DENTE_ZK_VERSION,
		backupId,
		orgId,
		ogrn,
		backupType,
		createdAt: nowIso,
		ivHex: iv.toString("hex"),
		algorithm: "aes-256-gcm",
		compression,
		kdf: {
			algorithm: "scrypt",
			salt: buildClinicSalt(ogrn, orgId),
			n: SCRYPT_N,
			r: SCRYPT_R,
			p: SCRYPT_P,
		},
		...(options.dumpStats !== undefined ? { dumpStats: options.dumpStats } : {}),
		...(options.meta !== undefined ? { meta: options.meta } : {}),
	};

	const headerBuf = serializeContainerHeader(metadata);
	const cipher = new GcmStreamCipher(masterKey, iv, headerBuf);

	const tempUploadPath = path.join(
		os.tmpdir(),
		`dente_up_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.enc`,
	);
	const tempWriteStream = fs.createWriteStream(tempUploadPath);
	tempWriteStream.write(headerBuf);

	let inputStream: Readable;
	if (typeof payload === "string") inputStream = fs.createReadStream(payload);
	else if (Buffer.isBuffer(payload)) inputStream = Readable.from(payload);
	else inputStream = payload;

	const compressor =
		compression === "gzip"
			? zlib.createGzip({ level: 6 })
			: new PassThrough();
	try {
		await pipeline(inputStream, compressor, cipher, tempWriteStream);
	} catch (err) {
		await cleanupTempBackupFile(tempUploadPath);
		throw err;
	}

	const s3Key = `backups/${orgId}/${backupType}/${backupId}.dente.enc`;
	let uploadResult: { key: string; size: number };
	try {
		uploadResult = await storage.upload(
			s3Key,
			tempUploadPath,
			"application/octet-stream",
		);
	} finally {
		await cleanupTempBackupFile(tempUploadPath);
	}

	const rotation = await rotateCloudBackups(storage, orgId);
	return {
		backupId,
		key: uploadResult.key,
		size: uploadResult.size,
		header: metadata,
		rotation,
	};
}

export interface RestoreCloudBackupToFileOptions {
	mnemonic: string;
	orgId?: string | undefined;
	ogrn?: string | undefined;
	key?: string | undefined;
	backupBuffer?: Buffer | undefined;
	encryptedFilePath?: string | undefined;
	targetPlaintextPath?: string | undefined;
	storage?: IS3StorageAdapter | undefined;
}

export interface RestoreCloudBackupToFileResult {
	header: CloudBackupMetadata;
	verifiedPlaintextPath: string;
	plaintextSize: number;
}

export async function restoreCloudBackupToFile(
	options: RestoreCloudBackupToFileOptions,
): Promise<RestoreCloudBackupToFileResult> {
	const storage = options.storage ?? resolveS3Storage();
	let encPath = options.encryptedFilePath;
	let cleanupEncPath = false;

	if (!encPath) {
		encPath = path.join(
			os.tmpdir(),
			`dente_enc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.tmp`,
		);
		cleanupEncPath = true;

		if (options.backupBuffer) {
			await fsPromises.writeFile(encPath, options.backupBuffer);
		} else {
			let targetKey = options.key;
			if (targetKey && options.orgId) {
				const normalizedKey = targetKey.replace(/^\/+/, "");
				const expectedPrefix = `backups/${options.orgId}/`;
				if (!normalizedKey.startsWith(expectedPrefix)) {
					throw new Error(
						`Backup key '${targetKey}' does not belong to organization '${options.orgId}'`,
					);
				}
			}
			if (!targetKey) {
				if (!options.orgId) {
					throw new Error(
						"Either backupBuffer, key, or orgId must be provided",
					);
				}
				const list = await storage.list(`backups/${options.orgId}/`);
				if (list.length === 0) {
					throw new Error(`No backups found for org ${options.orgId}`);
				}
				list.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
				targetKey = list[0]?.key;
			}
			if (!targetKey) {
				throw new Error("Could not resolve backup key in cloud storage");
			}

			if (storage.downloadToFile) {
				await storage.downloadToFile(targetKey, encPath);
			} else {
				const inStream = await storage.download(targetKey);
				const outStream = fs.createWriteStream(encPath);
				await pipeline(inStream, outStream);
			}
		}
	}

	try {
		const fd = await fsPromises.open(encPath, "r");
		const headBuffer = Buffer.alloc(65536);
		const { bytesRead } = await fd.read(headBuffer, 0, 65536, 0);
		await fd.close();

		const { header, headerBuffer, offset } = parseContainerHeader(
			headBuffer.subarray(0, bytesRead),
		);
		if (options.orgId && header.orgId !== options.orgId) {
			throw new Error(
				`Backup header orgId mismatch: expected '${options.orgId}', got '${header.orgId}'`,
			);
		}
		const orgId = options.orgId || header.orgId;
		const ogrn = options.ogrn || header.ogrn;
		const masterKey = await deriveMasterKey(options.mnemonic, ogrn, orgId);
		const iv = Buffer.from(header.ivHex, "hex");

		const targetPlaintextPath =
			options.targetPlaintextPath ||
			path.join(
				os.tmpdir(),
				`dente_verified_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.sql`,
			);

		const readStream = fs.createReadStream(encPath, { start: offset });
		const writeStream = fs.createWriteStream(targetPlaintextPath);
		const decipher = new GcmStreamDecipher(masterKey, iv, headerBuffer);
		const decompressor =
			header.compression === "gzip" ? zlib.createGunzip() : new PassThrough();

		try {
			await pipeline(readStream, decipher, decompressor, writeStream);
		} catch (error) {
			await cleanupTempBackupFile(targetPlaintextPath);
			throw error;
		}

		const stat = await fsPromises.stat(targetPlaintextPath);
		return {
			header,
			verifiedPlaintextPath: targetPlaintextPath,
			plaintextSize: stat.size,
		};
	} finally {
		if (cleanupEncPath && encPath) {
			await cleanupTempBackupFile(encPath);
		}
	}
}

export interface RestoreCloudBackupOptions {
	mnemonic: string;
	orgId?: string | undefined;
	ogrn?: string | undefined;
	key?: string | undefined;
	backupBuffer?: Buffer | undefined;
	storage?: IS3StorageAdapter | undefined;
}

export interface RestoreCloudBackupResult {
	header: CloudBackupMetadata;
	plaintext: Buffer;
}

export async function restoreCloudBackup(
	options: RestoreCloudBackupOptions,
): Promise<RestoreCloudBackupResult> {
	const res = await restoreCloudBackupToFile(options);
	try {
		const plaintext = await fsPromises.readFile(res.verifiedPlaintextPath);
		return { header: res.header, plaintext };
	} finally {
		await cleanupTempBackupFile(res.verifiedPlaintextPath);
	}
}

export function resolveBackupTypeFromDate(date: Date): CloudBackupType {
	if (date.getDate() === 1) return "monthly";
	if (date.getDay() === 0) return "weekly";
	return "daily";
}
