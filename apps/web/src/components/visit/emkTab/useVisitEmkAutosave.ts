import React from "react";

export interface UseVisitEmkAutosaveParams {
	readonly flushSoloPendingSave: () => Promise<boolean | void>;
}

export function useVisitEmkAutosave({
	flushSoloPendingSave,
}: UseVisitEmkAutosaveParams) {
	const debouncedDraftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	const triggerDebouncedAutosave = React.useCallback(() => {
		if (debouncedDraftTimerRef.current) clearTimeout(debouncedDraftTimerRef.current);
		debouncedDraftTimerRef.current = setTimeout(() => {
			void flushSoloPendingSave();
		}, 600); // Debounced autosave 500-1000ms (Mandates 8e, 8n)
	}, [flushSoloPendingSave]);

	React.useEffect(() => {
		const flushPending = () => {
			if (debouncedDraftTimerRef.current) {
				clearTimeout(debouncedDraftTimerRef.current);
				debouncedDraftTimerRef.current = null;
			}
			void flushSoloPendingSave();
		};

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") {
				flushPending();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}
		if (typeof window !== "undefined") {
			window.addEventListener("pagehide", flushPending);
			window.addEventListener("beforeunload", flushPending);
			window.addEventListener("blur", flushPending);
			window.addEventListener("dente-telephony-incoming-call", flushPending);
			window.addEventListener("dente:visit-tab-change", flushPending);
		}

		return () => {
			if (debouncedDraftTimerRef.current) {
				clearTimeout(debouncedDraftTimerRef.current);
				debouncedDraftTimerRef.current = null;
			}
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
			if (typeof window !== "undefined") {
				window.removeEventListener("pagehide", flushPending);
				window.removeEventListener("beforeunload", flushPending);
				window.removeEventListener("blur", flushPending);
				window.removeEventListener("dente-telephony-incoming-call", flushPending);
				window.removeEventListener("dente:visit-tab-change", flushPending);
			}
		};
	}, [flushSoloPendingSave]);

	return { triggerDebouncedAutosave };
}
