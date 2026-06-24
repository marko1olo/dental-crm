import { test, describe } from "node:test";
import assert from "node:assert";
import { documentHasUnresolvedPlaceholders } from "./renderDocument.js";

describe("documentHasUnresolvedPlaceholders", () => {
  test("returns false for HTML without placeholders", () => {
    const html = "<p>This is a normal document without placeholders.</p>";
    assert.strictEqual(documentHasUnresolvedPlaceholders(html), false);
  });

  test("returns true for various unresolved placeholders", () => {
    const placeholders = [
      "{ ",
      " { ",
      " {_",
      "_} ",
      " }"
    ];

    for (const text of placeholders) {
      const html = `<p>${text}</p>`;
      assert.strictEqual(
        documentHasUnresolvedPlaceholders(html),
        true,
        `Expected to return true for text containing: ${text}`
      );
    }
  });

  test("ignores placeholders inside signatures block", () => {
    const html = `
      <p>Main document text.</p>
      <div class="signatures">
        Doctor signature: {_
      </div>
    `;
    assert.strictEqual(documentHasUnresolvedPlaceholders(html), false);
  });

  test("detects placeholders if present both inside and outside signatures block", () => {
    const html = `
      <p>Missing value: { </p>
      <div class="signatures">
        Doctor signature: {_
      </div>
    `;
    assert.strictEqual(documentHasUnresolvedPlaceholders(html), true);
  });
});
