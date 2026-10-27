/**
 * useVoiceDictation.ts — Хук управления аудиопотоком, распознаванием и командами диктовки.
 * Строго <= 120 строк по Мандату 8b.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { UnifiedAudioClient } from "../../../services/voice/UnifiedAudioClient";
import { showToast } from "../../GlobalToast";
import { voiceDictationErrorText } from "../../odontogram/voiceDictationText";
import {
	type ClinicalVoiceParseResult,
	type ParsedClinicalVoiceCommand,
	parseClinicalVoiceSpeech,
} from "../voiceClinicalCommands";
import type { VoiceDictationAssistantModalProps } from "./voiceModalTypes";

export function useVoiceDictation(props: VoiceDictationAssistantModalProps) {
	const { isOpen, onClose, onApplyCommand, onApplyAllCommands, onApplySoapNote } = props;
	const [isListening, setIsListening] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [interimText, setInterimText] = useState("");
	const [finalText, setFinalText] = useState("");
	const [manualInput, setManualInput] = useState("");
	const [audioVolume, setAudioVolume] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [parseResult, setParseResult] = useState<ClinicalVoiceParseResult | null>(null);
	const [appliedCommandIds, setAppliedCommandIds] = useState<Set<string>>(new Set());
	const clientRef = useRef<UnifiedAudioClient | null>(null);

	const cleanupAudio = useCallback(() => {
		if (clientRef.current) {
			clientRef.current.dispose();
			clientRef.current = null;
		}
		setIsListening(false);
		setIsProcessing(false);
		setInterimText("");
		setAudioVolume(0);
	}, []);

	useEffect(() => {
		if (!isOpen) cleanupAudio();
		return () => {
			cleanupAudio();
		};
	}, [isOpen, cleanupAudio]);

	const handleStartListening = async () => {
		setErrorMessage(null);
		setIsProcessing(true);
		setInterimText("");
		try {
			cleanupAudio();
			const client = new UnifiedAudioClient({ preferredMode: "gemini_live", specialty: "therapy", autoFallback: true });
			clientRef.current = client;
			client.subscribe({
				onStateChange: (state) => {
					setIsListening(state === "listening" || state === "connecting");
					if (state === "idle" || state === "error") setIsProcessing(false);
				},
				onInterimText: (interim) => setInterimText(interim),
				onFinalText: (_final, accumulated) => {
					const text = (accumulated || _final).trim();
					setFinalText(text); setTranscript(text); setInterimText("");
					setParseResult(parseClinicalVoiceSpeech(text));
				},
				onTwoLayerTranscript: (data) => {
					setInterimText(data.interim); setFinalText(data.finalized);
					const full = (data.fullWithInterim || data.finalized).trim();
					setTranscript(full); setParseResult(parseClinicalVoiceSpeech(full));
				},
				onRmsUpdate: (rms) => setAudioVolume(Math.min(100, Math.round(rms * 250))),
				onError: (err) => { setErrorMessage(typeof err === "string" ? err : err.message); cleanupAudio(); },
			});
			await client.start();
			setIsListening(true); setIsProcessing(false);
		} catch (err: unknown) {
			setErrorMessage(voiceDictationErrorText(err));
			cleanupAudio(); setIsProcessing(false);
		}
	};

	const handleToggleListening = () => { if (isListening) cleanupAudio(); else void handleStartListening(); };

	const handleApplyManualText = (textToApply: string) => {
		const trimmed = textToApply.trim();
		if (!trimmed) { showToast("Введите текст клинической команды для распознавания", "warning"); return; }
		setTranscript(trimmed); setParseResult(parseClinicalVoiceSpeech(trimmed)); setManualInput("");
	};

	const handleApplySingleCommand = (cmd: ParsedClinicalVoiceCommand) => {
		onApplyCommand?.(cmd); setAppliedCommandIds((prev) => new Set(prev).add(cmd.id));
	};

	const handleDeleteCommand = (cmdId: string) => {
		if (!parseResult) return;
		setParseResult({ ...parseResult, commands: parseResult.commands.filter((c) => c.id !== cmdId) });
	};

	const handleClearTranscript = () => {
		setTranscript(""); setFinalText(""); setInterimText(""); setParseResult(null); setAppliedCommandIds(new Set());
	};

	const handleApplyAll = () => {
		const rawText = (transcript || finalText || manualInput).trim();
		if ((!parseResult || parseResult.commands.length === 0) && !rawText) {
			showToast("Произнесите диагноз или статус зуба в микрофон или выберите клинический шаблон ниже", "info");
			return;
		}
		if (parseResult?.commands.length) {
			onApplyAllCommands?.(parseResult.commands);
			for (const cmd of parseResult.commands) setAppliedCommandIds((prev) => new Set(prev).add(cmd.id));
		}
		if (parseResult?.soapNote && Object.keys(parseResult.soapNote).length > 0 && onApplySoapNote) {
			onApplySoapNote(parseResult.soapNote);
		} else if (rawText && onApplySoapNote) {
			// Соло-врач (1 кресло): свободная диктовка дневника визита 043/у без бюрократических барьеров
			onApplySoapNote({ plan: rawText });
		}
		showToast("Клиническая запись и команды применены", "success");
		onClose();
	};

	return {
		isListening, isProcessing, transcript, interimText, finalText, manualInput, setManualInput,
		audioVolume, errorMessage, parseResult, appliedCommandIds, handleToggleListening,
		handleApplyManualText, handleApplySingleCommand, handleDeleteCommand, handleClearTranscript, handleApplyAll,
	};
}
