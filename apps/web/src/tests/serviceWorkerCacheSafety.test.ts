/**
 * serviceWorkerCacheSafety.test.ts — Unit Tests for Service Worker Cache Safety & Anti-Corrupted-Script Filtering
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	SHELL_CACHE,
	isForbiddenRuntimeResponse,
	isCacheableShellAsset,
	isValidShellResponse,
} from "../service-worker";

describe("Service Worker Cache Safety & Anti-Corrupted-Script Invariants", () => {
	it("1. SHELL_CACHE is bumped to v8 for clean client cache invalidation", () => {
		assert.equal(SHELL_CACHE, "dental-crm-shell-v8");
	});

	it("2. isValidShellResponse rejects HTML responses for JavaScript and CSS files (SPA 404 fallback trap)", () => {
		// Mock Response with text/html content-type for a .js request
		const fakeHtmlResponseForJs = new Response("<!DOCTYPE html><html><body>Error</body></html>", {
			status: 200,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});

		const isValidJs = isValidShellResponse(
			"https://dente.local/assets/app-chunk-123.js",
			fakeHtmlResponseForJs,
		);
		assert.equal(
			isValidJs,
			false,
			"Service Worker MUST NOT cache HTML fallback as a JavaScript file (causes SyntaxError: Unexpected token '<')",
		);

		// Mock Response with text/html content-type for a .css request
		const fakeHtmlResponseForCss = new Response("<!DOCTYPE html><html></html>", {
			status: 200,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});

		const isValidCss = isValidShellResponse(
			"https://dente.local/assets/theme.css",
			fakeHtmlResponseForCss,
		);
		assert.equal(
			isValidCss,
			false,
			"Service Worker MUST NOT cache HTML fallback as a CSS stylesheet",
		);

		// Mock Response with text/html content-type for a .wasm request
		const fakeHtmlResponseForWasm = new Response("<!DOCTYPE html><html></html>", {
			status: 200,
			headers: { "Content-Type": "text/html" },
		});
		assert.equal(
			isValidShellResponse("https://dente.local/wasm/dicom.wasm", fakeHtmlResponseForWasm),
			false,
			"Service Worker MUST NOT cache HTML fallback as WebAssembly",
		);
	});

	it("3. isValidShellResponse accepts genuine scripts, styles, and binary assets", () => {
		const validJsResponse = new Response("console.log('dente');", {
			status: 200,
			headers: { "Content-Type": "application/javascript; charset=utf-8" },
		});

		assert.equal(
			isValidShellResponse("https://dente.local/assets/main-bundle.js", validJsResponse),
			true,
			"Genuine JavaScript bundle must be recognized as valid",
		);

		const validCssResponse = new Response(".btn { color: red; }", {
			status: 200,
			headers: { "Content-Type": "text/css; charset=utf-8" },
		});

		assert.equal(
			isValidShellResponse("https://dente.local/assets/styles.css", validCssResponse),
			true,
			"Genuine CSS stylesheet must be recognized as valid",
		);
	});

	it("4. isValidShellResponse rejects HTTP error codes (404, 500, 503)", () => {
		const errorResponse = new Response("Server Error", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});

		assert.equal(
			isValidShellResponse("https://dente.local/assets/main.js", errorResponse),
			false,
			"HTTP 500 must never be cached in shell cache",
		);

		const notFoundResponse = new Response("Not Found", {
			status: 404,
			headers: { "Content-Type": "text/plain" },
		});

		assert.equal(
			isValidShellResponse("https://dente.local/assets/missing.js", notFoundResponse),
			false,
			"HTTP 404 must never be cached in shell cache",
		);
	});

	it("5. isForbiddenRuntimeResponse protects patient data, DICOM datasets, and /api/* routes", () => {
		assert.equal(
			isForbiddenRuntimeResponse(new URL("https://dente.local/api/sync/gateway")),
			true,
		);
		assert.equal(
			isForbiddenRuntimeResponse(new URL("https://dente.local/api/portal/booking")),
			true,
		);
		assert.equal(
			isForbiddenRuntimeResponse(new URL("https://dente.local/imaging/patient-1/study.dcm")),
			true,
		);
		assert.equal(
			isForbiddenRuntimeResponse(new URL("https://dente.local/documents/act-804n.pdf")),
			true,
		);
		assert.equal(
			isForbiddenRuntimeResponse(new URL("https://dente.local/assets/index.js")),
			false,
		);
	});

	it("6. isCacheableShellAsset allows valid application shell assets", () => {
		assert.equal(
			isCacheableShellAsset(new URL("https://dente.local/index.html")),
			true,
		);
		assert.equal(
			isCacheableShellAsset(new URL("https://dente.local/assets/main-bundle.js")),
			true,
		);
		assert.equal(
			isCacheableShellAsset(new URL("https://dente.local/odontogram/tooth-11.svg")),
			true,
		);
		assert.equal(
			isCacheableShellAsset(new URL("https://dente.local/api/schedule/appointments")),
			false,
		);
	});
});
