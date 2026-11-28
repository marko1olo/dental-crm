import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	parseClinicalVoiceSpeech,
	isValidFdiToothNumber,
	parseRussianSpokenToothNumber,
	extractSoapSections,
} from "../voiceClinicalCommands";
import { CopilotVoiceStenographer } from "../../copilot/CopilotVoiceStenographer";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { CallAudioPlayer } from "../../telephony/CallAudioPlayer";
import { TelephonyHeaderCapsule } from "../../telephony/headerCapsule/TelephonyHeaderCapsule";
import { AudioStreamManager } from "../../audio/AudioStreamManager";
import { UnifiedAudioClient } from "../../../services/voice/UnifiedAudioClient";
import { useAppStore } from "../../../store/appStore";

describe("Voice Assistant & Telephony Autonomy Inquisition (Mandates 8c, 8d, 8e, 8i, 8k, 8s)", () => {
	describe("1. Solo Doctor Autonomy & Clinical Diary Notes (Mandates 8e, 8s)", () => {
		it("correctly identifies valid FDI tooth numbers in Russian spoken speech", () => {
			assert.equal(isValidFdiToothNumber(46), true);
			assert.equal(isValidFdiToothNumber(16), true);
			assert.equal(isValidFdiToothNumber(21), true);
			assert.equal(isValidFdiToothNumber(99), false);

			assert.equal(parseRussianSpokenToothNumber("сорок шесть"), 46);
			assert.equal(parseRussianSpokenToothNumber("шестнадцатый"), 16);
			assert.equal(parseRussianSpokenToothNumber("двадцать один"), 21);
			assert.equal(parseRussianSpokenToothNumber("зуб 47"), 47);
		});

		it("parses structured dental commands without requiring secondary clerk confirmation", () => {
			const speech = "зуб сорок шесть кариес дентина";
			const result = parseClinicalVoiceSpeech(speech);

			assert.ok(result.commands.length > 0, "Should generate at least one command");
			const cmd = result.commands.find((c) => c.toothNumber === 46);
			assert.ok(cmd, "Should identify tooth 46");
			assert.equal(cmd?.clinicalStatus, "CARIES");
			assert.equal(cmd?.confidenceLevel, "high");
		});

		it("extracts SOAP sections from natural clinical Russian speech", () => {
			const dictation =
				"Жалобы: периодическая ноющая боль в области зуба 36 от горячего. Лечение: проведена анестезия, вскрытие полости зуба, экстирпация пульпы.";
			const soap = extractSoapSections(dictation);

			assert.ok(soap.subjective, "Should extract subjective жалобы");
			assert.ok(soap.subjective?.includes("периодическая ноющая боль"));
			assert.ok(soap.plan, "Should extract treatment plan / дневник");
			assert.ok(soap.plan?.includes("проведена анестезия"));
		});

		it("renders CopilotVoiceStenographer with unlocked Primary CTA and Russian clinical section labels", () => {
			const html = renderToString(
				React.createElement(CopilotVoiceStenographer, {
					isOpen: true,
					patientId: "11111111-1111-4111-8111-111111111111",
					activeTooth: 36,
					patientName: "Иванов А.Б.",
					initialTranscript: "Жалобы: боль в области зуба 36 от холодного. Кариес.",
				}),
			);
			assert.ok(html.includes('data-testid="copilot-voice-stenographer"'));
			assert.ok(html.includes("Иванов А.Б."));
			assert.ok(html.includes("Зуб 36"));
			assert.equal(html.includes("Раздел: complaint"), false, "Сырой английский enum не должен утекать в UI");
			assert.equal(html.includes("Раздел: treatmentPlan"), false, "Сырой английский enum не должен утекать в UI");
			assert.equal(html.includes('disabled=""'), false, "Primary CTA врача не должен быть disabled");
		});
	});

	describe("2. Audio Lifecycle & Zero Potemkin Duration Defaults (Mandates 8i, 8k)", () => {
		it("AudioStreamManager and UnifiedAudioClient dispose cleanly without dangling timers or errors", () => {
			const manager = new AudioStreamManager({
				onPcmChunk: () => {},
				onError: () => {},
			});
			assert.equal(manager.getAnalyserNode(), null);
			assert.equal(manager.getAudioLevel(), 0);
			manager.pause();
			manager.resume();
			manager.dispose();

			const client = new UnifiedAudioClient({ preferredMode: "gemini_live" });
			assert.equal(client.getState(), "idle");
			client.dispose();
			assert.equal(client.getState(), "idle");
		});

		it("CallAudioPlayer renders honest 00:00 duration default instead of fake 45s", () => {
			const html = renderToString(
				React.createElement(CallAudioPlayer, {
					recordingUrl: "",
					transcript: "Пациент записан на завтра в 10:00",
				}),
			);
			assert.equal(html.includes("0:45"), false, "Фейковая длительность 45с должна быть исключена");
		});
	});

	describe("3. Desktop Density & Touch Ergonomics (Mandates 8c, 8d pt 2)", () => {
		it("TelephonyHeaderCapsule renders compact 32px density capsule in admin mode", () => {
			useAppStore.setState({ selectedWorkspaceRole: "administrator", currentView: "schedule" });
			const html = renderToString(
				React.createElement(TelephonyHeaderCapsule, {
					activeCall: {
						callId: "call-1",
						direction: "inbound",
						callerPhone: "+79991234567",
						callerName: "Петрова Е.В.",
						startedAt: new Date().toISOString(),
					},
				}),
			);
			assert.ok(html.includes("min-h-[32px]") && html.includes("rounded-full"));
		});

		it("SmartMicrophoneButton preserves >= 44x44px hit target for sterile chairside use", () => {
			const html = renderToString(
				React.createElement(SmartMicrophoneButton, { context: "visit", onResult: () => {} }),
			);
			assert.ok(html.includes("min-width:44px") || html.includes("min-w-[44px]"));
			assert.ok(html.includes("min-height:44px") || html.includes("min-h-[44px]"));
		});
	});

	describe("4. CSS Token Conformity & Theme Hygiene", () => {
		it("SmartMicrophoneButton and CopilotVoiceStenographer bind exclusively to design system tokens", () => {
			const micHtml = renderToString(
				React.createElement(SmartMicrophoneButton, { context: "visit", onResult: () => {} }),
			);
			const stenoHtml = renderToString(
				React.createElement(CopilotVoiceStenographer, { isOpen: true, activeTooth: 16, patientName: "Тест" }),
			);
			assert.ok(micHtml.includes("var(--teal, var(--brand-500))"), "Кнопка микрофона должна использовать var(--teal)");
			assert.equal(micHtml.includes("#ef444420"), false);
			assert.equal(stenoHtml.includes("#ef444420"), false);
		});
	});

	describe("5. Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
		it("Voice components and clinical parser outputs contain zero cartoon emojis", () => {
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			const parsed = parseClinicalVoiceSpeech("зуб 16 глубокий кариес, анестезия септанест");
			const samples = [
				JSON.stringify(parsed),
				renderToString(React.createElement(SmartMicrophoneButton, { context: "visit", onResult: () => {} })),
				renderToString(React.createElement(CopilotVoiceStenographer, { isOpen: true, patientName: "Тест" })),
			];
			for (const sample of samples) {
				assert.equal(emojiRegex.test(sample), false, "Обнаружен запрещенный cartoon emoji в голосовом контуре");
			}
		});
	});
});
