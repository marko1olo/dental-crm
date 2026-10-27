import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";

export function usePatientSearchDebounce(
	query: string,
	setQuery: (val: string) => void,
	setMobileActiveView: (view: "list" | "card") => void,
) {
	const [localQuery, setLocalQuery] = useState(query);
	const searchDebounceTimerRef = useRef<number | null>(null);

	useEffect(() => {
		setLocalQuery(query);
	}, [query]);

	const handleSearchChange = useCallback(
		(val: string) => {
			setLocalQuery(val);
			setMobileActiveView("list");
			if (searchDebounceTimerRef.current !== null) {
				window.clearTimeout(searchDebounceTimerRef.current);
			}
			const debounceMs = getOptimizedTiming().searchDebounceMs;
			searchDebounceTimerRef.current = window.setTimeout(() => {
				searchDebounceTimerRef.current = null;
				startTransition(() => {
					setQuery(val);
				});
			}, debounceMs);
		},
		[setQuery, setMobileActiveView],
	);

	const handleClearSearch = useCallback(() => {
		if (searchDebounceTimerRef.current !== null) {
			window.clearTimeout(searchDebounceTimerRef.current);
			searchDebounceTimerRef.current = null;
		}
		setLocalQuery("");
		setMobileActiveView("list");
		startTransition(() => {
			setQuery("");
		});
	}, [setQuery, setMobileActiveView]);

	return { localQuery, setLocalQuery, handleSearchChange, handleClearSearch };
}
