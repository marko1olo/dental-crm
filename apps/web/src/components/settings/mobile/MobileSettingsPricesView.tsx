/**
 * apps/web/src/components/settings/mobile/MobileSettingsPricesView.tsx
 *
 * Dedicated Mobile Pricelist View compliant with Apple HIG & Grouped Inset Cards:
 * - 1-Row Search by 804n code and title with clear button
 * - Horizontal Category Filter chips
 * - Grouped Inset Service Cards with 804n code, full title, large price, and chevron
 * - 1-Tap opens native iOS Bottom Sheet Drawer (MobilePriceDrawer)
 * - Floating Bottom Bar with primary CTA in natural thumb zone
 * - 0px horizontal drift (overflow-x: clip; max-width: 100vw)
 * - 100% connected to live clinic service catalog
 */

import React, { useState, useMemo } from "react";
import type { ServiceCatalogItem } from "@dental/shared";
import {
	ChevronLeft,
	ChevronRight,
	FolderTree,
	Plus,
	Search,
	Sparkles,
	Tag,
	X,
	Clock,
} from "lucide-react";
import { money } from "../../../AppHelpers";
import { MobilePriceDrawer } from "./MobilePriceDrawer";
import { CATEGORY_TABS } from "../pricelistEditorHelpers";
import { showToast } from "../../GlobalToast";
import { BASELINE_804N_PRICELIST_SERVICES } from "../../catalog/pricelist/servicePricelistPresets";
import { syncPricelistItemsToCatalog } from "../catalogSyncHelper";

export interface MobileSettingsPricesViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: app logic props bag
	readonly appLogic: Record<string, any>;
	readonly onBackToSettings: () => void;
}

