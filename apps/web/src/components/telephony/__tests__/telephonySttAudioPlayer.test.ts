import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { useTelephonyStore } from "../../../store/telephonyStore.js";

describe("Telephony: STT Transcript & Audio Player Density", () => {
	test("preserves authentic server utterances when provided", () => {
		const authenticUtterances = [
			{
				speaker: "operator" as const,
				startTimeSeconds: 1,
				endTimeSeconds: 5,
				text: "Клиника DENTE, слушаю вас.",
				confidence: 0.98,
				sentiment: "positive" as const,
			},
			{
				speaker: "patient" as const,
				startTimeSeconds: 6,
				endTimeSeconds: 12,
				text: "Здравствуйте, хочу подтвердить запись на завтра.",
				confidence: 0.96,
				sentiment: "neutral" as const,
			},
		];

		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-with-real-stt",
			phone: "+79991112233",
			patientId: null,
			patientName: "Реальный Пациент",
			timestamp: new Date().toISOString(),
			transcript: authenticUtterances,
		});

		const active = useTelephonyStore.getState().activeCall;
		assert.ok(active);
		assert.equal(active.transcript?.length, 2);
		assert.equal(active.transcript?.[0]?.speaker, "operator");
		assert.equal(active.transcript?.[1]?.speaker, "patient");

		useTelephonyStore.getState().dismissCall();
	});

	test("CallAudioPlayer.tsx enforces zero-mock fallback and desktop clinical density", () => {
		const playerPath = fs.existsSync(path.resolve(process.cwd(), "apps/web/src/components/telephony/CallAudioPlayer.tsx"))
			? path.resolve(process.cwd(), "apps/web/src/components/telephony/CallAudioPlayer.tsx")
			: path.resolve(process.cwd(), "src/components/telephony/CallAudioPlayer.tsx");
		const source = fs.readFileSync(playerPath, "utf-8");

		assert.ok(
			source.includes('data-testid="call-audio-player-empty"'),
			"CallAudioPlayer must include data-testid='call-audio-player-empty' for missing recording",
		);
		assert.ok(
			source.includes("Запись звонка не подключена или недоступна"),
			"CallAudioPlayer must render honest empty state message",
		);
		assert.ok(
			source.includes("min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px]"),
			"Play button must have compact desktop density",
		);
		assert.ok(
			source.includes("min-h-[32px] min-w-[32px] h-8 w-8"),
			"Skip buttons must use compact desktop 32px height",
		);
		assert.ok(
			source.includes("audioRef.current.pause()") &&
			source.includes('audioRef.current.src = ""') &&
			source.includes("audioRef.current.load()"),
			"CallAudioPlayer must clean up audio element on unmount",
		);
	});
});
