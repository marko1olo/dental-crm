/**
 * useVoiceChairsideSterileProtocol.ts — Hook for Chairside Hands-Free Sterile Voice Protocol.
 *
 * Allows dentist in sterile nitrile gloves to update odontogram & diary:
 * - Hotkeys: F8 (foot pedal switch), Alt+V / Alt+М (toggle mic)
 * - Auto-commit with 1800ms silence detection
 * - Real-time earcon audible confirmation
 *
 * Rules: THE_HAMMER_MASTER_PROMPT.md, frontend.md, <500 lines.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	dispatchSterileVoiceActions,
	parseVoiceChairsideCommand,
	type SterileVoiceParseResult,
} from "../lib/voiceChairsideSterileEngine";

// Web Speech API interface shims
interface SpeechRecognitionResultItem {
	transcript: string;
	confidence: number;
}
interface SpeechRecognitionResultList {
	[index: number]: { [index: number]: SpeechRecognitionResultItem; isFinal: boolean };
	length: number;
}
interface SpeechRecognitionEventLike {
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

export interface UseVoiceChairsideSterileProtocolReturn {
	isListening: boolean;
	transcript: string;
	lastActionResult: SterileVoiceParseResult | null;
	isHudVisible: boolean;
	toggleListening: (force?: boolean) => void;
	dismissHud: () => void;
	simulateSpokenCommand: (text: string) => void;
}

export function useVoiceChairsideSterileProtocol(): UseVoiceChairsideSterileProtocolReturn {
	const [isListening, setIsListening] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [lastActionResult, setLastActionResult] = useState<SterileVoiceParseResult | null>(null);
	const [isHudVisible, setIsHudVisible] = useState(false);

	// biome-ignore lint/suspicious/noExplicitAny: browser speech engine polymorphism
	const recognitionRef = useRef<any>(null);
	const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestTranscriptRef = useRef("");

	const commitPendingActions = useCallback(() => {
		const text = latestTranscriptRef.current.trim();
		if (!text) return;

		const result = parseVoiceChairsideCommand(text);
		if (result.hasActions) {
			dispatchSterileVoiceActions(result);
			setLastActionResult(result);
			setIsHudVisible(true);
		}
		setTranscript("");
		latestTranscriptRef.current = "";
	}, []);

	const stopListeningInternal = useCallback(() => {
		if (silenceTimerRef.current) {
			clearTimeout(silenceTimerRef.current);
			silenceTimerRef.current = null;
		}
		commitPendingActions();
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// ignore already stopped
			}
			recognitionRef.current = null;
		}
		setIsListening(false);
	}, [commitPendingActions]);

	const startListeningInternal = useCallback(() => {
		if (typeof window === "undefined") return;

		// Cleanup previous session
		if (recognitionRef.current) {
			try {
				recognitionRef.current.abort();
			} catch {
				// ignore
			}
			recognitionRef.current = null;
		}

		// Check for Web Speech API
		// biome-ignore lint/suspicious/noExplicitAny: standard browser vendor prefixes
		const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

		if (SpeechRecognitionConstructor) {
			try {
				const recognizer = new SpeechRecognitionConstructor();
				recognizer.continuous = true;
				recognizer.interimResults = true;
				recognizer.lang = "ru-RU";

				recognizer.onresult = (event: SpeechRecognitionEventLike) => {
					let currentInterim = "";
					for (let i = event.resultIndex; i < event.results.length; i++) {
						const res = event.results[i];
						if (res?.[0]) {
							currentInterim += res[0].transcript;
						}
					}

					latestTranscriptRef.current = currentInterim;
					setTranscript(currentInterim);
					setIsHudVisible(true);

					// Reset silence debounce timer
					if (silenceTimerRef.current) {
						clearTimeout(silenceTimerRef.current);
					}
					silenceTimerRef.current = setTimeout(() => {
						commitPendingActions();
					}, 1800);
				};

				recognizer.onerror = () => {
					// Silent fallback on permission or speech error
					stopListeningInternal();
				};

				recognizer.onend = () => {
					setIsListening(false);
				};

				recognizer.start();
				recognitionRef.current = recognizer;
				setIsListening(true);
				setIsHudVisible(true);
			} catch {
				// Mic error fallback
				setIsListening(false);
			}
		} else {
			// Mock / headless environment fallback
			setIsListening(true);
			setIsHudVisible(true);
		}
	}, [commitPendingActions, stopListeningInternal]);

	const toggleListening = useCallback(
		(force?: boolean) => {
			const targetState = force !== undefined ? force : !isListening;
			if (targetState) {
				startListeningInternal();
			} else {
				stopListeningInternal();
			}
		},
		[isListening, startListeningInternal, stopListeningInternal],
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

	// Global Hotkeys: F8 (foot pedal switch), Alt+V / Alt+М
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// F8 is standard hardware foot pedal switch
			if (e.key === "F8") {
				e.preventDefault();
				toggleListening();
				return;
			}

			// Alt+V or Alt+М (Russian)
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

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			if (silenceTimerRef.current) {
				clearTimeout(silenceTimerRef.current);
			}
			if (recognitionRef.current) {
				try {
					recognitionRef.current.abort();
				} catch {
					// ignore
				}
			}
		};
	}, [isHudVisible, toggleListening, dismissHud]);

	return {
		isListening,
		transcript,
		lastActionResult,
		isHudVisible,
		toggleListening,
		dismissHud,
		simulateSpokenCommand,
	};
}
