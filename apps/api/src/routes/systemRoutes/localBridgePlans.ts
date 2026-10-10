import {
	type LocalBridgeReadinessResponse,
	type LocalBridgeUsePath,
	type LocalBridgeUsePlan,
	type LocalBridgeUsePlanStep,
	type SpeechGatewayProvider,
	type SpeechGatewayStatus,
} from "@dental/shared";
import { getSpeechGatewayStatus } from "../../speech/gateway.js";
import { readyBridge } from "./systemHealthHandlers.js";

export function envConfigured(names: string[]): boolean {
	return names.some((name) => Boolean(process.env[name]?.trim()));
}

export function numberedEnvConfigured(prefixes: string[], max = 20): boolean {
	for (const prefix of prefixes) {
		for (let index = 1; index <= max; index += 1) {
			if (process.env[`${prefix}_${index}`]?.trim()) return true;
		}
	}
	return false;
}

export function groqVisionConfigured(): boolean {
	return (
		envConfigured(["GROQ_API_KEY", "GROQ_API_KEYS"]) ||
		numberedEnvConfigured(["GROQ_API_KEY"])
	);
}

export function planStep(
	order: number,
	title: string,
	owner: LocalBridgeUsePlanStep["owner"],
	path: LocalBridgeUsePath,
	storesLocalFirst: boolean,
	blocking: boolean,
	detail: string,
): LocalBridgeUsePlanStep {
	return { order, title, owner, path, storesLocalFirst, blocking, detail };
}

export function serverAudioRetentionDetail(speech: SpeechGatewayStatus): string {
	const chainProviderIds: SpeechGatewayProvider[] = speech.fallbackProviderIds
		.length
		? [...speech.fallbackProviderIds]
		: [speech.providerId];
	const hasAsyncUploadProvider = chainProviderIds.includes("assemblyai_async");
	const hasOneShotProvider = chainProviderIds.some(
		(providerId) => providerId !== "assemblyai_async",
	);
	const base =
		"Сервер клиники использует резервные маршруты распознавания и не хранит присланное аудио: в базу записывается только текст.";
	const asyncSentence = `Загруженное в ${providerLabelForRetention(
		speech,
	)} аудио и расшифровку сервер удаляет отдельным запросом сразу после обработки; неудачу удаления он записывает в журнал сервера, в карточку фрагмента и в строку задания ai_jobs, и такой фрагмент помечается как требующий проверки, но отдельной надписи об оставшемся аудио на экране приёма нет — удалять запись придётся в панели источника.`;
	const oneShotSentence =
		"Аудио уходит источнику внутри одного запроса и удаляется по его собственной политике хранения, которой CRM не управляет.";
	const sentences = [
		base,
		...(hasAsyncUploadProvider ? [asyncSentence] : []),
		...(hasOneShotProvider ? [oneShotSentence] : []),
	];
	return sentences.join(" ");
}

export function providerLabelForRetention(speech: SpeechGatewayStatus): string {
	return speech.providerId === "assemblyai_async"
		? speech.providerLabel
		: "асинхронный источник распознавания";
}

