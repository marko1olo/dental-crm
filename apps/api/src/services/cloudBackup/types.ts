import type { Readable } from "node:stream";

export const DENTE_ZK_MAGIC = "DENTE_ZK_BACKUP_V1\n";
export const DENTE_ZK_VERSION = 1;
export const GCM_IV_LENGTH = 12;
export const GCM_TAG_LENGTH = 16;
export const SCRYPT_KEY_LENGTH = 32;
export const SCRYPT_N = 32768;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;

export type CloudBackupType = "daily" | "weekly" | "monthly";

export interface CloudBackupMetadata {
	magic: "DENTE_ZK_BACKUP_V1";
	version: number;
	backupId: string;
	orgId: string;
	ogrn: string;
	backupType: CloudBackupType;
	createdAt: string;
	ivHex: string;
	algorithm: "aes-256-gcm";
	compression?: "gzip" | "none" | undefined;
	kdf: {
		algorithm: "scrypt";
		salt: string;
		n: number;
		r: number;
		p: number;
	};
	dumpStats?:
		| {
				copyBlocks?: number | undefined;
				dataRows?: number | undefined;
				populatedTables?: number | undefined;
				uncompressedSizeBytes?: number | undefined;
		  }
		| undefined;
	meta?: Record<string, unknown> | undefined;
}

export interface CloudBackupObjectInfo {
	key: string;
	size: number;
	lastModified: Date;
	backupType?: CloudBackupType | undefined;
	backupId?: string | undefined;
}

export interface IS3StorageAdapter {
	upload(
		key: string,
		data: Buffer | Readable | string,
		contentType?: string,
	): Promise<{ key: string; size: number }>;
	download(key: string): Promise<Readable>;
	downloadBuffer(key: string): Promise<Buffer>;
	downloadToFile?(key: string, targetPath: string): Promise<number>;
	list(prefix: string): Promise<CloudBackupObjectInfo[]>;
	delete(key: string): Promise<void>;
	exists(key: string): Promise<boolean>;
}

export interface S3StorageConfig {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	forcePathStyle?: boolean | undefined;
	requestTimeoutMs?: number | undefined;
}
