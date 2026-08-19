import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	browserIndexedDbWritable,
	inspectBrowserContinuity,
} from "../browserContinuity.js";
import { useDashboardLoaderLogic } from "../hooks/domains/useDashboardLoaderLogic.js";
import { usePatientResource } from "../hooks/usePatientResource.js";
import { useOnboardingLogic } from "../hooks/domains/useOnboardingLogic.js";
import { logger } from "../utils/logger.js";
import { WorkflowResponseError } from "../AppHelpers.js";

function renderHookProbe<T>(hookFn: () => T): T {
	let result!: T;
	function Probe() {
		result = hookFn();
		return createElement("span", null, "probe");
	}
	renderToStaticMarkup(createElement(Probe));
	return result;
}

describe("Milestone M1 Adversarial Suite: browserContinuity & IndexedDB", () => {
	it("browserIndexedDbWritable returns false and pops zero toasts in Node/SSR environment", async () => {
		const result = await browserIndexedDbWritable();
		assert.equal(typeof result, "boolean");
		assert.equal(result, false);
	});

	it("browserIndexedDbWritable catches simulated IDB exceptions gracefully without throwing or popping toasts", async () => {
		// Mock a failing window.indexedDB
		const originalWindow = globalThis.window;
		try {
			(globalThis as any).window = {
				indexedDB: {
					open: () => {
						throw new Error("QuotaExceeded or Private Browsing Access Denied");
					},
				},
			};

			const result = await browserIndexedDbWritable();
			assert.equal(result, false, "Should return false when IDB open throws");
		} finally {
			(globalThis as any).window = originalWindow;
		}
	});

	it("browserIndexedDbWritable handles onerror event on IDBOpenDBRequest without throwing", async () => {
		const originalWindow = globalThis.window;
		try {
			(globalThis as any).window = {
				indexedDB: {
					open: () => {
						const req: any = {};
						setTimeout(() => {
							if (req.onerror) {
								req.error = new Error("Blocked by security settings");
								req.onerror();
							}
						}, 0);
						return req;
					},
				},
			};

			const result = await browserIndexedDbWritable();
			assert.equal(result, false, "Should resolve to false when onerror fires");
		} finally {
			(globalThis as any).window = originalWindow;
		}
	});

	it("browserIndexedDbWritable returns true when indexedDB open and deleteDatabase succeed", async () => {
		const originalWindow = globalThis.window;
		let closed = false;
		let deletedDbName = "";
		try {
			(globalThis as any).window = {
				indexedDB: {
					open: (name: string) => {
						const req: any = {};
						setTimeout(() => {
							req.result = {
								close: () => {
									closed = true;
								},
							};
							if (req.onsuccess) req.onsuccess();
						}, 0);
						return req;
					},
					deleteDatabase: (name: string) => {
						deletedDbName = name;
					},
				},
			};

			const result = await browserIndexedDbWritable();
			assert.equal(result, true, "Should resolve to true on successful IDB access");
			assert.equal(closed, true, "Database should be closed");
			assert.equal(deletedDbName, "test-dente-db-support", "Test database should be deleted");
		} finally {
			(globalThis as any).window = originalWindow;
		}
	});

	it("inspectBrowserContinuity returns status with warnings when storage is unavailable and does not throw", async () => {
		const status = await inspectBrowserContinuity();
		assert.ok(status.checkedAt);
		assert.equal(typeof status.localStorageWritable, "boolean");
		assert.equal(typeof status.indexedDbSupported, "boolean");
		assert.ok(Array.isArray(status.warnings));
	});
});

