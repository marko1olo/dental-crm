/**
 * @file apps/web/src/components/visit/emk/useClinicalStenographer.ts
 * @description React hook for Zero-Latency Clinical Stenographer, Smart Snippets & Hands-Free Voice Dictation.
 * Form 043/y Doctor Diary keyboard autocomplete (Tab / Space), 1-click chip insertion & Tooth Grammar Speech formatting.
 */

import React from "react";
import {
	type ClinicalFormFieldTarget,
	type ClinicalSnippet,
	type SnippetReplacementResult,
	type ClinicalSpeechFormatResult,
	ClinicalStenographerEngine,
	getGlobalClinicalStenographer,
	formatClinicalSpeechToDiaryEntry,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useShortDictation } from "../../../hooks/useShortDictation";

export interface UseClinicalStenographerOptions {
	readonly value: string;
	readonly onChange: (nextValue: string) => void;
	readonly onCommit?: (nextValue: string) => void;
	readonly targetField?: ClinicalFormFieldTarget;
	readonly textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
	readonly enableStenographer?: boolean;
	readonly enableVoice?: boolean;
	readonly customEngine?: ClinicalStenographerEngine;
	readonly onToothDetected?: (toothNumber: number) => void;
}

export function useClinicalStenographer({
	value,
	onChange,
	onCommit,
	targetField = "all",
	textareaRef,
	enableStenographer = true,
	enableVoice = true,
	customEngine,
	onToothDetected,
}: UseClinicalStenographerOptions) {
	const engine = React.useMemo(
		() => customEngine ?? getGlobalClinicalStenographer(),
		[customEngine],
	);

	const [liveInterim, setLiveInterim] = React.useState<string>("");
	const [lastVoiceResult, setLastVoiceResult] =
		React.useState<ClinicalSpeechFormatResult | null>(null);

	// Contextual snippets for the active field
	const fieldSnippets = React.useMemo(() => {
		return engine.searchPrefix("", 12, targetField);
	}, [engine, targetField]);

	/**
	 * Formats and inserts clinical voice text into active textarea or appends to value.
	 */
	const insertVoiceText = React.useCallback(
		(rawSpeechText: string) => {
			const clean = (rawSpeechText || "").trim();
			if (!clean) return;

			// Run intelligent Tooth Grammar & Clinical Formatter (Order 804n & СтАР)
			const formatResult = formatClinicalSpeechToDiaryEntry(clean);
			setLastVoiceResult(formatResult);

			if (formatResult.detectedTeeth.length > 0 && onToothDetected) {
				onToothDetected(formatResult.detectedTeeth[0]!);
			}

			const textToInsert = formatResult.formattedText;
			const textarea = textareaRef?.current;

			if (textarea) {
				const start = textarea.selectionStart ?? value.length;
				const end = textarea.selectionEnd ?? value.length;

				const before = value.slice(0, start);
				const after = value.slice(end);

				const needsLeadingNewline =
					before.length > 0 &&
					!before.endsWith("\n") &&
					!before.endsWith(" ");
				const needsTrailingNewline =
					after.length > 0 &&
					!after.startsWith("\n") &&
					!after.startsWith(" ");

				const formattedInsertion = `${needsLeadingNewline ? "\n" : ""}${textToInsert}${needsTrailingNewline ? " " : ""}`;
				const nextVal = before + formattedInsertion + after;
				const nextCaret = before.length + formattedInsertion.length;

				onChange(nextVal);
				if (onCommit) {
					onCommit(nextVal);
				}

				textarea.value = nextVal;
				textarea.focus();
				textarea.setSelectionRange(nextCaret, nextCaret);

				requestAnimationFrame(() => {
					if (textarea) {
						textarea.setSelectionRange(nextCaret, nextCaret);
					}
				});
			} else {
				const separator = value.trim() ? "\n" : "";
				const nextVal = value ? `${value}${separator}${textToInsert}` : textToInsert;
				onChange(nextVal);
				if (onCommit) {
					onCommit(nextVal);
				}
			}

			setLiveInterim("");
			showToast(
				`✓ Зафиксировано голосом: «${textToInsert.slice(0, 48)}${textToInsert.length > 48 ? "..." : ""}»`,
				"success",
				2200,
			);
		},
		[onChange, onCommit, onToothDetected, textareaRef, value],
	);

	// Hands-free voice dictation hook (UnifiedAudioClient / Web Speech / Gemini Live VAD)
	const {
		isRecording: isListening,
		isProcessing,
		interimText: rawInterim,
		toggleRecording,
		startRecording,
		stopRecording,
	} = useShortDictation("visit", {
		onResult: (finalText) => {
			insertVoiceText(finalText);
		},
		onInterim: (interim) => {
			setLiveInterim(interim);
		},
	});

	/**
	 * Synchronously handles Tab and Space keys directly in the keyboard event.
	 * Executes in <0.5ms with zero DOM lag or cloud network latency.
	 */
	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (!enableStenographer) return;

			// We intercept Tab and Space
			if (e.key !== "Tab" && e.key !== " ") return;

			// Do not interfere if user is holding modifiers (Ctrl, Alt, Meta)
			if (e.ctrlKey || e.altKey || e.metaKey) return;

			const textarea = e.currentTarget;
			const selectionStart = textarea.selectionStart;
			const selectionEnd = textarea.selectionEnd;

			// Only expand when there is no active text range selection
			if (selectionStart !== selectionEnd) return;

			const triggerKey = e.key === "Tab" ? "Tab" : "Space";

			const result: SnippetReplacementResult = engine.expandAtCursor({
				text: textarea.value,
				cursorPosition: selectionStart,
				triggerKey,
				appendSpaceOnSpaceTrigger: true,
				targetField,
			});

			if (result.changed && result.snippet) {
				e.preventDefault();
				e.stopPropagation();

				const nextText = result.nextText;
				const nextCaret = result.nextCursorPosition;

				// Update React state
				onChange(nextText);
				if (onCommit) {
					onCommit(nextText);
				}

				// Synchronously update DOM value and caret to prevent cursor jumping
				textarea.value = nextText;
				textarea.setSelectionRange(nextCaret, nextCaret);

				requestAnimationFrame(() => {
					if (textarea) {
						textarea.setSelectionRange(nextCaret, nextCaret);
					}
				});

				showToast(
					`⚡ Стенограмма: «${result.snippet.label}»`,
					"info",
					1800,
				);
			}
		},
		[enableStenographer, engine, onChange, onCommit, targetField],
	);

	/**
	 * 1-click chip insertion at caret position or appended to end
	 */
	const insertSnippet = React.useCallback(
		(snippet: ClinicalSnippet) => {
			const textarea = textareaRef?.current;
			const textToInsert = snippet.text;

			if (textarea) {
				const start = textarea.selectionStart ?? value.length;
				const end = textarea.selectionEnd ?? value.length;

				const before = value.slice(0, start);
				const after = value.slice(end);

				// Smart separator
				const needsLeadingSpace =
					before.length > 0 &&
					!before.endsWith(" ") &&
					!before.endsWith("\n");
				const needsTrailingSpace =
					after.length > 0 &&
					!after.startsWith(" ") &&
					!after.startsWith("\n");

				const formattedInsertion = `${needsLeadingSpace ? " " : ""}${textToInsert}${needsTrailingSpace ? " " : ""}`;
				const nextVal = before + formattedInsertion + after;
				const nextCaret = before.length + formattedInsertion.length;

				onChange(nextVal);
				if (onCommit) {
					onCommit(nextVal);
				}

				textarea.value = nextVal;
				textarea.focus();
				textarea.setSelectionRange(nextCaret, nextCaret);

				requestAnimationFrame(() => {
					if (textarea) {
						textarea.setSelectionRange(nextCaret, nextCaret);
					}
				});
			} else {
				// Fallback if textarea not focused
				const separator = value.trim() ? " " : "";
				const nextVal = value ? `${value}${separator}${textToInsert}` : textToInsert;
				onChange(nextVal);
				if (onCommit) {
					onCommit(nextVal);
				}
			}

			showToast(
				`Вставлен протокол: «${snippet.label}»`,
				"success",
				1800,
			);
		},
		[onChange, onCommit, textareaRef, value],
	);

	const applyInterim = React.useCallback(() => {
		const text = (liveInterim || rawInterim).trim();
		if (text) {
			insertVoiceText(text);
			void stopRecording();
		}
	}, [insertVoiceText, liveInterim, rawInterim, stopRecording]);

	return {
		engine,
		fieldSnippets,
		handleKeyDown,
		insertSnippet,
		// Voice dictation API
		isListening: enableVoice ? isListening : false,
		isProcessing: enableVoice ? isProcessing : false,
		interimSpeechText: liveInterim || rawInterim,
		toggleVoiceDictation: toggleRecording,
		startVoiceDictation: startRecording,
		stopVoiceDictation: stopRecording,
		applyInterim,
		lastVoiceResult,
		insertVoiceText,
	};
}
