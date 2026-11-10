/**
 * StudioClinicalBundlesTab.tsx — Встроенный таб клинических пакетов в студии планов лечения.
 * Мандаты 8b, 8e: Интеграция пакетов «под ключ» в 1 клик прямо в студию без оторванных модалок-сирот.
 */

import React, { useState, useMemo } from "react";
import { Package, Plus, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { CLINICAL_BUNDLES, type ClinicalBundleDefinition, type ClinicalBundleCategory } from "../treatmentPlanBundlesEngine";
import { formatRubles } from "../treatmentPlanTypes";

export interface StudioClinicalBundlesTabProps {
	readonly onAddBundleToStages: (bundle: ClinicalBundleDefinition, toothNumber?: number) => void;
	readonly selectedToothNumber?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
	all: "Все пакеты",
	therapy: "Терапия",
	surgery: "Хирургия",
	orthopedics: "Ортопедия",
	periodontics: "Пародонтология",
	prevention: "Профилактика",
	implantation: "Имплантация",
	implantology: "Имплантация",
};

export const StudioClinicalBundlesTab: React.FC<StudioClinicalBundlesTabProps> = ({
	onAddBundleToStages,
	selectedToothNumber: initialTooth,
}) => {
	const [activeCategory, setActiveCategory] = useState<ClinicalBundleCategory | "all">("all");
	const [selectedTooth, setSelectedTooth] = useState<number | undefined>(initialTooth);
	const [expandedBundleIds, setExpandedBundleIds] = useState<Record<string, boolean>>({});
	const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

	const filteredBundles = useMemo(() => {
		if (activeCategory === "all") return CLINICAL_BUNDLES;
		return CLINICAL_BUNDLES.filter((b) => b.category === activeCategory);
	}, [activeCategory]);

	const handleAdd = (bundle: ClinicalBundleDefinition) => {
		onAddBundleToStages(bundle, selectedTooth);
		setRecentlyAddedId(bundle.id);
		setTimeout(() => setRecentlyAddedId(null), 2500);
	};

	const toggleExpand = (id: string) => {
		setExpandedBundleIds((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	return (
		<div className="space-y-4" data-testid="studio-clinical-bundles-tab">
			{/* Панель фильтров категорий и зуба FDI */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl">
				<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
					{(["all", "therapy", "surgery", "orthopedics"] as const).map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => setActiveCategory(cat)}
							className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
								activeCategory === cat
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
						>
							{CATEGORY_LABELS[cat]}
						</button>
					))}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<label htmlFor="bundle-tooth-input" className="text-xs text-[var(--muted)] font-semibold whitespace-nowrap">
						Привязать к зубу FDI:
					</label>
					<input
						id="bundle-tooth-input"
						type="number"
						min={11}
						max={48}
						placeholder="№ 11–48"
						value={selectedTooth || ""}
						onChange={(e) => {
							const val = parseInt(e.target.value, 10);
							setSelectedTooth(isNaN(val) ? undefined : val);
						}}
						className="w-20 h-9 px-2 text-xs font-bold bg-[var(--paper)] border border-[var(--line)] rounded-lg text-center text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>
			</div>

			{/* Уведомление об успешном добавлении */}
			{recentlyAddedId && (
				<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2 animate-in fade-in">
					<Sparkles className="w-4 h-4 shrink-0" />
					<span>Пакет успешно добавлен в этапы плана лечения!</span>
				</div>
			)}

			{/* Сетка карточек клинических пакетов */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				{filteredBundles.map((bundle) => {
					const isExpanded = Boolean(expandedBundleIds[bundle.id]);
					const isRecent = recentlyAddedId === bundle.id;
					return (
						<div
							key={bundle.id}
							className={`flex flex-col p-4 rounded-xl border transition-all ${
								isRecent
									? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.06))] shadow-sm"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong,#94a3b8)]"
							}`}
							data-testid={`bundle-card-${bundle.id}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-2 min-w-0">
									<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
										<Package className="w-4 h-4" />
									</div>
									<div className="min-w-0">
										<h4 className="text-xs sm:text-sm font-black text-[var(--ink)] truncate m-0">{bundle.title}</h4>
										<span className="text-[10px] text-[var(--muted)]">{CATEGORY_LABELS[bundle.category]} · {bundle.items.length} процедур</span>
									</div>
								</div>
								<div className="text-right shrink-0">
									<div className="text-xs sm:text-sm font-black text-[var(--ink)]">{formatRubles(bundle.totalRub || 0)}</div>
									<div className="text-[10px] text-[var(--muted)]">{bundle.estimatedVisits} визит</div>
								</div>
							</div>

							<p className="text-xs text-[var(--muted)] mt-2 mb-3 line-clamp-2 leading-relaxed">
								{bundle.description}
							</p>

							{/* Раскрываемый список процедур */}
							{isExpanded && (
								<div className="mt-1 mb-3 pt-2 border-t border-[var(--line-subtle)] space-y-1.5 text-xs">
									{bundle.items.map((item) => (
										<div key={item.id} className="flex items-center justify-between gap-2 text-[11px]">
											<span className="text-[var(--ink)] line-clamp-1">· {item.name}</span>
											<span className="font-semibold text-[var(--muted)] shrink-0">{formatRubles(item.priceRub || item.unitPriceRub || 0)}</span>
										</div>
									))}
								</div>
							)}

							<div className="mt-auto pt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line-subtle)]">
								<button
									type="button"
									onClick={() => toggleExpand(bundle.id)}
									className="text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
								>
									<span>{isExpanded ? "Скрыть состав" : "Состав пакета"}</span>
									{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
								</button>

								<button
									type="button"
									onClick={() => handleAdd(bundle)}
									className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
										isRecent
											? "bg-[var(--teal,#0d9488)] text-white"
											: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)]"
									}`}
								>
									{isRecent ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />}
									<span>{isRecent ? "Добавлено" : "+ Включить в план"}</span>
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default StudioClinicalBundlesTab;
