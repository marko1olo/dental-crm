declare module "vitest" {
	export interface Assertion<T = unknown> {
		toBe(expected: unknown): void;
		toEqual(expected: unknown): void;
		toStrictEqual(expected: unknown): void;
		toBeDefined(): void;
		toBeUndefined(): void;
		toBeNull(): void;
		toBeTruthy(): void;
		toBeFalsy(): void;
		toContain(expected: unknown): void;
		toHaveLength(expected: number): void;
		toMatch(expected: string | RegExp): void;
		toHaveBeenCalled(): void;
		toHaveBeenCalledTimes(expected: number): void;
		toHaveBeenCalledWith(...expectedArgs: unknown[]): void;
		toBeGreaterThan(expected: number): void;
		toBeGreaterThanOrEqual(expected: number): void;
		toBeLessThan(expected: number): void;
		toBeLessThanOrEqual(expected: number): void;
		toThrow(expected?: unknown): void;
		not: Assertion<T>;
	}

	export function describe(name: string, fn: () => void): void;
	export function it(name: string, fn: () => void | Promise<void>): void;
	export function test(name: string, fn: () => void | Promise<void>): void;
	export function expect<T = unknown>(actual: T): Assertion<T>;
	export const vi: unknown;
	export function beforeEach(fn: () => void | Promise<void>): void;
	export function afterEach(fn: () => void | Promise<void>): void;
}
