import { useEffect, useState } from "react";
import { logger } from "../../../utils/logger";
import { searchFamilyGroupsApi } from "./familyCardApi";

export function useFamilySearch(isLinking: boolean) {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchFailed, setSearchFailed] = useState(false);

	useEffect(() => {
		let active = true;
		if (isLinking && searchQuery.length >= 2) {
			const delayFn = setTimeout(async () => {
				if (!active) return;
				setSearchLoading(true);
				try {
					const data = await searchFamilyGroupsApi(searchQuery);
					if (!active) return;
					setSearchResults(data);
					setSearchFailed(false);
				} catch (e) {
					if (!active) return;
					logger.error("Family search failed", e);
					setSearchResults([]);
					setSearchFailed(true);
				} finally {
					if (active) setSearchLoading(false);
				}
			}, 300);
			return () => { active = false; clearTimeout(delayFn); };
		}
		setSearchResults([]);
		setSearchFailed(false);
		return () => { active = false; };
	}, [searchQuery, isLinking]);

	const resetSearch = () => {
		setSearchQuery("");
		setSearchResults([]);
		setSearchFailed(false);
	};

	return {
		searchQuery,
		setSearchQuery,
		searchResults,
		searchLoading,
		searchFailed,
		resetSearch,
	};
}
