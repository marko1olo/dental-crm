import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	publicSpeechProviderFailure,
	SpeechAsyncJobTimeoutError,
	transcribeAssemblyAi,
} from "../gateway.js";
import { SpeechProviderRequestError } from "../keyPool.js";

/**
 * Граница асинхронного распознавания AssemblyAI: сколько сервер ждёт результат,
 * что происходит с аудио пациента после обработки и когда сервер имеет право
 * бросить живое задание.
 *
 * Закрывает три дефекта одного модуля:
 *
 *  (a) опрос задания был ограничен 15 попытками с паузой 1000 мс — 15 секунд на
 *      всё задание. Диктовка приёма в этот срок не укладывается, и текст
 *      терялся, хотя провайдер его дописывал. Здесь длинное задание опрашивается
 *      далеко за прежний предел и доводится до готового текста, а исчерпанный
 *      бюджет ожидания доходит до врача именно как истёкшее ожидание, а не как
 *      «источник не вернул текст».
 *
 *  (b) удаления загруженного аудио и расшифровки у провайдера не было ни одной
 *      строкой, хотя продукт сообщал клинике об удалении. Здесь проверяется, что
 *      DELETE /v2/transcript/{id} действительно уходит — и на успехе, и на
 *      истёкшем ожидании, и на терминальном сбое, — а неудачное удаление не
 *      глотается: оно попадает и в лог, и в предупреждения фрагмента.
 *
 *  (c) ОДИН неудачный опрос убивал живое задание, а после появления удаления —
 *      убивал его безвозвратно. 429 на третьем опросе из двадцати четырёх уносил
 *      диктовку, которую провайдер закончил бы на пятом. Здесь единичный 429 и
 *      единичный оборванный опрос больше не трогают задание, повторной загрузки
 *      аудио не происходит, а осознанный отказ от задания (исчерпанный запас
 *      неудачных опросов или истёкший бюджет на серии отказов) обязан быть назван
 *      вслух: предупреждение фрагмента + запись в журнал сервера.
 *
 * Провайдер полностью подменён: ни одного сетевого запроса и ни одного реального
 * ключа. Ключ здесь — заведомая пустышка.
 */

const stubApiKey = "stub-key";
const stubAudio = Buffer.from("fake-audio-bytes");
const stubTranscriptId = "job-1";
const assemblyAiHost = "https://api.assemblyai.com";

type RecordedRequest = {
	url: string;
	method: string;
	authorization: string | null;
};

type FetchStub = {
	requests: RecordedRequest[];
	uploadCount: number;
	pollCount: number;
	deleteCount: number;
};

type StubScript = {
	/** Сколько ответов «задание ещё в работе» отдать до готового текста. */
	processingPolls: number;
	/** Никогда не завершаться: имитирует задание длиннее любого бюджета. */
	neverCompletes?: boolean;
	completedBody?: Record<string, unknown>;
	/** HTTP-код ответа на создание задания (400 = аудио уже загружено, задания нет). */
	transcriptCreateStatus?: number;
	/** HTTP-код ответа на удаление. */
	deleteStatus?: number;
	/** Обрыв связи на этом по счёту опросе (1 = на первом). */
	pollThrowsOnAttempt?: number;
	/** HTTP-код неудачного ответа на конкретных опросах: { 3: 429 }. */
	pollFailStatusByAttempt?: Record<number, number>;
	/** Все опросы отвечают этим кодом (для серии отказов). */
	pollFailStatusAlways?: number;
	/**
	 * Опрос, который обрывается по таймауту сокета. Имитируется через AbortError:
	 * fetchWithProviderTimeout превращает его в SpeechProviderRequestError с
	 * timedOut, ровно как настоящий обрыв, и НЕ уходит в ветку SOCKS5-туннеля.
	 */
	pollAbortsOnAttempts?: number[];
};

