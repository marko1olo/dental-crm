import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	parseClinicalVoiceSpeech,
	isValidFdiToothNumber,
	parseRussianSpokenToothNumber,
	extractSoapSections,
} from "../voiceClinicalCommands";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Voice Assistant & Telephony Autonomy Inquisition (Mandates 8c, 8d, 8e, 8i, 8k, 8s)", () => {
	const componentsDir = path.resolve(__dirname, "../../");
	const voiceDir = path.resolve(__dirname, "../");
	const telephonyDir = path.resolve(componentsDir, "telephony");

	describe("1. Solo Doctor Autonomy & Form 043/u Diary Notes (Mandates 8e, 8s)", () => {
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
			const dictation = "Жалобы: периодическая ноющая боль в области зуба 36 от горячего. Лечение: проведена анестезия, вскрытие полости зуба, экстирпация пульпы.";
			const soap = extractSoapSections(dictation);

			assert.ok(soap.subjective, "Should extract subjective жалобы");
			assert.ok(soap.subjective?.includes("периодическая ноющая боль"));
			assert.ok(soap.plan, "Should extract treatment plan / дневник");
			assert.ok(soap.plan?.includes("проведена анестезия"));
		});

		it("guarantees 1-chair solo doctor free dictation without blocking validations", () => {
			const modalPath = path.join(voiceDir, "VoiceDictationAssistantModal.tsx");
			const code = fs.readFileSync(modalPath, "utf-8");

			// Must support applying rawText directly to SOAP diary notes when no formal dental keywords are matched
			assert.ok(
				code.includes("onApplySoapNote({ plan: rawText })"),
				"VoiceDictationAssistantModal must apply free text directly to SOAP note without blocking modal toasts",
			);
			assert.ok(
				code.includes("Соло-врач (1 кресло): свободная диктовка дневника визита 043/у"),
				"Must document Solo Doctor Autonomy mandate in handleApplyAll",
			);
		});
	});

	describe("2. Audio Lifecycle & Memory Leak Law (Mandates 8i, 8k)", () => {
		it("VoiceDictationAssistantModal explicitly releases AudioContext and MediaStream on unmount", () => {
			const modalPath = path.join(voiceDir, "VoiceDictationAssistantModal.tsx");
			const code = fs.readFileSync(modalPath, "utf-8");

			// AudioContext and MediaStream must be cleaned up on unmount
			assert.ok(
				code.includes("cleanupAudio()"),
				"VoiceDictationAssistantModal must have cleanupAudio function",
			);
			assert.ok(
				code.includes("clientRef.current.dispose()"),
				"cleanupAudio must dispose UnifiedAudioClient to release audio hardware",
			);
			// Check that unmount cleanup hook exists
			assert.ok(
				code.includes("return () => {") && code.includes("cleanupAudio();"),
				"useEffect must return cleanup function invoking cleanupAudio()",
			);

			// Verify underlying hardware release in UnifiedAudioClient & AudioStreamManager
			const clientPath = path.resolve(componentsDir, "../services/voice/UnifiedAudioClient.ts");
			const clientCode = fs.readFileSync(clientPath, "utf-8");
			assert.ok(
				clientCode.includes("this.streamManager.dispose()"),
				"UnifiedAudioClient must dispose streamManager",
			);

			const managerPath = path.resolve(componentsDir, "audio/AudioStreamManager.ts");
			const managerCode = fs.readFileSync(managerPath, "utf-8");
			assert.ok(
				managerCode.includes("t.stop()"),
				"AudioStreamManager must stop all MediaStream tracks to release microphone hardware",
			);
			assert.ok(
				managerCode.includes("ctx.close()"),
				"AudioStreamManager must close AudioContext instance",
			);
		});

		it("TelephonyFloatingWidget explicitly pauses and resets audio element on unmount", () => {
			const widgetPath = path.join(telephonyDir, "TelephonyFloatingWidget.tsx");
			const code = fs.readFileSync(widgetPath, "utf-8");

			// Audio unmount cleanup
			assert.ok(
				code.includes("audioRef.current.pause()") &&
				code.includes("audioRef.current.src = \"\"") &&
				code.includes("audioRef.current.load()"),
				"TelephonyFloatingWidget must clean up audioRef on unmount",
			);

			// audioDuration must initialize to 0, not a fake hardcoded 45s
			assert.ok(
				code.includes("const [audioDuration, setAudioDuration] = useState(0)"),
				"audioDuration must initialize to 0 seconds",
			);
			assert.ok(
				!code.includes("const [audioDuration, setAudioDuration] = useState(45)"),
				"Must eliminate fake useState(45) default",
			);
		});

		it("IncomingCallPopup CallAudioPlayer explicitly cleans up audio and eliminates fake 45s default", () => {
			const popupPath = path.join(telephonyDir, "IncomingCallPopup.tsx");
			const code = fs.readFileSync(popupPath, "utf-8");

			// CallAudioPlayer default duration must be 0
			assert.ok(
				code.includes("durationSeconds = 0"),
				"CallAudioPlayer durationSeconds default must be 0",
			);
			assert.ok(
				!code.includes("durationSeconds = 45"),
				"CallAudioPlayer must not have durationSeconds = 45 default",
			);

			// CallAudioPlayer audio unmount cleanup
			assert.ok(
				code.includes("audioRef.current.pause()") &&
				code.includes("audioRef.current.src = \"\"") &&
				code.includes("audioRef.current.load()"),
				"CallAudioPlayer must clean up audio element on unmount",
			);

			// Zero fake 45s fallback in invocation
			assert.ok(
				code.includes("durationSeconds={currentCall.durationSeconds || 0}"),
				"Invocation must use durationSeconds || 0 instead of || 45",
			);
		});

		it("useVoiceAssistant hook terminates UnifiedAudioClient on unmount", () => {
			const hookPath = path.resolve(componentsDir, "../hooks/useVoiceAssistant.ts");
			const code = fs.readFileSync(hookPath, "utf-8");

			assert.ok(
				code.includes("clientRef.current.dispose()"),
				"useVoiceAssistant must call clientRef.current.dispose() on unmount",
			);
		});
	});

	describe("3. Desktop Density & HIG Ergonomics (Mandates 8c, 8d pt 2)", () => {
		it("telephonyFloatingWidget.css enforces desktop clinical density (32-36px) and adaptive coarse touch targets", () => {
			const cssPath = path.join(telephonyDir, "telephonyFloatingWidget.css");
			const css = fs.readFileSync(cssPath, "utf-8");

			// Desktop base rules must be 32px
			assert.ok(
				css.includes(".dnt-telephony-card button") &&
				css.includes("min-height: 32px"),
				"CSS must enforce min-height: 32px for desktop clinical density",
			);

			// Adaptive touch target only for coarse pointers
			assert.ok(
				css.includes("@media (pointer: coarse)"),
				"CSS must isolate 44px touch targets under @media (pointer: coarse)",
			);

			// No global universal 44px override on desktop
			const desktopOverridePattern = /\.dnt-telephony-island-pill button\s*,\s*\.dnt-telephony-island-expanded button\s*\{\s*min-height:\s*44px;\s*\}/;
			assert.equal(
				desktopOverridePattern.test(css),
				false,
				"Must not have unconditioned min-height: 44px on desktop buttons",
			);
		});

		it("Capsule pill buttons in TelephonyFloatingWidget and IncomingCallPopup use compact 32-34px density", () => {
			const widgetPath = path.join(telephonyDir, "TelephonyFloatingWidget.tsx");
			const widgetCode = fs.readFileSync(widgetPath, "utf-8");

			const popupPath = path.join(telephonyDir, "IncomingCallPopup.tsx");
			const popupCode = fs.readFileSync(popupPath, "utf-8");

			assert.ok(
				widgetCode.includes("min-h-[32px] sm:min-h-[34px] px-3 rounded-full bg-emerald-600"),
				"TelephonyFloatingWidget capsule button must use min-h-[32px] sm:min-h-[34px]",
			);

			assert.ok(
				popupCode.includes("min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95"),
				"IncomingCallPopup capsule button must use min-h-[32px] sm:min-h-[34px]",
			);
		});
	});

	describe("4. CSS Token Conformity & Theme Hygiene", () => {
		it("VoiceDictationAssistantModal eradicates hardcoded hex colors and binds to design tokens", () => {
			const modalPath = path.join(voiceDir, "VoiceDictationAssistantModal.tsx");
			const code = fs.readFileSync(modalPath, "utf-8");

			assert.ok(!code.includes("#ef444420"), "Must not contain #ef444420");
			assert.ok(!code.includes("#ef4444"), "Must not contain #ef4444");
			assert.ok(!code.includes("#10b981"), "Must not contain #10b981");

			assert.ok(code.includes("var(--bad-bg"), "Must use var(--bad-bg)");
			assert.ok(code.includes("var(--bad-fg"), "Must use var(--bad-fg)");
			assert.ok(code.includes("var(--ok-fg"), "Must use var(--ok-fg)");
			assert.ok(code.includes("var(--info-fg"), "Must use var(--info-fg)");
		});

		it("SmartMicrophoneButton binds to semantic tokens and handles fallback tokens cleanly", () => {
			const btnPath = path.join(componentsDir, "SmartMicrophoneButton.tsx");
			const code = fs.readFileSync(btnPath, "utf-8");

			assert.ok(code.includes("var(--bad-bg)"), "Must use var(--bad-bg)");
			assert.ok(code.includes("var(--bad-fg)"), "Must use var(--bad-fg)");
			assert.ok(code.includes("var(--info-bg)"), "Must use var(--info-bg)");
			assert.ok(code.includes("var(--info-fg)"), "Must use var(--info-fg)");
			assert.ok(code.includes("var(--teal, var(--brand-500))"), "Must use var(--teal, var(--brand-500))");
			assert.ok(code.includes("var(--bad-glow"), "Must use var(--bad-glow)");
		});
	});

	describe("5. Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
		const targetFiles = [
			path.join(voiceDir, "VoiceDictationAssistantModal.tsx"),
			path.join(voiceDir, "voiceClinicalCommands.ts"),
			path.join(telephonyDir, "TelephonyFloatingWidget.tsx"),
			path.join(telephonyDir, "IncomingCallPopup.tsx"),
			path.join(componentsDir, "SmartMicrophoneButton.tsx"),
			path.join(componentsDir, "VoiceAssistantUI.tsx"),
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

		for (const file of targetFiles) {
			const filename = path.basename(file);
			it(`${filename} contains zero cartoon emojis and strictly uses vector Lucide icons`, () => {
				const content = fs.readFileSync(file, "utf-8");
				const match = emojiRegex.exec(content);
				assert.equal(
					match,
					null,
					`Found prohibited cartoon emoji in ${filename}: ${match?.[0]}`,
				);
			});
		}
	});
});
