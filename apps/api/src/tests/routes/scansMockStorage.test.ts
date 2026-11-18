import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAndResolveStoragePath } from "../../routes/lab/scansLocalStorageHandlers.js";

describe("Dental Lab Mock Storage Security & Traversal Protection", () => {
	it("rejects path traversal attempts with .. or leading slashes", () => {
		assert.strictEqual(validateAndResolveStoragePath("../../../etc/passwd"), null);
		assert.strictEqual(validateAndResolveStoragePath("org_1/lab_orders/1/../../secret.stl"), null);
		assert.strictEqual(validateAndResolveStoragePath("/etc/shadow.stl"), null);
		assert.strictEqual(validateAndResolveStoragePath("..\\..\\windows\\system32\\calc.exe"), null);
	});

	it("rejects non-whitelisted extensions (.exe, .sh, .bat, .dll, .js)", () => {
		assert.strictEqual(validateAndResolveStoragePath("org_1/lab_orders/ord_1/malware.exe"), null);
		assert.strictEqual(validateAndResolveStoragePath("org_1/lab_orders/ord_1/payload.sh"), null);
		assert.strictEqual(validateAndResolveStoragePath("org_1/lab_orders/ord_1/script.js"), null);
		assert.strictEqual(validateAndResolveStoragePath("org_1/lab_orders/ord_1/test"), null);
	});

	it("accepts valid scan files (.stl, .ply, .obj, .dcm, .zip) with valid structure", () => {
		const validKey = "org_00000000-0000/lab_orders/ord_12345/1700000000_abcd1234_upper_jaw.stl";
		const res = validateAndResolveStoragePath(validKey);
		assert.ok(res !== null);
		assert.strictEqual(res.ext, "stl");
		assert.strictEqual(res.safeFileName, "1700000000_abcd1234_upper_jaw.stl");
		assert.ok(res.resolvedPath.includes(".data"));
		assert.ok(res.resolvedPath.includes("lab_scans"));
	});
});
