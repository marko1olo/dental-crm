import React from "react";
import { ChairsideDiagnosisPackageCard } from "../ChairsideDiagnosisPackageCard";
import { ChairsideExpressGrid } from "../ChairsideExpressGrid";
import { ChairsideToothSelector } from "../ChairsideToothSelector";
import {
	CLINICAL_SERVICE_BUNDLES,
	resolveClinicalServiceBundlesAgainstCatalog,
} from "../clinicalServiceBundles";
import { QuickServiceBundlesSection } from "./QuickServiceBundlesSection";
import { QuickServiceCatalogSearchBar } from "./QuickServiceCatalogSearchBar";
import type { QuickServiceSearchAndPresetsProps } from "./types";

export const QuickServiceSearchAndPresets: React.FC<
	QuickServiceSearchAndPresetsProps
> = ({
	selectedTooth,
	onSelectTooth,
	isToothGridOpen,
	onToggleToothGrid,
	onAddExpressService,
	catalogSearch,
	onCatalogSearchChange,
	filteredCatalog,
	onAddCatalogService,
	visitPatientId,
	visitId,
	effectiveCatalog,
	onApplyDiagnosisPackage,
	bundlesExpanded,
	onToggleBundlesExpanded,
	onAddBundle,
}) => {
	const resolvedBundles = React.useMemo(
		() =>
			Array.isArray(effectiveCatalog) && effectiveCatalog.length > 0
				? resolveClinicalServiceBundlesAgainstCatalog(effectiveCatalog)
				: CLINICAL_SERVICE_BUNDLES,
		[effectiveCatalog],
	);

	return (
		<>
			<ChairsideToothSelector
				selectedTooth={selectedTooth}
				onSelectTooth={onSelectTooth}
				isToothGridOpen={isToothGridOpen}
				onToggleToothGrid={onToggleToothGrid}
			/>

			<ChairsideExpressGrid
				selectedTooth={selectedTooth}
				onAddExpressService={onAddExpressService}
				catalog={effectiveCatalog}
			/>

			<QuickServiceCatalogSearchBar
				catalogSearch={catalogSearch}
				onCatalogSearchChange={onCatalogSearchChange}
				filteredCatalog={filteredCatalog}
				onAddCatalogService={onAddCatalogService}
				selectedTooth={selectedTooth}
			/>

			<ChairsideDiagnosisPackageCard
				selectedTooth={selectedTooth}
				patientId={visitPatientId}
				visitId={visitId}
				catalog={effectiveCatalog}
				onApplyPackageToPlan={onApplyDiagnosisPackage}
			/>

			<QuickServiceBundlesSection
				resolvedBundles={resolvedBundles}
				bundlesExpanded={bundlesExpanded}
				onToggleBundlesExpanded={onToggleBundlesExpanded}
				onAddBundle={onAddBundle}
				selectedTooth={selectedTooth}
			/>
		</>
	);
};
