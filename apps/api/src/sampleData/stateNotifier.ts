/**
 * @file stateNotifier.ts
 * @description Layer 0: Leaf event dispatcher for mutable state change notifications.
 * Decouples domain mutation modules from state snapshot persistence to guarantee an acyclic DAG.
 */

type FlushListener = () => void;
let flushListener: FlushListener | null = null;
let dirtyPending = false;

export function registerPersistenceFlushHandler(handler: FlushListener): void {
	flushListener = handler;
	if (dirtyPending) {
		dirtyPending = false;
		handler();
	}
}

export function persistMutableState(): void {
	if (flushListener) {
		flushListener();
	} else {
		dirtyPending = true;
	}
}
