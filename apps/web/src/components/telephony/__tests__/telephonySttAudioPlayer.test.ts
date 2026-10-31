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

	test("CallAudioPlayer architecture: modular decomposition and sweet-spot file limits", () => {
		const rootDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src/components/telephony"))
			? path.resolve(process.cwd(), "apps/web/src/components/telephony")
			: path.resolve(process.cwd(), "src/components/telephony");

		const facadePath = path.join(rootDir, "CallAudioPlayer.tsx");
		const audioPlayerDir = path.join(rootDir, "audioPlayer");

		assert.ok(fs.existsSync(facadePath), "CallAudioPlayer.tsx facade must exist");
		assert.ok(fs.existsSync(audioPlayerDir), "audioPlayer modular directory must exist");

		const facadeSource = fs.readFileSync(facadePath, "utf-8");
		const facadeLines = facadeSource.split("\n").length;
		assert.ok(
			facadeLines <= 200,
			`CallAudioPlayer.tsx facade must be <= 200 lines (current: ${facadeLines})`,
		);

		// Check facade invariants
		assert.ok(
			facadeSource.includes("audioRef.current.pause()") &&
			facadeSource.includes('audioRef.current.src = ""') &&
			facadeSource.includes("audioRef.current.load()"),
			"CallAudioPlayer must clean up audio element on unmount",
		);
		assert.ok(
			facadeSource.includes("durationSeconds = 0"),
			"CallAudioPlayer must default durationSeconds to 0",
		);

		// Check modular components
		const controlsPath = path.join(audioPlayerDir, "CallAudioPlaybackControls.tsx");
		const waveformPath = path.join(audioPlayerDir, "CallAudioWaveformBar.tsx");
		const transcriptPath = path.join(audioPlayerDir, "CallAudioTranscriptView.tsx");
		const emptyStatePath = path.join(audioPlayerDir, "CallAudioEmptyState.tsx");
		const stateHookPath = path.join(audioPlayerDir, "useCallAudioPlayerState.ts");

		const controlsSource = fs.readFileSync(controlsPath, "utf-8");
		const emptyStateSource = fs.readFileSync(emptyStatePath, "utf-8");
		const waveformSource = fs.readFileSync(waveformPath, "utf-8");
		const transcriptSource = fs.readFileSync(transcriptPath, "utf-8");
		const stateHookSource = fs.readFileSync(stateHookPath, "utf-8");

		// Empty State
		assert.ok(
			emptyStateSource.includes('data-testid="call-audio-player-empty"'),
			"CallAudioEmptyState must include data-testid='call-audio-player-empty'",
		);
		assert.ok(
			emptyStateSource.includes("Запись звонка не подключена или недоступна"),
			"Empty state must render honest fallback message",
		);

		// Playback Controls: Apple HIG & Desktop clinical density
		assert.ok(
			controlsSource.includes("min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px]"),
			"Play button must support compact desktop clinical density",
		);
		assert.ok(
			controlsSource.includes("min-h-[32px] min-w-[32px] h-8 w-8"),
			"Skip buttons must use compact desktop 32px height",
		);
		assert.ok(
			controlsSource.includes("min-h-[44px] min-w-[44px]"),
			"Touch targets must support Apple HIG >= 44x44px for touch interactions",
		);
		assert.ok(
			controlsSource.includes("CALL_AUDIO_PLAYBACK_SPEEDS.map"),
			"Controls must render speed selection chips",
		);

		// Waveform Bar
		assert.ok(
			waveformSource.includes('role="slider"'),
			"Waveform must be accessible as an interactive slider",
		);
		assert.ok(
			waveformSource.includes("ArrowLeft") && waveformSource.includes("ArrowRight"),
			"Waveform must support keyboard navigation",
		);

		// Transcript View
		assert.ok(
			transcriptSource.includes('data-testid="audio-transcript-toggle"'),
			"Transcript view must include toggle button",
		);
		assert.ok(
			transcriptSource.includes("Оператор") && transcriptSource.includes("Пациент"),
			"Transcript view must distinguish operator and patient speakers",
		);

		// Hook State
		assert.ok(
			stateHookSource.includes("useTelephonyStore"),
			"useCallAudioPlayerState must integrate with telephony store",
		);
		assert.ok(
			stateHookSource.includes("generateWaveformBars"),
			"useCallAudioPlayerState must generate waveform bars",
		);
	});
});
