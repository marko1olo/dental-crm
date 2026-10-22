import React from "react";
import {
	CompletedServicesList,
	type CompletedServicesListProps,
} from "../CompletedServicesList";
import {
	CompletedServiceRowItem,
	PreliminaryTreatmentPlanSection,
} from "./CompletedServiceRowItem";
import { CompletedServicesChecklistEmpty } from "./CompletedServicesChecklistEmpty";
import { CompletedServicesChecklistFooter } from "./CompletedServicesChecklistFooter";
import { QuickServiceSearchAndPresets } from "./QuickServiceSearchAndPresets";
import {
	completedLineOf,
	serviceTitleOf,
	toothSuffixOf,
} from "./serviceChecklistHelpers";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	type CompletedServicesChecklistProps,
} from "./types";
import { useCompletedServicesChecklist } from "./useCompletedServicesChecklist";

export {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	CompletedServiceRowItem,
	type CompletedServicesChecklistProps,
	CompletedServicesList,
	type CompletedServicesListProps,
	completedLineOf,
	PreliminaryTreatmentPlanSection,
	QuickServiceSearchAndPresets,
	serviceTitleOf,
	toothSuffixOf,
};

export const CompletedServicesChecklist: React.FC<
	CompletedServicesChecklistProps
> = ({ serviceCatalog: overrideCatalog }) => {
	const c = useCompletedServicesChecklist(overrideCatalog);

	if (!c.visitIsOpen) {
		return <CompletedServicesChecklistEmpty />;
	}

	return (
		<div
			data-testid="completed-services-checklist"
			className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
		>
			<div className="flex items-center justify-between gap-2 mb-1">
				<h4 className="m-0 text-sm font-semibold text-slate-900 dark:text-white">
					Отметка выполненного у кресла
				</h4>
				<span className="text-[11px] text-slate-500 dark:text-slate-400">
					Прейскурант услуг
				</span>
			</div>
			<p className="m-0 mb-3 text-xs text-slate-500 dark:text-slate-400">
				{c.visitPatientName ? `Пациент: ${c.visitPatientName}. ` : ""}
				Вносите экспресс-услуги или выбирайте из прейскуранта. Отмеченное
				дописывается в карту приёма и передается в счёт.
			</p>

			<QuickServiceSearchAndPresets
				selectedTooth={c.selectedTooth}
				onSelectTooth={c.setSelectedTooth}
				isToothGridOpen={c.isToothGridOpen}
				onToggleToothGrid={() => c.setIsToothGridOpen(!c.isToothGridOpen)}
				onAddExpressService={c.handleAddExpressService}
				catalogSearch={c.catalogSearch}
				onCatalogSearchChange={c.setCatalogSearch}
				filteredCatalog={c.filteredCatalog}
				onAddCatalogService={c.handleAddCatalogService}
				visitPatientId={c.visitPatientId}
				visitId={c.visitId}
				effectiveCatalog={c.effectiveCatalog}
				onApplyDiagnosisPackage={c.handleApplyDiagnosisPackage}
				bundlesExpanded={c.bundlesExpanded}
				onToggleBundlesExpanded={() => c.setBundlesExpanded(!c.bundlesExpanded)}
				onAddBundle={c.handleAddBundle}
			/>

			<PreliminaryTreatmentPlanSection
				planItems={c.planItems}
				isMarked={c.isMarked}
				onTogglePlanItem={c.togglePlanItem}
			/>

			<CompletedServicesList
				completedLinesList={c.completedLinesList}
				totalRub={c.summary.totalRub}
				onRemoveCompletedLine={c.handleRemoveCompletedLine}
			/>

			<CompletedServicesChecklistFooter
				summary={c.summary}
				onPushAllToInvoice={c.handlePushAllToInvoice}
			/>
		</div>
	);
};
