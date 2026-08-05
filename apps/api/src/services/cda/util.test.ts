import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MO_ROOT } from "./util.js";

describe("cda util", () => {
    it("exports correct DEFAULT_MO_ROOT", () => {
        assert.equal(DEFAULT_MO_ROOT, "1.2.643.5.1.13.13.12.2");
    });
});
