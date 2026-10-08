/**
 * @file domainState.ts
 * @description Layer 0: Live in-memory domain state proxy and registry.
 * Decouples domain computation functions from persistence lifecycle to ensure an acyclic DAG.
 */

import type { DomainState } from "./types.js";

let liveDomainState: DomainState | null = null;

export function registerLiveDomainState(state: DomainState): void {
	liveDomainState = state;
}

export const inMemoryDomainState: DomainState = new Proxy({} as DomainState, {
	get(_target, prop, receiver) {
		if (!liveDomainState) {
			throw new Error("inMemoryDomainState accessed before live state registration");
		}
		return Reflect.get(liveDomainState, prop, receiver);
	},
	set(_target, prop, value, receiver) {
		if (!liveDomainState) {
			throw new Error("inMemoryDomainState mutated before live state registration");
		}
		return Reflect.set(liveDomainState, prop, value, receiver);
	},
	has(_target, prop) {
		if (!liveDomainState) return false;
		return Reflect.has(liveDomainState, prop);
	},
	ownKeys(_target) {
		if (!liveDomainState) return [];
		return Reflect.ownKeys(liveDomainState);
	},
	getOwnPropertyDescriptor(_target, prop) {
		if (!liveDomainState) return undefined;
		return Object.getOwnPropertyDescriptor(liveDomainState, prop);
	},
});
