import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type {
	CloudBackupObjectInfo,
	CloudBackupType,
	IS3StorageAdapter,
	S3StorageConfig,
} from "./types.js";

const DEFAULT_S3_TIMEOUT_MS = 30_000;

function sha256Hex(data: string | Buffer): string {
	return crypto.createHash("sha256").update(data).digest("hex");
}

async function sha256FileStream(filePath: string): Promise<string> {
	const hash = crypto.createHash("sha256");
	const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
	for await (const chunk of stream) {
		hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return hash.digest("hex");
}

type StreamRequestInit = RequestInit & { duplex?: "half" };

function toFetchStreamBody(stream: Readable): NonNullable<RequestInit["body"]> {
	return Readable.toWeb(stream) as NonNullable<RequestInit["body"]>;
}

function getSigV4Key(
	secret: string,
	dateStamp: string,
	region: string,
	service: string,
): Buffer {
	const kDate = crypto
		.createHmac("sha256", `AWS4${secret}`)
		.update(dateStamp, "utf8")
		.digest();
	const kRegion = crypto
		.createHmac("sha256", kDate)
		.update(region, "utf8")
		.digest();
	const kService = crypto
		.createHmac("sha256", kRegion)
		.update(service, "utf8")
		.digest();
	return crypto
		.createHmac("sha256", kService)
		.update("aws4_request", "utf8")
		.digest();
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

function parseBackupType(raw?: string): CloudBackupType | undefined {
	const normalized = raw?.toLowerCase();
	if (normalized === "daily" || normalized === "weekly" || normalized === "monthly") {
		return normalized;
	}
	return undefined;
}

async function withFetchTimeout<T>(
	url: string,
	init: StreamRequestInit,
	timeoutMs: number,
	label: string,
	onResponse: (response: Response) => Promise<T>,
): Promise<T> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`));
	}, timeoutMs);
	timeoutId.unref?.();
	try {
		const response = await fetch(url, { ...init, signal: controller.signal });
		return await onResponse(response);
	} finally {
		clearTimeout(timeoutId);
	}
}

function parseS3ListXml(xml: string): CloudBackupObjectInfo[] {
	const objects: CloudBackupObjectInfo[] = [];
	const regex =
		/<Contents>[\s\S]*?<Key>(.*?)<\/Key>[\s\S]*?<LastModified>(.*?)<\/LastModified>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g;
	for (const match of xml.matchAll(regex)) {
		const key = match[1] ?? "";
		const tm = /dente_(daily|weekly|monthly)_/i.exec(key);
		objects.push({
			key,
			lastModified: new Date(match[2] ?? ""),
			size: Number.parseInt(match[3] ?? "0", 10),
			backupType: parseBackupType(tm?.[1]),
		});
	}
	return objects;
}

export class NativeS3Adapter implements IS3StorageAdapter {
	constructor(private readonly config: S3StorageConfig) {}

	private getEndpointUrl(objectKey = ""): URL {
		const base = this.config.endpoint.endsWith("/")
			? this.config.endpoint
			: `${this.config.endpoint}/`;
		const cleanKey = objectKey.startsWith("/") ? objectKey.slice(1) : objectKey;
		if (this.config.forcePathStyle) {
			return new URL(`${this.config.bucket}/${cleanKey}`, base);
		}
		const url = new URL(base);
		url.hostname = `${this.config.bucket}.${url.hostname}`;
		url.pathname = `/${cleanKey}`;
		return url;
	}

	private signRequest(
		method: string,
		url: URL,
		payloadSha = "UNSIGNED-PAYLOAD",
	): Record<string, string> {
		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
		const dateStamp = amzDate.slice(0, 8);
		const headers: Record<string, string> = {
			host: url.host,
			"x-amz-date": amzDate,
			"x-amz-content-sha256": payloadSha,
		};
		const signedHeaders = Object.keys(headers).sort().join(";");
		const canonicalHeaders = Object.keys(headers)
			.sort()
			.map((h) => `${h.toLowerCase()}:${headers[h]?.trim()}\n`)
			.join("");
		const canonicalRequest = [
			method,
			url.pathname,
			url.search.slice(1),
			canonicalHeaders,
			signedHeaders,
			payloadSha,
		].join("\n");
		const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
		const stringToSign = [
			"AWS4-HMAC-SHA256",
			amzDate,
			credentialScope,
			sha256Hex(canonicalRequest),
		].join("\n");
		const signingKey = getSigV4Key(
			this.config.secretAccessKey,
			dateStamp,
			this.config.region,
			"s3",
		);
		const signature = crypto
			.createHmac("sha256", signingKey)
			.update(stringToSign, "utf8")
			.digest("hex");
		headers.Authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
		return headers;
	}

	private getTimeoutMs(multiplier = 1): number {
		const base =
			typeof this.config.requestTimeoutMs === "number" &&
			Number.isFinite(this.config.requestTimeoutMs) &&
			this.config.requestTimeoutMs > 0
				? this.config.requestTimeoutMs
				: DEFAULT_S3_TIMEOUT_MS;
		return base * multiplier;
	}

	async upload(
		key: string,
		data: Buffer | Readable | string,
		contentType = "application/octet-stream",
	): Promise<{ key: string; size: number }> {
		const url = this.getEndpointUrl(key);
		if (typeof data === "string") {
			const stat = await fsPromises.stat(data);
			const payloadSha = await sha256FileStream(data);
			const signedHeaders = this.signRequest("PUT", url, payloadSha);
			signedHeaders["content-type"] = contentType;
			signedHeaders["content-length"] = String(stat.size);
			const fileStream = fs.createReadStream(data);
			try {
				const init: StreamRequestInit = {
					method: "PUT",
					headers: signedHeaders,
					body: toFetchStreamBody(fileStream),
					duplex: "half",
				};
				return await withFetchTimeout(
					url.toString(),
					init,
					this.getTimeoutMs(4),
					`S3 upload (${key})`,
					async (response) => {
						if (!response.ok) {
							throw new Error(
								`S3 upload failed HTTP ${response.status} for ${key}: ${await response.text()}`,
							);
						}
						return { key, size: stat.size };
					},
				);
			} finally {
				fileStream.destroy();
			}
		}

		if (Buffer.isBuffer(data)) {
			const signedHeaders = this.signRequest("PUT", url, sha256Hex(data));
			signedHeaders["content-type"] = contentType;
			signedHeaders["content-length"] = String(data.length);
			return withFetchTimeout(
				url.toString(),
				{
					method: "PUT",
					headers: signedHeaders,
					body: new Uint8Array(data),
				},
				this.getTimeoutMs(1),
				`S3 upload (${key})`,
				async (response) => {
					if (!response.ok) {
						throw new Error(
							`S3 upload failed HTTP ${response.status} for ${key}: ${await response.text()}`,
						);
					}
					return { key, size: data.length };
				},
			);
		}

		let streamedBytes = 0;
		const byteCounter = new Transform({
			transform(chunk, _enc, cb) {
				streamedBytes += Buffer.isBuffer(chunk)
					? chunk.length
					: Buffer.byteLength(String(chunk));
				cb(null, chunk);
			},
		});
		const countedStream = data.pipe(byteCounter);
		const signedHeaders = this.signRequest("PUT", url, "UNSIGNED-PAYLOAD");
		signedHeaders["content-type"] = contentType;
		const init: StreamRequestInit = {
			method: "PUT",
			headers: signedHeaders,
			body: toFetchStreamBody(countedStream),
			duplex: "half",
		};
		return withFetchTimeout(
			url.toString(),
			init,
			this.getTimeoutMs(4),
			`S3 upload (${key})`,
			async (response) => {
				if (!response.ok) {
					throw new Error(
						`S3 upload failed HTTP ${response.status} for ${key}: ${await response.text()}`,
					);
				}
				return { key, size: streamedBytes };
			},
		);
	}

	async download(key: string): Promise<Readable> {
		const url = this.getEndpointUrl(key);
		const signedHeaders = this.signRequest("GET", url, "UNSIGNED-PAYLOAD");
		const response = await fetch(url.toString(), {
			method: "GET",
			headers: signedHeaders,
			signal: AbortSignal.timeout(DEFAULT_S3_TIMEOUT_MS * 4),
		});
		if (!response.ok) {
			throw new Error(`S3 download failed HTTP ${response.status} for ${key}`);
		}
		if (response.body) {
			return Readable.fromWeb(response.body);
		}
		return Readable.from(Buffer.from(await response.arrayBuffer()));
	}

	async downloadBuffer(key: string): Promise<Buffer> {
		const stream = await this.download(key);
		return streamToBuffer(stream);
	}

	async downloadToFile(key: string, targetPath: string): Promise<number> {
		const stream = await this.download(key);
		let totalBytes = 0;
		const counter = new Transform({
			transform(chunk, _enc, cb) {
				totalBytes += Buffer.isBuffer(chunk)
					? chunk.length
					: Buffer.byteLength(String(chunk));
				cb(null, chunk);
			},
		});
		await pipeline(stream, counter, fs.createWriteStream(targetPath));
		return totalBytes;
	}

	async list(prefix: string): Promise<CloudBackupObjectInfo[]> {
		const url = this.getEndpointUrl();
		url.searchParams.set("list-type", "2");
		if (prefix) url.searchParams.set("prefix", prefix);
		const response = await fetch(url.toString(), {
			method: "GET",
			headers: this.signRequest("GET", url, "UNSIGNED-PAYLOAD"),
			signal: AbortSignal.timeout(DEFAULT_S3_TIMEOUT_MS),
		});
		if (!response.ok) {
			throw new Error(
				`S3 list failed HTTP ${response.status} for prefix ${prefix}`,
			);
		}
		return parseS3ListXml(await response.text());
	}

	async delete(key: string): Promise<void> {
		const url = this.getEndpointUrl(key);
		const res = await fetch(url.toString(), {
			method: "DELETE",
			headers: this.signRequest("DELETE", url, "UNSIGNED-PAYLOAD"),
			signal: AbortSignal.timeout(DEFAULT_S3_TIMEOUT_MS),
		});
		if (!res.ok && res.status !== 404) {
			throw new Error(`S3 delete failed HTTP ${res.status} for ${key}`);
		}
	}

	async exists(key: string): Promise<boolean> {
		const url = this.getEndpointUrl(key);
		const res = await fetch(url.toString(), {
			method: "HEAD",
			headers: this.signRequest("HEAD", url, "UNSIGNED-PAYLOAD"),
			signal: AbortSignal.timeout(DEFAULT_S3_TIMEOUT_MS),
		});
		return res.ok;
	}
}

export class LocalMockS3Adapter implements IS3StorageAdapter {
	constructor(public readonly rootDir: string) {
		fs.mkdirSync(rootDir, { recursive: true });
	}

	private resolvePath(key: string): string {
		const resolvedRoot = path.resolve(this.rootDir);
		const cleanRelative = key
			.replace(/^[/\\]+/, "")
			.replace(/[\\/]/g, path.sep);
		const candidate = path.resolve(resolvedRoot, cleanRelative);
		const relativeToRoot = path.relative(resolvedRoot, candidate);
		if (
			!relativeToRoot ||
			relativeToRoot.startsWith("..") ||
			path.isAbsolute(relativeToRoot)
		) {
			throw new Error("path_traversal_forbidden: invalid backup storage key");
		}
		return candidate;
	}

	async upload(
		key: string,
		data: Buffer | Readable | string,
	): Promise<{ key: string; size: number }> {
		const target = this.resolvePath(key);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		if (typeof data === "string") {
			await fsPromises.copyFile(data, target);
		} else if (Buffer.isBuffer(data)) {
			await fsPromises.writeFile(target, data);
		} else {
			await pipeline(data, fs.createWriteStream(target));
		}
		const stat = await fsPromises.stat(target);
		return { key, size: stat.size };
	}

	async download(key: string): Promise<Readable> {
		const target = this.resolvePath(key);
		if (!fs.existsSync(target)) throw new Error(`Object not found: ${key}`);
		return fs.createReadStream(target);
	}

	async downloadBuffer(key: string): Promise<Buffer> {
		const target = this.resolvePath(key);
		if (!fs.existsSync(target)) throw new Error(`Object not found: ${key}`);
		return fsPromises.readFile(target);
	}

	async downloadToFile(key: string, targetPath: string): Promise<number> {
		const target = this.resolvePath(key);
		if (!fs.existsSync(target)) throw new Error(`Object not found: ${key}`);
		await fsPromises.copyFile(target, targetPath);
		const stat = await fsPromises.stat(targetPath);
		return stat.size;
	}

	async list(prefix: string): Promise<CloudBackupObjectInfo[]> {
		const results: CloudBackupObjectInfo[] = [];
		const scan = async (dir: string) => {
			if (!fs.existsSync(dir)) return;
			for (const entry of await fsPromises.readdir(dir, {
				withFileTypes: true,
			})) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) await scan(full);
				else {
					const rel = path.relative(this.rootDir, full).replace(/\\/g, "/");
					if (!prefix || rel.startsWith(prefix)) {
						const st = await fsPromises.stat(full);
						const tm = /dente_(daily|weekly|monthly)_/i.exec(rel);
						results.push({
							key: rel,
							lastModified: st.mtime,
							size: st.size,
							backupType: parseBackupType(tm?.[1]),
						});
					}
				}
			}
		};
		await scan(this.rootDir);
		return results.sort(
			(a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
		);
	}

	async delete(key: string): Promise<void> {
		const target = this.resolvePath(key);
		if (fs.existsSync(target)) await fsPromises.unlink(target);
	}

	async exists(key: string): Promise<boolean> {
		return fs.existsSync(this.resolvePath(key));
	}
}

export function resolveS3Storage(
	config?: Partial<S3StorageConfig>,
): IS3StorageAdapter {
	const endpoint =
		config?.endpoint ||
		process.env.S3_ENDPOINT ||
		process.env.SELECTEL_S3_ENDPOINT;
	const bucket =
		config?.bucket ||
		process.env.S3_BUCKET ||
		process.env.DENTE_CLOUD_BACKUP_BUCKET;
	const accessKeyId =
		config?.accessKeyId ||
		process.env.S3_ACCESS_KEY_ID ||
		process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey =
		config?.secretAccessKey ||
		process.env.S3_SECRET_ACCESS_KEY ||
		process.env.AWS_SECRET_ACCESS_KEY;
	const region = config?.region || process.env.S3_REGION || "ru-1";

	if (endpoint && bucket && accessKeyId && secretAccessKey) {
		return new NativeS3Adapter({
			endpoint,
			bucket,
			accessKeyId,
			secretAccessKey,
			region,
			forcePathStyle: config?.forcePathStyle ?? true,
		});
	}
	const fallbackDir =
		process.env.DENTE_CLOUD_LOCAL_VAULT ||
		path.resolve(process.cwd(), ".data/cloud-vault");
	return new LocalMockS3Adapter(fallbackDir);
}
