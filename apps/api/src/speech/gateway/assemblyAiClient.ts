import type {
	DentalSpecialty,
	SpeechChunkUploadInput,
} from "@dental/shared";
import {
	fetchWithProviderTimeout,
	numberFromEnv,
	providerHttpError,
	sanitizeProviderErrorMessage,
	SpeechProviderRequestError,
} from "../keyPool.js";
import {
	looksLikeTransientNetworkFailure,
	normalizeLanguage,
	speechProviderFailureReason,
} from "./audioBufferUtils.js";
import {
	type AssemblyAiPollPayload,
	type AssemblyAiPollPolicy,
	providerLabels,
	type ProviderTranscript,
	SpeechAsyncJobTimeoutError,
	type SpeechRemoteArtifactDeletion,
} from "./types.js";

/**
 * Базовый адрес AssemblyAI. Вынесен в окружение не ради стиля: удаление данных в
 * европейском контуре провайдера обслуживает отдельный хост
 * (`api.eu.assemblyai.com`), и клиника, обязанная удалять записи в ЕС, должна
 * указывать его настройкой, а не правкой кода. Неверное значение не подменяется
 * молча на дефолт — иначе аудио уходило бы в другой контур, чем думает клиника.
 */
export function assemblyAiBaseUrl(): string {
	const configured = (process.env.ASSEMBLYAI_API_BASE_URL ?? "").trim();
	if (!configured) return "https://api.assemblyai.com";
	if (!/^https?:\/\//i.test(configured)) {
		throw new Error(
			"ASSEMBLYAI_API_BASE_URL должен начинаться с http:// или https://; исправьте серверные настройки распознавания.",
		);
	}
	return configured.replace(/\/+$/, "");
}

/**
 * Бюджет ожидания асинхронного задания AssemblyAI.
 */
export function assemblyAiPollPolicy(): AssemblyAiPollPolicy {
	const budgetMs = numberFromEnv("ASSEMBLYAI_POLL_TIMEOUT_MS", 300_000);
	const firstIntervalMs = numberFromEnv("ASSEMBLYAI_POLL_INTERVAL_MS", 1_000);
	const maxIntervalMs = Math.max(
		firstIntervalMs,
		numberFromEnv("ASSEMBLYAI_POLL_MAX_INTERVAL_MS", 15_000),
	);
	return {
		budgetMs,
		firstIntervalMs,
		maxIntervalMs,
		maxAttempts: numberFromEnv(
			"ASSEMBLYAI_POLL_ATTEMPTS",
			Math.max(1, Math.ceil(budgetMs / firstIntervalMs)),
		),
		failureTolerance: Math.max(
			1,
			numberFromEnv("ASSEMBLYAI_POLL_FAILURE_TOLERANCE", 3),
		),
	};
}

/**
 * Можно ли считать неудачу ОДНОГО опроса задания поводом продолжать ожидание.
 */
export function isRecoverablePollFailure(error: unknown): boolean {
	if (error instanceof SpeechProviderRequestError) {
		if (error.timedOut || error.rateLimited) return true;
		const statusCode = error.statusCode;
		return statusCode === 408 || (statusCode !== null && statusCode >= 500);
	}
	return looksLikeTransientNetworkFailure(error);
}

export function assemblyAiDeleteTimeoutMs(): number {
	return numberFromEnv("ASSEMBLYAI_DELETE_TIMEOUT_MS", 10_000);
}

export function assemblyAiDeleteAttempts(): number {
	return Math.max(1, numberFromEnv("ASSEMBLYAI_DELETE_ATTEMPTS", 2));
}

/**
 * Пауза между опросами задания.
 */
export function waitBetweenPolls(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			clearTimeout(timer);
			resolve();
		}, ms);
	});
}

/**
 * Удаление расшифровки и загруженного аудио на стороне AssemblyAI.
 */
