import assert from "node:assert/strict";

export type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
	mockResolvedValue: (val: any) => MockFn;
};

export function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	fn.mockResolvedValue = (val: any) => createMockFn(() => Promise.resolve(val));
	return fn;
}

export const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

export function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
			toContain: (expected: string) => {
				assert.ok(!actual?.includes?.(expected), `Expected "${actual}" NOT to contain "${expected}"`);
			},
			toHaveBeenCalled: () => {
				const count = actual?.calls?.length ?? 0;
				assert.strictEqual(count, 0, `Expected function NOT to have been called, but was called ${count} times`);
			},
		},
		toContain: (expected: string) => {
			assert.ok(actual?.includes?.(expected), `Expected "${actual}" to contain "${expected}"`);
		},
		toHaveBeenCalled: () => {
			const count = actual?.calls?.length ?? 0;
			assert.ok(count > 0, "Expected function to have been called");
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => {
					if (arg && typeof arg === "object" && arg._isStringContaining) {
						return typeof callArgs[i] === "string" && callArgs[i].includes(arg.substr);
					}
					return callArgs[i] === arg;
				}),
			);
			assert.ok(match, `Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`);
		},
	};
}