function abortLikeError(): Error {
	// Название формирует поведение: fetchWithProviderTimeout проверяет
	// error.name === "AbortError" ПЕРВЫМ и там же завершает обработку, поэтому
	// ветка «похоже на сетевую аварию -> поднять SSH-туннель и повторить запрос
	// МИМО подмены» не выполняется и тест не уходит в сеть.
	const error = new Error("stub: опрос отменён по таймауту");
	error.name = "AbortError";
	return error;
}

function installFetchStub(script: StubScript): FetchStub {
	const state: FetchStub = {
		requests: [],
		uploadCount: 0,
		pollCount: 0,
		deleteCount: 0,
	};

	globalThis.fetch = (async (
		input: unknown,
		init?: { method?: string; headers?: Record<string, string> },
	) => {
		const url = String(input);
		const method = (init?.method ?? "GET").toUpperCase();
		const headers = init?.headers ?? {};
		state.requests.push({
			url,
			method,
			authorization: headers.Authorization ?? null,
		});

		if (url === `${assemblyAiHost}/v2/upload`) {
			state.uploadCount += 1;
			return new Response(
				JSON.stringify({ upload_url: `${assemblyAiHost}/v2/upload/stub-file` }),
				{ status: 200 },
			);
		}

		if (url === `${assemblyAiHost}/v2/transcript` && method === "POST") {
			const status = script.transcriptCreateStatus ?? 200;
			if (status !== 200) {
				return new Response(JSON.stringify({ error: "stub create rejected" }), {
					status,
					statusText: "Bad Request",
				});
			}
			return new Response(JSON.stringify({ id: stubTranscriptId }), {
				status: 200,
			});
		}

		if (
			url === `${assemblyAiHost}/v2/transcript/${stubTranscriptId}` &&
			method === "DELETE"
		) {
			state.deleteCount += 1;
			const status = script.deleteStatus ?? 200;
			return new Response(
				JSON.stringify({ id: stubTranscriptId, status: "completed" }),
				{
					status,
					statusText: status === 200 ? "OK" : "Internal Server Error",
				},
			);
		}

		if (
			url === `${assemblyAiHost}/v2/transcript/${stubTranscriptId}` &&
			method === "GET"
		) {
			state.pollCount += 1;
			if (script.pollThrowsOnAttempt === state.pollCount) {
				// Формулировка намеренно не похожа на сетевую аварию: на сообщения вида
				// "fetch failed" fetchWithProviderTimeout поднимает SOCKS5-туннель и
				// повторяет запрос МИМО этой подмены, то есть тест уходил бы в сеть.
				throw new Error("stub: опрос прерван");
			}
			if (script.pollAbortsOnAttempts?.includes(state.pollCount)) {
				throw abortLikeError();
			}
			const failStatus =
				script.pollFailStatusAlways ??
				script.pollFailStatusByAttempt?.[state.pollCount];
			if (failStatus) {
				return new Response(JSON.stringify({ error: "stub poll rejected" }), {
					status: failStatus,
					statusText:
						failStatus === 429 ? "Too Many Requests" : "Service Unavailable",
				});
			}
			if (script.neverCompletes || state.pollCount <= script.processingPolls) {
				return new Response(JSON.stringify({ status: "processing" }), {
					status: 200,
				});
			}
			return new Response(
				JSON.stringify(
					script.completedBody ?? {
						status: "completed",
						text: "  Осмотр зуба 36  ",
						confidence: 0.93,
					},
				),
				{ status: 200 },
			);
		}

		throw new Error(`Тест не описывает запрос ${method} ${url}`);
	}) as typeof fetch;

	return state;
}

/** Журнал сервера — такое же доказательство записи, как и предупреждение фрагмента. */
function captureConsole(): {
	logged: { errors: string[]; warnings: string[] };
	restore: () => void;
} {
	const errors: string[] = [];
	const warnings: string[] = [];
	const originalError = console.error;
	const originalWarn = console.warn;
	console.error = (...args: unknown[]) => {
		errors.push(args.map((value) => String(value)).join(" "));
	};
	console.warn = (...args: unknown[]) => {
		warnings.push(args.map((value) => String(value)).join(" "));
	};
	return {
		logged: { errors, warnings },
		restore: () => {
			console.error = originalError;
			console.warn = originalWarn;
		},
	};
}

