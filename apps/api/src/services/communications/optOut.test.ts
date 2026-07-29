import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { detectOptOutIntent, optOutAcknowledgement } from "./optOut.js";

describe("Opt-out detection", () => {
  test("Returns null for empty or purely punctuation input", () => {
    assert.equal(detectOptOutIntent(""), null);
    assert.equal(detectOptOutIntent(null), null);
    assert.equal(detectOptOutIntent(undefined), null);
    assert.equal(detectOptOutIntent("!!!"), null);
    assert.equal(detectOptOutIntent("   "), null);
  });

  test("Detects basic opt-out tokens", () => {
    assert.equal(detectOptOutIntent("стоп"), "opt_out");
    assert.equal(detectOptOutIntent("STOP"), "opt_out");
    assert.equal(detectOptOutIntent("отписка"), "opt_out");
  });

  test("Detects basic opt-in tokens", () => {
    assert.equal(detectOptOutIntent("старт"), "opt_in");
    assert.equal(detectOptOutIntent("START"), "opt_in");
  });

  test("Handles normalization: case, punctuation, and 'ё'", () => {
    assert.equal(detectOptOutIntent("  СтОп!!!  "), "opt_out");
  });

  test("Detects opt-out phrases", () => {
    assert.equal(detectOptOutIntent("не пишите"), "opt_out");
    assert.equal(detectOptOutIntent("больше не присылайте мне это"), "opt_out");
  });

  test("Detects short commands starting with a token", () => {
    assert.equal(detectOptOutIntent("стоп рассылку"), "opt_out");
    assert.equal(detectOptOutIntent("отписка смс"), "opt_out");
    assert.equal(detectOptOutIntent("старт рассылка"), "opt_in");
  });

  test("Rejects commands longer than MAX_COMMAND_WORDS if not a phrase", () => {
    // 4 words, should return null
    assert.equal(detectOptOutIntent("стоп а во сколько прием"), null);
    // 4 words but starts with phrase, should return opt_out
    assert.equal(detectOptOutIntent("не пишите мне больше пожалуйста"), "opt_out");
  });

  test("Rejects messages where token is not first", () => {
    assert.equal(detectOptOutIntent("а стоп"), null);
    assert.equal(detectOptOutIntent("хочу отписаться"), null);
  });
});

describe("optOutAcknowledgement", () => {
  test("Formats opt-out message correctly", () => {
    const msg = optOutAcknowledgement("opt_out", "Клиника");
    assert.ok(msg.startsWith("Клиника: вы отписаны от сообщений"));
  });

  test("Formats opt-in message correctly", () => {
    const msg = optOutAcknowledgement("opt_in", "Клиника");
    assert.ok(msg.startsWith("Клиника: рассылка возобновлена"));
  });
});
