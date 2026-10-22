import React from "react";
import {
	filterServiceCatalog,
	type FilteredCatalogService,
} from "../completedServicesPlan";

export function useCompletedServicesCatalogSearch(
	overrideCatalog?: readonly any[],
	dashboardServiceCatalog?: readonly any[],
) {
	const [catalogSearch, setCatalogSearch] = React.useState<string>("");
	const [debouncedCatalogSearch, setDebouncedCatalogSearch] = React.useState<string>("");

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedCatalogSearch(catalogSearch), 280);
		return () => clearTimeout(timer);
	}, [catalogSearch]);

	const effectiveCatalog = overrideCatalog ?? dashboardServiceCatalog ?? [];
	const filteredCatalog = React.useMemo(
		() => filterServiceCatalog(effectiveCatalog, debouncedCatalogSearch, 20),
		[effectiveCatalog, debouncedCatalogSearch],
	);

	return {
		catalogSearch,
		setCatalogSearch,
		filteredCatalog,
		effectiveCatalog,
	};
}
