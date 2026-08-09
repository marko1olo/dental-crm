import { Check, Mic, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	VOICE_DICTATION_UNSUPPORTED_TEXT,
	voiceDictationErrorText,
} from "./voiceDictationText";

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
	/*
	 * Почему распознавания нет — отдельно от распознанного текста.
	 *
	 * БЫЛО: сообщение «Браузер не поддерживает распознавание речи» записывалось
	 * в transcript, то есть в речь пациента. Кнопка «Подтвердить» появляется по
	 * непустому transcript, поэтому она появлялась и здесь — и эту фразу можно
	 * было отправить на разбор как содержание приёма.
	 */
	const [problem, setProblem] = useState<string | null>(null);
	/*
	 * Живой объект распознавания. БЫЛО: он был локальной переменной внутри
	 * эффекта, поэтому кнопка «Остановить запись» до него не доставала и делала
	 * только setIsListening(false) — микрофон продолжал слушать кабинет, а
	 * onresult продолжал дописывать текст, который врач уже считал итоговым.
	 */
	const recognitionRef = useRef<{ stop: () => void } | null>(null);

	/** Остановить распознавание по-настоящему, а не только погасить полоски. */
	const stopListening = () => {
		const recognition = recognitionRef.current;
		recognitionRef.current = null;
		if (recognition) {
			try {
				recognition.stop();
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				// Остановка уже остановленного распознавания бросает исключение в
				// части браузеров. Человеку это не ошибка: запись и так не идёт.
				logger.error("[диктовка] остановка распознавания", err);
			}
		}
		setIsListening(false);
	};

	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		let recognition: any = null;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		let waveInterval: any = null;

		if (isOpen) {
			setTranscript("");
			setProblem(null);
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
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(window as any).SpeechRecognition ||
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(window as any).webkitSpeechRecognition;
			if (SpeechRecognition) {
				recognition = new SpeechRecognition();
				recognition.lang = "ru-RU";
				recognition.continuous = true;
				recognition.interimResults = true;

				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				recognition.onresult = (event: any) => {
					let currentTranscript = "";
					for (let i = event.resultIndex; i < event.results.length; ++i) {
						currentTranscript += event.results[i][0].transcript;
					}
					setTranscript((prev) => prev + currentTranscript);
				};

				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				recognition.onerror = (event: any) => {
					// Код ошибки английский и остаётся в консоли; врачу идёт причина
					// словами и следующий шаг.
					logger.error("[диктовка] распознавание речи", event?.error);
					setProblem(voiceDictationErrorText(event?.error));
					setIsListening(false);
				};

				recognition.onend = () => {
					setIsListening(false);
				};

				recognitionRef.current = recognition;
				recognition.start();
			} else {
				// Браузер без распознавания речи: причина в отдельном состоянии, а не
				// в тексте распознанного.
				setProblem(VOICE_DICTATION_UNSUPPORTED_TEXT);
				setIsListening(false);
			}
		}

		return () => {
			if (waveInterval) clearInterval(waveInterval);
			recognitionRef.current = null;
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
				type="button"
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
					waves
						.map((h, barIndex) => ({ barId: `wave-bar-${barIndex}`, h }))
						.map(({ barId, h }) => (
							<div
								key={barId}
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
				{/* Причина, по которой диктовать не выходит. БЫЛО: замершее окно без
				    слов и без кнопок — врач не знал ни что случилось, ни что делать. */}
				{problem !== null && (
					<p
						role="alert"
						style={{
							fontSize: 16,
							lineHeight: 1.5,
							color: "#ffd7a3",
							maxWidth: 520,
							margin: "0 auto",
						}}
					>
						{problem}
					</p>
				)}
			</div>

			<div style={{ display: "flex", gap: 16, marginTop: 40 }}>
				{isListening && (
					<button
						type="button"
						/* БЫЛО: только setIsListening(false) — полоски гасли, а микрофон
						   продолжал слушать кабинет и дописывать текст. */
						onClick={stopListening}
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
						type="button"
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
