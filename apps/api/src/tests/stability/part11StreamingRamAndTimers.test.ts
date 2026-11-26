import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import zlib from "node:zlib";
import { decompressGzipSync } from "@dental/shared";
import type { FastifyRequest } from "fastify";
import { readZipEntriesAsync } from "../../ingestion/docExtractor/zipReader.js";
import { BoundedStringSet, BoundedTtlMap } from "../../lib/boundedTtlMap.js";
import { createZipArchive, createZipArchiveAsync } from "../../routes/mobileOta.js";
import { streamDicomPayloadToDisk } from "../../routes/dicomweb/stowModules/stowStreamWriter.js";
import { NativeS3Adapter } from "../../services/cloudBackup/s3VaultAdapter.js";
import { dispatchAtolSyncTask } from "../../services/hardware/kktModules/kktProtocolFraming.js";
import { extractScanFilesFromZipAsync, extractScanFilesFromZipPath } from "../../services/scanner/scannerZipExtractor.js";
import { TelegramPollingRunner } from "../../services/telegram/TelegramPollingRunner.js";

describe("Part 11 Streaming, RAM Bounds, Fetch Timeouts & Graceful Eviction", () => {
	it("BoundedTtlMap enforces maxEntries, TTL expiration, and maxBytes budget", async () => {
		const evicted: Array<{ key: unknown; reason: string }> = [];
		const map = new BoundedTtlMap<string, Buffer>({
			maxEntries: 3,
			ttlMs: 80,
			maxBytes: 10,
			sizeOf: (v) => v.length,
			onEvict: (key, _val, reason) => {
				evicted.push({ key, reason });
			},
		});

		map.set("a", Buffer.alloc(4));
		map.set("b", Buffer.alloc(4));
		map.set("c", Buffer.alloc(4)); // превысит 10 байт -> вытеснит "a"

		assert.equal(map.has("a"), false);
		assert.equal(map.size, 2);
		assert.equal(map.currentBytes, 8);
		assert.ok(evicted.some((e) => e.key === "a" && e.reason === "bytes"));

		map.set("d", Buffer.alloc(1));
		map.set("e", Buffer.alloc(1)); // превысит maxEntries=3 -> вытеснит "b"
		assert.equal(map.size, 3);
		assert.ok(evicted.some((e) => e.key === "b" && e.reason === "capacity"));

		await new Promise((r) => setTimeout(r, 110));
		assert.equal(map.size, 0);
	});

	it("BoundedStringSet enforces capacity cap cleanly", () => {
		const set = new BoundedStringSet(2);
		set.add("one");
		set.add("two");
		set.add("three");
		assert.equal(set.size, 2);
		assert.equal(set.has("one"), false);
		assert.equal(set.has("two"), true);
		assert.equal(set.has("three"), true);
	});

	it("stowStreamWriter rejects unbounded multipart headers > 64 KB", async () => {
		const tmpTarget = path.join(os.tmpdir(), `dente-stow-test-${Date.now()}.dcm`);
		const headerFlood = Readable.from([
			Buffer.alloc(40 * 1024, 0x41),
			Buffer.alloc(40 * 1024, 0x42),
		]);
		const fakeReq = {
			headers: { "content-type": "multipart/related; boundary=abc" },
			body: headerFlood,
			raw: headerFlood,
			log: {
				debug: () => undefined,
			},
		} as Partial<FastifyRequest> as FastifyRequest;

		await assert.rejects(
			() => streamDicomPayloadToDisk(fakeReq, tmpTarget, 100 * 1024 * 1024),
			/64 КБ/,
		);
		await fs.unlink(tmpTarget).catch(() => undefined);
	});

	it("nativeVolumeImportEngine decompressGzipSync guards against > 64 MiB gzip bombs", () => {
		const bigZeroes = Buffer.alloc(70 * 1024 * 1024);
		const gzipped = zlib.gzipSync(bigZeroes);
		assert.throws(
			() => decompressGzipSync(gzipped),
			/failed to decompress gzip slice/,
		);
	});

	it("TelegramPollingRunner.stop() immediately aborts hung long-poll fetch", async () => {
		const origFetch = globalThis.fetch;
		let abortedObserved = false;

		globalThis.fetch = ((_input: unknown, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					abortedObserved = true;
					reject(new Error("aborted"));
				});
			})) as typeof fetch;

		try {
			const runner = new TelegramPollingRunner({
				botToken: "123:ABC",
				organizationId: "org-1",
				onUpdate: async () => undefined,
			});
			runner.start();
			await new Promise((r) => setTimeout(r, 20));
			runner.stop();
			await new Promise((r) => setTimeout(r, 20));
			assert.equal(abortedObserved, true);
		} finally {
			globalThis.fetch = origFetch;
		}
	});

	it("dispatchAtolSyncTask keeps timeout active across res.json() body stalls", async () => {
		const origFetch = globalThis.fetch;
		globalThis.fetch = (async (_input: unknown, init?: RequestInit) =>
			({
				ok: true,
				status: 200,
				json: () =>
					new Promise((_resolve, reject) => {
						init?.signal?.addEventListener("abort", () => {
							reject(new Error("body-aborted-by-timeout"));
						});
					}),
			}) as Response) as typeof fetch;

		try {
			await assert.rejects(
				() =>
					dispatchAtolSyncTask(
						{ host: "127.0.0.1", port: 16732, timeoutMs: 40 },
						{ type: "status" },
						"test",
						40,
					),
				/body-aborted-by-timeout/,
			);
		} finally {
			globalThis.fetch = origFetch;
		}
	});

	it("NativeS3Adapter streams downloadToFile without arrayBuffer() buffering", async () => {
		const origFetch = globalThis.fetch;
		const payload = Buffer.from("streaming-backup-chunk-1-streaming-backup-chunk-2");
		globalThis.fetch = (async () =>
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(payload.subarray(0, 16));
						controller.enqueue(payload.subarray(16));
						controller.close();
					},
				}),
				{ status: 200 },
			)) as typeof fetch;

		const target = path.join(os.tmpdir(), `dente-s3-dl-${Date.now()}.bin`);
		try {
			const adapter = new NativeS3Adapter({
				endpoint: "http://127.0.0.1:9000",
				bucket: "backups",
				accessKeyId: "key",
				secretAccessKey: "secret",
				region: "ru-1",
				forcePathStyle: true,
			});
			const bytes = await adapter.downloadToFile("test.bin", target);
			assert.equal(bytes, payload.length);
			const disk = await fs.readFile(target);
			assert.deepEqual(disk, payload);
		} finally {
			globalThis.fetch = origFetch;
			await fs.unlink(target).catch(() => undefined);
		}
	});

	it("yazl + yauzl streaming ZIP roundtrip works for scanner and docExtractor", async () => {
		const stlContent = Buffer.from("solid mesh\nendsolid mesh\n");
		const zipBuf = await createZipArchiveAsync([
			{ name: "scans/upper.stl", data: stlContent },
			{ name: "meta.json", data: Buffer.from('{"vendor":"medit"}') },
		]);

		const scanEntries = await extractScanFilesFromZipAsync(zipBuf);
		assert.equal(scanEntries.length, 2);
		assert.equal(scanEntries[0]?.name, "upper.stl");
		assert.deepEqual(scanEntries[0]?.buffer, stlContent);

		const tmpZip = path.join(os.tmpdir(), `dente-yazl-test-${Date.now()}.zip`);
		await fs.writeFile(tmpZip, createZipArchive([{ name: "doc.txt", data: Buffer.from("ok") }]));
		try {
			const fromDisk = await extractScanFilesFromZipPath(tmpZip);
			assert.equal(fromDisk.length, 1);
			const docRes = await readZipEntriesAsync(tmpZip);
			assert.equal(docRes.entries.length, 1);
			assert.equal(docRes.entries[0]?.data.toString("utf8"), "ok");
		} finally {
			await fs.unlink(tmpZip).catch(() => undefined);
		}
	});
});
