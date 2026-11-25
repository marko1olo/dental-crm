import type { SpeechProvider } from "@dental/shared";

export const speechProviders: SpeechProvider[] = [
	{
		id: "gemini_transcribe_live",
		title: "Gemini 3.5 Transcribe Live",
		status: "needs_server_key",
		mode: "server_streaming",
		recommendedFor: [
			"Диктовка у кресла в реальном времени",
			"Стенографирование приёма с высокой плотностью",
			"Потоковое распознавание со стоматологическим словарём",
		],
		strengths: [
			"Двунаправленный WebSocket Bidi-стриминг без задержек",
			"Встроенный стоматологический Speech Biasing словарь",
			"Smart Transcription с фильтрацией запинок и нормализацией чисел",
			"Zero-Downtime Key Pool Failover при исчерпании квот",
		],
		limits: [
			"Требуется ключ Google AI / Gemini API",
			"Потоковая передача аудио PCM 16kHz/24kHz Mono",
		],
		costNote: "Тарификация Google Generative AI Live API по объёму аудиопотока.",
		setupSettingsCount: 2,
		sourceUrl: "https://ai.google.dev/api/multimodal-live",
	},
	{
		id: "google_speech",
		title: "Google Cloud Speech-to-Text (Gemini Audio)",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"Единый серверный канал распознавания по ключу Gemini / Google",
			"Резервный облачный поток с клинической терминологией",
		],
		strengths: [
			"Поддержка ключей GEMINI_API_KEY / GOOGLE_API_KEY без отдельного аккаунта",
			"Высокая точность русской медицинской речи",
		],
		limits: ["Требует серверный ключ Gemini или Google Speech"],
		costNote: "По тарифам Google AI / Cloud",
		setupSettingsCount: 1,
		sourceUrl: "https://ai.google.dev/gemini-api/docs/audio",
	},
	{
		id: "groq_whisper",
		title: "Groq Whisper",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"Повседневный прием",
			"Диктовка протоколов",
			"Быстрый ответ",
		],
		strengths: [
			"Сверхбыстрое распознавание",
			"Высокая точность Whisper (OpenAI)",
			"Поддерживает медицинскую терминологию",
		],
		limits: [
			"Требуется ключ API Groq",
			"Максимальный размер файла ограничен",
			"Менее эффективно для длинных монологов",
		],
		costNote: "Зависит от тарифов GroqCloud.",
		setupSettingsCount: 1,
		sourceUrl: "https://console.groq.com/docs/speech-to-text",
	},
	{
		id: "openai_transcribe",
		title: "OpenAI Transcribe (Whisper / GPT-4o)",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"Высокоточная транскрибация длинных протоколов",
			"Сложная ортопедическая и имплантологическая лексика",
		],
		strengths: [
			"Устойчивое распознавание медицинской речи и терминов",
			"Надёжный облачный резерв при исчерпании квот других шлюзов",
		],
		limits: ["Требуется ключ OPENAI_API_KEY"],
		costNote: "По тарифам OpenAI Audio API.",
		setupSettingsCount: 1,
		sourceUrl: "https://platform.openai.com/docs/guides/speech-to-text",
	},
	{
		id: "deepgram_streaming",
		title: "Deepgram Nova Streaming",
		status: "needs_server_key",
		mode: "server_streaming",
		recommendedFor: [
			"Низколатентная потоковая диктовка",
			"Длительные клинические осмотры",
		],
		strengths: [
			"Потоковое распознавание с минимальной задержкой",
			"Поддержка стоматологических ключевых слов",
		],
		limits: ["Требуется ключ DEEPGRAM_API_KEY"],
		costNote: "По тарифам Deepgram API.",
		setupSettingsCount: 1,
		sourceUrl: "https://developers.deepgram.com/docs",
	},
	{
		id: "browser_speech",
		title: "Браузерная диктовка (резервный режим)",
		status: "usable_without_key",
		mode: "browser_live",
		recommendedFor: [
			"Аварийный фолбек без серверного ключа",
			"Короткие заметки",
		],
		strengths: [
			"Работает без серверного подключения",
			"Моментальный вывод текста (потоковое распознавание)",
			"Бесплатно в браузере (зависит от движка ОС)",
		],
		limits: [
			"Качество зависит от браузера и микрофона устройства",
			"Нет медицинской терминологии (стоматология)",
			"На Apple (Safari) работает только с активным интернетом",
		],
		costNote:
			"Бесплатно для клиники и пациента; фактическая доступность зависит от ОС.",
		setupSettingsCount: 0,
		sourceUrl: "https://developer.mozilla.org/docs/Web/API/Web_Speech_API",
	},
];
