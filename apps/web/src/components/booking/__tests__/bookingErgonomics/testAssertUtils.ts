import assert from "node:assert/strict";

export interface SpyMock {
	(...args: unknown[]): unknown;
	calls: unknown[][];
	toHaveBeenCalledWith: (...expectedArgs: unknown[]) => void;
}

export const vi = {
	fn: (): SpyMock => {
		const calls: unknown[][] = [];
		const fnObj = ((...args: unknown[]) => { calls.push(args); }) as SpyMock;
		fnObj.calls = calls;
		fnObj.toHaveBeenCalledWith = (...expected: unknown[]) => {
			const found = calls.some((c) => expected.every((arg, idx) => c[idx] === arg));
			assert.ok(found, `Expected call with ${JSON.stringify(expected)}`);
		};
		return fnObj;
	},
};

export function expect(actual: unknown) {
	return {
		toContain: (exp: string) => assert.ok(typeof actual === "string" && actual.includes(exp)),
		not: {
			toBeNull: () => assert.notStrictEqual(actual, null),
			toMatch: (r: RegExp) => assert.ok(typeof actual === "string" && !r.test(actual)),
			toContain: (exp: string) => assert.ok(typeof actual === "string" && !actual.includes(exp)),
		},
		toBe: (exp: unknown) => assert.strictEqual(actual, exp),
		toHaveBeenCalledWith: (...exp: unknown[]) => (actual as any)?.toHaveBeenCalledWith(...exp),
	};
}
