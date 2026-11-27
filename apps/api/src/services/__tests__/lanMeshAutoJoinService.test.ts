import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	AUTO_JOIN_MAX_ORGS,
	LanMeshAutoJoinService,
	getAutoJoinServicesByOrgCountForTest,
	getLanMeshAutoJoinServiceForOrg,
	hasLanMeshAutoJoinServiceForOrg,
	resetLanMeshAutoJoinServiceForTest,
} from "../lanMeshAutoJoinService.js";

describe("LanMeshAutoJoinService: 6-Digit PIN & QR Pairing Protocol", () => {
	let service: LanMeshAutoJoinService;

	beforeEach(() => {
		resetLanMeshAutoJoinServiceForTest();
		service = new LanMeshAutoJoinService({
			clinicId: "test-clinic-42",
			masterNodeId: "master-srv-1",
			primaryIp: "192.168.1.10",
			apiPort: 4100,
			webPort: 5173,
			pinTtlMs: 900000, // 15 mins
			graceTtlMs: 60000, // 60s
			maxAttemptsPerWindow: 5,
			rateLimitWindowMs: 300000, // 5 mins
		});
	});

	afterEach(() => {
		service.stop();
		resetLanMeshAutoJoinServiceForTest();
	});

	it("generates a uniform 6-digit numeric PIN and cryptographic QR pairing payload", () => {
		const pinInfo = service.getActivePinInfo();

		// Exact 6-digit numeric PIN
		assert.match(pinInfo.pin, /^\d{6}$/);
		assert.equal(pinInfo.clinicId, "test-clinic-42");
		assert.equal(pinInfo.masterNodeId, "master-srv-1");
		assert.equal(pinInfo.apiPort, 4100);
		assert.equal(pinInfo.webPort, 5173);
		assert.ok(pinInfo.remainingSeconds > 0 && pinInfo.remainingSeconds <= 900);

		// Mobile QR Code protocol URI
		assert.ok(pinInfo.qrPayload.startsWith("dente://pair?"));
		assert.ok(pinInfo.qrPayload.includes(`pin=${pinInfo.pin}`));
		assert.ok(pinInfo.qrPayload.includes("clinicId=test-clinic-42"));
		assert.ok(pinInfo.qrPayload.includes("nodeId=master-srv-1"));
		assert.ok(pinInfo.qrPayload.includes("token=pair-"));

		// Browser tablet direct fallback URL
		assert.ok(pinInfo.httpPairUrl.startsWith("http://"));
		assert.ok(pinInfo.httpPairUrl.includes(`pair_pin=${pinInfo.pin}`));
		assert.ok(pinInfo.httpPairUrl.includes("clinic_id=test-clinic-42"));
	});

	it("supports explicit PIN rotation with 60-second grace period for typing tablets", () => {
		const initialInfo = service.getActivePinInfo();
		const oldPin = initialInfo.pin;

		// Force rotation
		const rotatedInfo = service.rotatePin(true);
		const newPin = rotatedInfo.pin;

		// PINs must be different (overwhelming mathematical probability)
		assert.notEqual(newPin, oldPin);
		assert.match(newPin, /^\d{6}$/);

		// Both active PIN and previous PIN in grace window should verify
		const joinNew = service.verifyAndJoin({
			pin: newPin,
			clientIp: "192.168.1.55",
			clientName: "Doctor Tablet Cabinet 1",
			role: "doctor",
		});
		assert.equal(joinNew.success, true);

		const joinGrace = service.verifyAndJoin({
			pin: oldPin,
			clientIp: "192.168.1.56",
			clientName: "Assistant Tablet",
			role: "reception",
		});
		assert.equal(joinGrace.success, true);
	});

	it("completes mutual authentication and registers newly joined peers in topology", () => {
		const pinInfo = service.getActivePinInfo();

		const result = service.verifyAndJoin({
			pin: pinInfo.pin,
			clientIp: "192.168.1.77",
			nodeId: "tablet-dr-ivanov",
			clientName: "iPad Pro Dr. Ivanov",
			role: "doctor",
			appVersion: "2.4.0",
			schemaVersion: 182,
		});

		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.clinicId, "test-clinic-42");
			assert.equal(result.masterNodeId, "master-srv-1");
			assert.equal(result.assignedNodeId, "tablet-dr-ivanov");
			assert.equal(result.assignedRole, "doctor");
			assert.ok(result.meshToken.startsWith("mesh_token_"));
			assert.equal(result.schemaVersion, 182);
			assert.equal(result.appVersion, "2.4.0");
		}

		// Joined nodes table must reflect new device
		const joinedNodes = service.getJoinedNodes();
		assert.equal(joinedNodes.length, 1);
		assert.equal(joinedNodes[0]?.nodeId, "tablet-dr-ivanov");
		assert.equal(joinedNodes[0]?.clientName, "iPad Pro Dr. Ivanov");
	});

	it("rejects malformed PINs immediately with INVALID_REQUEST", () => {
		const res1 = service.verifyAndJoin({ pin: "123" });
		assert.equal(res1.success, false);
		if (!res1.success) {
			assert.equal(res1.error, "INVALID_REQUEST");
		}

		const res2 = service.verifyAndJoin({ pin: "abcdef" });
		assert.equal(res2.success, false);
		if (!res2.success) {
			assert.equal(res2.error, "INVALID_REQUEST");
		}
	});

	it("enforces brute-force rate limiting: blocks client IP after 5 consecutive failures", () => {
		const attackerIp = "192.168.1.99";

		// 4 consecutive invalid attempts: should report remaining attempts
		for (let i = 1; i <= 4; i++) {
			const res = service.verifyAndJoin({
				pin: "000000",
				clientIp: attackerIp,
			});
			assert.equal(res.success, false);
			if (!res.success) {
				assert.equal(res.error, "INVALID_PIN");
				assert.ok(res.message.includes(`Осталось попыток: ${5 - i}`));
			}
		}

		// 5th attempt: triggers RATE_LIMITED lockout
		const res5 = service.verifyAndJoin({
			pin: "000000",
			clientIp: attackerIp,
		});
		assert.equal(res5.success, false);
		if (!res5.success) {
			assert.equal(res5.error, "RATE_LIMITED");
			assert.ok(res5.retryAfterSeconds && res5.retryAfterSeconds > 0);
		}

		// Subsequent attempt with correct PIN must still be blocked during lockout window
		const correctPin = service.getActivePinInfo().pin;
		const blockedRes = service.verifyAndJoin({
			pin: correctPin,
			clientIp: attackerIp,
		});
		assert.equal(blockedRes.success, false);
		if (!blockedRes.success) {
			assert.equal(blockedRes.error, "RATE_LIMITED");
		}

		// Other IPs must not be affected
		const cleanRes = service.verifyAndJoin({
			pin: correctPin,
			clientIp: "192.168.1.101",
		});
		assert.equal(cleanRes.success, true);
	});

	it("resets failure counter upon successful authentication", () => {
		const clientIp = "192.168.1.120";
		const correctPin = service.getActivePinInfo().pin;

		// 2 failed attempts
		service.verifyAndJoin({ pin: "111111", clientIp });
		service.verifyAndJoin({ pin: "222222", clientIp });

		// 1 successful attempt resets the counter
		const successRes = service.verifyAndJoin({ pin: correctPin, clientIp });
		assert.equal(successRes.success, true);

		// Now 4 more failures will NOT trigger rate limit (counter was reset to 0)
		for (let i = 1; i <= 4; i++) {
			const failRes = service.verifyAndJoin({ pin: "333333", clientIp });
			assert.equal(failRes.success, false);
			if (!failRes.success) {
				assert.equal(failRes.error, "INVALID_PIN");
			}
		}
	});

	it("rotates PIN and triggers global lockout on distributed brute-force across multiple IPs", () => {
		const initialPin = service.getActivePinInfo().pin;

		// 14 distributed failures across distinct IPs (below 5 per IP, building up to 15 global)
		for (let i = 1; i <= 14; i++) {
			const res = service.verifyAndJoin({
				pin: "999999",
				clientIp: `192.168.10.${i}`,
			});
			assert.equal(res.success, false);
			if (!res.success) {
				assert.equal(res.error, "INVALID_PIN");
			}
		}

		// 15th failure triggers global lockout and rotates PIN
		const lockRes = service.verifyAndJoin({
			pin: "999999",
			clientIp: "192.168.10.200",
		});
		assert.equal(lockRes.success, false);
		if (!lockRes.success) {
			assert.equal(lockRes.error, "RATE_LIMITED");
		}

		// Even a clean IP is blocked during global lockout and PIN was rotated
		const afterLockRes = service.verifyAndJoin({
			pin: initialPin,
			clientIp: "192.168.10.250",
		});
		assert.equal(afterLockRes.success, false);
		if (!afterLockRes.success) {
			assert.equal(afterLockRes.error, "RATE_LIMITED");
		}
		assert.notEqual(service.getActivePinInfo().pin, initialPin);
	});

	it("getPairingStatus() returns comprehensive diagnostic telemetry", () => {
		const status = service.getPairingStatus();
		assert.equal(status.clinicId, "test-clinic-42");
		assert.match(status.currentPin, /^\d{6}$/);
		assert.ok(status.remainingSeconds > 0);
		assert.ok(status.qrPayload.startsWith("dente://pair?"));
		assert.ok(status.httpPairUrl.startsWith("http://"));
		assert.equal(status.joinedPeersCount, 0);
	});

	it("bounds joinedNodes and rateLimits via BoundedTtlMap (evicts oldest entries without unbounded growth)", () => {
		const bounded = new LanMeshAutoJoinService({
			clinicId: "bounded-clinic",
			maxJoinedNodes: 3,
			maxRateLimitEntries: 3,
			maxAttemptsPerWindow: 5,
		});

		try {
			const pin = bounded.getActivePinInfo().pin;
			for (let i = 1; i <= 5; i++) {
				const joinRes = bounded.verifyAndJoin({
					pin,
					nodeId: `tablet-${i}`,
					clientIp: `192.168.1.${10 + i}`,
				});
				assert.equal(joinRes.success, true);
			}

			const nodes = bounded.getJoinedNodes();
			assert.equal(nodes.length, 3);
			assert.deepEqual(
				nodes.map((n) => n.nodeId),
				["tablet-3", "tablet-4", "tablet-5"],
			);

			for (let i = 1; i <= 5; i++) {
				const failRes = bounded.verifyAndJoin({
					pin: "000000",
					clientIp: `10.0.0.${i}`,
				});
				assert.equal(failRes.success, false);
			}
			// 10.0.0.1 was evicted when 4th/5th distinct IPs arrived, so remaining attempts start fresh at 4
			const evictedIpRetry = bounded.verifyAndJoin({
				pin: "000000",
				clientIp: "10.0.0.1",
			});
			assert.equal(evictedIpRetry.success, false);
			if (!evictedIpRetry.success) {
				assert.equal(evictedIpRetry.error, "INVALID_PIN");
				assert.ok(evictedIpRetry.message.includes("Осталось попыток: 4"));
			}
		} finally {
			bounded.stop();
		}
	});

	it("bounds autoJoinServicesByOrg singleton registry and stops evicted services", () => {
		const total = AUTO_JOIN_MAX_ORGS + 10;
		for (let i = 0; i < total; i++) {
			getLanMeshAutoJoinServiceForOrg(`org-bounded-${i}`);
		}
		assert.equal(getAutoJoinServicesByOrgCountForTest(), AUTO_JOIN_MAX_ORGS);
		assert.equal(hasLanMeshAutoJoinServiceForOrg("org-bounded-0"), false);
		assert.equal(hasLanMeshAutoJoinServiceForOrg(`org-bounded-${total - 1}`), true);
	});
});
