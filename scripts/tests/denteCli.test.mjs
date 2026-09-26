/**
 * Unit & Integration Test Suite for DENTE Dental CRM CLI & Universal Runner.
 * Tests doctor, preflight, info commands, network port checks, QR matrix & OS audits.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	auditPostmasterPid,
	checkDatabase,
	checkDiskSpace,
	checkMigrations,
	checkPort,
	checkPorts,
	detectLanIp,
	diagnoseNode,
	diagnoseOs,
	generateQrMatrix,
	normalizeDatabaseUrl,
	renderQrTerminalString,
	resolveDatabaseUrl,
	runDoctor,
	runInfo,
	runPreflight,
	selectDatabasePort,
} from "../dente-cli.mjs";

test("diagnoseOs: correctly identifies platforms and architectures", () => {
	const macArm = { platform: () => "darwin", arch: () => "arm64", release: () => "23.4.0" };
	const macRes = diagnoseOs(macArm);
	assert.equal(macRes.status, "OK");
	assert.equal(macRes.prettyPlatform, "macOS");
	assert.equal(macRes.arch, "arm64");

	const winX64 = { platform: () => "win32", arch: () => "x64", release: () => "10.0.26100" };
	const winRes = diagnoseOs(winX64);
	assert.equal(winRes.status, "OK");
	assert.equal(winRes.prettyPlatform, "Windows");

	const linuxX64 = { platform: () => "linux", arch: () => "x64", release: () => "6.8.0" };
	const linuxRes = diagnoseOs(linuxX64);
	assert.equal(linuxRes.status, "OK");
	assert.equal(linuxRes.prettyPlatform, "Linux");

	const legacy32 = { platform: () => "win32", arch: () => "ia32", release: () => "6.1.7601" };
	const legacyRes = diagnoseOs(legacy32);
	assert.equal(legacyRes.status, "WARN");
});

test("diagnoseNode: enforces Node.js >= 20 ceiling", () => {
	const node20 = diagnoseNode("v20.18.0");
	assert.equal(node20.status, "OK");
	assert.equal(node20.meetsRequirement, true);
	assert.equal(node20.major, 20);

	const node24 = diagnoseNode("v24.13.0");
	assert.equal(node24.status, "OK");
	assert.equal(node24.meetsRequirement, true);
	assert.equal(node24.major, 24);

	const node18 = diagnoseNode("v18.20.4");
	assert.equal(node18.status, "FAIL");
	assert.equal(node18.meetsRequirement, false);
	assert.equal(node18.major, 18);
});

test("detectLanIp: prioritizes physical Wi-Fi/LAN over VPN & virtual adapters", () => {
	const mockedInterfaces = {
		"vEthernet (WSL)": [{ family: "IPv4", internal: false, address: "172.28.16.1" }],
		"Radmin VPN": [{ family: "IPv4", internal: false, address: "26.131.232.129" }],
		"Wi-Fi Network": [{ family: "IPv4", internal: false, address: "192.168.1.103" }],
		Loopback: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
	};
	const ip = detectLanIp(mockedInterfaces);
	assert.equal(ip, "192.168.1.103");

	const tenNet = {
		Ethernet: [{ family: "IPv4", internal: false, address: "10.0.4.15" }],
	};
	assert.equal(detectLanIp(tenNet), "10.0.4.15");

	const loopOnly = {
		lo: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
	};
	assert.equal(detectLanIp(loopOnly), "127.0.0.1");
});

test("checkDiskSpace: verifies 2 GB free disk boundary", () => {
	const mockStatOk = () => ({ bsize: 4096, bavail: 2500000 }); // ~10 GB
	const okRes = checkDiskSpace(".", mockStatOk);
	assert.equal(okRes.status, "OK");
	assert.equal(okRes.meetsRequirement, true);
	assert.ok(okRes.freeGb >= 2.0);

	const mockStatLow = () => ({ bsize: 4096, bavail: 200000 }); // ~800 MB
	const lowRes = checkDiskSpace(".", mockStatLow);
	assert.equal(lowRes.status, "FAIL");
	assert.equal(lowRes.meetsRequirement, false);
	assert.ok(lowRes.freeGb < 2.0);

	const mockStatErr = () => {
		throw new Error("Permission denied");
	};
	const errRes = checkDiskSpace(".", mockStatErr);
	assert.equal(errRes.status, "WARN");
	assert.equal(errRes.meetsRequirement, false);
});

test("checkPort: verifies socket connection resolution", async () => {
	const mockNetListening = {
		Socket: class {
			setTimeout() {}
			once(evt, cb) {
				if (evt === "connect") setTimeout(cb, 10);
			}
			connect() {}
			destroy() {}
		},
	};
	const resListen = await checkPort("127.0.0.1", 4000, 100, mockNetListening);
	assert.equal(resListen.isListening, true);

	const mockNetClosed = {
		Socket: class {
			setTimeout() {}
			once(evt, cb) {
				if (evt === "error") setTimeout(() => cb({ code: "ECONNREFUSED" }), 10);
			}
			connect() {}
			destroy() {}
		},
	};
	const resClosed = await checkPort("127.0.0.1", 4000, 100, mockNetClosed);
	assert.equal(resClosed.isListening, false);
	assert.equal(resClosed.error, "ECONNREFUSED");
});

test("checkPorts: aggregates status for 4000, 4100, and PostgreSQL ports", async () => {
	const mockNet = {
		Socket: class {
			setTimeout() {}
			once(evt, cb) {
				if (evt === "connect") setTimeout(cb, 5);
			}
			connect() {}
			destroy() {}
		},
	};
	const report = await checkPorts({ timeoutMs: 50 }, mockNet);
	assert.equal(report.webApi4000.port, 4000);
	assert.equal(report.ws4100.port, 4100);
	assert.equal(report.pgPorts.status, "OK");
});

test("resolveDatabaseUrl & normalizeDatabaseUrl: handles auth and fallbacks", () => {
	const rawNoPass = "postgres://dental@127.0.0.1:5432/dental_crm";
	const normalized = normalizeDatabaseUrl(rawNoPass, { POSTGRES_PASSWORD: "secret_dental" });
	assert.ok(normalized.includes(":secret_dental@"));

	const defaultUrl = resolveDatabaseUrl({}, "/non-existent-dir");
	assert.ok(defaultUrl.startsWith("postgres://"));
});

test("checkDatabase: tests connection via mock pg client and socket probe", async () => {
	const mockPgSuccess = {
		Client: class {
			async connect() {}
			async query() {
				return { rows: [{ current_database: "dental_crm", version: "PostgreSQL 18.4" }] };
			}
			async end() {}
		},
	};
	const dbRes = await checkDatabase({ databaseUrl: "postgres://dental:dental@127.0.0.1:5432/dental_crm" }, mockPgSuccess);
	assert.equal(dbRes.status, "OK");
	assert.equal(dbRes.connected, true);
	assert.equal(dbRes.database, "dental_crm");

	const mockPgFail = {
		Client: class {
			async connect() {
				throw new Error("Password authentication failed");
			}
		},
	};
	const failRes = await checkDatabase({ databaseUrl: "postgres://dental:wrong@127.0.0.1:5432/dental_crm" }, mockPgFail);
	assert.equal(failRes.status, "FAIL");
	assert.equal(failRes.connected, false);
});

test("auditPostmasterPid: handles clean state, active PID, and stale lock purge", () => {
	const tempDir = path.join(os.tmpdir(), `dente-test-pid-${Date.now()}`);
	fs.mkdirSync(tempDir, { recursive: true });
	const pidFile = path.join(tempDir, "postmaster.pid");

	// 1. Clean state
	const cleanRes = auditPostmasterPid([tempDir], fs, process);
	assert.equal(cleanRes.status, "OK");
	assert.equal(cleanRes.purged, false);

	// 2. Stale dead PID
	fs.writeFileSync(pidFile, "99999999\n/var/lib/postgresql\n", "utf8");
	const staleRes = auditPostmasterPid([tempDir], fs, process);
	assert.equal(staleRes.status, "WARN");
	assert.equal(staleRes.purged, true);
	assert.equal(fs.existsSync(pidFile), false);

	// 3. Active PID
	const myPid = process.pid;
	fs.writeFileSync(pidFile, `${myPid}\n`, "utf8");
	const activeRes = auditPostmasterPid([tempDir], fs, process);
	assert.equal(activeRes.status, "OK");
	assert.equal(activeRes.purged, false);
	assert.equal(activeRes.pid, myPid);

	// Cleanup
	try {
		fs.unlinkSync(pidFile);
		fs.rmdirSync(tempDir);
	} catch {}
});

test("selectDatabasePort: arbitrates between 5432 and 5438", async () => {
	const createMockNet = (activePort) => ({
		Socket: class {
			constructor() {
				this.events = {};
			}
			setTimeout() {}
			once(evt, cb) {
				this.events[evt] = cb;
			}
			connect(p) {
				setTimeout(() => {
					if (p === activePort) {
						if (this.events.connect) this.events.connect();
					} else {
						if (this.events.error) this.events.error({ code: "ECONNREFUSED" });
					}
				}, 5);
			}
			destroy() {}
		},
	});

	const p1 = await selectDatabasePort({ timeoutMs: 50 }, createMockNet(5432));
	assert.equal(p1.selectedPort, 5432);
	assert.equal(p1.isFallback, false);

	const p2 = await selectDatabasePort({ timeoutMs: 50 }, createMockNet(5438));
	assert.equal(p2.selectedPort, 5438);
	assert.equal(p2.isFallback, true);

	const p3 = await selectDatabasePort({ timeoutMs: 50 }, createMockNet(null));
	assert.equal(p3.selectedPort, 5432);
	assert.equal(p3.isFallback, false);
});

test("checkMigrations: verifies existing migration files on disk", () => {
	const res = checkMigrations(process.cwd());
	assert.equal(res.status, "OK");
	assert.ok(res.totalMigrations > 100);
	assert.ok(res.latestMigration.endsWith(".sql"));
});

test("generateQrMatrix & renderQrTerminalString: generates valid QR code with UTF-8 pseudographics", () => {
	const testUrl = "http://192.168.1.100:4000";
	const qr = generateQrMatrix(testUrl);
	assert.ok(qr.size >= 21);
	assert.equal(qr.matrix.length, qr.size);
	assert.equal(qr.matrix[0].length, qr.size);

	// Verify finder patterns in 3 corners are present (7x7 finders)
	assert.equal(qr.matrix[0][0], true);
	assert.equal(qr.matrix[0][6], true);
	assert.equal(qr.matrix[6][0], true);
	assert.equal(qr.matrix[6][6], true);

	const terminalArt = renderQrTerminalString(qr.matrix, 2);
	assert.ok(terminalArt.includes("\u2588")); // full block
	assert.ok(terminalArt.includes("\n"));
});

test("runDoctor, runPreflight & runInfo: end-to-end execution without throwing", async () => {
	const loggedDoctor = [];
	const docRes = await runDoctor({ logger: (msg) => loggedDoctor.push(msg) });
	assert.equal(typeof docRes.ok, "boolean");
	assert.ok(loggedDoctor.length > 5);

	const loggedPreflight = [];
	const preRes = await runPreflight({ logger: (msg) => loggedPreflight.push(msg) });
	assert.equal(typeof preRes.ok, "boolean");
	assert.ok(loggedPreflight.length > 3);

	const loggedInfo = [];
	const infoRes = runInfo({ logger: (msg) => loggedInfo.push(msg) });
	assert.ok(infoRes.localUrl.includes("localhost"));
	assert.ok(infoRes.networkUrl.startsWith("http://"));
	assert.ok(loggedInfo.length > 5);
});
