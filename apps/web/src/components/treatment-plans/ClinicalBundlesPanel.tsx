import React, { useState } from "react";
import { ChevronDown, ChevronUp, PackagePlus } from "lucide-react";
import { BundleCard } from "./bundlesPanel/BundleCard.js";
import { BundlePreviewDrawer } from "./bundlesPanel/BundlePreviewDrawer.js";
import { BundlesToolbar } from "./bundlesPanel/BundlesToolbar.js";
import { useClinicalBundles } from "./bundlesPanel/useClinicalBundles.js";
import type { ClinicalBundleId } from "./treatmentPlanBundlesEngine.js";

export interface ClinicalBundlesPanelProps {
	readonly onApplyBundle: (bundleId: ClinicalBundleId, toothNumber?: number) => void;
	readonly initialToothNumber?: number;
	readonly className?: string;
	readonly compact?: boolean;
}

export const ClinicalBundlesPanel: React.FC<ClinicalBundlesPanelProps> = ({
	onApplyBundle,
	initialToothNumber = 16,
	className = "",
	compact = false,
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(!compact);
	const {
		selectedTooth, customToothInput, lastAddedBundleId, previewBundle, setPreviewBundle,
		stageFilter, setStageFilter, searchQuery, setSearchQuery, filteredBundles,
		handleToothSelect, handleCustomToothChange, handleApply,
	} = useClinicalBundles({ initialToothNumber, onApplyBundle });

	return (
		<div
			className={`clinical-bundles-panel rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] p-4 shadow-sm ${className}`.trim()}
			data-testid="clinical-bundles-panel"
		>
			<div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--line,var(--border,#cbd5e1))]">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
						<PackagePlus size={18} />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-sm font-black text-[var(--ink,#0f172a)]">
								Клинические пакеты «под ключ»
							</h3>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,#0d9488)]/30">
								Быстрый ввод
							</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)]">
								Прейскурант услуг
							</span>
						</div>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							Готовые комплексные протоколы без номенклатурного ада и ручного ввода 15 мелких кодов
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
					title={isExpanded ? "Свернуть панель пакетов" : "Развернуть панель пакетов"}
					data-testid="bundles-toggle-btn"
				>
					{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</button>
			</div>

			{isExpanded && (
				<div className="mt-3 space-y-3">
					<BundlesToolbar
						stageFilter={stageFilter}
						onStageFilterChange={setStageFilter}
						selectedTooth={selectedTooth}
						onToothSelect={handleToothSelect}
						customToothInput={customToothInput}
						onCustomToothChange={handleCustomToothChange}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
					/>

					{filteredBundles.length === 0 ? (
						<div className="py-8 px-4 text-center text-xs text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,var(--border,#cbd5e1))] flex flex-col items-center justify-center gap-2">
							<PackagePlus size={24} className="text-[var(--muted,#64748b)] opacity-40" />
							<span className="font-semibold text-[var(--ink,#0f172a)]">Пакеты не найдены</span>
							<button
								type="button"
								onClick={() => { setStageFilter("all"); setSearchQuery(""); }}
								className="h-7 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,#0d9488)]/30 cursor-pointer transition-colors"
							>
								Сбросить фильтры
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
							{filteredBundles.map((b) => (
								<BundleCard
									key={b.id}
									bundle={b}
									selectedTooth={selectedTooth}
									isRecentlyAdded={lastAddedBundleId === b.id}
									onPreview={() => setPreviewBundle(previewBundle?.id === b.id ? null : b)}
									onApply={() => handleApply(b)}
								/>
							))}
						</div>
					)}

					{previewBundle && (
						<BundlePreviewDrawer bundle={previewBundle} onClose={() => setPreviewBundle(null)} />
					)}
				</div>
			)}
		</div>
	);
};

export default ClinicalBundlesPanel;
