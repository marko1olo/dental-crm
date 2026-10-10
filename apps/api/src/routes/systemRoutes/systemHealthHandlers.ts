import {
	type LocalBridgeKind,
	type LocalBridgeReadinessItem,
	type LocalBridgeReadinessResponse,
	localBridgeReadinessResponseSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import {
	type LocalBridgeDefinition,
	LocalBridgeUrlProtocolError,
} from "./types.js";

export const localBridgeTimeoutMs = 1400;

export const localBridgeDefinitions: LocalBridgeDefinition[] = [
	{
		kind: "speech_whisper",
		title: "Локальная диктовка Whisper.cpp",
		acceptedEnvVars: [
			"DENTAL_LOCAL_WHISPER_HEALTH_URL",
			"DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL",
			"DENTAL_LOCAL_WHISPER_URL",
			"WHISPER_CPP_HEALTH_URL",
			"WHISPER_CPP_TRANSCRIBE_URL",
			"WHISPER_CPP_URL",
			"LOCAL_WHISPER_HEALTH_URL",
			"LOCAL_WHISPER_TRANSCRIBE_URL",
			"LOCAL_WHISPER_URL",
		],
		defaultHealthPath: "/health",
		deriveHealthFromConfiguredPath: true,
		role: "офлайн-распознавание диктовки",
		workload: "локальные аудиофрагменты без облачной оплаты распознавания",
		privacyBoundary:
			"аудио остается на рабочей станции или локальном сервере клиники",
		setupHint:
			"Запустите локальный модуль Whisper.cpp и укажите его адрес в серверных настройках.",
	},
	{
		kind: "speech_vosk",
		title: "Локальное распознавание Vosk",
		acceptedEnvVars: [
			"DENTAL_VOSK_HEALTH_URL",
			"DENTAL_VOSK_TRANSCRIBE_URL",
			"DENTAL_VOSK_URL",
			"VOSK_HEALTH_URL",
			"VOSK_TRANSCRIBE_URL",
			"VOSK_SERVER_URL",
			"LOCAL_VOSK_HEALTH_URL",
			"LOCAL_VOSK_TRANSCRIBE_URL",
			"LOCAL_VOSK_URL",
		],
		defaultHealthPath: "/health",
		deriveHealthFromConfiguredPath: true,
		role: "офлайн-диктовка и резерв для команд",
		workload: "легкое локальное распознавание речи на слабых ПК",
		privacyBoundary: "аудио остается внутри локального модуля Vosk",
		setupHint:
			"Запустите модуль Vosk и укажите его адрес в серверных настройках.",
	},
	{
		kind: "dicom_cbct",
		title: "Локальный обработчик КЛКТ/КТ",
		acceptedEnvVars: [
			"DENTAL_DICOM_BRIDGE_URL",
			"DICOM_LOCAL_BRIDGE_URL",
			"DENTAL_DICOM_WORKER_URL",
		],
		defaultHealthPath: "/health",
		role: "подготовка КЛКТ/КТ-срезов и быстрая загрузка просмотра",
		workload:
			"серии КЛКТ/КТ, КТ-срезы, панорамная реконструкция и локальная подготовка просмотра",
		privacyBoundary:
			"тяжелые данные КЛКТ/КТ остаются в локальном просмотрщике или обработчике; CRM хранит список серии и состояние инструментов",
		setupHint:
			"Запустите локальный КЛКТ/КТ-обработчик или внешний просмотр и укажите его адрес в серверных настройках.",
	},
	{
		kind: "ocr_vision",
		title: "Локальный OCR / Tesseract",
		acceptedEnvVars: [
			"DENTAL_OCR_BRIDGE_URL",
			"OCR_LOCAL_BRIDGE_URL",
			"TESSERACT_BRIDGE_URL",
		],
		defaultHealthPath: "/health",
		role: "офлайн OCR для PDF, фотографий и таблиц",
		workload: "сканы PDF, фото прайс-листов, бумажные журналы",
		privacyBoundary: "изображения документов остаются в локальном OCR-модуле",
		setupHint:
			"Запустите локальный OCR-обработчик и укажите его адрес в серверных настройках.",
	},
	{
		kind: "ohif_viewer",
		title: "Внешний КТ-просмотрщик",
		acceptedEnvVars: ["DENTAL_OHIF_URL", "OHIF_BASE_URL"],
		defaultHealthPath: "/",
		role: "передача в диагностический просмотрщик",
		workload: "полный просмотрщик архива снимков вне экрана ведения приема",
		privacyBoundary:
			"исходные снимки остаются в просмотрщике; CRM только запускает и восстанавливает состояние",
		setupHint:
			"Настройте внешний просмотр поверх архива снимков и укажите его адрес в серверных настройках.",
	},
	{
		kind: "migration_staging",
		title: "Локальный модуль миграции старых МИС",
		acceptedEnvVars: [
			"DENTAL_MIGRATION_BRIDGE_URL",
			"DENTAL_DB_BRIDGE_URL",
			"DENTAL_LEGACY_BRIDGE_URL",
		],
		defaultHealthPath: "/health",
		role: "разбор только для чтения для старых БД, сетевых папок и экспортов",
		workload:
			"старые базы, резервные копии, табличные выгрузки и списки ссылок на снимки",
		privacyBoundary:
			"старые базы пациентов, снимки и файлы клиники остаются на локальной машине или сервере клиники; CRM получает только проверочный список или табличный предпросмотр",
		setupHint:
			"Запустите локальный модуль миграции на машине администратора и укажите его адрес в серверных настройках.",
	},
];

export function envValue(names: string[]): string | null {
	for (const name of names) {
		const value = process.env[name]?.trim();
		if (value) return value;
	}
	return null;
}

export function bridgeRemoteProbeAllowed(): boolean {
	return /^(1|true|yes)$/i.test(
		(process.env.DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES ?? "").trim(),
	);
}

export function isPrivateBridgeHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (
		host === "localhost" ||
		host === "::1" ||
		host === "[::1]" ||
		host.endsWith(".local")
	)
		return true;
	if (/^127\./.test(host)) return true;
	if (/^10\./.test(host)) return true;
	if (/^192\.168\./.test(host)) return true;
	const match = host.match(/^172\.(\d{1,2})\./);
	if (match) {
		const block = Number(match[1]);
		return block >= 16 && block <= 31;
	}
	return false;
}

