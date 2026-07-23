import fs from "node:fs";

const testPath = "apps/api/src/tests/persistentState.test.ts";
let content = fs.readFileSync(testPath, "utf8");

// Update imports
content = content.replace(
  'import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";',
  'import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";'
);
content = content.replace(
  'import { afterEach, beforeEach, describe, test } from "node:test";',
  'import { afterEach, beforeEach, describe, test, mock } from "node:test";'
);
content = content.replace(
  'import { savePersistentState } from "../persistentState.js";',
  'import { savePersistentState, rawFileHash } from "../persistentState.js";\nimport fsPromises from "node:fs/promises";'
);

const testSuite = `
describe("rawFileHash", () => {
    let tmpDir: string;
    let filePath: string;

    beforeEach(() => {
        tmpDir = path.join(os.tmpdir(), "dental-test-raw-hash-" + crypto.randomUUID());
        mkdirSync(tmpDir, { recursive: true });
        filePath = path.join(tmpDir, "test.txt");
    });

    afterEach(() => {
        mock.restoreAll();
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test("returns hash when file exists", async () => {
        const content = "hello world";
        writeFileSync(filePath, content);
        const hash = await rawFileHash(filePath);
        const expected = crypto.createHash("sha256").update(content).digest("hex");
        assert.strictEqual(hash, expected);
    });

    test("returns null when file does not exist", async () => {
        const hash = await rawFileHash(path.join(tmpDir, "does-not-exist.txt"));
        assert.strictEqual(hash, null);
    });

    test("returns null when fs.promises.readFile throws", async () => {
        writeFileSync(filePath, "content");
        mock.method(fsPromises, "readFile", async () => { throw new Error("Mock error"); });
        const hash = await rawFileHash(filePath);
        assert.strictEqual(hash, null);
    });
});
`;

content += testSuite;
fs.writeFileSync(testPath, content);
