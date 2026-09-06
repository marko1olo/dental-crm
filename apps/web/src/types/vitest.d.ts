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
