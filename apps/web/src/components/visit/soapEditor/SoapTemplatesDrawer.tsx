import React, { useMemo } from "react";
import {
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_SPECIALTIES,
} from "@dental/shared";
import { Eye, Search, Sparkles, X } from "lucide-react";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { SPECIALTY_BADGE_COLORS, SPECIALTY_ICONS } from "./constants";
import type { SoapTemplatesDrawerProps } from "./types";

export const SoapTemplatesDrawer: React.FC<SoapTemplatesDrawerProps> = ({
	isTemplatesOpen,
	onClose,
	activeSpecialty,
	onSelectSpecialty,
	searchQuery,
	onSearchChange,
	protocols,
	templatesLimit,
	onShowMore,
	onApplyProtocol,
	previewProtocol,
	onSetPreviewProtocol,
}) => {
	// Чанкинг и виртуализация шаблонов (Мандаты 8c, 8n: DOM budget <= 30-50 узлов)
	const templatesSlice = useMemo(() => {
		return sliceDomList(protocols, templatesLimit, 0);
	}, [protocols, templatesLimit]);

	if (!isTemplatesOpen && !previewProtocol) {
		return null;
	}

	return (
		<>
			{/* ── ВЫПАДАЮЩАЯ ПАНЕЛЬ ШАБЛОНОВ STOMX ── */}
			{isTemplatesOpen && (
				<div className="bg-[var(--paper-soft)] border-b border-[var(--line)] p-3 transition-all">
					<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							<span
								className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]"
								aria-label="Клинические протоколы (448 шаблонов)"
								title="Клинические протоколы (448 шаблонов)"
								data-catalog-source="Клинические протоколы StomX"
							>
								Клинические протоколы (448 шаблонов)
							</span>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer flex items-center justify-center"
							aria-label="Закрыть шаблоны"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Фильтры специальностей */}
					<div className="dente-filter-chips overflow-x-auto pb-2 scrollbar-none">
						<button
							type="button"
							onClick={() => onSelectSpecialty("all")}
							className={`dente-filter-chip ${activeSpecialty === "all" ? "active" : ""}`}
							data-active={activeSpecialty === "all"}
						>
							Все протоколы ({STOMX_ALL_448_TEMPLATES_INDEX.length})
						</button>
						{STOMX_SPECIALTIES.map((spec) => {
							const count = STOMX_ALL_448_TEMPLATES_INDEX.filter(
								(p) => p.specialty === spec.id,
							).length;
							const isActive = activeSpecialty === spec.id;
							return (
								<button
									key={spec.id}
									type="button"
									onClick={() => onSelectSpecialty(spec.id)}
									className={`dente-filter-chip ${isActive ? "active" : ""}`}
									data-active={isActive}
								>
									{SPECIALTY_ICONS[spec.id]}
									<span>{spec.shortLabel}</span>
									<span className="text-xs opacity-75">({count})</span>
								</button>
							);
						})}
					</div>

					{/* Поисковая строка */}
					<div className="dente-search-wrap w-full my-2">
						<Search className="dente-search-icon" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Поиск по диагнозу, протоколу (кариес, пульпит, виниры, имплантация, кюретаж)..."
							className="dente-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => onSearchChange("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					{/* Сетка шаблонов (виртуализирована чанками по 30 шт. для 4GB RAM и слабых CPU) */}
					<div
						className="max-h-[50dvh] sm:max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pr-1"
						style={{ contain: "content" }}
					>
						{(templatesSlice?.visibleItems ?? []).map((protocol) => (
							<div
								key={protocol.id}
								className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg flex flex-col justify-between hover:border-[var(--teal,var(--brand-primary))] transition-colors shadow-2xs"
								style={{ contain: "content", contentVisibility: "auto", containIntrinsicSize: "auto 84px" }}
							>
								<div>
									<div className="flex items-center justify-between gap-1 mb-1">
										<span
											className={`text-xs font-bold px-1.5 py-0.5 rounded border ${SPECIALTY_BADGE_COLORS[protocol.specialty]}`}
										>
											{protocol.mkbCode}
										</span>
										<span className="text-xs text-slate-500">
											{protocol.subcategory}
										</span>
									</div>
									<div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
										{protocol.name}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
										{protocol.complaint}
									</div>
								</div>
								<div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
									<button
										type="button"
										onClick={() => onApplyProtocol(protocol, "replace")}
										className="flex-1 min-h-[44px] sm:min-h-[32px] sm:h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center touch-manipulation"
										title="Заменить текущий дневник этим протоколом"
									>
										<span>Заполнить</span>
									</button>
									<button
										type="button"
										onClick={() => onSetPreviewProtocol(protocol)}
										className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded flex items-center justify-center touch-manipulation"
										title="Предпросмотр протокола"
									>
										<Eye className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => onApplyProtocol(protocol, "append")}
										className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded cursor-pointer flex items-center justify-center touch-manipulation"
										title="Дописать протокол к текущему тексту"
									>
										+ Добавить
									</button>
								</div>
							</div>
						))}
						{templatesSlice.hasMore && (
							<div className="col-span-full flex justify-center py-2">
								<button
									type="button"
									onClick={onShowMore}
									className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
									data-testid="btn-soap-templates-show-more"
								>
									{`Показать ещё ${Math.min(30, templatesSlice.remainingCount)} шаблонов (показано ${templatesSlice.displayedCount} из ${templatesSlice.totalCount})`}
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Модальное окно предпросмотра протокола */}
			{previewProtocol && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[var(--paper)] text-[var(--ink)] rounded-2xl max-w-xl w-full p-5 border border-[var(--line)] shadow-2xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-3">
							<div className="flex items-center gap-2 min-w-0">
								<span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 shrink-0">
									{previewProtocol.mkbCode}
								</span>
								<span className="text-sm font-bold text-[var(--ink)] truncate">
									{previewProtocol.name}
								</span>
							</div>
							<button
								type="button"
								onClick={() => onSetPreviewProtocol(null)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
								aria-label="Закрыть предпросмотр протокола"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="overflow-y-auto space-y-2.5 text-xs text-[var(--ink)] pr-1 flex-1">
							<div>
								<strong>Жалобы:</strong> {previewProtocol.complaint}
							</div>
							<div>
								<strong>Анамнез:</strong> {previewProtocol.anamnesis}
							</div>
							<div>
								<strong>Объективный статус:</strong>{" "}
								{previewProtocol.objectiveStatus}
							</div>
							<div>
								<strong>Диагноз:</strong> {previewProtocol.diagnosis}
							</div>
							<div>
								<strong>Протокол лечения:</strong>{" "}
								{previewProtocol.treatmentProtocol}
							</div>
							<div>
								<strong>Рекомендации:</strong> {previewProtocol.recommendations}
							</div>
						</div>
						<div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-[var(--line)]">
							<button
								type="button"
								onClick={() => onSetPreviewProtocol(null)}
								className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] border border-[var(--line)] transition-colors cursor-pointer"
							>
								Закрыть
							</button>
							<button
								type="button"
								onClick={() => onApplyProtocol(previewProtocol, "replace")}
								className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer"
							>
								Вставить в дневник
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