export const MobileSettingsPricesView: React.FC<MobileSettingsPricesViewProps> = ({
	appLogic,
	onBackToSettings,
}) => {
	const {
		dashboard,
		serviceCategoryLabels = {},
		specialtyLabels = {},
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
		refreshDashboard,
		loadClinicSettings,
	} = appLogic;

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: edited service item
	const [editingService, setEditingService] = useState<any | null>(null);
	const [isSeeding, setIsSeeding] = useState(false);

	const rawCatalog = (dashboard?.serviceCatalog ?? []) as ServiceCatalogItem[];

	// Filtered catalog
	const filteredServices = useMemo(() => {
		let items = [...rawCatalog];
		if (selectedCategory !== "all") {
			items = items.filter((s) => (s.category || "other") === selectedCategory);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			const cleanQ = q.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "");
			items = items.filter((s) => {
				const titleMatch = s.title.toLowerCase().includes(q);
				const codeMatch = s.code?.toLowerCase().includes(q);
				const cleanCodeMatch =
					cleanQ.length >= 2 &&
					(s.code || "")
						.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "")
						.toLowerCase()
						.includes(cleanQ);
				return titleMatch || codeMatch || cleanCodeMatch;
			});
		}
		return items.sort((a, b) => a.title.localeCompare(b.title));
	}, [rawCatalog, searchQuery, selectedCategory]);

	// Save service handler
	// biome-ignore lint/suspicious/noExplicitAny: payload
	const handleSaveService = async (payload: any, serviceId?: string) => {
		try {
			if (serviceId) {
				if (typeof updateServiceCatalogItem === "function") {
					await updateServiceCatalogItem(serviceId, payload);
				}
				showToast(`Услуга «${payload.title}» сохранена`, "success");
			} else {
				if (typeof createServiceCatalogItem === "function") {
					await createServiceCatalogItem(payload);
				}
				showToast(`Услуга «${payload.title}» добавлена в каталог`, "success");
			}
			if (typeof refreshDashboard === "function") await refreshDashboard();
			else if (typeof loadClinicSettings === "function") await loadClinicSettings();
		} catch (err: any) {
			showToast(err?.message || "Не удалось сохранить услугу", "error");
			throw err;
		}
	};

	// Delete service handler
	const handleDeleteService = async (serviceId: string) => {
		try {
			if (typeof deleteServiceCatalogItem === "function") {
				await deleteServiceCatalogItem(serviceId);
			}
			showToast("Услуга удалена из каталога", "info");
			if (typeof refreshDashboard === "function") await refreshDashboard();
			else if (typeof loadClinicSettings === "function") await loadClinicSettings();
		} catch (err: any) {
			showToast(err?.message || "Не удалось удалить услугу", "error");
			throw err;
		}
	};

	// Baseline seed handler
	const handleSeedBaseline = async () => {
		if (isSeeding) return;
		setIsSeeding(true);
		try {
			await syncPricelistItemsToCatalog({
				items: BASELINE_804N_PRICELIST_SERVICES,
				existingServices: rawCatalog,
				createServiceCatalogItem,
				updateServiceCatalogItem,
			});
			if (typeof refreshDashboard === "function") await refreshDashboard();
			else if (typeof loadClinicSettings === "function") await loadClinicSettings();
			showToast(`Каталог наполнен: добавлено ${BASELINE_804N_PRICELIST_SERVICES.length} типовых услуг`, "success");
		} catch (err: any) {
			showToast(err?.message || "Ошибка наполнения каталога", "error");
		} finally {
			setIsSeeding(false);
		}
	};

	return (
		<div
			className="mobile-prices-view flex flex-col w-full max-w-[100vw] overflow-x-clip pb-28"
			data-testid="mobile-settings-prices-view"
		>
			{/* Top Navigation Bar (Apple HIG Navigation Bar Style) */}
			<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between">
				<button
					type="button"
					onClick={onBackToSettings}
					className="min-w-[44px] min-h-[44px] -ml-2 px-2 flex items-center gap-1 text-[15px] font-medium text-[var(--teal)] hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
					aria-label="Назад в настройки"
					data-testid="btn-mobile-back-to-settings"
				>
					<ChevronLeft size={20} className="shrink-0" />
					<span>Настройки</span>
				</button>

				<div className="text-center min-w-0 px-2 flex flex-col items-center">
					<h2 className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate leading-tight">
						Прейскурант
					</h2>
					<span className="text-[11px] font-medium text-[var(--muted)]">
						{rawCatalog.length} услуг по 804н
					</span>
				</div>

				<button
					type="button"
					onClick={() => {
						setEditingService(null);
						setIsDrawerOpen(true);
					}}
					className="min-w-[44px] min-h-[44px] -mr-2 w-11 h-11 rounded-full flex items-center justify-center text-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-95 transition-transform cursor-pointer"
					aria-label="Добавить услугу"
					data-testid="btn-mobile-add-price-top"
				>
					<Plus size={22} />
				</button>
			</div>

			{/* Search Row */}
			<div className="px-4 pt-3 pb-2">
				<div className="relative flex items-center w-full">
					<Search
						size={15}
						className="absolute left-3.5 text-[var(--muted)] pointer-events-none"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по услугам или коду 804н..."
						className="w-full h-10 min-h-[40px] pr-9 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all mobile-settings-search-input"
						data-testid="input-mobile-price-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform cursor-pointer"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			{/* Category Chips Scroller */}
			<div className="flex items-center gap-1.5 overflow-x-auto px-4 py-1.5 scrollbar-none overscroll-contain">
				<button
					type="button"
					onClick={() => setSelectedCategory("all")}
					className={`mobile-filter-chip ${selectedCategory === "all" ? "active" : ""}`}
				>
					<span>Все</span>
					<span className="chip-counter">
						{rawCatalog.length}
					</span>
				</button>

				{CATEGORY_TABS.filter((cat) => cat.id !== "all").map((cat) => {
					const countInCat = rawCatalog.filter(
						(s) => (s.category || "other") === cat.id,
					).length;
					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedCategory(cat.id)}
							className={`mobile-filter-chip ${selectedCategory === cat.id ? "active" : ""}`}
						>
							<span>{cat.label}</span>
							{countInCat > 0 && (
								<span className="chip-counter">
									{countInCat}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Grouped Inset List of Services */}
			<div className="px-4 mt-2">
				{filteredServices.length > 0 ? (
					<div className="rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
						{filteredServices.map((service) => {
							const s = service as any;
							const basePrice = s.basePriceRub ?? s.priceRub ?? 0;
							return (
								<div
									key={service.id}
									onClick={() => {
										setEditingService(service);
										setIsDrawerOpen(true);
									}}
									className="flex items-center justify-between p-3.5 min-h-[58px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setEditingService(service);
											setIsDrawerOpen(true);
										}
									}}
									data-testid={`mobile-service-row-${service.id}`}
								>
									{/* Left: Code badge + Full Title + Badges */}
									<div className="flex flex-col gap-1 min-w-0 pr-3 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											{service.code ? (
												<span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
													{service.code}
												</span>
											) : (
												<span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] shrink-0">
													Без кода
												</span>
											)}
											{s.taxDeductible !== false && (
												<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
													Вычет
												</span>
											)}
											{s.vatRate === "vat_20" ? (
												<span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300">
													НДС 20%
												</span>
											) : (
												<span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300">
													ст. 149
												</span>
											)}
										</div>

										<h4 className="text-[15px] font-semibold text-[var(--ink)] leading-snug break-words">
											{service.title}
										</h4>

										<div className="flex items-center gap-2 text-[12px] text-[var(--muted)] mt-0.5">
											<span>
												{serviceCategoryLabels[service.category || "therapy"] ||
													service.category ||
													"Терапия"}
											</span>
											<span>•</span>
											<span className="flex items-center gap-0.5 font-mono">
												<Clock size={11} /> {service.durationMinutes || 30} мин
											</span>
										</div>
									</div>

									{/* Right: Large Price + Chevron */}
									<div className="flex items-center gap-2 shrink-0">
										<div className="flex flex-col items-end">
											<span className="text-[16px] font-bold font-mono text-[var(--teal)] whitespace-nowrap">
												{money(basePrice)}
											</span>
										</div>
										<ChevronRight
											size={16}
											className="text-[var(--muted)] shrink-0"
										/>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					/* Empty Catalog State */
					<div className="p-6 my-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs text-center flex flex-col items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<Sparkles size={24} />
						</div>
						<div className="flex flex-col gap-1">
							<h4 className="text-[16px] font-bold text-[var(--ink)]">
								{searchQuery ? "Ничего не найдено" : "Прейскурант услуг пуст"}
							</h4>
							<p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-xs mx-auto">
								{searchQuery
									? "Проверьте поисковый запрос или сбросьте фильтры."
									: "Быстро наполните номенклатуру 30 базовыми стоматологическими услугами по приказу 804н."}
							</p>
						</div>

						{searchQuery ? (
							<button
								type="button"
								onClick={() => {
									setSearchQuery("");
									setSelectedCategory("all");
								}}
								className="min-h-[40px] px-4 rounded-xl text-[13px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] active:scale-95 transition-transform cursor-pointer mt-1"
							>
								Сбросить фильтры
							</button>
						) : (
							<button
								type="button"
								disabled={isSeeding}
								onClick={handleSeedBaseline}
								className="w-full min-h-[46px] h-11 px-4 rounded-xl text-[14px] font-bold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50 mt-1"
								data-testid="btn-mobile-seed-baseline"
							>
								<Sparkles size={16} />
								<span>
									{isSeeding ? "Наполнение каталога..." : "Заполнить прейскурант (30 услуг)"}
								</span>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Floating Bottom Bar (Thumb Zone) */}
			<div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[var(--paper-strong)]/90 backdrop-blur-md border-t border-[var(--line)] pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg">
				<button
					type="button"
					onClick={() => {
						setEditingService(null);
						setIsDrawerOpen(true);
					}}
					className="w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
					data-testid="btn-mobile-add-price-bottom"
				>
					<Plus size={20} />
					<span>Добавить новую услугу</span>
				</button>
			</div>

			{/* Native Bottom Sheet Drawer */}
			<MobilePriceDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				service={editingService}
				onSave={handleSaveService}
				onDelete={handleDeleteService}
				serviceCategoryLabels={serviceCategoryLabels}
				specialtyLabels={specialtyLabels}
			/>
		</div>
	);
};

export default MobileSettingsPricesView;
