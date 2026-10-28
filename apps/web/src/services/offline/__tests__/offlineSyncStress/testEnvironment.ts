import { resetGlobalClockSkew } from "@dental/shared";
import { resetOfflineDbConnection } from "../../index";
import { setupMockIndexedDb } from "./mockIdb";

export interface StressTestEnv {
	getDb: () => any;
	getLocalStorageMap: () => Map<string, string>;
	cleanup: () => void;
}

export function setupStressTestEnv(): StressTestEnv {
	resetGlobalClockSkew();
	resetOfflineDbConnection();
	const localStorageMap = new Map<string, string>();
	const mockDbHolder = setupMockIndexedDb();
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");

	const mockLocalStorage = {
		getItem: (key: string) => localStorageMap.get(key) ?? null,
		setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
		removeItem: (key: string) => localStorageMap.delete(key),
		clear: () => localStorageMap.clear(),
		get length() { return localStorageMap.size; },
		key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
	};

	Object.defineProperty(globalThis, "window", {
		value: {
			indexedDB: mockDbHolder.mockIndexedDb,
			localStorage: mockLocalStorage,
			location: { hostname: "clinic.local" },
			dispatchEvent: () => true,
		},
		configurable: true,
		writable: true,
	});

	const cleanup = () => {
		resetGlobalClockSkew();
		resetOfflineDbConnection();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as unknown as { window?: unknown }).window;
		}
	};

	return {
		getDb: mockDbHolder.getDb,
		getLocalStorageMap: () => localStorageMap,
		cleanup,
	};
}
