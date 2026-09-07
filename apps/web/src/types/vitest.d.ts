declare module "vitest" {
	export interface Assertion<T = any> {
		toBe(expected: any): void;
		toEqual(expected: any): void;
		toStrictEqual(expected: any): void;
		toBeDefined(): void;
		toBeUndefined(): void;
		toBeNull(): void;
		toBeTruthy(): void;
		toBeFalsy(): void;
		toContain(expected: any): void;
		toHaveLength(expected: number): void;
		toMatch(expected: string | RegExp): void;
		toHaveBeenCalled(): void;
		toHaveBeenCalledTimes(expected: number): void;
		toBeGreaterThan(expected: number): void;
		toBeGreaterThanOrEqual(expected: number): void;
		toBeLessThan(expected: number): void;
		toBeLessThanOrEqual(expected: number): void;
		toThrow(expected?: any): void;
		not: Assertion<T>;
	}

	export function describe(name: string, fn: () => void): void;
	export function it(name: string, fn: () => void | Promise<void>): void;
	export function test(name: string, fn: () => void | Promise<void>): void;
	export function expect<T = any>(actual: T): Assertion<T>;
	export const vi: any;
	export function beforeEach(fn: () => void | Promise<void>): void;
	export function afterEach(fn: () => void | Promise<void>): void;
}
