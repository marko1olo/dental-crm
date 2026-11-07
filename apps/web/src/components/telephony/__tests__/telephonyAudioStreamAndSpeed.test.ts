import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getSharedTelephonyAudioStreamManager,
	TelephonyAudioStreamManager,
} from "../../../store/telephonyClinical";
import { useTelephonyStore } from "../../../store/telephonyStore";

describe("Telephony Audio Stream & Speed Lifecycle (Mandate 8b, 8e)", () => {
	it("1. TelephonyAudioStreamManager handles audio context, volume clamping, and mute state", () => {
		const manager = new TelephonyAudioStreamManager({
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		});

		manager.setStreamVolume(1.5);
		assert.equal(manager.getAudioStats().outputLevel, 1.0);

		manager.setStreamVolume(-0.5);
		assert.equal(manager.getAudioStats().outputLevel, 0.0);

		manager.setStreamVolume(0.85);
		assert.equal(manager.getAudioStats().outputLevel, 0.85);

		manager.setMicrophoneMute(true);
		assert.equal(manager.getAudioStats().inputLevel, 0);

		manager.setMicrophoneMute(false);
		assert.equal(manager.getAudioStats().inputLevel, 0.75);

		const shared = getSharedTelephonyAudioStreamManager();
		assert.ok(shared instanceof TelephonyAudioStreamManager);

		manager.dispose();
	});

	it("2. useTelephonyStore controls playback speed cycling and line switching", () => {
		useTelephonyStore.getState().setPlaybackSpeed(1);
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1.25);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1.5);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 2);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1);

		useTelephonyStore.getState().switchLine(2);
		assert.equal(useTelephonyStore.getState().activeLineId, 2);

		useTelephonyStore.getState().switchLine(1);
		assert.equal(useTelephonyStore.getState().activeLineId, 1);
	});

	it("3. TelephonyAudioStreamManager handles RTCPeerConnection negotiation, ICE, and stats polling", async () => {
		// Mock RTCPeerConnection in node test environment
		let localDesc: RTCSessionDescriptionInit | null = null;
		let remoteDesc: RTCSessionDescriptionInit | null = null;
		const candidates: any[] = [];

		class MockRTCPeerConnection {
			public connectionState: RTCPeerConnectionState = "new";
			public ontrack: any = null;
			public onicecandidate: any = null;
			public onconnectionstatechange: any = null;

			constructor(public config: any) {}

			public async createOffer() {
				return { type: "offer" as const, sdp: "v=0\r\no=mock 123 IN IP4 127.0.0.1\r\ns=Test\r\n" };
			}

			public async createAnswer() {
				return { type: "answer" as const, sdp: "v=0\r\no=mock 456 IN IP4 127.0.0.1\r\ns=Test\r\n" };
			}

			public async setLocalDescription(desc?: any) {
				localDesc = desc || { type: "offer", sdp: "mock" };
			}

			public async setRemoteDescription(desc: any) {
				remoteDesc = desc;
			}

			public async addIceCandidate(cand: any) {
				candidates.push(cand);
			}

			public addTrack(track: any) {
				return { track };
			}

			public async getStats() {
				const map = new Map();
				map.set("inbound-audio", {
					type: "inbound-rtp",
					kind: "audio",
					jitter: 0.008,
					packetsLost: 2,
					roundTripTime: 0.018,
				});
				map.set("active-codec", {
					type: "codec",
					mimeType: "audio/opus",
				});
				return map;
			}

			public close() {
				this.connectionState = "closed";
			}
		}

		(globalThis as any).window = globalThis.window || {};
		(globalThis as any).window.RTCPeerConnection = MockRTCPeerConnection;
		(globalThis as any).RTCSessionDescription = class {
			constructor(public desc: any) {
				Object.assign(this, desc);
			}
		};

		const manager = new TelephonyAudioStreamManager();
		const pc = manager.ensurePeerConnection();
		assert.ok(pc);

		const offer = await manager.createOffer();
		assert.equal(offer?.type, "offer");
		assert.ok(localDesc);

		await manager.setRemoteDescription({ type: "answer", sdp: "v=0..." });
		assert.equal(remoteDesc?.type, "answer");

		await manager.addIceCandidate({ candidate: "candidate:1 1 UDP ...", sdpMid: "0", sdpMLineIndex: 0 });
		assert.equal(candidates.length, 1);

		const stats = await manager.pollWebRtcStats();
		assert.equal(stats.jitterMs, 8);
		assert.equal(stats.packetsLost, 2);
		assert.equal(stats.roundTripTimeMs, 18);
		assert.equal(stats.codecName, "audio/opus");

		const waveform = manager.getAudioWaveform(12);
		assert.equal(waveform.length, 12);
		assert.ok(waveform.every((v) => v >= 0 && v <= 1));

		manager.dispose();
		assert.equal(manager.getAudioStats().connectionState, "uninitialized");
	});

	it("4. TelephonyAudioStreamManager handles microphone permission rejection gracefully", async () => {
		let reportedError: string | null = null;
		const manager = new TelephonyAudioStreamManager({
			onError: (err) => {
				reportedError = typeof err === "string" ? err : err.message;
			},
		});

		const originalMediaDevices = navigator.mediaDevices;
		const mockMediaDevices = {
			getUserMedia: async () => {
				const err = new Error("Permission denied by user");
				err.name = "NotAllowedError";
				throw err;
			},
		};

		Object.defineProperty(navigator, "mediaDevices", {
			value: mockMediaDevices,
			configurable: true,
			writable: true,
		});

		const stream = await manager.acquireLocalAudioStream();
		assert.equal(stream, null);
		assert.equal(manager.getMicrophoneError(), "Требуется доступ к микрофону для звонков");
		assert.equal(reportedError, "Требуется доступ к микрофону для звонков");

		if (originalMediaDevices) {
			Object.defineProperty(navigator, "mediaDevices", {
				value: originalMediaDevices,
				configurable: true,
				writable: true,
			});
		}

		manager.dispose();
	});
});