describe("AssemblyAI: бюджет ожидания задания и удаление аудио у провайдера", () => {
	let originalEnv: NodeJS.ProcessEnv;
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv };
		// Прокси уводит запрос в undici и мимо подменённого fetch.
		delete process.env.PROXY_URL;
		delete process.env.HTTPS_PROXY;
		delete process.env.HTTP_PROXY;
		delete process.env.ASSEMBLYAI_POLL_ATTEMPTS;
		delete process.env.ASSEMBLYAI_POLL_FAILURE_TOLERANCE;
		delete process.env.ASSEMBLYAI_DELETE_ATTEMPTS;
		delete process.env.ASSEMBLYAI_API_BASE_URL;
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		process.env = originalEnv;
	});

	it("длинное задание опрашивается далеко за прежний предел 15 попыток и отдаёт текст", async () => {
		// Прежний код: 15 попыток по 1000 мс. Здесь готовый текст приходит только на
		// 41-м опросе — при старом пределе фрагмент был бы потерян молча.
		const processingPolls = 40;
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		process.env.ASSEMBLYAI_POLL_MAX_INTERVAL_MS = "1";
		const stub = installFetchStub({ processingPolls });
		const warnings: string[] = [];

		const result = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		});

		assert.strictEqual(result.text, "Осмотр зуба 36");
		assert.strictEqual(result.confidence, 0.93);
		assert.strictEqual(stub.pollCount, processingPolls + 1);
		assert.ok(
			stub.pollCount > 15,
			`опросов должно быть больше прежнего предела 15, получено ${stub.pollCount}`,
		);
		// Удачное удаление молчит: лишнее предупреждение перевело бы качество
		// фрагмента в review на каждой нормальной диктовке.
		assert.deepStrictEqual(warnings, []);
	});

	it("после готового текста уходит DELETE расшифровки с ключом источника", async () => {
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		const stub = installFetchStub({ processingPolls: 0 });
		const warnings: string[] = [];

		await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		});

		const deletion = stub.requests.find(
			(request) => request.method === "DELETE",
		);
		assert.ok(deletion, "запрос на удаление расшифровки должен быть отправлен");
		assert.strictEqual(
			deletion.url,
			`${assemblyAiHost}/v2/transcript/${stubTranscriptId}`,
		);
		assert.strictEqual(deletion.authorization, stubApiKey);
		assert.strictEqual(stub.deleteCount, 1);
	});

	it("один 429 посреди опроса больше не убивает живое задание: текст приходит, аудио не загружается второй раз", async () => {
		// Ровно тот случай, из-за которого пакет вернулся на переделку: задание
		// завершается на 5-м опросе, а на 3-м провайдер ограничивает запросы. Прежний
		// код на этом ответе выходил из цикла, удалял расшифровку и отдавал наружу
		// повторяемую ошибку — то есть терял текст приёма и провоцировал вторую
		// полную загрузку аудио пациента другим ключом.
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		process.env.ASSEMBLYAI_POLL_MAX_INTERVAL_MS = "1";
		const stub = installFetchStub({
			processingPolls: 4,
			pollFailStatusByAttempt: { 3: 429 },
		});
		const warnings: string[] = [];
		const capture = captureConsole();

		let result: Awaited<ReturnType<typeof transcribeAssemblyAi>>;
		try {
			result = await transcribeAssemblyAi({
				apiKey: stubApiKey,
				audio: stubAudio,
				mimeType: "audio/webm",
				language: "ru",
				warnings,
			});
		} finally {
			capture.restore();
		}

		assert.strictEqual(result.text, "Осмотр зуба 36");
		assert.strictEqual(
			stub.pollCount,
			5,
			"опрос должен был дожить до пятой попытки",
		);
		assert.strictEqual(
			stub.uploadCount,
			1,
			"повторной загрузки аудио пациента быть не должно",
		);
		assert.strictEqual(
			stub.deleteCount,
			1,
			"расшифровка удаляется ровно один раз, на готовом тексте",
		);
		// Врача не трогаем: восстановившийся опрос не повод переводить фрагмент в review.
		assert.deepStrictEqual(warnings, []);
		// Но в журнале сервера сбой остаётся.
		assert.strictEqual(capture.logged.warnings.length, 1);
		assert.match(
			capture.logged.warnings[0] ?? "",
			/опрос задания N 3 не прошёл/,
		);
		assert.match(
			capture.logged.warnings[0] ?? "",
			/запас неудачных опросов 1\/3/,
		);
		assert.deepStrictEqual(capture.logged.errors, []);
	});

	it("оборванный опрос терпится: задание доживает до готового текста", async () => {
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		process.env.ASSEMBLYAI_POLL_MAX_INTERVAL_MS = "1";
		const stub = installFetchStub({
			processingPolls: 3,
			pollAbortsOnAttempts: [2],
		});
		const warnings: string[] = [];
		const capture = captureConsole();

		let result: Awaited<ReturnType<typeof transcribeAssemblyAi>>;
		try {
			result = await transcribeAssemblyAi({
				apiKey: stubApiKey,
				audio: stubAudio,
				mimeType: "audio/webm",
				language: "ru",
				warnings,
			});
		} finally {
			capture.restore();
		}

		assert.strictEqual(result.text, "Осмотр зуба 36");
		assert.strictEqual(stub.pollCount, 4);
		assert.strictEqual(stub.uploadCount, 1);
		assert.strictEqual(stub.deleteCount, 1);
		assert.deepStrictEqual(warnings, []);
		assert.strictEqual(capture.logged.warnings.length, 1);
		assert.match(
			capture.logged.warnings[0] ?? "",
			/опрос задания N 2 не прошёл/,
		);
	});

	it("исчерпанный запас неудачных опросов бросает задание, но не молча: предупреждение врачу и запись в журнал", async () => {
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		process.env.ASSEMBLYAI_POLL_MAX_INTERVAL_MS = "1";
		process.env.ASSEMBLYAI_POLL_FAILURE_TOLERANCE = "2";
		const stub = installFetchStub({
			processingPolls: 10,
			pollFailStatusByAttempt: { 1: 429, 2: 429, 3: 429 },
		});
		const warnings: string[] = [];
		const capture = captureConsole();

		const error = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		})
			.then(
				() => null,
				(thrown: unknown) => thrown,
			)
			.finally(() => capture.restore());

		assert.ok(
			error instanceof SpeechProviderRequestError,
			`ожидался SpeechProviderRequestError, получено ${String(error)}`,
		);
		assert.strictEqual(error.statusCode, 429);
		// Запас 2: первые два отказа терпим, отказ наступает на третьем.
		assert.strictEqual(
			stub.pollCount,
			3,
			`опросов должно быть 3, получено ${stub.pollCount}`,
		);
		assert.strictEqual(
			stub.deleteCount,
			1,
			"брошенное задание обязано быть удалено у источника",
		);
		assert.strictEqual(
			warnings.length,
			1,
			`ожидалось одно предупреждение врачу, получено ${JSON.stringify(warnings)}`,
		);
		assert.match(warnings[0] ?? "", /3 опроса задания подряд не прошли/);
		assert.match(warnings[0] ?? "", /оставалось в работе/);
		assert.match(warnings[0] ?? "", /отправьте фрагмент заново/);
		assert.ok(
			capture.logged.errors.some(
				(line) =>
					/\[SpeechGateway\]/.test(line) &&
					/3 опроса задания подряд не прошли/.test(line),
			),
			`запись об отказе должна быть в журнале сервера, получено ${JSON.stringify(capture.logged.errors)}`,
		);
	});

	it("бюджет ожидания, истёкший на серии неудачных опросов, называет причину, а не выдаёт медлительность источника", async () => {
		/*
		 * МАСШТАБ ВРЕМЕНИ, А НЕ ЕГО ЗНАЧЕНИЯ. Здесь стояли бюджет 60 мс и шаг 5 мс.
		 * Отношение то же, что сейчас (в бюджет влезает около двенадцати опросов), но
		 * абсолютные величины были меньше разброса планировщика: `node --test` гоняет
		 * файлы параллельно, и под нагрузкой от десятка процессов один setTimeout на
		 * 5 мс растягивался за весь 60-миллисекундный бюджет. Тогда в бюджет влезал
		 * ОДИН опрос, и утверждение `pollCount >= 2` падало — примерно в трёх полных
		 * прогонах из девяти, каждый раз выглядя новым дефектом.
		 *
		 * Ни одно утверждение не ослаблено: проверяется по-прежнему, что цикл вышел
		 * ПО ВРЕМЕНИ (запас неудач заведомо больше числа опросов), что опросов было
		 * больше одного и что причина названа словами. Изменён только масштаб, на
		 * котором это измеряется, — чтобы измерение перестало зависеть от загрузки
		 * машины. Файл и без того идёт около трёх секунд, так что цена нулевая.
		 */
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "1200";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "100";
		process.env.ASSEMBLYAI_POLL_MAX_INTERVAL_MS = "100";
		// Запас заведомо больше числа опросов, которые влезают в бюджет: выход из
		// цикла произойдёт по времени, а не по запасу.
		process.env.ASSEMBLYAI_POLL_FAILURE_TOLERANCE = "500";
		const stub = installFetchStub({
			processingPolls: 0,
			pollFailStatusAlways: 503,
		});
		const warnings: string[] = [];
		const capture = captureConsole();

		const error = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		})
			.then(
				() => null,
				(thrown: unknown) => thrown,
			)
			.finally(() => capture.restore());

		assert.ok(
			error instanceof SpeechAsyncJobTimeoutError,
			`ожидался SpeechAsyncJobTimeoutError, получено ${String(error)}`,
		);
		assert.ok(
			stub.pollCount >= 2,
			`опросов должно быть больше одного, получено ${stub.pollCount}`,
		);
		assert.strictEqual(stub.deleteCount, 1);
		assert.strictEqual(
			warnings.length,
			1,
			`ожидалось одно предупреждение врачу, получено ${JSON.stringify(warnings)}`,
		);
		assert.match(warnings[0] ?? "", /бюджет ожидания истёк/);
		assert.match(warnings[0] ?? "", /у источника временный сбой/);
		assert.ok(
			capture.logged.errors.some(
				(line) =>
					/\[SpeechGateway\]/.test(line) && /бюджет ожидания истёк/.test(line),
			),
			"причина брошенного задания обязана быть в журнале сервера",
		);
	});

	it("исчерпанный бюджет ожидания доходит до врача как истёкшее ожидание, а не как молчание источника", async () => {
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "30";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "5";
		process.env.ASSEMBLYAI_POLL_MAX_INTERVAL_MS = "5";
		const stub = installFetchStub({ processingPolls: 0, neverCompletes: true });
		const warnings: string[] = [];

		const error = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		}).then(
			() => null,
			(thrown: unknown) => thrown,
		);

		assert.ok(
			error instanceof SpeechAsyncJobTimeoutError,
			`ожидался SpeechAsyncJobTimeoutError, получено ${String(error)}`,
		);
		assert.ok(error.pollCount >= 1, "опрос должен был состояться хотя бы раз");
		assert.ok(
			error.waitedMs >= 30,
			`ожидание должно покрыть бюджет, получено ${error.waitedMs} мс`,
		);

		// Именно эта строка попадает в предупреждения фрагмента и видна врачу.
		const doctorVisible = publicSpeechProviderFailure("AssemblyAI", error);
		assert.match(
			doctorVisible,
			/задание распознавания не завершилось за \d+ сек\. после \d+ опросов/,
		);
		assert.doesNotMatch(doctorVisible, /не вернул готовый текст/);

		// Задание недостижимо для CRM: его идентификатор нигде не хранится, поэтому
		// аудио у провайдера — только утечка, и оно удаляется.
		assert.strictEqual(stub.deleteCount, 1);
		// Опросы проходили штатно, бросать было нечего: отдельного предупреждения о
		// брошенном задании быть не должно.
		assert.deepStrictEqual(warnings, []);
	});

	it("неудачное удаление не глотается: попадает в лог и в предупреждения фрагмента", async () => {
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		process.env.ASSEMBLYAI_DELETE_ATTEMPTS = "2";
		const stub = installFetchStub({ processingPolls: 0, deleteStatus: 500 });
		const warnings: string[] = [];
		const capture = captureConsole();

		let result: Awaited<ReturnType<typeof transcribeAssemblyAi>>;
		try {
			result = await transcribeAssemblyAi({
				apiKey: stubApiKey,
				audio: stubAudio,
				mimeType: "audio/webm",
				language: "ru",
				warnings,
			});
		} finally {
			capture.restore();
		}

		// Провал удаления не имеет права уничтожать медицинский текст.
		assert.strictEqual(result.text, "Осмотр зуба 36");
		assert.strictEqual(
			stub.deleteCount,
			2,
			"обе попытки удаления должны быть выполнены",
		);
		assert.strictEqual(warnings.length, 1);
		assert.match(
			warnings[0] ?? "",
			/не удалось удалить загруженное аудио и расшифровку у источника/,
		);
		assert.match(warnings[0] ?? "", /500/);
		assert.match(warnings[0] ?? "", /попыток 2/);
		assert.match(warnings[0] ?? "", /осталась у внешнего источника/);
		assert.strictEqual(capture.logged.errors.length, 1);
		assert.match(capture.logged.errors[0] ?? "", /\[SpeechGateway\]/);
	});

	it("аудио загружено, а задание не создано: продукт не обещает удаление, которого нет", async () => {
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		const stub = installFetchStub({
			processingPolls: 0,
			transcriptCreateStatus: 400,
		});
		const warnings: string[] = [];

		const error = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		}).then(
			() => null,
			(thrown: unknown) => thrown,
		);

		assert.ok(
			error instanceof Error,
			"создание задания должно завершиться ошибкой",
		);
		assert.strictEqual(
			stub.deleteCount,
			0,
			"удалять нечего: расшифровки, вместе с которой уходит файл, не создалось",
		);
		assert.strictEqual(warnings.length, 1);
		assert.match(
			warnings[0] ?? "",
			/аудио загружено, но задание распознавания не создано/,
		);
		assert.match(warnings[0] ?? "", /остаётся у источника/);
	});

	it("неповторяемый сбой опроса терминален и всё равно удаляет аудио у провайдера", async () => {
		// Пятый выход из цикла: ошибка, которую повторять бессмысленно, обязана
		// закрыть задание — и обязана унести с собой загруженное аудио, а не оставить
		// голос пациента у провайдера.
		process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
		process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
		const stub = installFetchStub({
			processingPolls: 5,
			pollThrowsOnAttempt: 2,
		});
		const warnings: string[] = [];

		const error = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		}).then(
			() => null,
			(thrown: unknown) => thrown,
		);

		assert.ok(error instanceof Error);
		assert.match(error.message, /опрос прерван/);
		assert.strictEqual(
			stub.pollCount,
			2,
			"падение должно случиться на втором опросе",
		);
		assert.strictEqual(
			stub.deleteCount,
			1,
			"упавший опрос не имеет права оставлять аудио у провайдера",
		);
	});

	it("неверный ASSEMBLYAI_API_BASE_URL не подменяется молча на публичный хост", async () => {
		process.env.ASSEMBLYAI_API_BASE_URL = "api.eu.assemblyai.com";
		const stub = installFetchStub({ processingPolls: 0 });
		const warnings: string[] = [];

		const error = await transcribeAssemblyAi({
			apiKey: stubApiKey,
			audio: stubAudio,
			mimeType: "audio/webm",
			language: "ru",
			warnings,
		}).then(
			() => null,
			(thrown: unknown) => thrown,
		);

		assert.ok(error instanceof Error);
		assert.match(error.message, /ASSEMBLYAI_API_BASE_URL/);
		assert.strictEqual(
			stub.requests.length,
			0,
			"ни один запрос не должен уйти на неизвестный хост",
		);
	});
});
