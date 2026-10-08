/**
 * @file speechProviders.ts
 * @description Layer 1: Speech transcription provider configurations and presets.
 */

import type { SpeechProvider } from "@dental/shared";

const speechProviders: SpeechProvider[] = [
	{
		id: "browser_speech",
		title: "Браузерная диктовка",
		status: "usable_without_key",
		mode: "browser_live",
		recommendedFor: [
			"быстрый старт",
			"нулевая нагрузка на сервер",
			"черновик администратора",
		],
		strengths: [
			"не требует серверного подключения",
			"может подставлять текст сразу в черновик",
			"подходит как первый слой, если браузер поддерживает ru-RU",
		],
		limits: [
			"поддержка зависит от браузера и политики устройства",
			"нельзя считать медицински надежным единственным источником",
			"в офлайне работает только при наличии локальной поддержки браузера",
		],
		costNote:
			"Без серверного подключения и оплаты сервера; фактическая доступность зависит от браузера.",
		setupSettingsCount: 0,
		sourceUrl: "https://developer.mozilla.org/docs/Web/API/Web_Speech_API",
	},
	{
		id: "groq_whisper",
		title: "Groq Whisper",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"первое облачное распознавание",
			"быстрая диктовка врача",
			"русский и смешанная речь",
		],
		strengths: [
			"совместимый серверный прием аудиофрагментов",
			"быстрые Whisper large-v3 / large-v3-turbo модели",
			"поддерживает word/segment timestamps для контроля качества",
		],
		limits: [
			"серверный доступ должен оставаться только на сервере клиники",
			"аудио уходит во внешний серверный контур",
			"длинные записи нужно резать на короткие фрагменты",
		],
		costNote:
			"Есть бесплатный старт GroqCloud; официальные документы указывают лимит загрузки 25MB на бесплатном уровне для распознавания речи.",
		setupSettingsCount: 3,
		sourceUrl: "https://console.groq.com/docs/speech-to-text",
	},
	{
		id: "openai_transcribe",
		title: "OpenAI Transcribe",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"качественная транскрибация",
			"аккуратная пунктуация",
			"осторожная полировка текста",
		],
		strengths: [
			"модели gpt-4o-transcribe и gpt-4o-mini-transcribe",
			"можно использовать тот же серверный контур, что и для draft-polish",
			"есть diarize-вариант для разделения говорящих",
		],
		limits: [
			"ключ и лимиты только на сервере",
			"LLM-полировка не имеет права добавлять факты",
			"raw transcript должен храниться рядом с правленным черновиком",
		],
		costNote:
			"Не бесплатный основной контур; полезен, если OpenAI worker уже используется для аккуратной правки.",
		setupSettingsCount: 3,
		sourceUrl: "https://platform.openai.com/docs/guides/speech-to-text",
	},
	{
		id: "deepgram_streaming",
		title: "Deepgram Streaming",
		status: "needs_server_key",
		mode: "server_streaming",
		recommendedFor: ["почти realtime", "помощник у кресла", "сетевые клиники"],
		strengths: [
			"есть потоковое распознавание и обработка готовых записей",
			"подходит для живых подсказок и агентских сценариев",
			"поддерживает функции вроде smart formatting и diarization",
		],
		limits: [
			"для русского нужно сверять актуальную модель и язык",
			"сложнее первого запуска, чем отправка короткими фрагментами",
			"нужен отдельный контроль соединений и ретраев",
		],
		costNote:
			"Официальная pricing-страница показывает free credit для старта, затем pay-as-you-go.",
		setupSettingsCount: 3,
		sourceUrl: "https://developers.deepgram.com/docs/stt/getting-started",
	},
	{
		id: "assemblyai_async",
		title: "AssemblyAI Async / Streaming",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"длинные записи",
			"расшифровка после приема",
			"аудио-архив",
		],
		strengths: [
			"REST async и отдельный streaming API",
			"есть бесплатный стартовый кредит",
			"удобен для фоновой обработки длинных аудио",
		],
		limits: [
			"добавляет задержку для async-сценария",
			"не должен становиться единственным путем диктовки",
			"медицинская приватность требует отдельного договора и настроек",
		],
		costNote:
			"Есть free/start credits по официальным страницам; перед продакшеном проверить текущие лимиты аккаунта.",
		setupSettingsCount: 3,
		sourceUrl: "https://www.assemblyai.com/docs/",
	},
	{
		id: "cloudflare_whisper",
		title: "Cloudflare Workers AI Whisper",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"легкий пограничный шлюз",
			"легкий сервер",
			"экспериментальный дешёвый контур",
		],
		strengths: [
			"Whisper доступен как Workers AI model",
			"можно вынести распознавание ближе к пользователю",
			"подходит для отдельного edge-шлюза без нагрузки на основной API",
		],
		limits: [
			"нужны Cloudflare account id и token",
			"важно проверить юридическую модель хранения и региона",
			"не заменяет локальный офлайн-контур",
		],
		costNote:
			"Стоимость и квоты зависят от Cloudflare Workers AI аккаунта; выгодно как edge-шлюз, не как офлайн.",
		setupSettingsCount: 4,
		sourceUrl: "https://developers.cloudflare.com/workers-ai/models/whisper",
	},
	{
		id: "azure_speech",
		title: "Azure AI Speech",
		status: "needs_server_key",
		mode: "server_streaming",
		recommendedFor: [
			"free-tier проверка",
			"enterprise-клиники",
			"realtime и batch",
		],
		strengths: [
			"официальный облачный Speech-to-Text с realtime и batch сценариями",
			"есть бесплатные часы на F0/Free tier по официальным страницам Azure",
			"подходит сетевым клиникам, где уже есть Microsoft/Azure контур",
		],
		limits: [
			"нужны Azure Speech resource, регион, ключ и юридическая проверка обработки медданных",
			"прямое подключение не включено в текущий шлюз, сначала используем каталог и правила выбора",
			"для врача не должен появляться отдельный выбор Azure на приеме",
		],
		costNote:
			"Microsoft указывает free audio hours для Speech-to-Text; перед production нужно проверить регион, F0 quotas и договор.",
		setupSettingsCount: 4,
		sourceUrl:
			"https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/",
	},
	{
		id: "google_speech",
		title: "Google Cloud Speech-to-Text",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"free quota проверка",
			"Google Workspace клиники",
			"длинная дорожная карта",
		],
		strengths: [
			"официальный API распознавания речи с большим количеством языков и моделей",
			"документация указывает бесплатную квоту при включенном billing",
			"может быть полезен для клиник, уже сидящих на Google Cloud",
		],
		limits: [
			"нужен billing/project/service account, ключи не должны попадать в клиент",
			"прямое подключение не включено в текущий шлюз",
			"медицинская приватность и регион обработки требуют отдельного решения",
		],
		costNote:
			"Google pricing показывает free quota для начальных минут, затем поминутную оплату и возможные доп. расходы GCS.",
		setupSettingsCount: 4,
		sourceUrl: "https://cloud.google.com/speech-to-text/pricing",
	},
	{
		id: "huggingface_asr",
		title: "Hugging Face ASR / Inference Providers",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"эксперименты",
			"open-source модели",
			"быстрое сравнение распознавания",
		],
		strengths: [
			"единый доступ к множеству моделей распознавания речи и вычислительных контуров",
			"удобно сравнивать open-source распознавание без собственного GPU на старте",
			"может стать research-контуром для выбора локальной модели",
		],
		limits: [
			"качество, лимиты и стоимость зависят от выбранного вычислительного контура",
			"не медицинский контур по умолчанию, нужна проверка приватности и хранения",
			"для production лучше вынести в отдельный server worker с явными лимитами",
		],
		costNote:
			"Есть бесплатные/community пути и платные вычислительные контуры; использовать как research, не как единственный медицинский контур распознавания.",
		setupSettingsCount: 4,
		sourceUrl: "https://huggingface.co/docs/inference-providers/index",
	},
	{
		id: "mobile_native_speech",
		title: "iOS/Android Native Speech",
		status: "planned_local",
		mode: "local_worker",
		recommendedFor: [
			"мобильное приложение",
			"минимум нагрузки на сервер",
			"быстрая диктовка у кресла",
		],
		strengths: [
			"может дать живую диктовку без нагрузки на наш API при наличии поддержки устройства",
			"хорошо подходит будущему mobile shell как первый zero-server слой",
			"результат можно отправлять как localTranscript без raw audio",
		],
		limits: [
			"поведение офлайна и приватность зависят от ОС, языка, устройства и установленных моделей",
			"нужна отдельная мобильная реализация, браузерный прототип ее не заменяет",
			"для ЭМК все равно нужен deterministic parser, raw transcript и врачебная проверка",
		],
		costNote:
			"Без нашего API-счета распознавания; реальная доступность зависит от iOS/Android и политики устройства.",
		setupSettingsCount: 0,
		sourceUrl:
			"https://developer.android.com/reference/android/speech/SpeechRecognizer",
	},
	{
		id: "local_whisper",
		title: "Local Whisper.cpp",
		status: "planned_local",
		mode: "local_worker",
		recommendedFor: [
			"офлайн-кабинет",
			"настольное или мобильное приложение",
			"максимальная приватность",
		],
		strengths: [
			"работает локально без отправки аудио в облако",
			"есть tiny/base/small/medium/large модели под разные устройства",
			"подходит для будущего настольного или мобильного модуля",
		],
		limits: [
			"для чистого браузерного прототипа тяжелее по памяти и установке",
			"качество зависит от модели и железа",
			"нужен отдельный installer/model manager",
		],
		costNote:
			"Open-source без API-оплаты; платим установкой, моделью, CPU/GPU и поддержкой локального модуля.",
		setupSettingsCount: 0,
		sourceUrl: "https://github.com/ggml-org/whisper.cpp",
	},
	{
		id: "vosk_local",
		title: "Vosk Local",
		status: "planned_local",
		mode: "local_worker",
		recommendedFor: [
			"офлайн-команды",
			"дешевые устройства",
			"локальный сервер клиники",
		],
		strengths: [
			"offline toolkit с Node/Python/Java/C# bindings",
			"малые модели и потоковый API",
			"подходит для команд и регулярных фраз без облака",
		],
		limits: [
			"качество свободной диктовки обычно ниже сильных Whisper-моделей",
			"нужно управлять моделями и словарями",
			"медицинские термины требуют кастомного словаря",
		],
		costNote:
			"Open-source/offline без API-оплаты; хорош для команд и дешевого локального сервера.",
		setupSettingsCount: 0,
		sourceUrl: "https://github.com/alphacep/vosk-api",
	},
];


export { speechProviders };
