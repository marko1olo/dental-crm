import * as vitest from "vitest";

const mockMethod = (obj: any, method: string, impl?: any) => {
	const spy = vitest.vi.spyOn(obj, method as any);
	if (impl) spy.mockImplementation(impl);
	(spy.mock as any).callCount = () => spy.mock.calls.length;
	const originalCalls = spy.mock.calls;
	spy.mock.calls = new Proxy(originalCalls, {
		get(target, prop, receiver) {
			const item = Reflect.get(target, prop, receiver);
			if (Array.isArray(item) && !(item as any).arguments) {
				(item as any).arguments = item;
			}
			return item;
		},
	});
	return Object.assign(spy, {
		restore: () => spy.mockRestore(),
	});
};

const createT = (ctx: any): any => {
	const registeredAfterEach: Array<() => any> = [];
	const spies: any[] = [];
	const subMockMethod = (obj: any, method: string, impl?: any) => {
		const spy = mockMethod(obj, method, impl);
		spies.push(spy);
		return spy;
	};

	const t: any = {
		...ctx,
		test: async (name: string, subFn?: any) => {
			if (typeof subFn === "function") {
				const childT = createT(ctx);
				try {
					return await subFn(childT);
				} finally {
					for (const fn of registeredAfterEach) {
						try { await fn(); } catch {}
					}
					for (const spy of spies) {
						try { spy.restore(); } catch {}
					}
				}
			}
		},
		it: async (name: string, subFn?: any) => {
			if (typeof subFn === "function") {
				const childT = createT(ctx);
				try {
					return await subFn(childT);
				} finally {
					for (const fn of registeredAfterEach) {
						try { await fn(); } catch {}
					}
					for (const spy of spies) {
						try { spy.restore(); } catch {}
					}
				}
			}
		},
		afterEach: (fn: any) => {
			registeredAfterEach.push(fn);
			vitest.afterEach(fn);
		},
		beforeEach: (fn: any) => vitest.beforeEach(fn),
		after: (fn: any) => vitest.afterAll(fn),
		before: (fn: any) => vitest.beforeAll(fn),
		mock: {
			method: subMockMethod,
		},
	};
	return t;
};

function wrapTestFn(originalTest: any): any {
	const wrapped: any = function (name: string, a?: any, b?: any) {
		if (typeof a === "function") {
			return originalTest(name, async (ctx: any) => a(createT(ctx)), b);
		}
		if (typeof b === "function") {
			return originalTest(name, a, async (ctx: any) => b(createT(ctx)));
		}
		return originalTest(name, a, b);
	};
	Object.assign(wrapped, originalTest);
	if (typeof originalTest.only === "function") {
		wrapped.only = function (name: string, a?: any, b?: any) {
			if (typeof a === "function") return originalTest.only(name, async (ctx: any) => a(createT(ctx)), b);
			if (typeof b === "function") return originalTest.only(name, a, async (ctx: any) => b(createT(ctx)));
			return originalTest.only(name, a, b);
		};
	}
	if (typeof originalTest.skip === "function") {
		wrapped.skip = function (name: string, a?: any, b?: any) {
			if (typeof a === "function") return originalTest.skip(name, async (ctx: any) => a(createT(ctx)), b);
			if (typeof b === "function") return originalTest.skip(name, a, async (ctx: any) => b(createT(ctx)));
			return originalTest.skip(name, a, b);
		};
	}
	return wrapped;
}

export const test = wrapTestFn(vitest.test);
export const it = wrapTestFn(vitest.it);
export const describe = vitest.describe;
export const suite = vitest.suite;
export const before = vitest.beforeAll;
export const after = vitest.afterAll;
export const beforeEach = vitest.beforeEach;
export const afterEach = vitest.afterEach;
export const mock = {
	method: mockMethod,
};

export default test;
