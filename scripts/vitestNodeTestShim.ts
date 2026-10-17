import * as vitest from "vitest";

const createT = (ctx: any): any => {
	const t: any = {
		...ctx,
		test: async (name: string, subFn?: any) => {
			if (typeof subFn === "function") {
				return subFn(createT(ctx));
			}
		},
		it: async (name: string, subFn?: any) => {
			if (typeof subFn === "function") {
				return subFn(createT(ctx));
			}
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

export default test;
