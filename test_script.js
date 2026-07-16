import fs from "node:fs";
import { describe, test, mock } from "node:test";
import assert from "node:assert";

describe("Test", () => {
    test("my mock", async () => {
        mock.method(fs.promises, 'readFile', async () => { throw new Error("Mock Error"); });
        let threw = false;
        try {
            await fs.promises.readFile("test");
        } catch (e) {
            threw = true;
        }
        assert.ok(threw);
    });
});
