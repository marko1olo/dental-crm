import { resolveUpdater, type Updater } from "../updater";

export type SetterFn<T> = (val: Updater<T>) => void;

export function createSetter<T = unknown>(
	set: (updater: (state: Record<string, unknown>) => Record<string, unknown>) => void,
	key: string,
): SetterFn<T> {
	return (val: Updater<T>) =>
		set((state: Record<string, unknown>) => ({
			[key]: resolveUpdater(val, state[key] as T),
		}));
}
