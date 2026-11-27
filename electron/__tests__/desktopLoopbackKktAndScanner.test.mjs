import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
	buildShtrikhMCommandPacket,
	checkKktStatusTcpSocket,
	computeXorChecksum,
} = require("../src/kktHardwareDriver.cjs");
const {
	ensureEmbeddedBackendStarted,
	ensureManagedApiStarted,
	getLocalServerStatus,
	shouldRunEmbeddedBackend,
	startLoopbackHttpServer,
	stopLoopbackHttpServer,
	stopManagedServices,
	switchLocalDatabaseMode,
} = require("../src/embeddedServerSupervisor.cjs");
const {
	acquireTwainImage,
	getTwainDevices,
	queryWiaDevices,
	scanTwainDataSources,
	validateHotFolderPath,
} = require("../src/twainWiaScannerBridge.cjs");
const {
	isPrivateIpv4,
	probeClinicDiscoveryEndpoint,
	resolveConfiguredClinicServerUrl,
} = require("../src/lanBeaconDesktopBridge.cjs");

async function allocateClosedPort() {
	const srv = net.createServer();
	await new Promise((r) => srv.listen(0, "127.0.0.1", r));
	const port = srv.address().port;
	await new Promise((r) => srv.close(r));
	return port;
}

function buildShtrihStatusFrame({ errorCode = 0, flags = 0x0022, mode = 0x02, operator = 30 }) {
	const body = Buffer.alloc(12, 0);
	body[0] = 0x02;
	body[1] = 10; // cmd(1) + err(1) + op(1) + flags(2) + mode(1) + pad(4)
	body[2] = 0x11;
	body[3] = errorCode;
	body[4] = operator;
	body.writeUInt16LE(flags, 5);
	body[7] = mode;
	const crc = computeXorChecksum(body, 1, body.length - 1);
	body[body.length - 1] = crc;
	return body;
}

