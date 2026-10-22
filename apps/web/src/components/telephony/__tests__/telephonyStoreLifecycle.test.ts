import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	type IncomingCallPayload,
	useTelephonyStore,
} from "../../../store/telephonyStore.js";

describe("Telephony: Store Lifecycle & Playback Controls", () => {
	test("store initializes with default playback speed and volume", () => {
		const state = useTelephonyStore.getState();
		assert.equal(state.playbackSpeed, 1);
		assert.equal(state.volumeLevel, 0.8);
		assert.equal(state.isMuted, false);
	});

	test("cyclePlaybackSpeed cycles through 1x -> 1.25x -> 1.5x -> 2x -> 1x", () => {
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
	});

	test("setVolumeLevel clamps volume between 0.0 and 1.0", () => {
		useTelephonyStore.getState().setVolumeLevel(0.5);
		assert.equal(useTelephonyStore.getState().volumeLevel, 0.5);

		useTelephonyStore.getState().setVolumeLevel(1.5);
		assert.equal(useTelephonyStore.getState().volumeLevel, 1);

		useTelephonyStore.getState().setVolumeLevel(-0.2);
		assert.equal(useTelephonyStore.getState().volumeLevel, 0);
	});

	test("playRecording and stopRecording manage audio playback state", () => {
		useTelephonyStore.getState().playRecording("https://records.example.com/test.mp3");
		assert.equal(useTelephonyStore.getState().isPlayingRecording, true);
		assert.equal(
			useTelephonyStore.getState().activeRecordingUrl,
			"https://records.example.com/test.mp3",
		);

		useTelephonyStore.getState().stopRecording();
		assert.equal(useTelephonyStore.getState().isPlayingRecording, false);
	});

	test("triggerIncomingCall, answerCall and acceptCall update history", () => {
		const call: IncomingCallPayload = {
			phone: "+79161234567",
			patientId: "11111111-1111-1111-1111-111111111111",
			patientName: "Иванов Иван",
			provider: "mango",
			timestamp: "2026-08-21T10:00:00Z",
			status: "ringing",
			recordingUrl: "https://records.mango-office.ru/call-123.mp3",
		};

		useTelephonyStore.getState().triggerIncomingCall(call);

		let state = useTelephonyStore.getState();
		assert.ok(state.activeCall);
		assert.equal(state.activeCall?.phone, "+79161234567");

		useTelephonyStore.getState().answerCall();
		state = useTelephonyStore.getState();
		assert.equal(state.activeCall?.status, "answered");

		useTelephonyStore.getState().acceptCall();
		state = useTelephonyStore.getState();
		assert.equal(state.activeCall, null);
		assert.equal(state.callHistory[0]?.status, "answered");
	});
});