export async function deleteAssemblyAiTranscript(input: {
	apiKey: string;
	transcriptId: string;
}): Promise<SpeechRemoteArtifactDeletion> {
	const attemptLimit = assemblyAiDeleteAttempts();
	let failureReason: string | null = null;

	for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
		try {
			const response = await fetchWithProviderTimeout(
				`${assemblyAiBaseUrl()}/v2/transcript/${encodeURIComponent(input.transcriptId)}`,
				{
					method: "DELETE",
					headers: { Authorization: input.apiKey },
				},
				assemblyAiDeleteTimeoutMs(),
			);
			await response.body?.cancel().catch(() => undefined);
			if (response.ok || response.status === 404) {
				return { deleted: true, attempts: attempt, failureReason: null };
			}
			failureReason = sanitizeProviderErrorMessage(
				`${response.status} ${response.statusText}`,
			);
		} catch (error) {
			failureReason = sanitizeProviderErrorMessage(
				error instanceof Error ? error.message : String(error ?? ""),
			);
		}
	}

	return {
		deleted: false,
		attempts: attemptLimit,
		failureReason: failureReason ?? "источник не подтвердил удаление",
	};
}

/**
 * Неудачное удаление обязано быть записано и показано.
 */
export function reportRemoteArtifactDeletion(input: {
	providerLabel: string;
	deletion: SpeechRemoteArtifactDeletion;
	warnings: string[];
}): void {
	if (input.deletion.deleted) return;
	const warning = `${input.providerLabel}: не удалось удалить загруженное аудио и расшифровку у источника (${(
		input.deletion.failureReason ?? "причина не сообщена"
	).slice(
		0,
		80,
	)}), попыток ${input.deletion.attempts}. Запись голоса пациента осталась у внешнего источника: удалите её в его панели.`;
	console.error(`[SpeechGateway] ${warning}`);
	input.warnings.push(warning);
}

/**
 * Живое задание, от которого CRM отказалась, обязано быть названо вслух.
 */
export function reportAbandonedRemoteJob(input: {
	providerLabel: string;
	consecutiveFailures: number;
	pollCount: number;
	failure: unknown;
	budgetExhausted: boolean;
	warnings: string[];
}): void {
	const reason = speechProviderFailureReason(input.failure);
	const cause = input.budgetExhausted
		? `бюджет ожидания истёк, а последние неудачные опросы (${input.consecutiveFailures}) так и не прошли: ${reason}`
		: `${input.consecutiveFailures} опроса задания подряд не прошли: ${reason}`;
	const warning = `${input.providerLabel}: ${cause} (всего опросов ${input.pollCount}). Задание распознавания у источника оставалось в работе, но CRM прекратила ожидание и запрашивает удаление задания вместе с загруженным аудио, поэтому текст этого фрагмента получить уже нельзя — отправьте фрагмент заново.`;
	console.error(`[SpeechGateway] ${warning}`);
	input.warnings.push(warning);
}

