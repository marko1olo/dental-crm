import React from "react";
import { ChevronDown, ChevronUp, Plus, Search, X, Zap } from "lucide-react";
import { money } from "../../../AppHelpers";
import { ChairsideDiagnosisPackageCard } from "../ChairsideDiagnosisPackageCard";
import { ChairsideExpressGrid } from "../ChairsideExpressGrid";
import { ChairsideToothSelector } from "../ChairsideToothSelector";
import { CLINICAL_SERVICE_BUNDLES } from "../clinicalServiceBundles";
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
	return (
		<>
			{/* 1. БЫСТРЫЙ ВЫБОР ЗУБА ДЛЯ ПРИВЯЗКИ (FDI 11..48, «Без зуба») */}
			<ChairsideToothSelector
				selectedTooth={selectedTooth}
				onSelectTooth={onSelectTooth}
				isToothGridOpen={isToothGridOpen}
				onToggleToothGrid={onToggleToothGrid}
			/>

			{/* 2. 9 быстрых услуг у кресла */}
			<ChairsideExpressGrid
				selectedTooth={selectedTooth}
				onAddExpressService={onAddExpressService}
			/>

			{/* 3. БЫСТРЫЙ ИНЛАЙН-ПОИСК ПО ПРЕЙСКУРАНТУ КЛИНИКИ */}
			<div className="mb-3 relative">
				<div className="relative">
					<input
						type="text"
						value={catalogSearch}
						onChange={(e) => onCatalogSearchChange(e.target.value)}
						placeholder="Поиск по прейскуранту клиники (код услуги или название: пломба, коронка, анестезия)..."
						data-testid="service-catalog-search-input"
						className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2.5 min-h-[44px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
					/>
					<Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
					{catalogSearch && (
						<button
							type="button"
							onClick={() => onCatalogSearchChange("")}
							className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
							title="Очистить поиск"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{catalogSearch.trim().length > 0 && (
					<div
						data-testid="service-catalog-search-results"
						className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-30 divide-y divide-slate-100 dark:divide-slate-800"
					>
						{filteredCatalog.length === 0 ? (
							<div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
								Ничего не найдено в прейскуранте по запросу «{catalogSearch}»
							</div>
						) : (
							filteredCatalog.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => onAddCatalogService(item)}
									className="w-full min-h-[44px] flex items-center justify-between p-2.5 text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
								>
									<div className="flex-1 min-w-0 pr-2">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
												{item.title}
											</span>
											<span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
												[{item.code}]
											</span>
										</div>
										{selectedTooth && (
											<div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
												будет привязано к зубу {selectedTooth}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-200">
											{money(item.priceRub)}
										</span>
										<span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
											<Plus className="w-3.5 h-3.5" /> Добавить
										</span>
									</div>
								</button>
							))
						)}
					</div>
				)}
			</div>

			{/* 3.5. ГОТОВЫЙ ЧЕК-ЛИСТ УСЛУГ ПО НОМЕНКЛАТУРЕ 804Н (МГНОВЕННО У КРЕСЛА) */}
			<ChairsideDiagnosisPackageCard
				selectedTooth={selectedTooth}
				patientId={visitPatientId}
				visitId={visitId}
				catalog={effectiveCatalog}
				onApplyPackageToPlan={onApplyDiagnosisPackage}
			/>

			{/* 4. КОМПЛЕКСНЫЕ КЛИНИЧЕСКИЕ ПАКЕТЫ (КАРИЕС, ЭНДО, ГИГИЕНА, УДАЛЕНИЕ) */}
			<div className="mb-3 p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50">
				<div className="flex items-center justify-between gap-2 mb-2">
					<span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
						<Zap className="w-3.5 h-3.5 text-indigo-500" />
						Комплексные клинические пакеты:
					</span>
					<button
						type="button"
						onClick={onToggleBundlesExpanded}
						className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
					>
						{bundlesExpanded ? "Свернуть" : "Показать все 4 пакета"}
						{bundlesExpanded ? (
							<ChevronUp className="w-3 h-3" />
						) : (
							<ChevronDown className="w-3 h-3" />
						)}
					</button>
				</div>
				<div
					className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${
						bundlesExpanded ? "" : "max-h-[120px] overflow-hidden"
					}`}
				>
					{CLINICAL_SERVICE_BUNDLES.map((b) => (
						<button
							key={b.id}
							type="button"
							onClick={() => onAddBundle(b)}
							className="flex flex-col items-start p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-all text-left group min-h-[48px]"
							title={b.services
								.map(
									(s) =>
										`• [${s.code804n}] ${s.title} (${money(s.priceRub)})`,
								)
								.join("\n")}
						>
							<div className="w-full flex items-center justify-between gap-1">
								<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
									{b.shortLabel}
									{selectedTooth ? ` (зуб ${selectedTooth})` : ""}
								</span>
								<span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono">
									{money(b.totalPriceRub)}
								</span>
							</div>
							<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full mt-0.5">
								{b.badge}
							</span>
						</button>
					))}
				</div>
			</div>
		</>
	);
};
