import { answerTelegramCallbackQuery, sendTelegramTextMessage, sendTelegramPhotoMessage } from "../apps/api/dist/telegramTransport.js";

async function run() {
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 12345 } }) };
  };

  // Test answerTelegramCallbackQuery
  const result = await answerTelegramCallbackQuery({
    botToken: "test-token",
    callbackQueryId: "test-query-id",
    text: "test text"
  });

  assert(result.ok, "Expected result to be ok");
  assert(calls.length === 1, "Expected exactly one fetch call");
  assert(calls[0].url === "https://api.telegram.org/bottest-token/answerCallbackQuery", `Unexpected url: ${calls[0].url}`);

  const body = JSON.parse(calls[0].init.body);
  assert(body.callback_query_id === "test-query-id", `Unexpected callback_query_id: ${body.callback_query_id}`);
  assert(body.text === "test text", `Unexpected text: ${body.text}`);

  // Test truncation
  calls.length = 0;
  await answerTelegramCallbackQuery({
    botToken: "test-token",
    callbackQueryId: "test-query-id",
    text: "A".repeat(250)
  });

  const body2 = JSON.parse(calls[0].init.body);
  assert(body2.text === "A".repeat(200), `Expected text to be truncated to 200 chars. Got length ${body2.text.length}`);

  // Test without text
  calls.length = 0;
  await answerTelegramCallbackQuery({
    botToken: "test-token",
    callbackQueryId: "test-query-id",
  });

  const body3 = JSON.parse(calls[0].init.body);
  assert(!("text" in body3), `Expected no text parameter if not provided`);

  // Test not ok response
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: false,
      status: 400,
      json: async () => ({
        parameters: { retry_after: 5 }
      })
    };
  };

  const resultError = await answerTelegramCallbackQuery({
    botToken: "test-token",
    callbackQueryId: "test-query-id"
  });

  assert(!resultError.ok, "Expected result to be not ok");
  assert(resultError.errorClass === "bad_request", `Unexpected error class: ${resultError.errorClass}`);
  assert(resultError.errorCode === 400, `Unexpected error code: ${resultError.errorCode}`);
  assert(resultError.retryAfterSeconds === 5, `Unexpected retry after: ${resultError.retryAfterSeconds}`);


  // Reset fetch
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 12345 } }) };
  };

  // Test sendTelegramTextMessage
  const textResult = await sendTelegramTextMessage({
    botToken: "test-token",
    chatId: "123",
    text: "hello text message"
  });

  assert(textResult.ok, "sendTelegramTextMessage ok");
  assert(textResult.telegramMessageId === 12345, "sendTelegramTextMessage id");

  const textBody = JSON.parse(calls[calls.length - 1].init.body);
  assert(textBody.text === "hello text message", "textBody.text");
  assert(textBody.chat_id === "123", "textBody.chat_id");


  // Test sendTelegramPhotoMessage
  const photoResult = await sendTelegramPhotoMessage({
    botToken: "test-token",
    chatId: "123",
    photoUrl: "https://example.com/photo.jpg",
    caption: "hello photo message"
  });

  assert(photoResult.ok, "sendTelegramPhotoMessage ok");
  assert(photoResult.telegramMessageId === 12345, "sendTelegramPhotoMessage id");

  const photoBody = JSON.parse(calls[calls.length - 1].init.body);
  assert(photoBody.caption === "hello photo message", "photoBody.caption");
  assert(photoBody.photo === "https://example.com/photo.jpg", "photoBody.photo");
  assert(photoBody.chat_id === "123", "photoBody.chat_id");


  console.log(JSON.stringify({ ok: true, telegramBot: "transport methods checked" }, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
