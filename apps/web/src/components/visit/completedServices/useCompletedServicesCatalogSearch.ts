import React from "react";
import type { DiagnosisPackageCatalogItem } from "../useDiagnosisPackage";
import {
	filterServiceCatalog,
	type FilteredCatalogService,
} from "../completedServicesPlan";

export function useCompletedServicesCatalogSearch(
	overrideCatalog?: readonly DiagnosisPackageCatalogItem[] | undefined,
	dashboardServiceCatalog?: readonly DiagnosisPackageCatalogItem[] | undefined,
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