export async function transcribeAssemblyAi(input: {
	apiKey: string;
	audio: Buffer;
	mimeType: string;
	language: string;
	specialty?: DentalSpecialty | null;
	source?: SpeechChunkUploadInput["source"];
	/**
	 * Предупреждения о судьбе аудио пишутся в массив вызывающей стороны, а не в
	 * возвращаемый ProviderTranscript: на отказе распознавания результата нет, а
	 * сказать врачу, что голос пациента остался у провайдера, всё равно обязаны.
	 */
	warnings: string[];
}): Promise<ProviderTranscript> {
	const providerLabel = providerLabels.assemblyai_async;
	const baseUrl = assemblyAiBaseUrl();
	const uploadResponse = await fetchWithProviderTimeout(
		`${baseUrl}/v2/upload`,
		{
			method: "POST",
			headers: {
				Authorization: input.apiKey,
				"Content-Type": input.mimeType,
			},
			body: input.audio,
		},
	);
	const uploadPayload = (await uploadResponse.json().catch(() => ({}))) as {
		upload_url?: string;
		error?: string;
	};
	if (!uploadResponse.ok || !uploadPayload.upload_url) {
		throw providerHttpError(
			uploadResponse.status,
			uploadResponse.statusText,
			uploadPayload.error,
		);
	}

	const transcriptResponse = await fetchWithProviderTimeout(
		`${baseUrl}/v2/transcript`,
		{
			method: "POST",
			headers: {
				Authorization: input.apiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				audio_url: uploadPayload.upload_url,
				language_code: normalizeLanguage(input.language),
				punctuate: true,
				format_text: true,
			}),
		},
	);
	const transcriptPayload = (await transcriptResponse
		.json()
		.catch(() => ({}))) as { id?: string; error?: string };
	const transcriptId = transcriptPayload.id;
	if (!transcriptResponse.ok || !transcriptId) {
		input.warnings.push(
			`${providerLabel}: аудио загружено, но задание распознавания не создано; удалить такой файл можно только вместе с расшифровкой, поэтому он остаётся у источника до его собственной очистки.`,
		);
		throw providerHttpError(
			transcriptResponse.status,
			transcriptResponse.statusText,
			transcriptPayload.error,
		);
	}

	const removeRemoteArtifacts = async (): Promise<void> => {
		reportRemoteArtifactDeletion({
			providerLabel,
			deletion: await deleteAssemblyAiTranscript({
				apiKey: input.apiKey,
				transcriptId,
			}),
			warnings: input.warnings,
		});
	};

	const policy = assemblyAiPollPolicy();
	const startedAt = Date.now();
	let intervalMs = policy.firstIntervalMs;
	let pollCount = 0;
	let completed: ProviderTranscript | null = null;
	let failure: unknown = null;

	let consecutivePollFailures = 0;
	let lastPollFailure: unknown = null;
	try {
		while (pollCount < policy.maxAttempts) {
			const elapsedMs = Date.now() - startedAt;
			if (elapsedMs >= policy.budgetMs) break;
			await waitBetweenPolls(
				Math.max(1, Math.min(intervalMs, policy.budgetMs - elapsedMs)),
			);
			intervalMs = Math.min(intervalMs * 2, policy.maxIntervalMs);
			pollCount += 1;

			let pollPayload: AssemblyAiPollPayload;
			try {
				const pollResponse = await fetchWithProviderTimeout(
					`${baseUrl}/v2/transcript/${encodeURIComponent(transcriptId)}`,
					{
						headers: { Authorization: input.apiKey },
					},
				);
				const parsedPayload = (await pollResponse
					.json()
					.catch(() => ({}))) as AssemblyAiPollPayload;
				if (!pollResponse.ok) {
					throw providerHttpError(
						pollResponse.status,
						pollResponse.statusText,
						parsedPayload.error,
					);
				}
				pollPayload = parsedPayload;
			} catch (pollError) {
				lastPollFailure = pollError;
				if (!isRecoverablePollFailure(pollError)) {
					failure = pollError;
					break;
				}
				consecutivePollFailures += 1;
				if (consecutivePollFailures > policy.failureTolerance) {
					reportAbandonedRemoteJob({
						providerLabel,
						consecutiveFailures: consecutivePollFailures,
						pollCount,
						failure: pollError,
						budgetExhausted: false,
						warnings: input.warnings,
					});
					failure = pollError;
					break;
				}
				console.warn(
					`[SpeechGateway] ${providerLabel}: опрос задания N ${pollCount} не прошёл (${speechProviderFailureReason(
						pollError,
					)}); задание живо, ожидание продолжается, запас неудачных опросов ${consecutivePollFailures}/${
						policy.failureTolerance
					}.`,
				);
				continue;
			}

			consecutivePollFailures = 0;
			lastPollFailure = null;
			if (pollPayload.status === "completed") {
				completed = {
					text: pollPayload.text?.trim() ?? "",
					confidence:
						typeof pollPayload.confidence === "number"
							? pollPayload.confidence
							: null,
					warnings: [],
				};
				break;
			}
			if (pollPayload.status === "error") {
				failure = new Error(
					"AssemblyAI не вернул готовый текст; локальный черновик сохранен, повторите отправку позже.",
				);
				break;
			}
		}
	} catch (error) {
		failure = error;
	}

	if (
		failure === null &&
		completed === null &&
		consecutivePollFailures > 0 &&
		lastPollFailure !== null
	) {
		reportAbandonedRemoteJob({
			providerLabel,
			consecutiveFailures: consecutivePollFailures,
			pollCount,
			failure: lastPollFailure,
			budgetExhausted: true,
			warnings: input.warnings,
		});
	}

	const waitedMs = Date.now() - startedAt;
	await removeRemoteArtifacts();

	if (failure !== null) throw failure;
	if (completed) return completed;

	throw new SpeechAsyncJobTimeoutError({ providerLabel, waitedMs, pollCount });
}
