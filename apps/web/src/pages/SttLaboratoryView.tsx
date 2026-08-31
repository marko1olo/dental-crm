import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Activity,
	Check,
	Copy,
	Download,
	Globe,
	Languages,
	Mic,
	MicOff,
	Play,
	Radio,
	RefreshCw,
	Sparkles,
	Volume2,
	Zap,
} from "lucide-react";
import "./SttLaboratoryView.css";

export type SttLabMode =
	| "gemini_live"
	| "gemini_batch"
	| "gemini_translate"
	| "groq_whisper"
	| "browser_speech";

interface MedicalEntity {
	term: string;
	category: "fdi_tooth" | "diagnosis" | "material" | "anesthesia" | "surgery" | "instrument" | "imaging";
	index: number;
	length: number;
}

interface TelemetryState {
	latencyMs: number;
	bytesTransferred: number;
	estimatedTokens: number;
	wpm: number;
	keyId: string;
	noiseLevelDb: number;
	activeVad: boolean;
	connectedWs: boolean;
}

const MODES_CONFIG: Array<{
	id: SttLabMode;
	title: string;
	badge: string;
	desc: string;
	icon: React.ComponentType<{ className?: string }>;
}> = [
	{
		id: "gemini_live",
		title: "Gemini 3.5 Transcribe Live",
		badge: "WebSocket Bidi",
		desc: "Потоковое распознавание в реальном времени с двунаправленным обменом аудио и текста",
		icon: Radio,
	},
	{
		id: "gemini_batch",
		title: "Gemini 3.5 Batch Transcribe",
		badge: "Diarization + Words",
		desc: "Пакетная транскрибация с разделением ролей (Врач / Пациент) и таймстемпами слов",
		icon: Sparkles,
	},
	{
		id: "gemini_translate",
		title: "Gemini 3.5 Live Translate",
		badge: "Audio-to-Audio",
		desc: "Синхронный медицинский перевод речи на лету с сохранением терминологии",
		icon: Globe,
	},
	{
		id: "groq_whisper",
		title: "Groq Whisper Large-v3",
		badge: "Fast Chunks",
		desc: "Сверхбыстрое распознавание аудиочанков через LPU Inference с ультра-низким latency",
		icon: Zap,
	},
	{
		id: "browser_speech",
		title: "Browser Web Speech API",
		badge: "Native Client",
		desc: "Встроенный речевой движок браузера, работает полностью на клиенте без ключей",
		icon: Languages,
	},
];

const CLINICAL_TEST_PHRASES = [
	"Пациент обратился с острой болью в области зуба 46. На КЛКТ обнаружен глубокий пульпит. Выполнена анестезия ультракаин, наложен коффердам, обработаны каналы.",
	"Проведен осмотр зуба 21. Наблюдается скол эмали. Рекомендована установка керамического винира E-max.",
	"Выполнена операция дентальной имплантации в области зуба 36. Использован апекслокатор и формирователь десны. Назначен хлоргексидин.",
	"Зуб 16: периодонтит, рецидивирующий кариес. Наложена пломба из фотополимера и гуттаперчи.",
];

