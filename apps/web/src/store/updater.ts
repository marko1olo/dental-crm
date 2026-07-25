/**
 * Zustand updater helper.
 *
 * Store setters accept either a next value `T` or a functional updater
 * `(prev: T) => T` (mirroring React's SetStateAction). Resolving that union
 * inline forced a `(val as any)(prev)` cast at every call site because the
 * generic narrowing of `T | ((prev: T) => T)` on `typeof val === "function"`
 * does not, on its own, prove `val` is callable with a `T`.
 *
 * This helper performs the narrowing once, type-safely, so setters can drop
 * the casts entirely.
 */
export type Updater<T> = T | ((prev: T) => T);

export function resolveUpdater<T>(val: Updater<T>, prev: T): T {
	return val instanceof Function ? val(prev) : val;
}
