import { describe, it } from "node:test";
import assert from "node:assert";
import { speechJsonBodyLimitBytes } from "../gateway.js";

describe("speechJsonBodyLimitBytes", () => {
  it("should calculate correct limit based on default env value when env var is not set", () => {
    const originalEnv = process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
    try {
      delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;

      // 6_000_000 is default * 1.4 + 4096 = 8404096
      assert.strictEqual(speechJsonBodyLimitBytes(), 8404096);
    } finally {
      if (originalEnv !== undefined) {
        process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = originalEnv;
      }
    }
  });

  it("should calculate correct limit based on custom env value", () => {
    const originalEnv = process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
    try {
      process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = "1000000";

      // 1_000_000 * 1.4 = 1_400_000. 1_400_000 + 4096 = 1404096
      assert.strictEqual(speechJsonBodyLimitBytes(), 1404096);
    } finally {
      if (originalEnv !== undefined) {
        process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = originalEnv;
      } else {
        delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
      }
    }
  });
});
