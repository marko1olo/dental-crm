/**
 * ClinicalBundlesPanel.tsx — Панель 1-клик добавления готовых клинических пакетов «под ключ»
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты под ключ вместо номенклатурного ада).
 *
 * Врач не должен набивать 15 мелких кодов Минздрава на одну пломбу или коронку.
 * Панель позволяет в 1 клик добавить готовый клинический комплекс в соответствующий этап плана лечения.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	Activity,
	Check,
	ChevronDown,
	ChevronUp,
	Crown,
	Droplet,
	Eye,
	PackagePlus,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
} from "./treatmentPlanBundlesEngine";

export interface ClinicalBundlesPanelProps {
	readonly onApplyBundle: (bundleId: ClinicalBundleId, toothNumber?: number) => void;
	readonly initialToothNumber?: number | undefined;
	readonly className?: string | undefined;
	readonly compact?: boolean | undefined;
}

const COMMON_TEETH = [11, 16, 21, 26, 36, 46, 14, 24, 34, 44, 38, 48];

export const ClinicalBundlesPanel: React.FC<ClinicalBundlesPanelProps> = ({
	onApplyBundle,
	initialToothNumber = 16,
	className = "",
	compact = false,
}) => {
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [customToothInput, setCustomToothInput] = useState<string>(String(initialToothNumber));
	const [isExpanded, setIsExpanded] = useState<boolean>(!compact);
	const [lastAddedBundleId, setLastAddedBundleId] = useState<string | null>(null);
	const [previewBundle, setPreviewBundle] = useState<ClinicalBundleDefinition | null>(null);
	const [stageFilter, setStageFilter] = useState<number | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	useEffect(() => {
		if (initialToothNumber && initialToothNumber >= 11 && initialToothNumber <= 85) {
			setSelectedTooth(initialToothNumber);
			setCustomToothInput(String(initialToothNumber));
		}
	}, [initialToothNumber]);

	const handleToothSelect = (tooth: number) => {
		setSelectedTooth(tooth);
		setCustomToothInput(String(tooth));
	};

	const handleCustomToothChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.replace(/\D/g, "").slice(0, 2);
		setCustomToothInput(val);
		const num = parseInt(val, 10);
		if (num >= 11 && num <= 85) {
			setSelectedTooth(num);
		}
	};

	const handleApply = (bundle: ClinicalBundleDefinition) => {
		const tooth = bundle.requiresTooth ? selectedTooth : undefined;
		onApplyBundle(bundle.id, tooth);
		setLastAddedBundleId(bundle.id);
		setTimeout(() => setLastAddedBundleId(null), 2000);
	};

	const filteredBundles = useMemo(() => {
		return CLINICAL_BUNDLES.filter((bundle) => {
			if (stageFilter !== "all" && bundle.stageNumber !== stageFilter) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchesTitle =
					bundle.title.toLowerCase().includes(q) ||
					bundle.shortTitle.toLowerCase().includes(q);
				const matchesDesc = bundle.description.toLowerCase().includes(q);
				const matchesItems = bundle.items.some(
					(it) =>
						it.name.toLowerCase().includes(q) ||
						it.code804n.toLowerCase().includes(q),
				);
				if (!matchesTitle && !matchesDesc && !matchesItems) return false;
			}
			return true;
		});
	}, [stageFilter, searchQuery]);

	const getStageBadge = (stageNumber: number) => {
		switch (stageNumber) {
			case 1:
				return {
					text: "Этап I: Терапия & Гигиена",
					cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
				};
			case 2:
				return {
					text: "Этап II: Хирургия & Имплантация",
					cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
				};
			case 3:
				return {
					text: "Этап III: Ортопедия",
					cls: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
				};
			default:
				return {
					text: "Клинический этап",
					cls: "bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border-[var(--line,#cbd5e1)]",
				};
		}
	};

	const getBundleIcon = (id: ClinicalBundleId) => {
		switch (id) {
			case "caries_turnkey":
				return <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
			case "endo_1canal_turnkey":
				return <Activity size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
			case "endo_3canal_turnkey":
				return <Zap size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
			case "hygiene_turnkey":
				return <Droplet size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />;
			case "extraction_turnkey":
				return <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
			case "implant_turnkey":
				return <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />;
			case "crown_metalloceramic_turnkey":
				return <Crown size={16} className="text-[var(--teal,#0d9488)] shrink-0" />;
			case "crown_zirconia_turnkey":
				return <Crown size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />;
			default:
				return <PackagePlus size={16} className="text-[var(--teal,#0d9488)] shrink-0" />;
		}
	};

	return (
		<div
			className={`clinical-bundles-panel rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] p-4 shadow-sm ${className}`.trim()}
			data-testid="clinical-bundles-panel"
		>
			{/* Header & Collapse Toggle */}
			<div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--line,var(--border,#cbd5e1))]">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
						<PackagePlus size={18} />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-sm font-black text-[var(--ink,#0f172a)]">
								Клинические пакеты «под ключ» (1 клик)
							</h3>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,#0d9488)]/30">
								Быстрый ввод
							</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)]">
								Приказ МЗ РФ №804н
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
					{/* Hick's Law: Compact 1-Row Toolbar (32-36px) for Stage Filter, FDI Tooth & Search */}
					<div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] flex-wrap sm:flex-nowrap min-h-[36px]">
						{/* Stage Filter Pills (Hick's Law: reduce choices) */}
						<div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 py-0.5">
							<button
								type="button"
								onClick={() => setStageFilter("all")}
								className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
									stageFilter === "all"
										? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
								}`}
								data-testid="bundle-filter-all"
							>
								Все ({CLINICAL_BUNDLES.length})
							</button>
							<button
								type="button"
								onClick={() => setStageFilter(1)}
								className={`h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
									stageFilter === 1
										? "bg-emerald-600 text-white shadow-2xs"
										: "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
								}`}
								data-testid="bundle-filter-stage-1"
							>
								Этап I: Терапия
							</button>
							<button
								type="button"
								onClick={() => setStageFilter(2)}
								className={`h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
									stageFilter === 2
										? "bg-amber-600 text-white shadow-2xs"
										: "text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
								}`}
								data-testid="bundle-filter-stage-2"
							>
								Этап II: Хирургия
							</button>
							<button
								type="button"
								onClick={() => setStageFilter(3)}
								className={`h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
									stageFilter === 3
										? "bg-purple-600 text-white shadow-2xs"
										: "text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
								}`}
								data-testid="bundle-filter-stage-3"
							>
								Этап III: Ортопедия
							</button>
						</div>

						{/* Quick FDI Tooth & Search Bar */}
						<div className="flex items-center gap-1.5 shrink-0">
							<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] border border-[var(--line,var(--border,#cbd5e1))] rounded-lg px-2 h-7">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)]">Зуб:</span>
								<select
									value={selectedTooth}
									onChange={(e) => handleToothSelect(Number(e.target.value))}
									className="bg-transparent font-mono font-bold text-xs text-[var(--ink,#0f172a)] outline-none cursor-pointer"
									title="Выбрать целевой зуб FDI"
								>
									{COMMON_TEETH.map((t) => (
										<option key={t} value={t}>
											#{t}
										</option>
									))}
								</select>
								<input
									type="text"
									value={customToothInput}
									onChange={handleCustomToothChange}
									placeholder="FDI"
									maxLength={2}
									className="w-7 text-center font-mono font-bold text-xs bg-transparent text-[var(--teal,#0d9488)] outline-none border-l border-[var(--line,var(--border,#cbd5e1))] pl-1 ml-1"
									title="Ввести номер зуба FDI вручную"
									data-testid="bundle-tooth-input"
								/>
							</div>

							<div className="relative flex items-center">
								<Search
									size={12}
									className="absolute left-2 text-[var(--muted,#64748b)] pointer-events-none"
								/>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск пакета..."
									className="h-7 w-28 sm:w-36 pl-6 pr-2 text-xs rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-[var(--teal,#0d9488)]"
									data-testid="bundle-search-input"
								/>
							</div>
						</div>
					</div>

					{/* Packages Grid / Empty State */}
					{filteredBundles.length === 0 ? (
						<div className="py-8 px-4 text-center text-xs text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,var(--border,#cbd5e1))] flex flex-col items-center justify-center gap-2">
							<PackagePlus size={24} className="text-[var(--muted,#64748b)] opacity-40" />
							<span className="font-semibold text-[var(--ink,#0f172a)]">
								Пакеты не найдены по текущим критериям
							</span>
							<button
								type="button"
								onClick={() => {
									setStageFilter("all");
									setSearchQuery("");
								}}
								className="h-7 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,#0d9488)]/30 cursor-pointer transition-colors"
							>
								Сбросить фильтры
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
							{filteredBundles.map((bundle) => {
								const badge = getStageBadge(bundle.stageNumber);
								const isRecentlyAdded = lastAddedBundleId === bundle.id;

								return (
									<div
										key={bundle.id}
										className="flex flex-col justify-between p-3 rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)] hover:shadow-md transition-all group"
										data-testid={`bundle-card-${bundle.id}`}
									>
										<div>
											<div className="flex items-start justify-between gap-1.5 mb-1.5">
												<div className="flex items-center gap-1.5 min-w-0">
													{getBundleIcon(bundle.id)}
													<span className="font-bold text-xs text-[var(--ink,#0f172a)] truncate group-hover:text-[var(--teal,#0d9488)] transition-colors">
														{bundle.shortTitle}
													</span>
												</div>
												<span
													className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${badge.cls}`}
												>
													{bundle.stageNumber === 1
														? "Этап I"
														: bundle.stageNumber === 2
															? "Этап II"
															: "Этап III"}
												</span>
											</div>

											<p className="text-[11px] text-[var(--muted,#64748b)] leading-snug mb-2 line-clamp-2">
												{bundle.description}
											</p>

											{/* Items Micro-Summary */}
											<div className="text-[10px] text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] p-1.5 rounded-lg border border-[var(--line,var(--border,#cbd5e1))] mb-2.5">
												<strong className="text-[var(--ink,#0f172a)] block mb-0.5 font-semibold">
													Включает ({bundle.items.length} поз.):
												</strong>
												<ul className="list-disc list-inside space-y-0.5 text-[9.5px]">
													{bundle.items.map((it) => (
														<li key={it.code804n} className="truncate">
															<span className="font-mono text-[var(--muted,#64748b)]">
																{it.code804n}:
															</span>{" "}
															{it.name}
														</li>
													))}
												</ul>
											</div>
										</div>

										{/* Footer: Price & 1-Click Apply Button */}
										<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line,var(--border,#cbd5e1))]">
											<div>
												<span className="text-[10px] text-[var(--muted,#64748b)] block leading-none">
													Итого под ключ
												</span>
												<strong className="text-sm font-black text-[var(--ink,#0f172a)] font-mono">
													{bundle.totalPriceRub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>

											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() =>
														setPreviewBundle(
															previewBundle?.id === bundle.id ? null : bundle,
														)
													}
													className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer touch-manipulation"
													title="Посмотреть клинический состав и материалы"
												>
													<Eye size={14} />
												</button>
												<button
													type="button"
													onClick={() => handleApply(bundle)}
													className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs touch-manipulation ${
														isRecentlyAdded
															? "bg-emerald-600 text-white"
															: "bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white"
													}`}
													title={`Добавить пакет в план лечения${bundle.requiresTooth ? ` для зуба ${selectedTooth}` : ""}`}
													data-testid={`add-bundle-${bundle.id}`}
												>
													{isRecentlyAdded ? (
														<>
															<Check size={13} />
															<span>Добавлено!</span>
														</>
													) : (
														<>
															<PackagePlus size={13} />
															<span>В план</span>
														</>
													)}
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Modal/Detail Drawer for Bundle Preview */}
					{previewBundle && (
						<div
							className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--teal,#0d9488)]/30 text-xs space-y-2 animate-in fade-in duration-150"
							data-testid="bundle-detail-preview"
						>
							<div className="flex items-center justify-between gap-2 border-b border-[var(--line,var(--border,#cbd5e1))] pb-2">
								<div className="flex items-center gap-2">
									<Sparkles size={16} className="text-[var(--teal,#0d9488)]" />
									<strong className="text-[var(--ink,#0f172a)] font-bold">
										{previewBundle.title}
									</strong>
								</div>
								<button
									type="button"
									onClick={() => setPreviewBundle(null)}
									className="text-[11px] text-[var(--muted,#64748b)] hover:underline cursor-pointer"
								>
									Закрыть
								</button>
							</div>

							<p className="text-[var(--muted,#64748b)]">{previewBundle.description}</p>

							<div className="overflow-x-auto">
								<table className="w-full text-[11px] border-collapse">
									<thead>
										<tr className="border-b border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] text-left">
											<th className="py-1 pr-2">Код 804н</th>
											<th className="py-1 pr-2">Процедура</th>
											<th className="py-1 pr-2">Материалы и протокол</th>
											<th className="py-1 text-right">Тариф</th>
										</tr>
									</thead>
									<tbody>
										{previewBundle.items.map((it) => (
											<tr
												key={it.code804n}
												className="border-b border-[var(--line,var(--border,#cbd5e1))]/50 hover:bg-[var(--paper,#ffffff)]"
											>
												<td className="py-1 font-mono font-bold text-[var(--teal,#0d9488)]">
													{it.code804n}
												</td>
												<td className="py-1 pr-2 font-medium">{it.name}</td>
												<td className="py-1 pr-2 text-[10px] text-[var(--muted,#64748b)]">
													{it.materials}
												</td>
												<td className="py-1 text-right font-mono font-bold whitespace-nowrap">
													{it.defaultPriceRub.toLocaleString("ru-RU")} ₽
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