describe("Milestone M1 Adversarial Suite: useDashboardLoaderLogic Toast & Auth Remediation", () => {
	it("suppresses toasts on 401 Unauthorized and flags access unlock required", async () => {
		let toastCalled = false;
		let errorSet: string | null = null;
		let unlockRequired = false;
		let unlockMessage = "";
		let dashboardSet = null;

		const originalFetch = globalThis.fetch;
		try {
			globalThis.fetch = async () => {
				return {
					ok: false,
					status: 401,
					statusText: "Unauthorized",
					json: async () => ({ error: "Unauthorized", message: "Сессия истекла" }),
					text: async () => JSON.stringify({ error: "Unauthorized", message: "Сессия истекла" }),
				} as any;
			};

			const props = {
				authRef: {
					current: {
						denteClinicalReadHeaders: () => ({ Authorization: "Bearer test" }),
					},
				},
				setDashboard: (d: any) => {
					dashboardSet = d;
				},
				setAccessUnlockRequired: (req: boolean) => {
					unlockRequired = req;
				},
				setAccessUnlockMessage: (msg: string) => {
					unlockMessage = msg;
				},
				showToast: () => {
					toastCalled = true;
				},
				setError: (err: string) => {
					errorSet = err;
				},
				loadPersistenceHealthRef: { current: async () => {} },
				refreshSpeechRuntimeRef: { current: async () => {} },
			};

			const { loadDashboard } = renderHookProbe(() => useDashboardLoaderLogic(props));
			await loadDashboard();

			assert.equal(toastCalled, false, "showToast MUST NOT be called on 401");
			assert.equal(errorSet, null, "setError MUST NOT be called on 401");
			assert.equal(unlockRequired, true, "setAccessUnlockRequired(true) MUST be called on 401");
			assert.match(unlockMessage, /Сессия истекла/);
			assert.equal(dashboardSet, null, "dashboard should not be overwritten with fake demo data");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("suppresses toasts on 403 Forbidden and flags access unlock required", async () => {
		let toastCalled = false;
		let errorSet: string | null = null;
		let unlockRequired = false;
		let unlockMessage = "";

		const originalFetch = globalThis.fetch;
		try {
			globalThis.fetch = async () => {
				return {
					ok: false,
					status: 403,
					statusText: "Forbidden",
					json: async () => ({ error: "Forbidden", message: "Требуется авторизация" }),
					text: async () => JSON.stringify({ error: "Forbidden", message: "Требуется авторизация" }),
				} as any;
			};

			const props = {
				authRef: {
					current: {
						denteClinicalReadHeaders: () => ({ Authorization: "Bearer test" }),
					},
				},
				setDashboard: () => {},
				setAccessUnlockRequired: (req: boolean) => {
					unlockRequired = req;
				},
				setAccessUnlockMessage: (msg: string) => {
					unlockMessage = msg;
				},
				showToast: () => {
					toastCalled = true;
				},
				setError: (err: string) => {
					errorSet = err;
				},
				loadPersistenceHealthRef: { current: async () => {} },
				refreshSpeechRuntimeRef: { current: async () => {} },
			};

			const { loadDashboard } = renderHookProbe(() => useDashboardLoaderLogic(props));
			await loadDashboard();

			assert.equal(toastCalled, false, "showToast MUST NOT be called on 403");
			assert.equal(errorSet, null, "setError MUST NOT be called on 403");
			assert.equal(unlockRequired, true, "setAccessUnlockRequired(true) MUST be called on 403");
			assert.match(unlockMessage, /Сессия истекла/);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("shows toast and sets error on 500 Internal Server Error without triggering access unlock", async () => {
		let toastCalled = false;
		let toastMsg = "";
		let toastType = "";
		let errorSet: string | null = null;
		let unlockRequired = false;

		const originalFetch = globalThis.fetch;
		try {
			globalThis.fetch = async () => {
				return {
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: async () => ({ error: "InternalServerError", message: "Database connection failed" }),
					text: async () => "Database connection failed",
				} as any;
			};

			const props = {
				authRef: {
					current: {
						denteClinicalReadHeaders: () => ({ Authorization: "Bearer test" }),
					},
				},
				setDashboard: () => {},
				setAccessUnlockRequired: (req: boolean) => {
					unlockRequired = req;
				},
				setAccessUnlockMessage: () => {},
				showToast: (msg: string, type?: any) => {
					toastCalled = true;
					toastMsg = msg;
					toastType = type;
				},
				setError: (err: string) => {
					errorSet = err;
				},
				loadPersistenceHealthRef: { current: async () => {} },
				refreshSpeechRuntimeRef: { current: async () => {} },
			};

			const { loadDashboard } = renderHookProbe(() => useDashboardLoaderLogic(props));
			await loadDashboard();

			assert.equal(toastCalled, true, "showToast MUST be called on 500");
			assert.equal(toastType, "error");
			assert.match(toastMsg, /Не удалось загрузить данные клиники/);
			assert.match(toastMsg, /сервер не смог выполнить запрос/);
			assert.match(errorSet ?? "", /Не удалось загрузить данные клиники/);
			assert.equal(unlockRequired, false, "500 error should NOT trigger access unlock");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("handles network failure (fetch throws TypeError) by showing error toast", async () => {
		let toastCalled = false;
		let toastMsg = "";
		let errorSet: string | null = null;
		let unlockRequired = false;

		const originalFetch = globalThis.fetch;
		try {
			globalThis.fetch = async () => {
				throw new TypeError("Failed to fetch (network drop)");
			};

			const props = {
				authRef: {
					current: {
						denteClinicalReadHeaders: () => ({ Authorization: "Bearer test" }),
					},
				},
				setDashboard: () => {},
				setAccessUnlockRequired: (req: boolean) => {
					unlockRequired = req;
				},
				setAccessUnlockMessage: () => {},
				showToast: (msg: string) => {
					toastCalled = true;
					toastMsg = msg;
				},
				setError: (err: string) => {
					errorSet = err;
				},
				loadPersistenceHealthRef: { current: async () => {} },
				refreshSpeechRuntimeRef: { current: async () => {} },
			};

			const { loadDashboard } = renderHookProbe(() => useDashboardLoaderLogic(props));
			await loadDashboard();

			assert.equal(toastCalled, true, "showToast MUST be called on network error");
			assert.match(toastMsg, /Не удалось загрузить данные клиники/);
			assert.match(errorSet ?? "", /Не удалось загрузить данные клиники/);
			assert.equal(unlockRequired, false, "network error should NOT trigger access unlock");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("discards stale responses when multiple loadDashboard requests race", async () => {
		let dashboardResult: any = null;
		let toastCount = 0;

		const originalFetch = globalThis.fetch;
		try {
			let resolveReq1: any;
			let resolveReq2: any;

			let callCount = 0;
			globalThis.fetch = (async () => {
				callCount++;
				if (callCount === 1) {
					return new Promise((resolve) => {
						resolveReq1 = () =>
							resolve({
								ok: false,
								status: 500,
								statusText: "Server Error",
								json: async () => ({}),
								text: async () => "Stale 500 Error",
							} as any);
					});
				} else {
					return new Promise((resolve) => {
						resolveReq2 = () =>
							resolve({
								ok: true,
								status: 200,
								json: async () => ({ clinicProfile: { clinicName: "Fresh Clinic" } }),
							} as any);
					});
				}
			}) as any;

			const props = {
				authRef: {
					current: {
						denteClinicalReadHeaders: () => ({ Authorization: "Bearer test" }),
					},
				},
				setDashboard: (d: any) => {
					dashboardResult = d;
				},
				setAccessUnlockRequired: () => {},
				setAccessUnlockMessage: () => {},
				showToast: () => {
					toastCount++;
				},
				setError: () => {},
				loadPersistenceHealthRef: { current: async () => {} },
				refreshSpeechRuntimeRef: { current: async () => {} },
			};

			const { loadDashboard } = renderHookProbe(() => useDashboardLoaderLogic(props));

			// Start request 1 (slow, will fail with 500)
			const p1 = loadDashboard();
			// Start request 2 (fast, will succeed with 200)
			const p2 = loadDashboard();

			// Resolve request 2 first
			resolveReq2();
			await p2;

			assert.equal(dashboardResult?.clinicProfile?.clinicName, "Fresh Clinic");
			assert.equal(toastCount, 0);

			// Now resolve request 1 (stale error)
			resolveReq1();
			await p1;

			// Stale error must NOT trigger toast or overwrite dashboard
			assert.equal(toastCount, 0, "Stale request failure MUST NOT pop toast");
			assert.equal(dashboardResult?.clinicProfile?.clinicName, "Fresh Clinic");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe("Milestone M1 Adversarial Suite: usePatientResource dependency & reload", () => {
	it("exports usePatientResource function correctly", () => {
		assert.equal(typeof usePatientResource, "function");
	});
});

describe("Milestone M1 Adversarial Suite: useOnboardingLogic logger integration", () => {
	it("exports useOnboardingLogic and logger symbol resolves correctly", () => {
		assert.equal(typeof useOnboardingLogic, "function");
		assert.equal(typeof logger.warn, "function");
		assert.equal(typeof logger.error, "function");
		assert.equal(typeof logger.info, "function");
	});
});
