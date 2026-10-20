import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { portalRoutes } from "../../routes/portal/index.js";

describe("Portal Mock Storage API Routes (/api/portal/mock-storage/*)", () => {
	let app: FastifyInstance;
	const testKeyStl = "org_test_inquisitor/lab_orders/order_999/test_scan.stl";
	const testKeyPly = "org_test_inquisitor/lab_orders/order_999/test_scan.ply";
	const sampleStlData = Buffer.from("solid test_jaw\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test_jaw");

	before(async () => {
		app = Fastify({ logger: false });
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();
	});

	after(async () => {
		await app.close();
		// Очистка тестовых файлов из .data/lab_scans
		const testOrgDir = path.resolve(process.cwd(), ".data", "lab_scans", "org_test_inquisitor");
		if (fs.existsSync(testOrgDir)) {
			fs.rmSync(testOrgDir, { recursive: true, force: true });
		}
	});

	test("отклоняет загрузку без ключа key (400)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/portal/mock-storage/upload",
			payload: sampleStlData,
			headers: { "content-type": "application/octet-stream" },
		});
		assert.strictEqual(res.statusCode, 400);
		assert.ok(res.json().error.includes("Ключ хранилища"));
	});

	test("блокирует попытку Path Traversal в key (400)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/portal/mock-storage/upload?key=../../etc/passwd",
			payload: sampleStlData,
			headers: { "content-type": "application/octet-stream" },
		});
		assert.strictEqual(res.statusCode, 400);
		assert.ok(res.json().error.includes("Path Traversal"));
	});

	test("успешно загружает 3D STL скан на диск через PUT (200)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/portal/mock-storage/upload?key=${encodeURIComponent(testKeyStl)}`,
			payload: sampleStlData,
			headers: { "content-type": "model/stl" },
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.storageKey, testKeyStl);
		assert.strictEqual(json.bytesWritten, sampleStlData.length);

		// Проверяем реальное наличие файла на диске в .data/lab_scans
		const expectedPath = path.resolve(process.cwd(), ".data", "lab_scans", testKeyStl);
		assert.strictEqual(fs.existsSync(expectedPath), true);
		const onDisk = fs.readFileSync(expectedPath);
		assert.deepStrictEqual(onDisk, sampleStlData);
	});

	test("успешно скачивает ранее сохраненный 3D скан через GET (200)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/portal/mock-storage/download?key=${encodeURIComponent(testKeyStl)}`,
		});

		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.headers["content-type"], "model/stl");
		assert.ok((res.headers["content-disposition"] as string).includes("test_scan.stl"));
		assert.deepStrictEqual(res.rawPayload, sampleStlData);
	});

	test("возвращает 404 при попытке скачать несуществующий файл", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/portal/mock-storage/download?key=org_test/non_existent_scan.stl",
		});
		assert.strictEqual(res.statusCode, 404);
		assert.ok(res.json().error.includes("не найден"));
	});

	test("отклоняет загрузку файла с недопустимым расширением .exe (400)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/portal/mock-storage/upload?key=org_test_inquisitor/malware.exe",
			payload: Buffer.from("MZ malicious payload"),
			headers: { "content-type": "application/octet-stream" },
		});
		assert.strictEqual(res.statusCode, 400);
	});

	test("отклоняет ключ без префикса организации org_<id>/ (400)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/portal/mock-storage/upload?key=unscoped_folder/scan.stl",
			payload: sampleStlData,
			headers: { "content-type": "model/stl" },
		});
		assert.strictEqual(res.statusCode, 400);
	});

	test("изоляция арендатора: блокирует доступ к ключу чужой организации (403)", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/portal/mock-storage/upload?key=${encodeURIComponent(testKeyStl)}`,
			payload: sampleStlData,
			headers: {
				"content-type": "model/stl",
				"x-organization-id": "org_another_clinic_uuid",
			},
		});
		assert.strictEqual(res.statusCode, 403);
		assert.ok(res.json().error.includes("другой организации"));
	});
});
