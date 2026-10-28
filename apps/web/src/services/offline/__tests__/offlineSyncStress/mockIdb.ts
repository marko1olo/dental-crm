export interface MockStoreData {
	keyPath: string;
	indexes: Map<string, string>;
	records: Map<string, unknown>;
}

export class MockIDBTransaction {
	db: MockIDBDatabase;
	mode: string;
	activeRequests = 0;
	oncomplete: (() => void) | null = null;
	onerror: ((err?: unknown) => void) | null = null;

	constructor(db: MockIDBDatabase, mode: string) {
		this.db = db;
		this.mode = mode;
	}

	requestDone() {
		this.activeRequests--;
		if (this.activeRequests <= 0) {
			setTimeout(() => { if (this.oncomplete) this.oncomplete(); }, 0);
		}
	}

	objectStore(storeName: string) {
		const store = this.db.stores.get(storeName);
		if (!store) throw new Error(`Store ${storeName} not found`);

		const wrap = (req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null }, op: () => void) => {
			this.activeRequests++;
			setTimeout(() => {
				try {
					op();
					if (req.onsuccess) req.onsuccess();
				} catch (err) {
					req.error = err;
					if (req.onerror) req.onerror();
				} finally {
					this.requestDone();
				}
			}, 0);
			return req;
		};

		return {
			put: (value: Record<string, unknown>) => {
				const key = String(value[store.keyPath]);
				const req = { result: key as unknown };
				return wrap(req, () => { store.records.set(key, JSON.parse(JSON.stringify(value))); });
			},
			get: (key: string) => {
				const req = { result: undefined as unknown };
				return wrap(req, () => { const r = store.records.get(key); req.result = r ? JSON.parse(JSON.stringify(r)) : undefined; });
			},
			getAll: () => {
				const req = { result: undefined as unknown };
				return wrap(req, () => { req.result = Array.from(store.records.values()).map((r) => JSON.parse(JSON.stringify(r))); });
			},
			delete: (key: string) => {
				const req = { result: undefined as unknown };
				return wrap(req, () => { store.records.delete(key); });
			},
			count: () => {
				const req = { result: 0 as unknown };
				return wrap(req, () => { req.result = store.records.size; });
			},
		};
	}
}

export class MockIDBDatabase {
	name: string;
	version: number;
	objectStoreNames: { contains: (name: string) => boolean };
	stores = new Map<string, MockStoreData>();
	onversionchange: (() => void) | null = null;
	onclose: (() => void) | null = null;

	constructor(name: string, version: number) {
		this.name = name;
		this.version = version;
		this.objectStoreNames = { contains: (storeName: string) => this.stores.has(storeName) };
	}

	createObjectStore(name: string, options: { keyPath: string }) {
		const storeData: MockStoreData = { keyPath: options.keyPath, indexes: new Map(), records: new Map() };
		this.stores.set(name, storeData);
		return { createIndex: (indexName: string, keyPath: string) => { storeData.indexes.set(indexName, keyPath); } };
	}

	transaction(_storeNames: string | string[], mode: "readonly" | "readwrite") {
		return new MockIDBTransaction(this, mode);
	}

	close() { if (this.onclose) this.onclose(); }
}

export function setupMockIndexedDb() {
	let currentDb: MockIDBDatabase | null = null;
	const mockIndexedDb = {
		open: (name: string, version: number) => {
			const req: { result?: MockIDBDatabase; onupgradeneeded?: ((e?: unknown) => void) | null; onsuccess?: ((e?: unknown) => void) | null; onerror?: ((e?: unknown) => void) | null } = {};
			setTimeout(() => {
				if (!currentDb || currentDb.version !== version) {
					currentDb = new MockIDBDatabase(name, version);
					req.result = currentDb;
					if (req.onupgradeneeded) (req.onupgradeneeded as any)({ target: req });
				} else {
					req.result = currentDb;
				}
				if (req.onsuccess) (req.onsuccess as any)({ target: req });
			}, 0);
			return req;
		},
	};
	return { mockIndexedDb, getDb: () => currentDb };
}
