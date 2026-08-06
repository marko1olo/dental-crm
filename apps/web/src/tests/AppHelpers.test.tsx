import * as assert from "node:assert";
import { describe, it } from "node:test";
import {
	assertSpeechChunkDbStores,
	requiredSpeechChunkDbStoreNames,
} from "../AppHelpers";

describe("assertSpeechChunkDbStores", () => {
	it("does not throw when all required stores are present", () => {
		const mockDb = {
			objectStoreNames: {
				contains: (storeName: string) =>
					requiredSpeechChunkDbStoreNames.includes(storeName as any),
			},
		} as unknown as IDBDatabase;

		assert.doesNotThrow(() => assertSpeechChunkDbStores(mockDb));
	});

	it("throws an error when one required store is missing", () => {
		const missingStore = requiredSpeechChunkDbStoreNames[0];
		const mockDb = {
			objectStoreNames: {
				contains: (storeName: string) => {
					if (storeName === missingStore) return false;
					return requiredSpeechChunkDbStoreNames.includes(storeName as any);
				},
			},
		} as unknown as IDBDatabase;

		assert.throws(() => assertSpeechChunkDbStores(mockDb), {
			message: `Offline IndexedDB schema is missing stores: ${missingStore}`,
		});
	});

	it("throws an error when multiple required stores are missing", () => {
		const missingStores = [
			requiredSpeechChunkDbStoreNames[0],
			requiredSpeechChunkDbStoreNames[1],
		];
		const mockDb = {
			objectStoreNames: {
				contains: (storeName: string) => {
					if (missingStores.includes(storeName as any)) return false;
					return requiredSpeechChunkDbStoreNames.includes(storeName as any);
				},
			},
		} as unknown as IDBDatabase;

		assert.throws(() => assertSpeechChunkDbStores(mockDb), {
			message: `Offline IndexedDB schema is missing stores: ${missingStores.join(", ")}`,
		});
	});
});
