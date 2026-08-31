import { Check, Mic, MicOff, Sparkles, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { useAudioFeedback } from "../../hooks/useAudioFeedback";
import { parseDentalVoiceSpeech } from "../../services/voice/dentalGrammarParser";

export function VoiceDictationOverlay({
	isOpen,
	onClose,
	onDictationSubmit,
}: {
	isOpen: boolean;
	onClose: () => void;
	onDictationSubmit: (text: string) => void;
}) {
	const {
		isRecording,
		audioLevel,
		interimText,
		fullTranscript,
		startDictation,
		stopDictation,
		clearTranscript,
		error,
	} = useUnifiedDictation({
		preferredMode: "gemini_live",
		context: "visit",
		specialty: "therapy",
		autoFallback: true,
	});

	const [liveIntentSummary, setLiveIntentSummary] = useState<string | null>(null);
	const prevParsedCountRef = useRef(0);
	const { playActionSuccess, playSpeechCaptured } = useAudioFeedback();

	useEffect(() => {
		if (isOpen) {
			clearTranscript();
			setLiveIntentSummary(null);
			prevParsedCountRef.current = 0;
			void startDictation("gemini_live");
		} else {
			if (isRecording) {
				void stopDictation();
			}
		}
	}, [isOpen, startDictation, stopDictation, clearTranscript]);

	// Live parse intent for preview feedback
	useEffect(() => {
		const fullText = (fullTranscript + " " + interimText).trim();
		if (fullText) {
			const intent = parseDentalVoiceSpeech(fullText);
			if (intent.teethUpdates.length > 0) {
				const chips = intent.teethUpdates
					.map((t) => `Зуб ${t.toothNumber}: ${t.state}`)
					.join(", ");
				setLiveIntentSummary(chips);
				if (intent.teethUpdates.length > prevParsedCountRef.current) {
					prevParsedCountRef.current = intent.teethUpdates.length;
					void playSpeechCaptured();
				}
			} else {
				setLiveIntentSummary(null);
			}
		} else {
			setLiveIntentSummary(null);
			prevParsedCountRef.current = 0;
		}
	}, [fullTranscript, interimText, playSpeechCaptured]);

	if (!isOpen) return null;

	const handleStop = async () => {
		const res = await stopDictation();
		if (res && res.trim()) {
			onDictationSubmit(res.trim());
		}
	};

	const handleConfirm = () => {
		const finalVal = (fullTranscript + " " + interimText).trim();
		if (finalVal) {
			void playActionSuccess();
			onDictationSubmit(finalVal);
		}
		onClose();
	};

	const displayText = fullTranscript.trim();
	const interim = interimText.trim();

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100000,
				background: "rgba(0,0,0,0.75)",
				backdropFilter: "blur(14px)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
				boxSizing: "border-box",
			}}
			data-testid="voice-dictation-overlay"
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Закрыть голосовую надиктовку ДЕНТА"
				style={{
					position: "absolute",
					top: 24,
					right: 24,
					background: "rgba(255,255,255,0.12)",
					border: "1px solid rgba(255,255,255,0.2)",
					borderRadius: "50%",
					width: 48,
					height: 48,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					color: "#ffffff",
					transition: "all 0.2s ease",
				}}
			>
				<X size={22} />
			</button>

			{/* Real Live VU Equalizer Waveform */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 6,
					height: 72,
					marginBottom: 24,
				}}
				aria-label="Аудио индикатор"
			>
				{[0.3, 0.6, 1.1, 1.7, 2.0, 1.6, 1.2, 0.7, 0.4].map((mult, idx) => {
					const barHeight = isRecording
						? Math.max(6, Math.min(68, 6 + audioLevel * mult * 60))
						: 6;
					return (
						<div
							key={idx}
							style={{
								width: 6,
								height: `${barHeight}px`,
								background: isRecording ? "var(--teal, #0d9488)" : "#666",
								borderRadius: 3,
								transition: "height 0.08s cubic-bezier(0.2, 0.8, 0.4, 1)",
							}}
						/>
					);
				})}
			</div>

			{/* Central Mic Pulse Orb */}
			<div
				style={{
					position: "relative",
					width: 100,
					height: 100,
					borderRadius: "50%",
					background: isRecording
						? "var(--teal, #0d9488)"
						: "rgba(255,255,255,0.12)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: isRecording
						? "0 0 32px var(--teal-glow, rgba(13, 148, 136, 0.45))"
						: "none",
					border: isRecording ? "3px solid #ffffff" : "3px solid transparent",
					transition: "all 0.3s ease",
					marginBottom: 24,
				}}
			>
				{isRecording && (
					<div
						style={{
							position: "absolute",
							inset: -10,
							borderRadius: "50%",
							border: "2px solid var(--teal, #0d9488)",
							opacity: 0.5,
							animation: "copilot-pulse-mic 1.5s infinite",
						}}
					/>
				)}
				{isRecording ? (
					<Mic size={40} color="#ffffff" />
				) : (
					<MicOff size={40} color="#aaaaaa" />
				)}
			</div>

			{/* Two-Layer Streaming Text Area */}
			<div
				style={{
					maxWidth: 680,
					width: "100%",
					textAlign: "center",
					minHeight: 90,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
				}}
			>
				<p
					style={{
						fontSize: 22,
						fontWeight: 500,
						color: "#ffffff",
						lineHeight: 1.4,
						margin: 0,
						wordBreak: "break-word",
					}}
				>
					{displayText ? (
						<span>
							{displayText}
							{interim && (
								<span
									style={{
										color: "var(--teal-soft, #5eead4)",
										fontStyle: "italic",
										fontWeight: 600,
										marginLeft: 6,
									}}
								>
									{interim}
								</span>
							)}
						</span>
					) : interim ? (
						<span
							style={{
								color: "var(--teal-soft, #5eead4)",
								fontStyle: "italic",
								fontWeight: 600,
							}}
						>
							{interim}
						</span>
					) : isRecording ? (
						<span style={{ color: "rgba(255,255,255,0.6)" }}>
							Слушаю... ДЕНТА распознает команды зубной формулы ("36 кариес", "47 пульпит")...
						</span>
					) : (
						<span style={{ color: "rgba(255,255,255,0.4)" }}>
							Запись остановлена
						</span>
					)}
				</p>

				{/* Live Dental Intent Chip Feedback */}
				{liveIntentSummary && (
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							padding: "4px 12px",
							borderRadius: 20,
							background: "rgba(13, 148, 136, 0.25)",
							border: "1px solid var(--teal, #0d9488)",
							color: "var(--teal-soft, #5eead4)",
							fontSize: 13,
							fontWeight: 600,
							marginTop: 4,
						}}
					>
						<Sparkles size={14} />
						<span>ДЕНТА распознала: {liveIntentSummary}</span>
					</div>
				)}

				{error && (
					<p
						role="alert"
						style={{
							fontSize: 14,
							lineHeight: 1.4,
							color: "#fca5a5",
							maxWidth: 520,
							margin: "4px 0 0 0",
						}}
					>
						{error}
					</p>
				)}
			</div>

			{/* Actions Bar */}
			<div style={{ display: "flex", gap: 14, marginTop: 32 }}>
				{isRecording ? (
					<button
						type="button"
						onClick={handleStop}
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "12px 28px",
							borderRadius: 24,
							background: "rgba(255,255,255,0.15)",
							color: "#ffffff",
							border: "1px solid rgba(255,255,255,0.25)",
							fontSize: 16,
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 8,
							transition: "all 0.15s ease",
						}}
					>
						<MicOff size={18} />
						<span>Остановить</span>
					</button>
				) : (
					<button
						type="button"
						onClick={() => void startDictation("gemini_live")}
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "12px 28px",
							borderRadius: 24,
							background: "rgba(255,255,255,0.15)",
							color: "#ffffff",
							border: "1px solid rgba(255,255,255,0.25)",
							fontSize: 16,
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 8,
						}}
					>
						<Mic size={18} />
						<span>Продолжить запись</span>
					</button>
				)}

				{(displayText || interim) && (
					<button
						type="button"
						onClick={handleConfirm}
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "12px 28px",
							borderRadius: 24,
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							fontSize: 16,
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 8,
							cursor: "pointer",
							boxShadow: "0 2px 10px rgba(13, 148, 136, 0.4)",
						}}
					>
						<Check size={20} />
						<span>Применить</span>
					</button>
				)}
			</div>
		</div>
	);
}
