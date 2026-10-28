/**
 * useVoiceChairsideSterileProtocol.ts — Hook for Chairside Hands-Free Sterile Voice Protocol.
 *
 * Allows dentist in sterile nitrile gloves to update odontogram & diary:
 * - Hotkeys: F8 (foot pedal switch), Alt+V / Alt+М (toggle mic)
 * - Auto-commit with 1800ms silence detection & noise suppression
 * - Real-time earcon audible confirmation & active input insertion
 * - Calm error toasts and HUD error indicator (zero silent failures)
 *
 * Unified with useUnifiedDictation (Mandates 8e, 8l, THE_HAMMER).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	dispatchSterileVoiceActions,
	insertTextIntoActiveInput,
	parseVoiceChairsideCommand,
	type SterileVoiceParseResult,
} from "../lib/voiceChairsideSterileEngine";
import { voiceDictationErrorText } from "../components/odontogram/voiceDictationText";
import { showToast } from "../components/GlobalToast";
import { useUnifiedDictation } from "./useUnifiedDictation";

export interface UseVoiceChairsideSterileProtocolReturn {
	isListening: boolean;
	transcript: string;
	lastActionResult: SterileVoiceParseResult | null;
	errorMessage: string | null;
	isHudVisible: boolean;
	toggleListening: (force?: boolean) => void;
	dismissHud: () => void;
	simulateSpokenCommand: (text: string) => void;
}

export function useVoiceChairsideSterileProtocol(): UseVoiceChairsideSterileProtocolReturn {
	const [transcript, setTranscript] = useState("");
	const [lastActionResult, setLastActionResult] = useState<SterileVoiceParseResult | null>(null);
	const [isHudVisible, setIsHudVisible] = useState(false);

	const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestTranscriptRef = useRef("");

	const commitPendingActions = useCallback(() => {
		const text = latestTranscriptRef.current.trim();
		if (!text) return;

		const insertedIntoInput = insertTextIntoActiveInput(text);
		const result = parseVoiceChairsideCommand(text);

		if (result.hasActions) {
			dispatchSterileVoiceActions(result);
			setLastActionResult(result);
			setIsHudVisible(true);
		} else if (insertedIntoInput) {
			setLastActionResult({
				hasActions: true,
				teethActions: [],
				anesthesiaAction: null,
				diaryActions: [],
				summaryText: "Текст вставлен в активное поле",
			});
			setIsHudVisible(true);
		}
		setTranscript("");
		latestTranscriptRef.current = "";
	}, []);

	const {
		isRecording,
		startDictation,
		stopDictation,
		error,
	} = useUnifiedDictation({
		context: "visit",
		onInterim: (interim) => {
			if (!interim) return;
			latestTranscriptRef.current = interim;
			setTranscript(interim);
			setIsHudVisible(true);

			if (silenceTimerRef.current) {
				clearTimeout(silenceTimerRef.current);
			}
			silenceTimerRef.current = setTimeout(() => {
				commitPendingActions();
			}, 1800);
		},
		onResult: (finalText) => {
			if (!finalText) return;
			latestTranscriptRef.current = finalText;
			setTranscript(finalText);
			setIsHudVisible(true);
			commitPendingActions();
		},
	});

	// Calm error toast handling without silent failures (Red Team mandate)
	useEffect(() => {
		if (error) {
			const calmMessage = voiceDictationErrorText(error);
			showToast(calmMessage, "warning", 6000);
		}
	}, [error]);

	const toggleListening = useCallback(
		(force?: boolean) => {
			const targetState = force !== undefined ? force : !isRecording;
			if (targetState) {
				void startDictation();
			} else {
				if (silenceTimerRef.current) {
					clearTimeout(silenceTimerRef.current);
					silenceTimerRef.current = null;
				}
				commitPendingActions();
				void stopDictation();
			}
		},
		[isRecording, startDictation, stopDictation, commitPendingActions],
	);

	const dismissHud = useCallback(() => {
		setIsHudVisible(false);
		setLastActionResult(null);
	}, []);

	const simulateSpokenCommand = useCallback(
		(text: string) => {
			latestTranscriptRef.current = text;
			setTranscript(text);
			commitPendingActions();
		},
		[commitPendingActions],
	);

	// Global Hotkeys: F8 (foot pedal switch), Alt+V / Alt+М, and dente:toggle-sterile-voice event
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// F8 is standard hardware foot pedal switch
			if (e.key === "F8") {
				e.preventDefault();
				toggleListening();
				return;
			}

			// Alt+V or Alt+М (Russian layout support)
			if (e.altKey && !e.ctrlKey && !e.metaKey) {
				const key = e.key.toLowerCase();
				if (key === "v" || key === "м" || e.code === "KeyV") {
					e.preventDefault();
					toggleListening();
				}
			}

			// Escape closes HUD
			if (e.key === "Escape" && isHudVisible) {
				dismissHud();
			}
		};

		const handleVoiceToggleEvent = (e: Event) => {
			const force = (e as CustomEvent<{ force?: boolean }>)?.detail?.force;
			toggleListening(force);
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("dente:toggle-sterile-voice", handleVoiceToggleEvent);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("dente:toggle-sterile-voice", handleVoiceToggleEvent);
			if (silenceTimerRef.current) {
				clearTimeout(silenceTimerRef.current);
			}
		};
	}, [isHudVisible, toggleListening, dismissHud]);

	return {
		isListening: isRecording,
		transcript,
		lastActionResult,
		errorMessage: error ? voiceDictationErrorText(error) : null,
		isHudVisible,
		toggleListening,
		dismissHud,
		simulateSpokenCommand,
	};
}
