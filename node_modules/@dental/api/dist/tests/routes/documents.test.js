import { describe, test } from "node:test";
import assert from "node:assert";
import { documentRequiresIssuedArchive, documentHasIssuedArchiveMetadata } from "../../routes/documents.js";
describe("documentRequiresIssuedArchive", () => {
    test("returns false for draft documents", () => {
        const doc = { status: "draft" };
        assert.strictEqual(documentRequiresIssuedArchive(doc), false);
    });
    test("returns true for issued documents", () => {
        const doc = { status: "issued" };
        assert.strictEqual(documentRequiresIssuedArchive(doc), true);
    });
    test("returns false for voided documents without issuedAt", () => {
        const doc = { status: "voided", issuedAt: null };
        assert.strictEqual(documentRequiresIssuedArchive(doc), false);
        const doc2 = { status: "voided" };
        assert.strictEqual(documentRequiresIssuedArchive(doc2), false);
    });
    test("returns true for voided documents with issuedAt", () => {
        const doc = { status: "voided", issuedAt: "2023-10-01T12:00:00Z" };
        assert.strictEqual(documentRequiresIssuedArchive(doc), true);
    });
});
describe("documentHasIssuedArchiveMetadata", () => {
    test("returns true when both sha256 and createdAt are present", () => {
        const doc = {
            issuedSnapshotSha256: "some-hash",
            issuedSnapshotCreatedAt: "2023-10-01T12:00:00Z"
        };
        assert.strictEqual(documentHasIssuedArchiveMetadata(doc), true);
    });
    test("returns false when sha256 is missing", () => {
        const doc = {
            issuedSnapshotCreatedAt: "2023-10-01T12:00:00Z"
        };
        assert.strictEqual(documentHasIssuedArchiveMetadata(doc), false);
    });
    test("returns false when createdAt is missing", () => {
        const doc = {
            issuedSnapshotSha256: "some-hash"
        };
        assert.strictEqual(documentHasIssuedArchiveMetadata(doc), false);
    });
    test("returns false when both are missing", () => {
        const doc = {};
        assert.strictEqual(documentHasIssuedArchiveMetadata(doc), false);
    });
});