export function buildVisitDictationPlan(
	readiness: LocalBridgeReadinessResponse,
): LocalBridgeUsePlan {
	const speech = getSpeechGatewayStatus();
	const whisper = readyBridge(readiness, "speech_whisper");
	const vosk = readyBridge(readiness, "speech_vosk");
	const localBridge = whisper ?? vosk;
	const serverSttAvailable = speech.serverTranscriptionCurrentlyAvailable;
	const primaryPath: LocalBridgeUsePath = localBridge
		? "local_bridge"
		: serverSttAvailable
			? "server_gateway"
			: "browser_local";
	const warnings = [
		...(!localBridge
			? [
					"Локальный модуль распознавания не готов; офлайн-диктовка остается через печать, браузерную диктовку и детерминированный парсер.",
				]
			: []),
		...(serverSttAvailable
			? []
			: [
					"Серверное распознавание сейчас недоступно; аудиофрагменты должны оставаться локально восстановимыми до появления серверного маршрута или локального модуля.",
				]),
	];

	return {
		scenario: "visit_dictation",
		title: "Диктовка приема",
		primaryPath,
		localBridgeKind: localBridge?.kind ?? null,
		canProceed: true,
		doctorBlocking: false,
		confidence: localBridge || serverSttAvailable ? 0.86 : 0.64,
		steps: [
			planStep(
				1,
				"Записать без блокировки приема",
				"doctor",
				"browser_local",
				true,
				false,
				"Печатный текст и браузерная диктовка добавляются в один автосохраняемый черновик.",
			),
			planStep(
				2,
				localBridge
					? `Использовать ${localBridge.title}`
					: serverSttAvailable
						? `Использовать ${speech.providerLabel}`
						: "Оставить аудио и текст в очереди",
				"system",
				primaryPath,
				true,
				false,
				localBridge
					? "Локальный модуль может распознавать фрагменты на рабочей станции клиники после подключения маршрута приема аудиофрагментов."
					: serverSttAvailable
						? serverAudioRetentionDetail(speech)
						: "Готового модуля распознавания нет; держите локальную очередь и используйте детерминированную очистку.",
			),
			planStep(
				3,
				"Черновик через детерминированный парсер",
				"system",
				"browser_local",
				true,
				false,
				"Общий парсер строит профильный черновик ЭМК без облачной зависимости.",
			),
			planStep(
				4,
				"Проверка врачом и сохранение",
				"doctor",
				"manual_review",
				true,
				false,
				"Предупреждения не блокируют сохранение проверенной записи.",
			),
		],
		warnings,
		nextAction: localBridge
			? "Подключайте локальное распознавание только после настройки доступа и лимитов аудиофрагментов на рабочей станции клиники."
			: serverSttAvailable
				? "Можно использовать серверное распознавание фрагментами; локальный модуль держите как необязательное офлайн-ускорение."
				: "Добавьте серверное распознавание или локальный модуль Whisper/Vosk; до этого доступны печать и браузерная диктовка.",
	};
}

export function buildDocumentOcrPlan(
	readiness: LocalBridgeReadinessResponse,
): LocalBridgeUsePlan {
	const ocr = readyBridge(readiness, "ocr_vision");
	const groqReady = groqVisionConfigured();
	const primaryPath: LocalBridgeUsePath = ocr
		? "local_bridge"
		: groqReady
			? "cloud_provider"
			: "manual_review";

	return {
		scenario: "document_ocr",
		title: "OCR документов и сканов",
		primaryPath,
		localBridgeKind: ocr?.kind ?? null,
		canProceed: true,
		doctorBlocking: false,
		confidence: ocr || groqReady ? 0.82 : 0.58,
		steps: [
			planStep(
				1,
				"Сначала извлечь локальный текст",
				"administrator",
				"browser_local",
				true,
				false,
				"Встроенный извлекатель обрабатывает документы, архивы и таблицы до OCR.",
			),
			planStep(
				2,
				ocr
					? "Запустить локальный OCR-модуль"
					: groqReady
						? "Использовать серверное распознавание изображений"
						: "Отметить, что нужен OCR",
				"system",
				primaryPath,
				true,
				false,
				ocr
					? "Сканированные страницы остаются на локальном OCR-обработчике."
					: groqReady
						? "Изображения проходят через серверный маршрут распознавания; результат все равно требует предпросмотра."
						: "OCR-движок не готов; администратор проверяет извлеченные поля вручную и может повторить позже.",
			),
			planStep(
				3,
				"Маршрут в предпросмотр",
				"administrator",
				"server_gateway",
				true,
				false,
				"Пациенты, список снимков, умный импорт или анализ прайса получают текст только после извлечения.",
			),
			planStep(
				4,
				"Ручное подтверждение",
				"administrator",
				"manual_review",
				true,
				false,
				"Импортируемые строки не записываются без предпросмотра и подтверждения.",
			),
		],
		warnings:
			ocr || groqReady
				? []
				: [
						"OCR и распознавание изображений не готовы; сканированные документы требуют ручной проверки или повторной попытки позже.",
					],
		nextAction: ocr
			? "Держите OCR-модуль в админском контуре; не выносите настройку OCR на экран приема врача."
			: groqReady
				? "Используйте серверное распознавание изображений для админских OCR/фото-задач с валидацией схемы и детерминированным резервом."
				: "Настройте локальный OCR или серверное распознавание изображений; текущий извлекатель продолжает обрабатывать текстовые и табличные файлы.",
	};
}

