import { resolveUpdater, type Updater } from "../updater";
import type { DocumentStoreSet } from "./types";

export type SetterFn<T> = (val: Updater<T>) => void;

export function createSetter<T = unknown>(
	set: DocumentStoreSet,
	key: string,
): SetterFn<T> {
	return (val: Updater<T>) =>
		set((state) => ({
			[key]: resolveUpdater(val, Reflect.get(state, key) as T),
		} as Partial<typeof state>));
}