export function redactedUrl(url: URL): string {
	const copy = new URL(url.toString());
	copy.username = "";
	copy.password = "";
	copy.search = "";
	copy.hash = "";
	return copy.toString();
}

export function healthUrl(
	rawUrl: string,
	defaultHealthPath: string,
	deriveHealthFromConfiguredPath = false,
): URL {
	const url = new URL(rawUrl);
	if (!/^https?:$/.test(url.protocol)) {
		throw new LocalBridgeUrlProtocolError();
	}
	const cleanPath = url.pathname.replace(/\/+$/g, "");
	if (!cleanPath) {
		url.pathname = defaultHealthPath;
	} else if (
		deriveHealthFromConfiguredPath &&
		!/\/(?:health|healthz|status)$/i.test(cleanPath)
	) {
		if (/\/v1\/audio\/transcriptions$/i.test(cleanPath)) {
			url.pathname = `${cleanPath.replace(/\/v1\/audio\/transcriptions$/i, "")}${defaultHealthPath}`;
		} else {
			url.pathname = `${cleanPath}${defaultHealthPath}`;
		}
	}
	return url;
}

export function localBridgeUrlWarning(error: unknown): string {
	if (error instanceof LocalBridgeUrlProtocolError) {
		return "Для локального модуля поддерживаются только URL http/https.";
	}
	return "Адрес локального модуля не читается. Проверьте URL в серверных настройках.";
}

export function localBridgeProbeWarning(error: unknown): string {
	if (error instanceof Error && error.name === "AbortError") {
		return `Локальный модуль не ответил за ${localBridgeTimeoutMs} мс; проверьте, что служба запущена и доступна с сервера клиники.`;
	}
	return "Проверка локального модуля не завершилась; проверьте, что служба запущена и доступна с сервера клиники.";
}