export function buildPricePhotoPlan(
	readiness: LocalBridgeReadinessResponse,
): LocalBridgeUsePlan {
	const ocr = readyBridge(readiness, "ocr_vision");
	const groqReady = groqVisionConfigured();
	const primaryPath: LocalBridgeUsePath = groqReady
		? "cloud_provider"
		: ocr
			? "local_bridge"
			: "manual_review";

	return {
		scenario: "price_photo_ocr",
		title: "Распознавание фото прайс-листа",
		primaryPath,
		localBridgeKind: ocr?.kind ?? null,
		canProceed: true,
		doctorBlocking: false,
		confidence: groqReady ? 0.84 : ocr ? 0.74 : 0.55,
		steps: [
			planStep(
				1,
				"Сжать изображение в браузере",
				"administrator",
				"browser_local",
				true,
				false,
				"Веб-клиент уменьшает фото перед загрузкой, чтобы не ломать слабую сеть.",
			),
			planStep(
				2,
				groqReady
					? "Классифицировать через серверное распознавание"
					: ocr
						? "Считать текст локальным OCR"
						: "Использовать детерминированный разбор таблицы",
				"system",
				primaryPath,
				true,
				false,
				groqReady
					? "Серверное распознавание изображений классифицирует лечение, материал, тип коронки или реставрации, бренд, единицу и цену."
					: ocr
						? "Локальный OCR извлекает текст; детерминированная таксономия прайса сопоставляет поля после проверки."
						: "Скопированный текст или ручной ввод все равно проходят через детерминированную таксономию.",
			),
			planStep(
				3,
				"Проверка структуры",
				"system",
				"server_gateway",
				true,
				false,
				"Невалидная структура или поля с низкой уверенностью становятся предупреждениями, а не записью в каталог.",
			),
			planStep(
				4,
				"Администратор сопоставляет услуги",
				"administrator",
				"manual_review",
				true,
				false,
				"Изменения каталога услуг требуют явного предпросмотра и подтверждения.",
			),
		],
		warnings:
			groqReady || ocr
				? []
				: [
						"Распознавание прайса по фото ограничено, пока не настроен серверный модуль распознавания изображений или локальный OCR.",
					],
		nextAction: groqReady
			? "Используйте серверное распознавание изображений как самый сильный текущий путь для фото прайс-листа; детерминированный разбор оставьте резервом."
			: ocr
				? "Сначала используйте локальный OCR, затем детерминированную таксономию прайса."
				: "Сейчас используйте скопированные таблицы или текст; для фото настройте серверное распознавание изображений или локальный OCR.",
	};
}

