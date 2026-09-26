/**
 * apps/web/src/components/settings/owner/OwnerPriceList804nSection.tsx
 *
 * Секция управления прейскурантом по Приказу Минздрава РФ № 804н для владельца клиники.
 * Прозрачная калькуляция маржинальности услуг: цена - расходные материалы - ЗТЛ.
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Все финансовые расчеты строго в целочисленных копейках (integer kopecks).
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Check,
	Coins,
	Copy,
	DollarSign,
	Filter,
	Layers,
	Percent,
	Search,
	ShieldCheck,
	TrendingUp,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	CATEGORY_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	type Order804nCategory,
	type ServicePricelistItem,
} from "../../catalog/pricelist/servicePricelistPresets";
import {
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";

export interface CustomServicePriceOverride {
	readonly serviceId: string;
	readonly customPriceKopecks: number;
	readonly customMaterialCostKopecks?: number;
	readonly customLabCostKopecks?: number;
}

export function OwnerPriceList804nSection() {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [marginFilter, setMarginFilter] = useState<"all" | "high" | "low">("all");
	const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
	const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
	const [tempPriceInput, setTempPriceInput] = useState<string>("");

	// Категории для фильтра
	const categories = useMemo(() => {
		const cats: { key: string; label: string }[] = [{ key: "all", label: "Все категории" }];
		for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
			cats.push({ key, label });
		}
		return cats;
	}, []);

	// Вычисление эффективных цен и маржинальности для каждой услуги
	const catalogItems = useMemo(() => {
		return STATUTORY_ORDER_804N_PRESETS.map((item) => {
			const effectivePriceKopecks =
				priceOverrides[item.id] !== undefined
					? priceOverrides[item.id]!
					: item.basePriceKopecks || (item.basePriceRub ? item.basePriceRub * 100 : 0);

			const materialCostKopecks = item.materialCostRub ? item.materialCostRub * 100 : 0;
			const labCostKopecks = item.labCostRub ? item.labCostRub * 100 : 0;
			const totalDirectCostsKopecks = materialCostKopecks + labCostKopecks;

			const netMarginKopecks = Math.max(0, effectivePriceKopecks - totalDirectCostsKopecks);
			const marginPct =
				effectivePriceKopecks > 0
					? Math.round((netMarginKopecks / effectivePriceKopecks) * 10000) / 100
					: 0;

			return {
				...item,
				effectivePriceKopecks,
				materialCostKopecks,
				labCostKopecks,
				totalDirectCostsKopecks,
				netMarginKopecks,
				marginPct,
			};
		});
	}, [priceOverrides]);

	// Фильтрация каталога
	const filteredCatalog = useMemo(() => {
		return catalogItems.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) {
				return false;
			}

			if (marginFilter === "high" && item.marginPct < 70) {
				return false;
			}
			if (marginFilter === "low" && item.marginPct >= 50) {
				return false;
			}

			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;

			return (
				item.code804n.toLowerCase().includes(q) ||
				item.commercialTitle.toLowerCase().includes(q) ||
				item.statutoryTitle804n.toLowerCase().includes(q) ||
				(item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
			);
		});
	}, [catalogItems, selectedCategory, marginFilter, searchQuery]);

	// Сводная статистика каталога
	const stats = useMemo(() => {
		const totalServices = catalogItems.length;
		const totalValueKopecks = catalogItems.reduce((acc, i) => acc + i.effectivePriceKopecks, 0);
		const avgMarginPct =
			totalServices > 0
				? Math.round(
						(catalogItems.reduce((acc, i) => acc + i.marginPct, 0) / totalServices) * 10,
					) / 10
				: 0;
		const highMarginCount = catalogItems.filter((i) => i.marginPct >= 70).length;
		const lowMarginCount = catalogItems.filter((i) => i.marginPct < 50).length;

		return {
			totalServices,
			totalValueKopecks,
			avgMarginPct,
			highMarginCount,
			lowMarginCount,
		};
	}, [catalogItems]);

	const handleStartEdit = (serviceId: string, currentKopecks: number) => {
		setEditingServiceId(serviceId);
		setTempPriceInput((currentKopecks / 100).toFixed(0));
	};

	const handleSavePrice = (serviceId: string) => {
		const kopecks = parseRublesToKopecks(tempPriceInput);
		if (kopecks <= 0) {
			showToast("Цена услуги должна быть больше 0 руб", "error");
			return;
		}
		setPriceOverrides((prev) => ({ ...prev, [serviceId]: kopecks }));
		setEditingServiceId(null);
		showToast(`Цена обновлена: ${formatKopecksToRublesDisplay(kopecks)}`, "success");
	};

	const handleQuickAdjust = (serviceId: string, currentKopecks: number, deltaRubles: number) => {
		const nextKopecks = Math.max(10000, currentKopecks + deltaRubles * 100);
		setPriceOverrides((prev) => ({ ...prev, [serviceId]: nextKopecks }));
		showToast(`Цена изменена на ${deltaRubles > 0 ? "+" : ""}${deltaRubles} руб`, "info");
	};

	const handleResetOverrides = () => {
		setPriceOverrides({});
		showToast("Цены сброшены к базовому прейскуранту 804н", "info");
	};

	const handleCopyCode = (code: string) => {
		navigator.clipboard.writeText(code);
		showToast(`Код 804н «${code}» скопирован`, "success");
	};

	return (
		<section className="settings-section" data-testid="owner-pricelist-804n-section">
			{/* Шапка раздела */}
			<div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
						<Coins size={18} />
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)]">
							Прейскурант 804н и калькуляция маржинальности
						</h3>
						<p className="m-0 text-xs text-[var(--muted)]">
							Приказ Минздрава РФ № 804н. Прозрачный учет себестоимости материалов и лаборатории ЗТЛ.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{Object.keys(priceOverrides).length > 0 && (
						<button
							type="button"
							onClick={handleResetOverrides}
							className="secondary-button text-xs py-1 px-2.5 min-h-[32px] cursor-pointer"
						>
							Сбросить правки ({Object.keys(priceOverrides).length})
						</button>
					)}
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
						<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
						НДС 0% (ст. 149 НК РФ)
					</span>
				</div>
			</div>

			{/* Сводная финансовая панель */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-[11px] text-[var(--muted)] block">Всего позиций 804н</span>
					<span className="text-lg font-bold text-[var(--ink)] mt-0.5 block">
						{stats.totalServices} услуг
					</span>
				</div>
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-[11px] text-[var(--muted)] block">Средняя рентабельность</span>
					<span className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5 block">
						{stats.avgMarginPct}%
					</span>
				</div>
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-[11px] text-[var(--muted)] block">Высокомаржинальные (&gt;=70%)</span>
					<span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
						{stats.highMarginCount} услуг
					</span>
				</div>
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-[11px] text-[var(--muted)] block">Низкомаржинальные (&lt;50%)</span>
					<span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
						{stats.lowMarginCount} услуг
					</span>
				</div>
			</div>

			{/* Фильтры и поиск */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] mb-4 space-y-2.5">
				<div className="flex flex-col sm:flex-row gap-2">
					<div className="relative flex-1">
						<Search
							size={14}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по коду 804н (A16.07.002) или названию услуги..."
							className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
						/>
					</div>
					<div className="flex gap-1.5 shrink-0">
						<button
							type="button"
							onClick={() => setMarginFilter("all")}
							className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
								marginFilter === "all"
									? "bg-[var(--teal)] text-white border-[var(--teal)]"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
							}`}
						>
							Все
						</button>
						<button
							type="button"
							onClick={() => setMarginFilter("high")}
							className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
								marginFilter === "high"
									? "bg-emerald-600 text-white border-emerald-600"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
							}`}
						>
							Маржа &gt;= 70%
						</button>
						<button
							type="button"
							onClick={() => setMarginFilter("low")}
							className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
								marginFilter === "low"
									? "bg-amber-600 text-white border-amber-600"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
							}`}
						>
							Маржа &lt; 50%
						</button>
					</div>
				</div>

				{/* Категории */}
				<div className="flex gap-1.5 overflow-x-auto pb-1">
					{categories.map((cat) => {
						const isSelected = selectedCategory === cat.key;
						return (
							<button
								key={cat.key}
								type="button"
								onClick={() => setSelectedCategory(cat.key)}
								className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer border transition-all ${
									isSelected
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
								}`}
							>
								{cat.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Таблица / список услуг с прозрачной маржинальностью */}
			<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
				<div className="hidden sm:grid grid-cols-12 gap-2 p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold text-[var(--muted)]">
					<div className="col-span-2">Код 804н</div>
					<div className="col-span-4">Услуга / Номенклатура</div>
					<div className="col-span-2 text-right">Розница (пациент)</div>
					<div className="col-span-2 text-right">Материалы + ЗТЛ</div>
					<div className="col-span-2 text-right">Маржа клиники</div>
				</div>

				<div className="divide-y divide-[var(--line)] max-h-[500px] overflow-y-auto">
					{filteredCatalog.length === 0 ? (
						<div className="p-8 text-center text-xs text-[var(--muted)]">
							Позиций по заданным критериям не найдено.
						</div>
					) : (
						filteredCatalog.map((service) => {
							const isEditing = editingServiceId === service.id;
							const hasCustomPrice = priceOverrides[service.id] !== undefined;

							return (
								<div
									key={service.id}
									className="p-3 sm:p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center hover:bg-[var(--paper-soft)] transition-colors"
								>
									{/* Код 804н */}
									<div className="sm:col-span-2 flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => handleCopyCode(service.code804n)}
											className="font-mono text-[11px] font-bold text-[var(--teal-dark)] bg-[var(--teal-soft)] px-2 py-0.5 rounded border border-[var(--teal-soft)] flex items-center gap-1 cursor-pointer hover:opacity-80"
											title="Скопировать код 804н"
										>
											<span>{service.code804n}</span>
											<Copy size={10} />
										</button>
									</div>

									{/* Наименование */}
									<div className="sm:col-span-4 min-w-0">
										<span className="text-xs font-bold text-[var(--ink)] block truncate">
											{service.commercialTitle}
										</span>
										<span className="text-[10px] text-[var(--muted)] block truncate" title={service.statutoryTitle804n}>
											{service.statutoryTitle804n}
										</span>
									</div>

									{/* Розничная цена */}
									<div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end gap-1.5">
										{isEditing ? (
											<div className="flex items-center gap-1">
												<input
													type="number"
													value={tempPriceInput}
													onChange={(e) => setTempPriceInput(e.target.value)}
													className="w-20 text-xs px-1.5 py-0.5 rounded border border-[var(--teal)] bg-[var(--paper)] text-[var(--ink)]"
													autoFocus
												/>
												<button
													type="button"
													onClick={() => handleSavePrice(service.id)}
													className="p-1 rounded bg-[var(--teal)] text-white cursor-pointer"
													title="Сохранить"
												>
													<Check size={12} />
												</button>
											</div>
										) : (
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={() => handleStartEdit(service.id, service.effectivePriceKopecks)}
													className="text-xs font-bold text-[var(--ink)] hover:text-[var(--teal)] cursor-pointer"
													title="Нажмите для изменения цены"
												>
													{formatKopecksToRublesDisplay(service.effectivePriceKopecks)}
												</button>
												{hasCustomPrice && (
													<span className="text-[9px] font-bold px-1 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300">
														изм
													</span>
												)}
											</div>
										)}
									</div>

									{/* Себестоимость (Материалы + ЗТЛ) */}
									<div className="sm:col-span-2 sm:text-right text-[11px] text-[var(--muted)] flex items-center justify-between sm:justify-end gap-1">
										<span>
											{service.totalDirectCostsKopecks > 0
												? formatKopecksToRublesDisplay(service.totalDirectCostsKopecks)
												: "—"}
										</span>
										{service.labCostKopecks > 0 && (
											<span className="text-[9px] px-1 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" title={`ЗТЛ: ${formatKopecksToRublesDisplay(service.labCostKopecks)}`}>
												ЗТЛ
											</span>
										)}
									</div>

									{/* Чистая маржа и процент */}
									<div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end gap-1.5">
										<span className="text-xs font-bold text-[var(--ink)]">
											{formatKopecksToRublesDisplay(service.netMarginKopecks)}
										</span>
										<span
											className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
												service.marginPct >= 70
													? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
													: service.marginPct >= 50
														? "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30"
														: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
											}`}
										>
											{service.marginPct}%
										</span>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</section>
	);
}