export async function probeBridge(
	definition: LocalBridgeDefinition,
	allowRemoteBridgeProbe: boolean,
): Promise<LocalBridgeReadinessItem> {
	const configuredUrl = envValue(definition.acceptedEnvVars);
	if (!configuredUrl) {
		return {
			kind: definition.kind,
			title: definition.title,
			status: "not_configured",
			configured: false,
			reachable: false,
			urlRedacted: null,
			setupSettingsCount: definition.acceptedEnvVars.length,
			latencyMs: null,
			role: definition.role,
			workload: definition.workload,
			privacyBoundary: definition.privacyBoundary,
			warnings: [],
			nextAction: definition.setupHint,
		};
	}

	let url: URL;
	try {
		url = healthUrl(
			configuredUrl,
			definition.defaultHealthPath,
			definition.deriveHealthFromConfiguredPath,
		);
	} catch (error) {
		return {
			kind: definition.kind,
			title: definition.title,
			status: "misconfigured",
			configured: true,
			reachable: false,
			urlRedacted: null,
			setupSettingsCount: definition.acceptedEnvVars.length,
			latencyMs: null,
			role: definition.role,
			workload: definition.workload,
			privacyBoundary: definition.privacyBoundary,
			warnings: [localBridgeUrlWarning(error)],
			nextAction: `Исправьте адрес локального модуля в серверных настройках. ${definition.setupHint}`,
		};
	}

	const warnings: string[] = [];
	if (!allowRemoteBridgeProbe && !isPrivateBridgeHost(url.hostname)) {
		return {
			kind: definition.kind,
			title: definition.title,
			status: "blocked",
			configured: true,
			reachable: false,
			urlRedacted: redactedUrl(url),
			setupSettingsCount: definition.acceptedEnvVars.length,
			latencyMs: null,
			role: definition.role,
			workload: definition.workload,
			privacyBoundary: definition.privacyBoundary,
			warnings: [
				"Проверка удаленных локальных модулей отключена; по умолчанию проверяются только localhost и частная сеть клиники.",
			],
			nextAction:
				"Используйте localhost/частный адрес локального модуля или разрешите проверку удаленного адреса в серверных настройках после проверки инфраструктуры.",
		};
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), localBridgeTimeoutMs);
	const startedAt = Date.now();
	try {
		const response = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json,text/plain,*/*" },
			signal: controller.signal,
		});
		const latencyMs = Date.now() - startedAt;
		if (response.ok) {
			return {
				kind: definition.kind,
				title: definition.title,
				status: "ready",
				configured: true,
				reachable: true,
				urlRedacted: redactedUrl(url),
				setupSettingsCount: definition.acceptedEnvVars.length,
				latencyMs,
				role: definition.role,
				workload: definition.workload,
				privacyBoundary: definition.privacyBoundary,
				warnings,
				nextAction:
					"Проверка доступности локального модуля прошла. Держите это как возможность администратора или локального рабочего места, а не как блокер приема.",
			};
		}
		warnings.push(
			`Локальный модуль ответил кодом ${response.status}; проверьте адрес и страницу проверки.`,
		);
		return {
			kind: definition.kind,
			title: definition.title,
			status: "unreachable",
			configured: true,
			reachable: false,
			urlRedacted: redactedUrl(url),
			setupSettingsCount: definition.acceptedEnvVars.length,
			latencyMs,
			role: definition.role,
			workload: definition.workload,
			privacyBoundary: definition.privacyBoundary,
			warnings,
			nextAction:
				"Проверьте, что локальный модуль запущен, отвечает и привязан к настроенному адресу и порту.",
		};
	} catch (error) {
		warnings.push(localBridgeProbeWarning(error));
		return {
			kind: definition.kind,
			title: definition.title,
			status: "unreachable",
			configured: true,
			reachable: false,
			urlRedacted: redactedUrl(url),
			setupSettingsCount: definition.acceptedEnvVars.length,
			latencyMs: Date.now() - startedAt,
			role: definition.role,
			workload: definition.workload,
			privacyBoundary: definition.privacyBoundary,
			warnings,
			nextAction:
				"Запустите локальный модуль или продолжайте через облако, серверный режим либо ручной ввод; работа врача не блокируется.",
		};
	} finally {
		clearTimeout(timeout);
	}
}

export async function buildLocalBridgeReadiness(): Promise<LocalBridgeReadinessResponse> {
	const allowRemoteBridgeProbe = bridgeRemoteProbeAllowed();
	const bridges = await Promise.all(
		localBridgeDefinitions.map((definition) =>
			probeBridge(definition, allowRemoteBridgeProbe),
		),
	);
	const configuredCount = bridges.filter((bridge) => bridge.configured).length;
	const readyCount = bridges.filter(
		(bridge) => bridge.status === "ready",
	).length;
	const warnings = bridges.flatMap((bridge) =>
		bridge.warnings.map((warning) => `${bridge.title}: ${warning}`),
	);
	const nextAction =
		readyCount > 0
			? "Используйте готовые локальные модули для тяжелых и офлайн-задач; прием остается неблокирующим, очередь имеет приоритет."
			: configuredCount > 0
				? "Настроенные локальные модули недоступны; используйте облачный или ручной режим и проверьте локальное рабочее место."
				: "Локальные модули пока не настроены; приложение продолжает работать через браузер, сервер и детерминированные разборщики.";

	return localBridgeReadinessResponseSchema.parse({
		generatedAt: new Date().toISOString(),
		allowRemoteBridgeProbe,
		configuredCount,
		readyCount,
		bridges,
		warnings,
		nextAction,
	});
}

export function readyBridge(
	readiness: LocalBridgeReadinessResponse,
	kind: LocalBridgeKind,
): LocalBridgeReadinessItem | null {
	return (
		readiness.bridges.find(
			(bridge) => bridge.kind === kind && bridge.status === "ready",
		) ?? null
	);
}

export function registerSystemHealthRoutes(app: FastifyInstance) {
	app.get("/api/system/local-bridges/readiness", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"local bridge readiness",
			))
		)
			return;
		return buildLocalBridgeReadiness();
	});
}
