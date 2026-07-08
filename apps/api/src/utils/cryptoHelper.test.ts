import { test, describe } from "node:test";
import * as assert from "node:assert";
import { verifyCredential } from "./cryptoHelper.js";

describe("cryptoHelper", () => {
  describe("verifyCredential", () => {
    test("returns false on error (catch block)", () => {
      // Pass null to force an error in stored.split(':')
      // @ts-expect-error forcing null for error path testing
      assert.strictEqual(verifyCredential("password", null), false);
    });
  });
});
