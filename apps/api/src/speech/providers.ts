import type { SpeechProvider } from "@dental/shared";

export const speechProviders: SpeechProvider[] = [
	{
		id: "browser_speech",
		title: "Браузерная диктовка",
		status: "usable_without_key",
		mode: "browser_live",
		recommendedFor: [
			"Быстрый старт",
			"Мобильные устройства в клинике",
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
];
