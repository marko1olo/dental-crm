import type { CachedCephStudy } from "./types";

let inMemorySharedStudy: CachedCephStudy | null = null;

export function cacheActiveCephStudy(study: CachedCephStudy | null): void {
	inMemorySharedStudy = study;
	if (typeof window !== "undefined") {
		try {
			(window as unknown as { __cephSharedStudy?: CachedCephStudy | null }).__cephSharedStudy = study;
		} catch {
			// ignore cross-origin/sandbox quirks
		}
	}
}

export function getCachedActiveCephStudy(): CachedCephStudy | null {
	if (inMemorySharedStudy) {
		return inMemorySharedStudy;
	}
	if (typeof window !== "undefined") {
		try {
			const opener = window.opener as unknown as { __cephSharedStudy?: CachedCephStudy | null } | null;
			if (opener?.__cephSharedStudy) {
				return opener.__cephSharedStudy;
			}
			const local = (window as unknown as { __cephSharedStudy?: CachedCephStudy | null }).__cephSharedStudy;
			if (local) {
				return local;
			}
		} catch {
			// opener may be cross-origin or blocked
		}
	}
	return null;
}
