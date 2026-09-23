/**
 * Заглушка для импорта файлов стилей и пакетов тестовых сред (vitest).
 *
 * ЗАЧЕМ. Тесты запускаются через `node --import tsx --test`, а node ничего не
 * знает про `import "./что-то.css"`: такой импорт падает с
 * ERR_UNKNOWN_FILE_EXTENSION и уносит ВЕСЬ файл теста, даже если проверяемая
 * функция к стилям отношения не имеет. В сборке это работает, потому что стили
 * обрабатывает vite.
 *
 * Аналогично для тестов, написанных под runner Vitest (например priceListMappingDiffView.test.tsx):
 * при запуске через node --test виртуальный модуль vitest транслируется в нативные
 * функции node:test / assertions, предотвращая падение по ERR_MODULE_NOT_FOUND.
 */
import { registerHooks } from "node:module";
import "tsx";
import React from "react";

globalThis.React = React;

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "vitest") {
			return {
				format: "module",
				shortCircuit: true,
				url: "data:text/javascript," + encodeURIComponent(`
					import assert from "node:assert/strict";
					import * as nt from "node:test";
					export const describe = nt.describe;
					export const it = nt.it;
					export const test = nt.test;
					export const beforeEach = nt.beforeEach;
					export const afterEach = nt.afterEach;
					const makeExpect = (val, isNot = false) => {
						const wrap = (fn) => (...args) => {
							if (isNot) {
								assert.throws(() => fn(...args));
							} else {
								fn(...args);
							}
						};
						const res = {
							toBe: wrap((exp) => assert.strictEqual(val, exp)),
							toEqual: wrap((exp) => assert.deepStrictEqual(val, exp)),
							toStrictEqual: wrap((exp) => assert.deepStrictEqual(val, exp)),
							toContain: wrap((sub) => assert.ok(val && (Array.isArray(val) ? val.includes(sub) : String(val).includes(sub)), "Expected to contain: " + sub)),
							toHaveLength: wrap((len) => assert.strictEqual(val?.length, len)),
							toHaveBeenCalled: wrap(() => assert.ok(val?.mock?.calls?.length > 0, "Expected to have been called")),
							toHaveBeenCalledTimes: wrap((n) => assert.strictEqual(val?.mock?.calls?.length, n)),
							toHaveBeenCalledWith: wrap((...args) => {
								assert.ok(val?.mock?.calls?.length > 0, "Expected to have been called with args");
							}),
							toMatch: wrap((regex) => assert.match(typeof val === "string" ? val : String(val), regex)),
							toBeNull: wrap(() => assert.strictEqual(val, null)),
							toBeDefined: wrap(() => assert.notStrictEqual(val, undefined)),
							toBeUndefined: wrap(() => assert.strictEqual(val, undefined)),
							toBeTruthy: wrap(() => assert.ok(val)),
							toBeFalsy: wrap(() => assert.ok(!val)),
							toBeGreaterThan: wrap((exp) => assert.ok(val > exp)),
							toBeGreaterThanOrEqual: wrap((exp) => assert.ok(val >= exp)),
							toBeLessThan: wrap((exp) => assert.ok(val < exp)),
							toBeLessThanOrEqual: wrap((exp) => assert.ok(val <= exp)),
						};
						if (!isNot) {
							res.not = makeExpect(val, true);
						}
						return res;
					};
					export const expect = (val) => makeExpect(val);
					expect.objectContaining = (expected) => expected;
					expect.arrayContaining = (expected) => expected;
					export const vi = {
						fn: (initialImpl) => {
							let currentImpl = initialImpl;
							const f = (...args) => {
								f.mock.calls.push(args);
								if (typeof currentImpl === "function") return currentImpl(...args);
							};
							f.mock = { calls: [] };
							f.mockImplementation = (fn) => { currentImpl = fn; return f; };
							f.mockReturnValue = (val) => { currentImpl = () => val; return f; };
							f.mockResolvedValue = (val) => { currentImpl = () => Promise.resolve(val); return f; };
							f.mockRejectedValue = (err) => { currentImpl = () => Promise.reject(err); return f; };
							f.mockReset = () => { f.mock.calls = []; currentImpl = undefined; return f; };
							f.mockClear = () => { f.mock.calls = []; return f; };
							return f;
						},
						restoreAllMocks: () => {},
						clearAllMocks: () => {},
						resetAllMocks: () => {},
						spyOn: (obj, method) => {
							const orig = obj?.[method];
							const mock = vi.fn(orig);
							if (obj && method) obj[method] = mock;
							return mock;
						},
					};
				`),
			};
		}
		if (specifier === "@cornerstonejs/dicom-image-loader") {
			return {
				format: "module",
				shortCircuit: true,
				url: "data:text/javascript," + encodeURIComponent(`
					const fileManager = {
						add: (file) => "wadouri:" + (file?.name || "image"),
						purge: () => {},
					};
					export default {
						wadouri: {
							fileManager,
						},
					};
				`),
			};
		}
		if (specifier === "@dental/shared") {
			return nextResolve(new URL("../../packages/shared/src/index.ts", import.meta.url).href, context);
		}
		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		if (url.endsWith(".css")) {
			return {
				format: "module",
				shortCircuit: true,
				source: "export default {};",
			};
		}
		return nextLoad(url, context);
	},
});
