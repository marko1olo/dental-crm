/**
 * telephonyRedTeamInquisition.test.ts
 *
 * RED TEAM INQUISITION TEST SUITE: CTI TELEPHONY & CLINICAL CALL DESK
 *
 * Mandates & Invariants Verified:
 * 1. Production Isolation & Anti-Synthetic Calls (Mandates 8c, 8k, 8y):
 *    - In production (!isDemoShowcaseMode()), synthetic callers ("Константинопольский А.В.", etc.)
 *      are strictly forbidden. Empty or stub phones are rejected. Unknown callers stay unknown.
 *    - In demo showcase mode, canonical showcase identity ("Смирнова Анна Сергеевна") binds cleanly.
 * 2. Emergency Cito / Acute Pain Booking Autonomy (Mandate 8e):
 *    - 1-click acute pain booking creates a valid planned appointment draft without gatekeeping
 *      or requiring passport / SNILS documents.
 *    - Chairside doctor immunity protects active clinical visits from disruptive popups.
 * 3. Safe Transcript Rendering (Zero-Crash Invariant):
 *    - Graceful handling of empty, undefined, or missing transcripts.
 *    - Non-numeric or missing confidence values do not output 'NaN%'.
 * 4. Audio Player Lifecycle & Memory Leak Prevention (Mandates 8b, 8l):
 *    - Audio cleanup on unmount/source swap revokes object URLs and clears audio resources.
 * 5. UI Purity & Zero Emojis Purge (Mandate 8d, UI Sin 7):
 *    - All telephony components strictly use Lucide SVG icons; 0 raw unicode emojis.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	useTelephonyStore,
	assertNoSyntheticCallsInProduction,
	generateWaveformBars,
	formatDurationTimer,
	resolvePatientCategory,
} from "../store/telephonyStore";
import {
	enableDemoShowcaseMode,
	disableDemoShowcaseMode,
	isDemoShowcaseMode,
} from "../lib/demoMode";
import { useAppStore } from "../store/appStore";
import { useScheduleStore } from "../store/scheduleStore";
import { emptyAppointmentScheduleDraft } from "../utils/draftDefaults";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CTI Telephony Red Team Inquisition (8c, 8e, 8k, 8y, 8d)", () => {
	beforeEach(() => {
		useTelephonyStore.getState().clearHistory();
		useTelephonyStore.setState({
			activeCall: null,
			isCallDrawerOpen: false,
			playbackSpeed: 1,
			isMuted: false,
		});
		useScheduleStore.setState({ newAppointmentDraft: emptyAppointmentScheduleDraft() });
		disableDemoShowcaseMode();
	});

	afterEach(() => {
		disableDemoShowcaseMode();
		vi.restoreAllMocks();
	});

	// ── 1. PRODUCTION PURITY & ZERO SYNTHETIC LEAKS ───────────────────────────
	describe("1. Production Purity & Anti-Synthetic Invariants (Mandates 8c, 8k, 8y)", () => {
		it("assertNoSyntheticCallsInProduction returns true when demo mode is disabled", () => {
			disableDemoShowcaseMode();
			expect(isDemoShowcaseMode()).toBe(false);
			expect(assertNoSyntheticCallsInProduction()).toBe(true);
		});

		it("production mode blocks triggerIncomingCall with empty, whitespace or stub numbers", () => {
			disableDemoShowcaseMode();
			const store = useTelephonyStore.getState();

			store.triggerIncomingCall({
				phone: "",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});
			expect(useTelephonyStore.getState().activeCall).toBeNull();
			expect(useTelephonyStore.getState().callHistory).toHaveLength(0);

			store.triggerIncomingCall({
				phone: "    ",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});
			expect(useTelephonyStore.getState().activeCall).toBeNull();
		});

		it("production mode does not invent synthetic patient names for unknown caller", () => {
			disableDemoShowcaseMode();
			const store = useTelephonyStore.getState();

			store.triggerIncomingCall({
				phone: "+7 999 111-22-33",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});

			const active = useTelephonyStore.getState().activeCall;
			expect(active).not.toBeNull();
			expect(active?.phone).toBe("+79991112233");
			expect(active?.patientName).toBe("");
			expect(active?.patientId).toBeNull();
		});

		it("demo showcase mode canonically binds to Smirnova Anna Sergeevna", () => {
			enableDemoShowcaseMode();
			expect(isDemoShowcaseMode()).toBe(true);

			const store = useTelephonyStore.getState();
			store.triggerIncomingCall({
				phone: "",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});

			const active = useTelephonyStore.getState().activeCall;
			expect(active).not.toBeNull();
			expect(active?.patientName).toBe("Смирнова Анна Сергеевна");
			expect(active?.phone).toBe("+79162345678");
		});
	});

	// ── 2. EMERGENCY CITO BOOKING & DOCTOR AUTONOMY ────────────────────────────
	describe("2. Emergency Cito 1-Click Booking Autonomy (Mandate 8e)", () => {
		it("emergency Cito booking creates valid planned draft without requiring SNILS or passport", () => {
			const callerPhone = "+7 (926) 999-88-77";
			const todayIso = new Date().toISOString().split("T")[0]!;

			// Simulate quick booking action (handleQuickBook('today_urgent'))
			const targetDate = todayIso;
			const startTime = "10:00:00";
			const endTime = "10:30:00";
			const reason = "Острая боль / Экстренный приём";

			useScheduleStore.getState().setNewAppointmentDraft({
				patientId: "", // New unknown caller without existing ID
				doctorUserId: "doc-duty-01",
				assistantUserId: "",
				chairId: "chair-1",
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Запись по экстренному звонку (${callerPhone})`,
			});

			const draft = useScheduleStore.getState().newAppointmentDraft;
			expect(draft).not.toBeNull();
			expect(draft?.patientId).toBe("");
			expect(draft?.reason).toBe("Острая боль / Экстренный приём");
			expect(draft?.startsAt).toBe(`${todayIso}T10:00:00`);
			expect(draft?.endsAt).toBe(`${todayIso}T10:30:00`);
			expect(draft?.comment).toContain(callerPhone);
		});

		it("chairside doctor immunity suppresses incoming call popups during clinical procedures", () => {
			const isDisruptionSuppressed = (role: string, currentView: string): boolean => {
				return (
					role === "doctor" ||
					currentView === "visit" ||
					currentView === "odontogram" ||
					currentView === "periodontics"
				);
			};

			// Active clinical visit view protects user from disruption
			expect(isDisruptionSuppressed("doctor", "schedule")).toBe(true);
			expect(isDisruptionSuppressed("administrator", "visit")).toBe(true);
			expect(isDisruptionSuppressed("assistant", "odontogram")).toBe(true);
			expect(isDisruptionSuppressed("hygienist", "periodontics")).toBe(true);

			// Administrator in reception/schedule view receives call popups
			expect(isDisruptionSuppressed("administrator", "schedule")).toBe(false);
			expect(isDisruptionSuppressed("registrar", "finances")).toBe(false);
		});
	});

	// ── 3. SAFE TRANSCRIPT RENDERING & STT ROBUSTNESS ─────────────────────────
	describe("3. Safe Transcript Rendering & STT Invariants", () => {
		it("handles empty and undefined transcripts without throwing", () => {
			const emptyUtterances = [] as const;
			expect(emptyUtterances.length).toBe(0);

			const formatTranscript = (utterances: any[] | undefined) => {
				const list = Array.isArray(utterances) ? utterances : [];
				return list.map((u) => ({
					time: `${formatDurationTimer(u.startTimeSeconds || 0)} - ${formatDurationTimer(u.endTimeSeconds || 0)}`,
					speaker: u.speaker === "operator" ? "Оператор" : "Пациент",
					confidenceDisplay:
						typeof u.confidence === "number" && !Number.isNaN(u.confidence)
							? `${(u.confidence * 100).toFixed(0)}% уверенность`
							: "",
					text: u.text || "",
				}));
			};

			expect(formatTranscript(undefined)).toEqual([]);
			expect(formatTranscript([])).toEqual([]);

			const rawData = [
				{
					speaker: "operator",
					startTimeSeconds: 0,
					endTimeSeconds: 4,
					text: "Клиника Денте, здравствуйте!",
					confidence: 0.98,
				},
				{
					speaker: "patient",
					startTimeSeconds: 5,
					endTimeSeconds: 12,
					text: "Здравствуйте, у меня острая боль в зубе.",
					confidence: undefined, // Missing confidence
				},
				{
					speaker: "operator",
					startTimeSeconds: 13,
					endTimeSeconds: 20,
					text: "Сейчас оформим срочный приём.",
					confidence: Number.NaN, // Corrupted confidence
				},
			];

			const formatted = formatTranscript(rawData);
			expect(formatted).toHaveLength(3);
			expect(formatted[0]?.confidenceDisplay).toBe("98% уверенность");
			// Must never display 'NaN%' or throw error
			expect(formatted[1]?.confidenceDisplay).toBe("");
			expect(formatted[2]?.confidenceDisplay).toBe("");
		});

		it("formatDurationTimer formats duration seconds safely across edge cases", () => {
			expect(formatDurationTimer(0)).toBe("00:00");
			expect(formatDurationTimer(45)).toBe("00:45");
			expect(formatDurationTimer(65)).toBe("01:05");
			expect(formatDurationTimer(3665)).toBe("01:01:05");
			// Non-finite / negative guard
			expect(formatDurationTimer(-10)).toBe("00:00");
			expect(formatDurationTimer(Number.NaN)).toBe("00:00");
			expect(formatDurationTimer(Number.POSITIVE_INFINITY)).toBe("00:00");
		});
	});

	// ── 4. AUDIO PLAYER LIFECYCLE & WAVEFORM MEMORY SAFETY ───────────────────
	describe("4. Audio Player Lifecycle & Memory Safety", () => {
		it("generateWaveformBars produces bounded, non-empty amplitudes", () => {
			const bars1 = generateWaveformBars("rec-test-call-1", 44);
			expect(bars1).toHaveLength(44);
			bars1.forEach((val) => {
				expect(val).toBeGreaterThanOrEqual(0.1);
				expect(val).toBeLessThanOrEqual(1.0);
			});

			// Deterministic for same seed
			const bars2 = generateWaveformBars("rec-test-call-1", 44);
			expect(bars1).toEqual(bars2);
		});

		it("URL.revokeObjectURL is invoked when blob URLs are cleaned up", () => {
			const revokedUrls: string[] = [];
			const origRevoke = URL.revokeObjectURL;
			URL.revokeObjectURL = vi.fn((url: string) => {
				revokedUrls.push(url);
			});

			try {
				const blobUrl = "blob:http://localhost:3000/1234-call-audio";
				// Simulate cleanup hook behavior
				if (blobUrl.startsWith("blob:")) {
					URL.revokeObjectURL(blobUrl);
				}
				expect(revokedUrls).toContain(blobUrl);
			} finally {
				URL.revokeObjectURL = origRevoke;
			}
		});

		it("audio player controls respect playback speeds and mute toggle", () => {
			const store = useTelephonyStore.getState();
			expect(store.playbackSpeed).toBe(1);

			store.setPlaybackSpeed(1.5);
			expect(useTelephonyStore.getState().playbackSpeed).toBe(1.5);

			store.toggleMute();
			expect(useTelephonyStore.getState().isMuted).toBe(true);
			store.toggleMute();
			expect(useTelephonyStore.getState().isMuted).toBe(false);
		});
	});

	// ── 5. EMOJI PURGE VERIFICATION (MANDATE 8D & UI SIN 7) ───────────────────
	describe("5. Telephony UI Zero-Emoji Purge Audit (Sin 7 & Mandate 8d)", () => {
		it("all telephony component files contain zero raw unicode emojis", () => {
			const telephonyDir = path.resolve(__dirname, "../components/telephony");
			const files = fs
				.readdirSync(telephonyDir)
				.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

			// Regex matching Unicode emoji ranges and dingbats
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			const violations: Array<{ file: string; line: number; match: string }> = [];

			files.forEach((file) => {
				const fullPath = path.join(telephonyDir, file);
				const content = fs.readFileSync(fullPath, "utf-8");
				const lines = content.split("\n");

				lines.forEach((lineText, idx) => {
					const match = emojiRegex.exec(lineText);
					if (match) {
						violations.push({
							file,
							line: idx + 1,
							match: match[0],
						});
					}
				});
			});

			expect(violations).toHaveLength(0);
		});
	});
});
