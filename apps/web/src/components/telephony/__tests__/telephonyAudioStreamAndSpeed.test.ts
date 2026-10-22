import assert from "node:assert/strict";
import { describe, it } from "vitest";
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
});