test("Wave6 Desktop Runtime: Honest KKT Framing, Loopback HTTP & TWAIN/WIA/HotFolder", async (t) => {
	await t.test("KKT: ECONNREFUSED and silent timeout NEVER return paperOk: true", async () => {
		const closedPort = await allocateClosedPort();
		const refused = await checkKktStatusTcpSocket({
			host: "127.0.0.1",
			port: closedPort,
			protocol: "atol",
			timeoutMs: 400,
		});
		assert.equal(refused.online, false);
		assert.equal(refused.status, "unreachable");
		assert.equal(refused.fiscalFallbackMode, "offline_queue");
		assert.equal(refused.paperOk, false);
		assert.equal(refused.coverClosed, false);
		assert.equal(refused.fnPresent, false);

		const silentSockets = [];
		const silentServer = net.createServer((socket) => {
			silentSockets.push(socket);
			// Accept connection and intentionally send zero bytes
		});
		await new Promise((r) => silentServer.listen(0, "127.0.0.1", r));
		const silentPort = silentServer.address().port;

		try {
			const timedOut = await checkKktStatusTcpSocket({
				host: "127.0.0.1",
				port: silentPort,
				protocol: "atol",
				timeoutMs: 120,
			});
			assert.equal(timedOut.online, false);
			assert.equal(timedOut.status, "unreachable");
			assert.equal(timedOut.fiscalFallbackMode, "offline_queue");
			assert.equal(timedOut.paperOk, false);
		} finally {
			for (const s of silentSockets) s.destroy();
			silentServer.close();
		}
	});

	await t.test("KKT: Immediate socket close without reply or truncated frame returns protocol_error", async () => {
		const immediateCloseServer = net.createServer((socket) => {
			socket.end();
		});
		await new Promise((r) => immediateCloseServer.listen(0, "127.0.0.1", r));
		const closePort = immediateCloseServer.address().port;

		const truncatedAtolServer = net.createServer((socket) => {
			socket.once("data", () => {
				socket.end('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"results":[{"errorCode":');
			});
		});
		await new Promise((r) => truncatedAtolServer.listen(0, "127.0.0.1", r));
		const truncPort = truncatedAtolServer.address().port;

		try {
			const emptyRes = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: closePort, protocol: "atol", timeoutMs: 400 });
			assert.equal(emptyRes.online, false);
			assert.equal(emptyRes.status, "protocol_error");
			assert.equal(emptyRes.protocolError, true);
			assert.equal(emptyRes.fiscalFallbackMode, "offline_queue");
			assert.equal(emptyRes.paperOk, false);

			const truncRes = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: truncPort, protocol: "atol", timeoutMs: 400 });
			assert.equal(truncRes.online, false);
			assert.equal(truncRes.status, "protocol_error");
			assert.equal(truncRes.protocolError, true);
			assert.equal(truncRes.paperOk, false);
		} finally {
			immediateCloseServer.close();
			truncatedAtolServer.close();
		}
	});

	await t.test("KKT: ATOL JSON & v3 binary frames parse paper, cover, FN and shift flags accurately", async () => {
		const outOfPaperServer = net.createServer((socket) => {
			socket.once("data", (reqBuf) => {
				assert.ok(reqBuf.toString("utf8").includes("getDeviceStatus"));
				socket.end(
					JSON.stringify({
						results: [
							{
								errorCode: 2,
								deviceInfo: { paperPresent: false, coverClosed: false, modelName: "АТОЛ 55Ф" },
								fnInfo: { fnPresent: true, fiscalized: true, fnNumber: "9960000001" },
							},
						],
					}),
				);
			});
		});
		await new Promise((r) => outOfPaperServer.listen(0, "127.0.0.1", r));
		const paperPort = outOfPaperServer.address().port;

		const v3BinaryServer = net.createServer((socket) => {
			socket.once("data", (reqBuf) => {
				assert.equal(reqBuf[0], 0x02);
				assert.equal(reqBuf[2], 0x3f);
				const payload = Buffer.from([0x02, 0x04, 0x3f, 0x00, 0x08]); // errorCode=0, flags=0x08 (shiftOpen)
				const crc = computeXorChecksum(payload, 1, payload.length);
				socket.end(Buffer.concat([payload, Buffer.from([crc])]));
			});
		});
		await new Promise((r) => v3BinaryServer.listen(0, "127.0.0.1", r));
		const v3Port = v3BinaryServer.address().port;

		try {
			const paperRes = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: paperPort, protocol: "atol" });
			assert.equal(paperRes.online, true);
			assert.equal(paperRes.status, "hardware_alert");
			assert.equal(paperRes.paperOk, false);
			assert.equal(paperRes.coverClosed, false);
			assert.equal(paperRes.fnPresent, true);
			assert.equal(paperRes.fiscalFallbackMode, "offline_queue");

			const v3Res = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: v3Port, protocol: "atol_v3" });
			assert.equal(v3Res.online, true);
			assert.equal(v3Res.status, "ready");
			assert.equal(v3Res.paperOk, true);
			assert.equal(v3Res.coverClosed, true);
			assert.equal(v3Res.fnPresent, true);
			assert.equal(v3Res.shiftOpen, true);
		} finally {
			outOfPaperServer.close();
			v3BinaryServer.close();
		}
	});

	await t.test("KKT: Shtrikh-M 0x11 binary framing validates XOR CRC, flags, and truncated frames", async () => {
		let receivedCommand = 0;
		const shtrihOkServer = net.createServer((socket) => {
			socket.once("data", (req) => {
				receivedCommand = req[2];
				socket.end(buildShtrihStatusFrame({ errorCode: 0, flags: 0x0022, mode: 0x02 }));
			});
		});
		await new Promise((r) => shtrihOkServer.listen(0, "127.0.0.1", r));
		const okPort = shtrihOkServer.address().port;

		const shtrihAlertServer = net.createServer((socket) => {
			socket.once("data", () => {
				// bit 1 (0x0002 paper) = 0, bit 10 (0x0400 coverOpen) = 1, bit 5 (0x0020 fnPresent) = 1
				socket.end(buildShtrihStatusFrame({ errorCode: 0x04, flags: 0x0420, mode: 0x02 }));
			});
		});
		await new Promise((r) => shtrihAlertServer.listen(0, "127.0.0.1", r));
		const alertPort = shtrihAlertServer.address().port;

		const badCrcServer = net.createServer((socket) => {
			socket.once("data", () => {
				const frame = buildShtrihStatusFrame({ errorCode: 0, flags: 0x0022, mode: 0x02 });
				frame[frame.length - 1] ^= 0xff; // corrupt XOR checksum
				socket.end(frame);
			});
		});
		await new Promise((r) => badCrcServer.listen(0, "127.0.0.1", r));
		const badCrcPort = badCrcServer.address().port;

		try {
			const packet = buildShtrikhMCommandPacket(0x11, Buffer.alloc(0), 30);
			assert.equal(packet[0], 0x02);
			assert.equal(packet[2], 0x11);

			const okRes = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: okPort, protocol: "shtrih" });
			assert.equal(receivedCommand, 0x11);
			assert.equal(okRes.online, true);
			assert.equal(okRes.status, "ready");
			assert.equal(okRes.paperOk, true);
			assert.equal(okRes.coverClosed, true);
			assert.equal(okRes.fnPresent, true);
			assert.equal(okRes.shiftOpen, true);

			const alertRes = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: alertPort, protocol: "shtrih" });
			assert.equal(alertRes.online, true);
			assert.equal(alertRes.status, "hardware_alert");
			assert.equal(alertRes.paperOk, false);
			assert.equal(alertRes.coverClosed, false);
			assert.equal(alertRes.fnPresent, true);

			const badCrcRes = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: badCrcPort, protocol: "shtrih" });
			assert.equal(badCrcRes.online, false);
			assert.equal(badCrcRes.status, "protocol_error");
			assert.equal(badCrcRes.protocolError, true);
		} finally {
			shtrihOkServer.close();
			shtrihAlertServer.close();
			badCrcServer.close();
		}
	});

	await t.test("Loopback HTTP Supervisor serves dist, proxies /api/* with cookies, persists runtime.json", async () => {
		const tempRoot = path.join(os.tmpdir(), `dente-loopback-test-${Date.now()}`);
		const distDir = path.join(tempRoot, "dist");
		const assetsDir = path.join(distDir, "assets");
		const runtimeConfigPath = path.join(tempRoot, "userData", "runtime.json");
		fs.mkdirSync(assetsDir, { recursive: true });
		fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body>DENTE_LOOPBACK_OK</body></html>", "utf8");
		fs.writeFileSync(path.join(assetsDir, "app.js"), "console.log('ok');", "utf8");

		const mockApiServer = http.createServer((req, res) => {
			if (req.url === "/api/health") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, status: "healthy" }));
				return;
			}
			if (req.url === "/api/session") {
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Set-Cookie": "dente_sid=session-xyz; HttpOnly; Path=/",
				});
				res.end(JSON.stringify({ authenticated: true }));
				return;
			}
			if (req.url === "/api/health/discovery") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ serverName: "Clinic-1", apiPort: 4100 }));
				return;
			}
			res.writeHead(404);
			res.end();
		});
		await new Promise((r) => mockApiServer.listen(0, "127.0.0.1", r));
		const mockApiPort = mockApiServer.address().port;
		const mockApiUrl = `http://127.0.0.1:${mockApiPort}`;

		const pgTcpMock = net.createServer((s) => s.end());
		await new Promise((r) => pgTcpMock.listen(0, "127.0.0.1", r));
		const pgMockPort = pgTcpMock.address().port;

		try {
			const loopback = await startLoopbackHttpServer({
				port: 0,
				webDistDir: distDir,
				apiBaseUrl: mockApiUrl,
				runtimeConfigPath,
			});
			assert.ok(loopback.url.startsWith("http://127.0.0.1:"));
			assert.equal(loopback.url.startsWith("file://"), false);
			assert.ok(fs.existsSync(runtimeConfigPath));
			const savedRuntime = JSON.parse(fs.readFileSync(runtimeConfigPath, "utf8"));
			assert.equal(savedRuntime.loopbackPort, loopback.port);
			assert.equal(savedRuntime.engine, "embedded-postgres");

			const htmlRes = await fetch(`${loopback.url}/`);
			assert.equal(htmlRes.status, 200);
			assert.ok((await htmlRes.text()).includes("DENTE_LOOPBACK_OK"));

			const spaRes = await fetch(`${loopback.url}/cbct-studio?studyId=123`);
			assert.equal(spaRes.status, 200);
			assert.ok((await spaRes.text()).includes("DENTE_LOOPBACK_OK"));

			const jsRes = await fetch(`${loopback.url}/assets/app.js`);
			assert.equal(jsRes.status, 200);
			assert.ok(jsRes.headers.get("content-type")?.includes("application/javascript"));

			const traversalStatus = await new Promise((resolve, reject) => {
				const parsed = new URL(loopback.url);
				const req = http.request(
					{ hostname: parsed.hostname, port: parsed.port, path: "/../userData/runtime.json", method: "GET" },
					(res) => {
						res.resume();
						resolve(res.statusCode);
					},
				);
				req.on("error", reject);
				req.end();
			});
			assert.equal(traversalStatus, 403);

			const apiRes = await fetch(`${loopback.url}/api/session`);
			assert.equal(apiRes.status, 200);
			assert.ok(apiRes.headers.get("set-cookie")?.includes("dente_sid=session-xyz"));
			assert.equal((await apiRes.json()).authenticated, true);

			const onlineStatus = await getLocalServerStatus({ pgPort: pgMockPort, apiBaseUrl: mockApiUrl });
			assert.equal(onlineStatus.isRunning, true);
			assert.equal(onlineStatus.pgReady, true);
			assert.equal(onlineStatus.apiReachable, true);
			assert.equal(onlineStatus.status, "online");
			assert.equal(onlineStatus.engine, "embedded-postgres");
			assert.equal(onlineStatus.loopbackUrl, loopback.url);

			const discoveryProbe = await probeClinicDiscoveryEndpoint(mockApiUrl);
			assert.equal(discoveryProbe.reachable, true);
			assert.equal(discoveryProbe.discovery.serverName, "Clinic-1");

			if (typeof mockApiServer.closeAllConnections === "function") mockApiServer.closeAllConnections();
			await new Promise((r) => mockApiServer.close(r));
			const proxyDownRes = await fetch(`${loopback.url}/api/session`);
			assert.equal(proxyDownRes.status, 502);
			assert.equal((await proxyDownRes.json()).error, "LOCAL_API_UNREACHABLE");
		} finally {
			await stopLoopbackHttpServer();
			pgTcpMock.close();
			if (mockApiServer.listening) mockApiServer.close();
			fs.rmSync(tempRoot, { recursive: true, force: true });
		}
	});

	await t.test("TWAIN/WIA/HotFolder Scanner Bridge scans real .ds, WIA and HotFolders without phantom lists", async () => {
		const tempRoot = path.join(os.tmpdir(), `dente-twain-test-${Date.now()}`);
		const twainDir = path.join(tempRoot, "twain_32", "Vatech");
		const hotFolder = path.join(tempRoot, "EzDent_HotFolder");
		const missingDir = path.join(tempRoot, "DoesNotExist");
		fs.mkdirSync(twainDir, { recursive: true });
		fs.mkdirSync(hotFolder, { recursive: true });
		fs.writeFileSync(path.join(twainDir, "EzSensor.ds"), "DS_BIN", "utf8");
		fs.writeFileSync(path.join(hotFolder, "tooth_16_scan.png"), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

		try {
			const dsList = await scanTwainDataSources([path.join(tempRoot, "twain_32"), missingDir]);
			assert.equal(dsList.length, 1);
			assert.equal(dsList[0].source, "twain_ds");
			assert.equal(dsList[0].vendor, "vatech");
			assert.equal(dsList[0].connected, true);

			const wiaMock = await queryWiaDevices({
				wiaQueryFn: async () => [{ id: "wia-canon-1", name: "Canon EOS (WIA)", type: "camera", source: "wia", connected: true }],
			});
			assert.equal(wiaMock.length, 1);

			const validCheck = await validateHotFolderPath(hotFolder);
			assert.equal(validCheck.valid, true);
			assert.equal(validCheck.writable, true);

			const missingCheck = await validateHotFolderPath(missingDir);
			assert.equal(missingCheck.valid, false);
			assert.ok(missingCheck.error);

			const devices = await getTwainDevices({
				twainDirs: [path.join(tempRoot, "twain_32"), missingDir],
				hotFolders: [hotFolder, missingDir],
				includeInstalledPresets: false,
				wiaQueryFn: async () => [{ id: "wia-test", name: "WIA Test Scanner", type: "scanner", source: "wia", connected: true }],
			});
			assert.equal(devices.length, 4);
			assert.equal(devices.find((d) => d.folderPath === path.resolve(hotFolder))?.connected, true);
			assert.equal(devices.find((d) => d.folderPath === path.resolve(missingDir))?.connected, false);

			const acquired = await acquireTwainImage("twain-vatech", { hotFolders: [hotFolder] });
			assert.equal(acquired.success, true);
			assert.ok(acquired.dataBase64?.startsWith("data:image/png;base64,"));

			const emptyAcquired = await acquireTwainImage("twain-vatech", { hotFolders: [missingDir] });
			assert.equal(emptyAcquired.success, false);
			assert.equal(emptyAcquired.status, "hardware_offline");
		} finally {
			fs.rmSync(tempRoot, { recursive: true, force: true });
		}
	});

	await t.test("LAN Bridge validates RFC 1918 private subnets and clinicServerUrl strictly", () => {
		assert.equal(isPrivateIpv4("192.168.1.50"), true);
		assert.equal(isPrivateIpv4("10.0.0.12"), true);
		assert.equal(isPrivateIpv4("172.16.10.5"), true);
		assert.equal(isPrivateIpv4("127.0.0.1"), false);
		assert.equal(isPrivateIpv4("169.254.10.20"), false);
		assert.equal(isPrivateIpv4("100.64.0.1"), false);
		assert.equal(isPrivateIpv4("8.8.8.8"), false);

		assert.equal(resolveConfiguredClinicServerUrl({ clinicServerUrl: "http://192.168.1.100:4100/path" }), "http://192.168.1.100:4100");
		assert.equal(resolveConfiguredClinicServerUrl({ clinicServerUrl: "file:///C:/invalid" }), null);
	});

	await t.test("Electron builder config avoids web/dist duplication and points to valid Windows ICO", () => {
		const electronDir = path.resolve(import.meta.dirname, "..");
		const builderConfig = JSON.parse(fs.readFileSync(path.join(electronDir, "electron-builder.json"), "utf8"));
		assert.equal(
			(builderConfig.files || []).some((entry) => String(entry).includes("apps/web/dist")),
			false,
			"files[] must not duplicate ../apps/web/dist",
		);
		assert.ok(
			(builderConfig.extraResources || []).some(
				(res) => res && res.from === "../apps/web/dist" && res.to === "web/dist",
			),
			"extraResources must include ../apps/web/dist -> web/dist",
		);
		const iconPath = path.resolve(electronDir, builderConfig.win.icon);
		assert.equal(iconPath.toLowerCase().endsWith(".svg"), false);
		assert.ok(fs.existsSync(iconPath), `Missing Windows icon at ${iconPath}`);
		const icoBytes = fs.readFileSync(iconPath);
		assert.ok(icoBytes.length > 100);
		assert.equal(icoBytes.readUInt16LE(0), 0);
		assert.equal(icoBytes.readUInt16LE(2), 1);
	});

	await t.test("Embedded server supervisor respects remote flags and manages standalone API lifecycle safely", async () => {
		assert.equal(shouldRunEmbeddedBackend({ argv: ["--remote"], env: {}, runtimeConfig: {} }).enabled, false);
		assert.equal(shouldRunEmbeddedBackend({ argv: [], env: { DENTE_API_URL: "http://192.168.1.20:4100" }, runtimeConfig: {} }).enabled, false);
		assert.equal(shouldRunEmbeddedBackend({ argv: [], env: { DENTE_DISABLE_EMBEDDED_SERVER: "1" }, runtimeConfig: {} }).enabled, false);
		assert.equal(shouldRunEmbeddedBackend({ argv: [], env: {}, runtimeConfig: { engine: "lan_client" } }).enabled, false);
		assert.equal(shouldRunEmbeddedBackend({ argv: [], env: {}, runtimeConfig: { clinicServerUrl: "http://192.168.1.50:4100" } }).enabled, false);
		assert.equal(shouldRunEmbeddedBackend({ argv: [], env: {}, runtimeConfig: { engine: "embedded-postgres" } }).enabled, true);

		const skipped = await ensureEmbeddedBackendStarted({ argv: ["--remote"], env: {} });
		assert.equal(skipped.mode, "remote_or_disabled");
		assert.equal(skipped.reason, "remote_cli_flag");
		assert.equal(skipped.api.skipped, true);

		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-embedded-api-test-"));
		const dummyEntry = path.join(tempDir, "server.js");
		const closedProbe = net.createServer();
		await new Promise((r) => closedProbe.listen(0, "127.0.0.1", r));
		const targetPort = closedProbe.address().port;
		await new Promise((r) => closedProbe.close(r));

		fs.writeFileSync(
			dummyEntry,
			`const http = require("node:http");
const srv = http.createServer((req, res) => {
  if (req.url === "/api/health") { res.writeHead(200); res.end('{"ok":true}'); return; }
  res.writeHead(404); res.end();
});
srv.listen(Number(process.env.API_PORT), "127.0.0.1");
process.on("SIGTERM", () => srv.close(() => process.exit(0)));
`,
			"utf8",
		);

		try {
			const started = await ensureManagedApiStarted({
				apiBaseUrl: `http://127.0.0.1:${targetPort}`,
				apiEntryPath: dummyEntry,
				nodeExecPath: process.execPath,
				startupTimeoutMs: 3000,
			});
			assert.equal(started.started, true);
			assert.equal(started.external, false);
			assert.ok(typeof started.pid === "number" && started.pid > 0);

			const status = await getLocalServerStatus({
				pgPort: targetPort,
				apiBaseUrl: `http://127.0.0.1:${targetPort}`,
			});
			assert.equal(status.apiReachable, true);
			assert.equal(status.managedApiPid, started.pid);
		} finally {
			await stopManagedServices();
			fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
		}
	});
});
