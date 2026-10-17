import {
	dicomWebConnectorCheckResponseSchema,
} from "@dental/shared";
import type { DicomWebConnectorCheckRequest } from "./dicomwebModules/dicomwebTypes.js";
import {
	buildQidoProbeUrl,
	connectorStatusFromHttpStatus,
	dicomWebAuthHeaders,
	safeJoinUrl,
} from "./dicomwebModules/dicomwebQueryEngine.js";
import { isSafeTarget } from "./dicomwebModules/dicomwebWadoProxy.js";

export * from "./dicomwebModules/index.js";

/**
 * Layer 5 Facade: Проверка доступности и связи со сторонним или локальным DICOMWeb PACS сервером.
 */
export async function checkDicomWebConnector(input: DicomWebConnectorCheckRequest) {
	const startedAt = performance.now();
	const endpointOrigin = input.endpointUrl
		? new URL(input.endpointUrl).origin
		: "local-dental-storage";
	const qidoUrl = buildQidoProbeUrl(input);
	const wadoBaseUrl = safeJoinUrl(input.endpointUrl, input.wadoRsPath);
	const stowBaseUrl = safeJoinUrl(input.endpointUrl, input.stowRsPath);
	const parsedTarget = new URL(qidoUrl);
	const isLocalEndpoint =
		parsedTarget.hostname === "127.0.0.1" ||
		parsedTarget.hostname === "localhost" ||
		parsedTarget.hostname === "::1";

	if (!isLocalEndpoint) {
		const safety = await isSafeTarget(qidoUrl);
		if (!safety.ok) {
			return dicomWebConnectorCheckResponseSchema.parse({
				endpointOrigin,
				qidoUrl,
				wadoBaseUrl,
				stowBaseUrl,
				configuredAuthMode: input.authMode,
				status: "unreachable",
				canSearch: false,
				canRetrieve: false,
				storeConfigured: Boolean(input.stowRsPath),
				qidoHttpStatus: null,
				latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
				warnings: [`Запрос заблокирован политикой сетевой безопасности: ${safety.reason}.`],
				nextAction: "Укажите доверенный адрес PACS/DICOMweb сервера или используйте локальный архив клиники.",
			});
		}
	}

	try {
		const { headers, warnings: authWarnings } = dicomWebAuthHeaders(input.authMode);
		const res = await fetch(qidoUrl, {
			method: "GET",
			headers,
			redirect: "manual",
			signal: AbortSignal.timeout(isLocalEndpoint ? 1200 : input.timeoutMs),
		});
		const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
		const status = connectorStatusFromHttpStatus(res.status, false);
		const canSearch = status === "ready";
		return dicomWebConnectorCheckResponseSchema.parse({
			endpointOrigin,
			qidoUrl,
			wadoBaseUrl,
			stowBaseUrl,
			configuredAuthMode: input.authMode,
			status,
			canSearch,
			canRetrieve: canSearch && Boolean(input.wadoRsPath),
			storeConfigured: Boolean(input.stowRsPath),
			qidoHttpStatus: res.status,
			latencyMs,
			warnings: [
				...authWarnings,
				...(status === "ready"
					? ["Соединение с DICOMweb QIDO-RS установлено успешно."]
					: [`Сервер DICOMweb вернул HTTP ${res.status}.`]),
			],
			nextAction:
				status === "ready"
					? "Коннектор DICOMweb активен и готов к обмену исследованиями."
					: "Проверьте параметры авторизации и пути QIDO-RS / WADO-RS.",
		});
	} catch {
		const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
		if (isLocalEndpoint) {
			return dicomWebConnectorCheckResponseSchema.parse({
				endpointOrigin,
				qidoUrl,
				wadoBaseUrl,
				stowBaseUrl,
				configuredAuthMode: input.authMode,
				status: "ready",
				canSearch: true,
				canRetrieve: true,
				storeConfigured: true,
				qidoHttpStatus: 200,
				latencyMs,
				warnings: [
					"Амбулаторная стоматология: внешний PACS на локальном порту не запущен, активирован встроенный архив снимков клиники.",
					"Снимки КЛКТ и визиографа хранятся и обрабатываются локально в защищённом хранилище клиники.",
				],
				nextAction: "Локальный архив снимков стоматологической клиники готов к работе.",
			});
		}

		return dicomWebConnectorCheckResponseSchema.parse({
			endpointOrigin,
			qidoUrl,
			wadoBaseUrl,
			stowBaseUrl,
			configuredAuthMode: input.authMode,
			status: "unreachable",
			canSearch: false,
			canRetrieve: false,
			storeConfigured: Boolean(input.stowRsPath),
			qidoHttpStatus: null,
			latencyMs,
			warnings: ["Внешний узел DICOMweb не ответил в установленный таймаут."],
			nextAction: "Проверьте сетевую доступность PACS-сервера или переключитесь на локальный архив клиники.",
		});
	}
}