export const SttLaboratoryView: React.FC = () => {
	const [activeMode, setActiveMode] = useState<SttLabMode>("gemini_live");
	const [isRecording, setIsRecording] = useState(false);
	const [finalTranscript, setFinalTranscript] = useState("");
	const [interimTranscript, setInterimTranscript] = useState("");
	const [translatedText, setTranslatedText] = useState("");
	const [medicalEntities, setMedicalEntities] = useState<MedicalEntity[]>([]);
	const [copied, setCopied] = useState(false);

	const [telemetry, setTelemetry] = useState<TelemetryState>({
		latencyMs: 24,
		bytesTransferred: 0,
		estimatedTokens: 0,
		wpm: 0,
		keyId: "gsk_...3a9f",
		noiseLevelDb: -72,
		activeVad: false,
		connectedWs: false,
	});

	// Audio & Canvas Refs
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const animFrameIdRef = useRef<number | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Web Speech API instance
	const recognitionRef = useRef<any>(null);
	const recordingStartTimeRef = useRef<number>(0);

	// Гарантированная очистка ресурсов при размонтировании
	useEffect(() => {
		return () => {
			if (animFrameIdRef.current) {
				cancelAnimationFrame(animFrameIdRef.current);
				animFrameIdRef.current = null;
			}
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
				try {
					mediaRecorderRef.current.stop();
				} catch {
					// ignore
				}
				mediaRecorderRef.current = null;
			}
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
				mediaStreamRef.current = null;
			}
			if (audioContextRef.current) {
				void audioContextRef.current.close();
				audioContextRef.current = null;
			}
			if (recognitionRef.current) {
				try {
					recognitionRef.current.stop();
				} catch {
					// ignore
				}
				recognitionRef.current = null;
			}
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, []);

	// Извлечение медицинских сущностей на клиенте
	const detectEntities = useCallback((text: string) => {
		const entities: MedicalEntity[] = [];
		const lower = text.toLowerCase();

		// FDI зубы
		const fdiRegex = /\b(?:зуб[а-я]*\s+)?([1-4][1-8]|[5-8][1-5])\b|\bзуб[а-я]*\s+([1-4]\.[1-8]|[5-8]\.[1-5])\b/gi;
		let match: RegExpExecArray | null = null;
		while (true) {
			match = fdiRegex.exec(text);
			if (!match) break;
			entities.push({
				term: match[0],
				category: "fdi_tooth",
				index: match.index,
				length: match[0].length,
			});
		}

		// Стоматологические термины
		const dictionary: Array<{ term: string; category: MedicalEntity["category"] }> = [
			{ term: "пульпит", category: "diagnosis" },
			{ term: "кариес", category: "diagnosis" },
			{ term: "периодонтит", category: "diagnosis" },
			{ term: "гингивит", category: "diagnosis" },
			{ term: "коффердам", category: "material" },
			{ term: "винир", category: "material" },
			{ term: "виниры", category: "material" },
			{ term: "e-max", category: "material" },
			{ term: "emax", category: "material" },
			{ term: "диоксид циркония", category: "material" },
			{ term: "гуттаперча", category: "material" },
			{ term: "фотополимер", category: "material" },
			{ term: "ультракаин", category: "anesthesia" },
			{ term: "септонест", category: "anesthesia" },
			{ term: "скандонест", category: "anesthesia" },
			{ term: "анестезия", category: "anesthesia" },
			{ term: "имплант", category: "surgery" },
			{ term: "имплантат", category: "surgery" },
			{ term: "апекслокатор", category: "instrument" },
			{ term: "клкт", category: "imaging" },
			{ term: "оптг", category: "imaging" },
		];

		for (const item of dictionary) {
			let idx = 0;
			while (idx < lower.length) {
				const found = lower.indexOf(item.term, idx);
				if (found === -1) break;
				const overlaps = entities.some(
					(e) => (found >= e.index && found < e.index + e.length) ||
						(found + item.term.length > e.index && found + item.term.length <= e.index + e.length)
				);
				if (!overlaps) {
					entities.push({
						term: text.slice(found, found + item.term.length),
						category: item.category,
						index: found,
						length: item.term.length,
					});
				}
				idx = found + item.term.length;
			}
		}

		setMedicalEntities(entities.sort((a, b) => a.index - b.index));
	}, []);

	// Подключение WebSocket к бэкенду лаборатории
	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/api/v1/speech/lab-session`;

		try {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				setTelemetry((prev) => ({ ...prev, connectedWs: true }));
				ws.send(JSON.stringify({ type: "config", mode: activeMode }));
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === "session_ready") {
						setTelemetry((prev) => ({
							...prev,
							keyId: data.keyFingerprint || prev.keyId,
						}));
					} else if (data.type === "transcript_interim") {
						setInterimTranscript(data.text || "");
						setTelemetry((prev) => ({
							...prev,
							latencyMs: data.latencyMs || prev.latencyMs,
							bytesTransferred: data.bytes || prev.bytesTransferred,
							estimatedTokens: data.tokens || prev.estimatedTokens,
							wpm: data.wpm || prev.wpm,
						}));
					} else if (data.type === "transcript_final") {
						setFinalTranscript((prev) => `${prev} ${data.text}`.trim());
						setInterimTranscript("");
						if (data.translatedText) {
							setTranslatedText(data.translatedText);
						}
						setTelemetry((prev) => ({
							...prev,
							latencyMs: data.latencyMs || prev.latencyMs,
							bytesTransferred: data.bytes || prev.bytesTransferred,
							estimatedTokens: data.tokens || prev.estimatedTokens,
							wpm: data.wpm || prev.wpm,
						}));
					} else if (data.type === "telemetry") {
						setTelemetry((prev) => ({
							...prev,
							noiseLevelDb: data.noiseLevelDb ?? prev.noiseLevelDb,
							activeVad: Boolean(data.activeVAD),
							latencyMs: data.latencyMs ?? prev.latencyMs,
						}));
					}
				} catch {
					// Игнорируем не-JSON сообщения
				}
			};

			ws.onclose = () => {
				setTelemetry((prev) => ({ ...prev, connectedWs: false }));
			};

			ws.onerror = () => {
				setTelemetry((prev) => ({ ...prev, connectedWs: false }));
			};
		} catch {
			// Локальный режим без WS сервера
		}

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [activeMode]);

	// Обновление сущностей при изменении текста
	useEffect(() => {
		const fullText = `${finalTranscript} ${interimTranscript}`.trim();
		detectEntities(fullText);
	}, [finalTranscript, interimTranscript, detectEntities]);

	// Отрисовка Waveform на Canvas (60 FPS)
	const drawWaveform = useCallback(() => {
		const canvas = canvasRef.current;
		const analyser = analyserRef.current;
		if (!canvas || !analyser) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const bufferLength = analyser.fftSize;
		const dataArray = new Uint8Array(bufferLength);
		analyser.getByteTimeDomainData(dataArray);

		// Вычисляем RMS и VAD
		let sumSquares = 0;
		for (let i = 0; i < bufferLength; i++) {
			const rawVal = dataArray[i] ?? 128;
			const norm = (rawVal - 128) / 128;
			sumSquares += norm * norm;
		}
		const rms = Math.sqrt(sumSquares / bufferLength);
		const db = rms > 0.0001 ? Math.max(-90, Math.min(0, Math.round(20 * Math.log10(rms)))) : -90;
		const isVoice = db > -42;

		setTelemetry((prev) => ({
			...prev,
			noiseLevelDb: db,
			activeVad: isVoice,
		}));

		// Очистка Canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Фон сетки
		ctx.fillStyle = "rgba(13, 148, 136, 0.03)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Центральная линия
		ctx.strokeStyle = "rgba(13, 148, 136, 0.15)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, canvas.height / 2);
		ctx.lineTo(canvas.width, canvas.height / 2);
		ctx.stroke();

		// Отрисовка волны
		ctx.lineWidth = 2.5;
		ctx.strokeStyle = isVoice ? "#0d9488" : "rgba(107, 114, 128, 0.5)";
		ctx.beginPath();

		const sliceWidth = (canvas.width * 1.0) / bufferLength;
		let x = 0;

		for (let i = 0; i < bufferLength; i++) {
			const rawVal = dataArray[i] ?? 128;
			const v = rawVal / 128.0;
			const y = (v * canvas.height) / 2;

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		ctx.lineTo(canvas.width, canvas.height / 2);
		ctx.stroke();

		animFrameIdRef.current = requestAnimationFrame(drawWaveform);
	}, []);

	// Старт записи с микрофона
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
			mediaStreamRef.current = stream;

			const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			const audioCtx = new AudioCtx();
			audioContextRef.current = audioCtx;

			const source = audioCtx.createMediaStreamSource(stream);
			const analyser = audioCtx.createAnalyser();
			analyser.fftSize = 512;
			source.connect(analyser);
			analyserRef.current = analyser;

			recordingStartTimeRef.current = Date.now();
			setIsRecording(true);

			// Старт 60fps анимации
			drawWaveform();

			// Если выбран режим Web Speech API
			if (activeMode === "browser_speech" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
				// biome-ignore lint/suspicious/noExplicitAny: window SpeechRecognition check
				const win = window as any;
				const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
				if (SpeechRec) {
					const recognition: any = new SpeechRec();
					recognition.continuous = true;
					recognition.interimResults = true;
					recognition.lang = "ru-RU";

					recognition.onresult = (event: any) => {
						let interim = "";
						let final = "";

						for (let i = event.resultIndex; i < event.results.length; ++i) {
							const res = event.results[i];
							if (res && res[0] && res[0].transcript) {
								if (res.isFinal) {
									final += res[0].transcript;
								} else {
									interim += res[0].transcript;
								}
							}
						}

						if (final) {
							setFinalTranscript((prev) => `${prev} ${final}`.trim());
						}
						setInterimTranscript(interim);

						const elapsedSec = (Date.now() - recordingStartTimeRef.current) / 1000;
						const words = (finalTranscript + " " + final).trim().split(/\s+/).filter(Boolean).length;
						const wpm = elapsedSec > 0 ? Math.round((words / elapsedSec) * 60) : 0;

						setTelemetry((prev) => ({
							...prev,
							latencyMs: 16,
							wpm,
							estimatedTokens: Math.ceil((finalTranscript.length + interim.length) / 4),
						}));
					};

					recognition.start();
					recognitionRef.current = recognition;
				}
			} else if (typeof MediaRecorder !== "undefined") {
				try {
					const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
						? "audio/webm;codecs=opus"
						: "audio/webm";
					const recorder = new MediaRecorder(stream, { mimeType });
					recorder.ondataavailable = async (event) => {
						if (event.data && event.data.size > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
							const arrayBuf = await event.data.arrayBuffer();
							const bytes = new Uint8Array(arrayBuf);
							let binary = "";
							for (const byte of bytes) {
								binary += String.fromCharCode(byte);
							}
							const base64 = btoa(binary);
							wsRef.current.send(
								JSON.stringify({
									type: "audio_chunk",
									data: base64,
									mimeType,
									isFinal: true,
								})
							);
						}
					};
					recorder.start(1000);
					mediaRecorderRef.current = recorder;
				} catch (recErr) {
					console.warn("MediaRecorder initialization fallback:", recErr);
				}
			}
		} catch (err) {
			console.error("Ошибка доступа к микрофону:", err);
		}
	};

	// Остановка записи
	const stopRecording = () => {
		setIsRecording(false);

		if (animFrameIdRef.current) {
			cancelAnimationFrame(animFrameIdRef.current);
			animFrameIdRef.current = null;
		}

		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			try {
				mediaRecorderRef.current.stop();
			} catch {
				// ignore
			}
			mediaRecorderRef.current = null;
		}

		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}

		if (audioContextRef.current) {
			void audioContextRef.current.close();
			audioContextRef.current = null;
		}

		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// ignore
			}
			recognitionRef.current = null;
		}
	};

	// Впрыск тестовой клинической фразы
	const injectTestPhrase = () => {
		const phrase = CLINICAL_TEST_PHRASES[Math.floor(Math.random() * CLINICAL_TEST_PHRASES.length)] ?? CLINICAL_TEST_PHRASES[0] ?? "";
		setFinalTranscript((prev: string) => (prev ? `${prev} ${phrase}` : phrase));
		setInterimTranscript("");
		if (activeMode === "gemini_translate") {
			setTranslatedText("Patient examined: Acute pulpitis of tooth 46 diagnosed. Ultracain anesthesia and cofferdam applied.");
		}
		setTelemetry((prev) => ({
			...prev,
			latencyMs: Math.round(18 + Math.random() * 20),
			bytesTransferred: prev.bytesTransferred + phrase.length * 2,
			estimatedTokens: prev.estimatedTokens + Math.ceil(phrase.length / 4),
			wpm: 125,
		}));
	};

	// Очистить транскрипт
	const clearTranscript = () => {
		setFinalTranscript("");
		setInterimTranscript("");
		setTranslatedText("");
		setMedicalEntities([]);
		setTelemetry((prev) => ({
			...prev,
			bytesTransferred: 0,
			estimatedTokens: 0,
			wpm: 0,
		}));
	};

	// Скопировать в буфер
	const copyTranscript = async () => {
		const textToCopy = finalTranscript || interimTranscript;
		if (!textToCopy) return;
		try {
			await navigator.clipboard.writeText(textToCopy);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Ошибка копирования:", err);
		}
	};

	// Экспорт JSON с разметкой
	const exportJson = () => {
		const data = {
			timestamp: new Date().toISOString(),
			mode: activeMode,
			transcript: finalTranscript,
			interim: interimTranscript,
			translatedText: activeMode === "gemini_translate" ? translatedText : undefined,
			medicalEntities,
			telemetry,
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `stt-lab-export-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Рендер размеченного текста с цветными сущностями
	const renderHighlightedText = () => {
		const text = finalTranscript;
		if (!text && !interimTranscript) {
			return <span className="stt-text-interim">Нажмите «Начать запись» или «Тестовая фраза» для запуска распознавания...</span>;
		}

		if (medicalEntities.length === 0) {
			return (
				<>
					<span className="stt-text-final">{text}</span>
					{interimTranscript && <span className="stt-text-interim"> {interimTranscript}</span>}
				</>
			);
		}

		const parts: React.ReactNode[] = [];
		let lastIndex = 0;

		medicalEntities.forEach((entity, idx) => {
			if (entity.index > lastIndex) {
				parts.push(
					<span key={`txt_${lastIndex}`} className="stt-text-final">
						{text.slice(lastIndex, entity.index)}
					</span>
				);
			}

			let entityClass = "stt-entity-highlight";
			if (entity.category === "fdi_tooth") entityClass += " stt-entity-fdi";
			if (entity.category === "anesthesia") entityClass += " stt-entity-anesthesia";

			parts.push(
				<span
					key={`ent_${idx}`}
					className={entityClass}
					title={`Категория: ${entity.category}`}
				>
					{text.slice(entity.index, entity.index + entity.length)}
				</span>
			);
			lastIndex = entity.index + entity.length;
		});

		if (lastIndex < text.length) {
			parts.push(
				<span key={`txt_end`} className="stt-text-final">
					{text.slice(lastIndex)}
				</span>
			);
		}

		return (
			<>
				{parts}
				{interimTranscript && <span className="stt-text-interim"> {interimTranscript}</span>}
			</>
		);
	};

	return (
		<div className="stt-lab-root">
			{/* Top Header */}
			<header className="stt-lab-header">
				<div className="stt-lab-title-group">
					<Radio className="w-6 h-6 text-teal-600 dark:text-teal-400" />
					<div>
						<div className="flex items-center gap-2">
							<h1 className="stt-lab-title">STT Laboratory & Playground</h1>
							<span className="stt-lab-badge">Standalone Testing Lab</span>
						</div>
						<p className="stt-lab-subtitle">
							Тестирование потокового распознавания речи, VAD, медицинской терминологии и синхронного перевода
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
						<span
							className={`w-2.5 h-2.5 rounded-full ${
								telemetry.connectedWs ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
							}`}
						/>
						{telemetry.connectedWs ? "WS Подключен" : "Локальный клиент"}
					</div>
				</div>
			</header>

			{/* Mode Switcher Grid */}
			<div className="stt-lab-mode-grid">
				{MODES_CONFIG.map((m) => {
					const Icon = m.icon;
					const isActive = activeMode === m.id;
					return (
						<button
							key={m.id}
							type="button"
							className={`stt-lab-mode-card ${isActive ? "active" : ""}`}
							onClick={() => setActiveMode(m.id)}
						>
							<div className="stt-lab-mode-header">
								<div className="stt-lab-mode-title">
									<Icon className="w-4 h-4" />
									<span>{m.title}</span>
								</div>
								<span className="stt-lab-mode-pill">{m.badge}</span>
							</div>
							<p className="stt-lab-mode-desc">{m.desc}</p>
						</button>
					);
				})}
			</div>

			{/* Waveform & Meter Visualizer */}
			<div className="stt-lab-visualizer-container">
				<div className="stt-lab-visualizer-header">
					<div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
						<Activity className="w-4 h-4 text-teal-600" />
						<span>Canvas Waveform (60 FPS) & VAD Индикатор</span>
					</div>

					<div className="stt-lab-meter-bar">
						<div className={`stt-lab-vad-badge ${telemetry.activeVad ? "active" : ""}`}>
							<Volume2 className="w-3.5 h-3.5" />
							<span>{telemetry.activeVad ? "VAD: ГОЛОС ОБНАРУЖЕН" : "VAD: ТИШИНА"}</span>
						</div>

						<div className="stt-lab-db-gauge">
							<span>{telemetry.noiseLevelDb} dB</span>
							<div className="stt-lab-db-track">
								<div
									className="stt-lab-db-fill"
									style={{
										width: `${Math.min(100, Math.max(0, ((telemetry.noiseLevelDb + 90) / 90) * 100))}%`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="stt-lab-canvas-wrapper">
					<canvas ref={canvasRef} width={800} height={120} className="stt-lab-canvas" />
				</div>

				{/* Controls Bar */}
				<div className="stt-lab-controls">
					{!isRecording ? (
						<button
							type="button"
							className="stt-lab-btn stt-lab-btn-primary"
							onClick={startRecording}
						>
							<Mic className="w-4 h-4" />
							<span>Начать запись (Микрофон)</span>
						</button>
					) : (
						<button
							type="button"
							className="stt-lab-btn stt-lab-btn-danger"
							onClick={stopRecording}
						>
							<MicOff className="w-4 h-4" />
							<span>Остановить запись</span>
						</button>
					)}

					<button
						type="button"
						className="stt-lab-btn"
						onClick={injectTestPhrase}
					>
						<Play className="w-4 h-4 text-teal-600" />
						<span>Тестовая клиническая фраза</span>
					</button>

					<button
						type="button"
						className="stt-lab-btn"
						onClick={clearTranscript}
					>
						<RefreshCw className="w-4 h-4" />
						<span>Очистить</span>
					</button>

					<button
						type="button"
						className="stt-lab-btn"
						onClick={copyTranscript}
					>
						{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
						<span>{copied ? "Скопировано!" : "Копировать"}</span>
					</button>

					<button
						type="button"
						className="stt-lab-btn"
						onClick={exportJson}
					>
						<Download className="w-4 h-4" />
						<span>Экспорт JSON</span>
					</button>
				</div>
			</div>

			{/* Split Layout: Transcription Output + Telemetry HUD */}
			<div className="stt-lab-main-layout">
				{/* Output Window */}
				<div className="stt-lab-output-card">
					<div className="stt-lab-card-title">
						<span>Распознанный текст с разметкой терминов</span>
						<span className="text-xs text-[var(--muted)]">
							Найдено терминов: {medicalEntities.length}
						</span>
					</div>

					<div className="stt-lab-transcript-box">
						{renderHighlightedText()}

						{activeMode === "gemini_translate" && translatedText && (
							<div className="stt-translation-block">
								<div className="font-semibold flex items-center gap-1.5 mb-1">
									<Globe className="w-3.5 h-3.5" />
									<span>Live Translation (English):</span>
								</div>
								<div>{translatedText}</div>
							</div>
						)}
					</div>
				</div>

				{/* Telemetry Dashboard */}
				<div className="stt-lab-telemetry-card">
					<div className="stt-lab-card-title">
						<span>Консоль телеметрии</span>
						<Activity className="w-4 h-4 text-[var(--muted)]" />
					</div>

					<div className="stt-lab-metrics-grid">
						<div className="stt-lab-metric-box">
							<span className="stt-lab-metric-label">Latency</span>
							<span className="stt-lab-metric-val text-teal-600">
								{telemetry.latencyMs} мс
							</span>
						</div>

						<div className="stt-lab-metric-box">
							<span className="stt-lab-metric-label">Скорость (WPM)</span>
							<span className="stt-lab-metric-val">{telemetry.wpm}</span>
						</div>

						<div className="stt-lab-metric-box">
							<span className="stt-lab-metric-label">Токены / Байты</span>
							<span className="stt-lab-metric-val">
								{telemetry.estimatedTokens} tok
							</span>
						</div>

						<div className="stt-lab-metric-box">
							<span className="stt-lab-metric-label">Key Pool ID</span>
							<span className="stt-lab-metric-val text-xs font-mono truncate" title={telemetry.keyId}>
								{telemetry.keyId}
							</span>
						</div>
					</div>

					{/* Legend */}
					<div className="stt-lab-entity-legend">
						<div className="text-xs font-semibold text-[var(--ink)] mb-1">
							Легенда цветовой дифференциации:
						</div>
						<div className="stt-lab-legend-item">
							<span className="text-[var(--muted)] italic">Серый курсив</span>
							<span>Interim (промежуточные чанки)</span>
						</div>
						<div className="stt-lab-legend-item">
							<span className="text-[var(--ink)] font-semibold">Черный / Четкий текст</span>
							<span>Finalized предложения</span>
						</div>
						<div className="stt-lab-legend-item">
							<span className="stt-entity-highlight text-xs">Зеленая подсветка</span>
							<span>Медицинские термины & Диагнозы</span>
						</div>
						<div className="stt-lab-legend-item">
							<span className="stt-entity-highlight stt-entity-fdi text-xs">Бирюзовый бейдж</span>
							<span>Номера зубов по FDI</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SttLaboratoryView;
