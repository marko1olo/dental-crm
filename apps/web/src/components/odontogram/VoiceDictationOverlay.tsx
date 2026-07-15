import { Check, Mic, X } from "lucide-react";
import React, { useEffect, useState } from "react";

export function VoiceDictationOverlay({
	isOpen,
	onClose,
	onDictationSubmit,
}: {
	isOpen: boolean;
	onClose: () => void;
	onDictationSubmit: (text: string) => void;
}) {
	const [isListening, setIsListening] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [waves, setWaves] = useState<number[]>([20, 40, 60, 40, 20]);

	useEffect(() => {
		let recognition: any = null;
		let waveInterval: any = null;

		if (isOpen) {
			setTranscript("");
			setIsListening(true);

			waveInterval = setInterval(() => {
				setWaves(
					Array.from(
						{ length: 15 },
						() =>
							(Number(crypto.getRandomValues(new Uint32Array(1))[0]) /
								4294967295) *
								80 +
							20,
					),
				);
			}, 150);

			const SpeechRecognition =
				(window as any).SpeechRecognition ||
				(window as any).webkitSpeechRecognition;
			if (SpeechRecognition) {
				recognition = new SpeechRecognition();
				recognition.lang = "ru-RU";
				recognition.continuous = true;
				recognition.interimResults = true;

				recognition.onresult = (event: any) => {
					let currentTranscript = "";
					for (let i = event.resultIndex; i < event.results.length; ++i) {
						currentTranscript += event.results[i][0].transcript;
					}
					setTranscript((prev) => prev + currentTranscript);
				};

				recognition.onerror = (event: any) => {
					console.error("Speech recognition error", event.error);
					setIsListening(false);
				};

				recognition.onend = () => {
					setIsListening(false);
				};

				recognition.start();
			} else {
				// Fallback for browsers that don't support SpeechRecognition
				setTranscript(
					"Браузер не поддерживает распознавание речи. Используйте текстовый ввод.",
				);
				setIsListening(false);
			}
		}

		return () => {
			if (waveInterval) clearInterval(waveInterval);
			if (recognition) {
				recognition.stop();
			}
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100000,
				background: "rgba(0,0,0,0.7)",
				backdropFilter: "blur(12px)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<button
				onClick={onClose}
				style={{
					position: "absolute",
					top: 40,
					right: 40,
					background: "rgba(255,255,255,0.1)",
					border: "none",
					borderRadius: "50%",
					width: 48,
					height: 48,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					color: "#fff",
				}}
			>
				<X size={24} />
			</button>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					height: 100,
					marginBottom: 40,
				}}
			>
				{isListening ? (
					waves.map((h, i) => (
						<div
							key={i}
							style={{
								width: 8,
								height: h,
								background: "var(--primary-color, #a082ff)",
								borderRadius: 4,
								transition: "height 0.15s ease",
							}}
						/>
					))
				) : (
					<div
						style={{
							width: 8,
							height: 10,
							background: "#888",
							borderRadius: 4,
						}}
					/>
				)}
			</div>

			<div
				style={{
					position: "relative",
					width: 120,
					height: 120,
					borderRadius: "50%",
					background: isListening
						? "var(--primary-color, #a082ff)"
						: "rgba(255,255,255,0.1)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: isListening
						? "0 0 40px var(--primary-color, #a082ff)"
						: "none",
					transition: "all 0.3s",
					marginBottom: 32,
				}}
			>
				{isListening && (
					<div
						style={{
							position: "absolute",
							inset: -20,
							borderRadius: "50%",
							background: "var(--primary-color, #a082ff)",
							opacity: 0.3,
							animation: "pulse 1.5s infinite",
						}}
					/>
				)}
				<Mic size={48} color={isListening ? "#fff" : "#aaa"} />
			</div>

			<div style={{ maxWidth: 600, textAlign: "center" }}>
				<p
					style={{
						fontSize: 24,
						fontWeight: 500,
						color: "#fff",
						minHeight: 80,
						lineHeight: 1.4,
					}}
				>
					{transcript || (isListening ? "Говорите..." : "")}
				</p>
			</div>

			<div style={{ display: "flex", gap: 16, marginTop: 40 }}>
				{isListening && (
					<button
						onClick={() => setIsListening(false)}
						style={{
							padding: "16px 32px",
							borderRadius: 32,
							background: "rgba(255,255,255,0.1)",
							color: "#fff",
							border: "none",
							fontSize: 18,
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						Остановить запись
					</button>
				)}
				{!isListening && transcript && (
					<button
						onClick={() => onDictationSubmit(transcript)}
						style={{
							padding: "16px 32px",
							borderRadius: 32,
							background: "var(--primary-color, #a082ff)",
							color: "#fff",
							border: "none",
							fontSize: 18,
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: 12,
							cursor: "pointer",
						}}
					>
						<Check size={24} /> Подтвердить
					</button>
				)}
			</div>
		</div>
	);
}
