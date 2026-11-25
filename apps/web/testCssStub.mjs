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

process.env.NODE_ENV = process.env.NODE_ENV || "test";

globalThis.React = React;

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.endsWith(".css") || specifier.includes(".css")) {
			return {
				format: "module",
				shortCircuit: true,
				url: "data:text/javascript," + encodeURIComponent("export default {};"),
			};
		}
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

					const isMatcher = (v) => Boolean(v && typeof v === "object" && "__vitestMatcher" in v);
					const matchesExpected = (actual, expected) => {
						if (isMatcher(expected)) {
							if (expected.__vitestMatcher === "anything") {
								return actual !== null && actual !== undefined;
							}
							if (expected.__vitestMatcher === "any") {
								const ctor = expected.expected;
								if (ctor === String) return typeof actual === "string" || actual instanceof String;
								if (ctor === Number) return typeof actual === "number" || actual instanceof Number;
								if (ctor === Boolean) return typeof actual === "boolean" || actual instanceof Boolean;
								if (ctor === Function) return typeof actual === "function";
								if (ctor === Array) return Array.isArray(actual);
								if (ctor === Object) return typeof actual === "object" && actual !== null;
								return actual instanceof ctor;
							}
							if (expected.__vitestMatcher === "stringContaining") {
								return typeof actual === "string" && actual.includes(expected.expected);
							}
							if (expected.__vitestMatcher === "objectContaining") {
								if (!actual || typeof actual !== "object") return false;
								return Object.entries(expected.expected).every(([k, v]) =>
									Object.prototype.hasOwnProperty.call(actual, k) && matchesExpected(actual[k], v)
								);
							}
							if (expected.__vitestMatcher === "arrayContaining") {
								if (!Array.isArray(actual)) return false;
								return expected.expected.every((item) => actual.some((a) => matchesExpected(a, item)));
							}
						}
						if (expected && typeof expected === "object" && typeof expected.asymmetricMatch === "function") {
							return expected.asymmetricMatch(actual);
						}
						if (Array.isArray(expected)) {
							return Array.isArray(actual) && actual.length === expected.length && expected.every((v, i) => matchesExpected(actual[i], v));
						}
						if (
							expected &&
							typeof expected === "object" &&
							actual &&
							typeof actual === "object" &&
							Object.getPrototypeOf(expected) === Object.prototype &&
							Object.getPrototypeOf(actual) === Object.prototype
						) {
							const expKeys = Object.keys(expected);
							const actKeys = Object.keys(actual);
							if (expKeys.length !== actKeys.length) return false;
							return expKeys.every((k) => Object.prototype.hasOwnProperty.call(actual, k) && matchesExpected(actual[k], expected[k]));
						}
						try {
							assert.deepStrictEqual(actual, expected);
							return true;
						} catch {
							return false;
						}
					};

					const errorMatches = (caught, expected) => {
						if (expected === undefined) return true;
						const msg = String(caught?.message ?? caught);
						if (expected instanceof RegExp) return expected.test(msg);
						if (typeof expected === "string") return msg.includes(expected);
						if (typeof expected === "function") return caught instanceof expected;
						return true;
					};

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
							toEqual: wrap((exp) => {
								if (!matchesExpected(val, exp)) {
									assert.deepStrictEqual(val, exp);
								}
							}),
							toStrictEqual: wrap((exp) => assert.deepStrictEqual(val, exp)),
							toMatchObject: wrap((exp) => {
								assert.ok(
									matchesExpected(val, expect.objectContaining(exp)),
									"Expected " + JSON.stringify(val) + " to match object " + JSON.stringify(exp),
								);
							}),
							toContain: wrap((sub) => assert.ok(val && (Array.isArray(val) ? val.includes(sub) : String(val).includes(sub)), "Expected to contain: " + sub)),
							toHaveLength: wrap((len) => assert.strictEqual(val?.length, len)),
							toHaveBeenCalled: wrap(() => assert.ok(val?.mock?.calls?.length > 0, "Expected to have been called")),
							toHaveBeenCalledTimes: wrap((n) => assert.strictEqual(val?.mock?.calls?.length, n)),
							toHaveBeenCalledWith: wrap((...expectedArgs) => {
								const calls = val?.mock?.calls;
								assert.ok(Array.isArray(calls) && calls.length > 0, "Expected mock function to have been called");
								const matched = calls.some(
									(call) =>
										call.length === expectedArgs.length &&
										expectedArgs.every((exp, idx) => matchesExpected(call[idx], exp)),
								);
								assert.ok(
									matched,
									"Expected mock to have been called with " +
										JSON.stringify(expectedArgs) +
										", actual calls: " +
										JSON.stringify(calls),
								);
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
							toBeInstanceOf: wrap((ctor) => assert.ok(val instanceof ctor)),
							toThrow: (expected) => {
								let threw = false;
								let caught;
								try {
									val();
								} catch (err) {
									threw = true;
									caught = err;
								}
								if (isNot) {
									if (threw && errorMatches(caught, expected)) {
										assert.fail("Expected function not to throw, but threw: " + String(caught?.message ?? caught));
									}
									return;
								}
								assert.ok(threw, "Expected function to throw");
								if (expected !== undefined) {
									assert.ok(
										errorMatches(caught, expected),
										"Expected thrown error (" + String(caught?.message ?? caught) + ") to match " + String(expected),
									);
								}
							},
						};
						if (!isNot) {
							res.not = makeExpect(val, true);
						}
						return res;
					};
					export const expect = (val) => makeExpect(val);
					expect.objectContaining = (expected) => ({ __vitestMatcher: "objectContaining", expected });
					expect.arrayContaining = (expected) => ({ __vitestMatcher: "arrayContaining", expected });
					expect.stringContaining = (expected) => ({ __vitestMatcher: "stringContaining", expected });
					expect.any = (expected) => ({ __vitestMatcher: "any", expected });
					expect.anything = () => ({ __vitestMatcher: "anything" });

					const realTimers = {
						setTimeout: globalThis.setTimeout,
						clearTimeout: globalThis.clearTimeout,
						setInterval: globalThis.setInterval,
						clearInterval: globalThis.clearInterval,
						dateNow: Date.now,
					};
					let fakeTimersActive = false;
					let virtualNow = 0;
					let nextTimerId = 1;
					const scheduledTimers = new Map();

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
						mock: () => {},
						restoreAllMocks: () => {},
						clearAllMocks: () => {},
						resetAllMocks: () => {},
						useFakeTimers: () => {
							fakeTimersActive = true;
							virtualNow = realTimers.dateNow.call(Date);
							scheduledTimers.clear();
							nextTimerId = 1;
							Date.now = () => virtualNow;
							globalThis.setTimeout = (fn, delay = 0, ...args) => {
								const id = nextTimerId++;
								scheduledTimers.set(id, {
									id,
									fn,
									args,
									runAt: virtualNow + Math.max(0, Number(delay) || 0),
									interval: null,
								});
								return id;
							};
							globalThis.clearTimeout = (id) => {
								scheduledTimers.delete(id);
							};
							globalThis.setInterval = (fn, delay = 0, ...args) => {
								const id = nextTimerId++;
								const period = Math.max(1, Number(delay) || 1);
								scheduledTimers.set(id, {
									id,
									fn,
									args,
									runAt: virtualNow + period,
									interval: period,
								});
								return id;
							};
							globalThis.clearInterval = (id) => {
								scheduledTimers.delete(id);
							};
							return vi;
						},
						useRealTimers: () => {
							if (!fakeTimersActive) return vi;
							fakeTimersActive = false;
							scheduledTimers.clear();
							Date.now = realTimers.dateNow;
							globalThis.setTimeout = realTimers.setTimeout;
							globalThis.clearTimeout = realTimers.clearTimeout;
							globalThis.setInterval = realTimers.setInterval;
							globalThis.clearInterval = realTimers.clearInterval;
							return vi;
						},
						advanceTimersByTime: (ms) => {
							if (!fakeTimersActive) return vi;
							const targetTime = virtualNow + Math.max(0, Number(ms) || 0);
							for (;;) {
								let nextEntry = null;
								for (const entry of scheduledTimers.values()) {
									if (entry.runAt <= targetTime && (!nextEntry || entry.runAt < nextEntry.runAt)) {
										nextEntry = entry;
									}
								}
								if (!nextEntry) break;
								virtualNow = nextEntry.runAt;
								if (nextEntry.interval !== null) {
									nextEntry.runAt = virtualNow + nextEntry.interval;
								} else {
									scheduledTimers.delete(nextEntry.id);
								}
								if (typeof nextEntry.fn === "function") {
									nextEntry.fn(...nextEntry.args);
								}
							}
							virtualNow = targetTime;
							return vi;
						},
						runAllTimers: () => {
							if (!fakeTimersActive) return vi;
							let guard = 0;
							while (scheduledTimers.size > 0 && guard < 1000) {
								guard++;
								let nextEntry = null;
								for (const entry of scheduledTimers.values()) {
									if (!nextEntry || entry.runAt < nextEntry.runAt) nextEntry = entry;
								}
								if (!nextEntry) break;
								virtualNow = nextEntry.runAt;
								scheduledTimers.delete(nextEntry.id);
								if (typeof nextEntry.fn === "function") nextEntry.fn(...nextEntry.args);
							}
							return vi;
						},
						setSystemTime: (date) => {
							virtualNow = date instanceof Date ? date.getTime() : Number(date);
							return vi;
						},
						stubGlobal: (key, val) => {
							globalThis[key] = val;
						},
						unstubAllGlobals: () => {},
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
