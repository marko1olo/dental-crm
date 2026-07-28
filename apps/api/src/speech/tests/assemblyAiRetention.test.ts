import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import {
  SpeechAsyncJobTimeoutError,
  publicSpeechProviderFailure,
  transcribeAssemblyAi
} from "../gateway.js";

/**
 * Граница асинхронного распознавания AssemblyAI: сколько сервер ждёт результат и
 * что происходит с аудио пациента после обработки.
 *
 * Закрывает два дефекта одного модуля:
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
 *      истёкшем ожидании, — а неудачное удаление не глотается: оно попадает и в
 *      лог, и в предупреждения фрагмента.
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
};

function installFetchStub(script: StubScript): FetchStub {
  const state: FetchStub = { requests: [], pollCount: 0, deleteCount: 0 };

  globalThis.fetch = (async (input: unknown, init?: { method?: string; headers?: Record<string, string> }) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = init?.headers ?? {};
    state.requests.push({ url, method, authorization: headers.Authorization ?? null });

    if (url === `${assemblyAiHost}/v2/upload`) {
      return new Response(JSON.stringify({ upload_url: `${assemblyAiHost}/v2/upload/stub-file` }), { status: 200 });
    }

    if (url === `${assemblyAiHost}/v2/transcript` && method === "POST") {
      const status = script.transcriptCreateStatus ?? 200;
      if (status !== 200) {
        return new Response(JSON.stringify({ error: "stub create rejected" }), { status, statusText: "Bad Request" });
      }
      return new Response(JSON.stringify({ id: stubTranscriptId }), { status: 200 });
    }

    if (url === `${assemblyAiHost}/v2/transcript/${stubTranscriptId}` && method === "DELETE") {
      state.deleteCount += 1;
      const status = script.deleteStatus ?? 200;
      return new Response(JSON.stringify({ id: stubTranscriptId, status: "completed" }), {
        status,
        statusText: status === 200 ? "OK" : "Internal Server Error"
      });
    }

    if (url === `${assemblyAiHost}/v2/transcript/${stubTranscriptId}` && method === "GET") {
      state.pollCount += 1;
      if (script.pollThrowsOnAttempt === state.pollCount) {
        // Формулировка намеренно не похожа на сетевую аварию: на сообщения вида
        // "fetch failed" fetchWithProviderTimeout поднимает SOCKS5-туннель и
        // повторяет запрос МИМО этой подмены, то есть тест уходил бы в сеть.
        throw new Error("stub: опрос прерван");
      }
      if (script.neverCompletes || state.pollCount <= script.processingPolls) {
        return new Response(JSON.stringify({ status: "processing" }), { status: 200 });
      }
      return new Response(
        JSON.stringify(script.completedBody ?? { status: "completed", text: "  Осмотр зуба 36  ", confidence: 0.93 }),
        { status: 200 }
      );
    }

    throw new Error(`Тест не описывает запрос ${method} ${url}`);
  }) as typeof fetch;

  return state;
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
      warnings
    });

    assert.strictEqual(result.text, "Осмотр зуба 36");
    assert.strictEqual(result.confidence, 0.93);
    assert.strictEqual(stub.pollCount, processingPolls + 1);
    assert.ok(stub.pollCount > 15, `опросов должно быть больше прежнего предела 15, получено ${stub.pollCount}`);
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
      warnings
    });

    const deletion = stub.requests.find((request) => request.method === "DELETE");
    assert.ok(deletion, "запрос на удаление расшифровки должен быть отправлен");
    assert.strictEqual(deletion.url, `${assemblyAiHost}/v2/transcript/${stubTranscriptId}`);
    assert.strictEqual(deletion.authorization, stubApiKey);
    assert.strictEqual(stub.deleteCount, 1);
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
      warnings
    }).then(
      () => null,
      (thrown: unknown) => thrown
    );

    assert.ok(error instanceof SpeechAsyncJobTimeoutError, `ожидался SpeechAsyncJobTimeoutError, получено ${String(error)}`);
    assert.ok(error.pollCount >= 1, "опрос должен был состояться хотя бы раз");
    assert.ok(error.waitedMs >= 30, `ожидание должно покрыть бюджет, получено ${error.waitedMs} мс`);

    // Именно эта строка попадает в предупреждения фрагмента и видна врачу.
    const doctorVisible = publicSpeechProviderFailure("AssemblyAI", error);
    assert.match(doctorVisible, /задание распознавания не завершилось за \d+ сек\. после \d+ опросов/);
    assert.doesNotMatch(doctorVisible, /не вернул готовый текст/);

    // Задание недостижимо для CRM: его идентификатор нигде не хранится, поэтому
    // аудио у провайдера — только утечка, и оно удаляется.
    assert.strictEqual(stub.deleteCount, 1);
    assert.deepStrictEqual(warnings, []);
  });

  it("неудачное удаление не глотается: попадает в лог и в предупреждения фрагмента", async () => {
    process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
    process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
    process.env.ASSEMBLYAI_DELETE_ATTEMPTS = "2";
    const stub = installFetchStub({ processingPolls: 0, deleteStatus: 500 });
    const warnings: string[] = [];
    const loggedErrors: string[] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      loggedErrors.push(args.map((value) => String(value)).join(" "));
    };

    let result: Awaited<ReturnType<typeof transcribeAssemblyAi>>;
    try {
      result = await transcribeAssemblyAi({
        apiKey: stubApiKey,
        audio: stubAudio,
        mimeType: "audio/webm",
        language: "ru",
        warnings
      });
    } finally {
      console.error = originalConsoleError;
    }

    // Провал удаления не имеет права уничтожать медицинский текст.
    assert.strictEqual(result.text, "Осмотр зуба 36");
    assert.strictEqual(stub.deleteCount, 2, "обе попытки удаления должны быть выполнены");
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0] ?? "", /не удалось удалить загруженное аудио и расшифровку у источника/);
    assert.match(warnings[0] ?? "", /500/);
    assert.match(warnings[0] ?? "", /попыток 2/);
    assert.match(warnings[0] ?? "", /осталась у внешнего источника/);
    assert.strictEqual(loggedErrors.length, 1);
    assert.match(loggedErrors[0] ?? "", /\[SpeechGateway\]/);
  });

  it("аудио загружено, а задание не создано: продукт не обещает удаление, которого нет", async () => {
    process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
    process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
    const stub = installFetchStub({ processingPolls: 0, transcriptCreateStatus: 400 });
    const warnings: string[] = [];

    const error = await transcribeAssemblyAi({
      apiKey: stubApiKey,
      audio: stubAudio,
      mimeType: "audio/webm",
      language: "ru",
      warnings
    }).then(
      () => null,
      (thrown: unknown) => thrown
    );

    assert.ok(error instanceof Error, "создание задания должно завершиться ошибкой");
    assert.strictEqual(stub.deleteCount, 0, "удалять нечего: расшифровки, вместе с которой уходит файл, не создалось");
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0] ?? "", /аудио загружено, но задание распознавания не создано/);
    assert.match(warnings[0] ?? "", /остаётся у источника/);
  });

  it("обрыв связи посреди опроса тоже удаляет аудио у провайдера, а не бросает его там", async () => {
    process.env.ASSEMBLYAI_POLL_TIMEOUT_MS = "60000";
    process.env.ASSEMBLYAI_POLL_INTERVAL_MS = "1";
    const stub = installFetchStub({ processingPolls: 5, pollThrowsOnAttempt: 2 });
    const warnings: string[] = [];

    const error = await transcribeAssemblyAi({
      apiKey: stubApiKey,
      audio: stubAudio,
      mimeType: "audio/webm",
      language: "ru",
      warnings
    }).then(
      () => null,
      (thrown: unknown) => thrown
    );

    assert.ok(error instanceof Error);
    assert.match(error.message, /опрос прерван/);
    assert.strictEqual(stub.pollCount, 2, "падение должно случиться на втором опросе");
    assert.strictEqual(stub.deleteCount, 1, "упавший опрос не имеет права оставлять аудио у провайдера");
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
      warnings
    }).then(
      () => null,
      (thrown: unknown) => thrown
    );

    assert.ok(error instanceof Error);
    assert.match(error.message, /ASSEMBLYAI_API_BASE_URL/);
    assert.strictEqual(stub.requests.length, 0, "ни один запрос не должен уйти на неизвестный хост");
  });
});