export function buildCbctMprPlan(
	readiness: LocalBridgeReadinessResponse,
): LocalBridgeUsePlan {
	const dicom = readyBridge(readiness, "dicom_cbct");
	const ohif = readyBridge(readiness, "ohif_viewer");
	const primaryPath: LocalBridgeUsePath = dicom
		? "local_bridge"
		: ohif
			? "external_viewer"
			: "metadata_preview";

	return {
		scenario: "cbct_mpr",
		title: "Просмотр КЛКТ / КТ-срезов",
		primaryPath,
		localBridgeKind: dicom?.kind ?? ohif?.kind ?? null,
		canProceed: true,
		doctorBlocking: false,
		confidence: dicom ? 0.88 : ohif ? 0.78 : 0.52,
		steps: [
			planStep(
				1,
				"Сначала разобрать список серии",
				"system",
				"metadata_preview",
				true,
				false,
				"Предпросмотр папки, архива или списка снимков читает заголовки и группирует исследования/серии до открытия тяжелых данных.",
			),
			planStep(
				2,
				dicom
					? "Использовать локальный КТ-обработчик"
					: ohif
						? "Открыть внешний просмотр"
						: "Остаться в режиме метаданных",
				"system",
				primaryPath,
				true,
				false,
				dicom
					? "Локальный обработчик может взять на себя подготовку серии, быструю загрузку КТ-срезов и панорамную реконструкцию вне обычной оболочки CRM."
					: ohif
						? "CRM передает план запуска и состояние инструментов; исходные снимки остаются у просмотрщика."
						: "Локальный обработчик или просмотрщик не готов: показываем предупреждения, план ресурсов и инструкции для внешней передачи.",
			),
			planStep(
				3,
				"Восстановить заметки CRM",
				"system",
				"server_gateway",
				true,
				false,
				"Состояние просмотра хранит курсор, окно, заметки и измерения отдельно от исходных файлов снимков.",
			),
			planStep(
				4,
				"Врач интерпретирует в просмотрщике",
				"doctor",
				"manual_review",
				true,
				false,
				"Подсказки ИИ и снимков остаются черновиком; диагностическая интерпретация остается за врачом.",
			),
		],
		warnings:
			dicom || ohif
				? []
				: [
						"Локальный КТ-обработчик или внешний просмотр не готов; полный объем КЛКТ не загружается внутрь CRM.",
					],
		nextAction: dicom
			? "Настройте передачу данных в локальный КТ-обработчик с хэшированием файлов, лимитами ресурсов и аудитом."
			: ohif
				? "Используйте план запуска внешнего просмотра для исходных снимков из архива."
				: "Оставьте предпросмотр метаданных и политику ресурсов; настройте КТ-обработчик или внешний просмотр перед диагностическим просмотром срезов.",
	};
}

export function buildImagingImportPlan(
	readiness: LocalBridgeReadinessResponse,
): LocalBridgeUsePlan {
	const dicom = readyBridge(readiness, "dicom_cbct");
	const ocr = readyBridge(readiness, "ocr_vision");
	const primaryPath: LocalBridgeUsePath = dicom
		? "local_bridge"
		: "metadata_preview";

	return {
		scenario: "imaging_import",
		title: "Импорт снимков",
		primaryPath,
		localBridgeKind: dicom?.kind ?? null,
		canProceed: true,
		doctorBlocking: false,
		confidence: dicom ? 0.86 : 0.7,
		steps: [
			planStep(
				1,
				"Сканирование только для чтения",
				"administrator",
				"metadata_preview",
				true,
				false,
				"Предпросмотр папок наблюдения и архивов собирает пути и заголовки снимков до подтверждения.",
			),
			planStep(
				2,
				dicom
					? "Передать тяжелый архив снимков обработчику"
					: "Использовать встроенный разбор метаданных",
				"system",
				primaryPath,
				true,
				false,
				dicom
					? "Локальный обработчик сможет раскрывать папки исследования/архивы и готовить быстрый просмотр без блокировки сервера."
					: "Встроенный парсер читает типовые заголовки снимков и обычные архивы; неподдержанные архивы становятся предупреждениями.",
			),
			planStep(
				3,
				ocr
					? "OCR этикеток при необходимости"
					: "OCR этикеток остается необязательным",
				"system",
				ocr ? "local_bridge" : "manual_review",
				true,
				false,
				ocr
					? "Локальный OCR может читать экспортированные этикетки или бумажные ссылки."
					: "Ручное сопоставление пациента остается доступным.",
			),
			planStep(
				4,
				"Подтвердить только готовые строки",
				"administrator",
				"manual_review",
				true,
				false,
				"Строки без пациента, типа или пути остаются предупреждениями либо заблокированными строками.",
			),
		],
		warnings: dicom
			? []
			: [
					"Тяжелым архивам снимков нужен внешний извлекатель или будущий локальный обработчик; текущий встроенный разбор читает метаданные первым проходом.",
				],
		nextAction: dicom
			? "Используйте локальный КТ-модуль для подготовки тяжелого импорта после добавления сверки файлов и аудита."
			: "Сейчас используйте существующий предпросмотр только для чтения; для больших архивов и быстрой загрузки КЛКТ добавьте КТ-модуль.",
	};
}
