/**
 * ============================================================================
 * DENTE CRM — KRAFT PACKETS & PACKAGING REGISTRY TAB (SanPiN 3.3686-21)
 * ГОСТ Р ИСО 11607 / СанПиН 3.3686-21: Учет крафт-пакетов, печать этикеток
 * 58×40 / 43×25 мм, индикаторы 4–5 класса, вскрытие у кресла в 1 клик.
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8b, 8e, 8p, 8v
 * Component strictly <= 800 lines.
 * ============================================================================
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	Package,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldAlert,
	Sparkles,
	Trash2,
	Unlock,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	calculateKraftBatchStatistics,
	exportKraftBatchToCsv,
	filterKraftPackages,
	generateKraftBatchRecords,
	printThermalStickers,
	type KraftPackageRecord,
	type KraftPackageStatus,
} from "./kraftPackageEngine";
import {
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	getChemicalIndicatorDefinition,
} from "./kraftPackagePresets";
import { KraftPackageBarcodeModal } from "./KraftPackageBarcodeModal";
import "./kraftPackage.css";

export const KRAFT_STORAGE_KEY = "dente_sterilization_kraft_packages";

export function loadStoredKraftPackages(): KraftPackageRecord[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(KRAFT_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed) && parsed.length > 0) {
				return parsed;
			}
		}
	} catch (e) {
		console.warn("Failed to load kraft packages from localStorage", e);
	}
	return [];
}

export function saveStoredKraftPackages(packages: KraftPackageRecord[]): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(KRAFT_STORAGE_KEY, JSON.stringify(packages));
	} catch (e) {
		console.warn("Failed to save kraft packages to localStorage", e);
	}
}

export function getDefaultShowcaseKraftPackages(): KraftPackageRecord[] {
	const batch1 = generateKraftBatchRecords({
		autoclaveId: "AUTO-01",
		cycleNumber: 3,
		packageType: "paper_self_seal_single",
		packageSize: "size_100x200",
		toolSetId: "set_therapeutic_tray",
		quantity: 4,
		operatorName: "Иванова А. С. (Медсестра ЦСО)",
		indicatorId: "vinar_steritest_4",
	});

	const batch2 = generateKraftBatchRecords({
		autoclaveId: "AUTO-01",
		cycleNumber: 2,
		packageType: "paper_plastic_pouch",
		packageSize: "size_150x250",
		toolSetId: "set_surgery_implant",
		quantity: 2,
		operatorName: "Иванова А. С. (Медсестра ЦСО)",
		indicatorId: "dGM_steriguard_5",
	});

	const batch3 = generateKraftBatchRecords({
		autoclaveId: "AUTO-02",
		cycleNumber: 1,
		packageType: "paper_plastic_pouch",
		packageSize: "size_75x150",
		toolSetId: "set_orthodontic_pliers",
		quantity: 3,
		operatorName: "Иванова А. С. (Медсестра ЦСО)",
		indicatorId: "vinar_steritest_4",
	});

	return [...batch1, ...batch2, ...batch3];
}

export function SanpinKraftPacketsTab() {
	const [packages, setPackages] = useState<KraftPackageRecord[]>(() => {
		const saved = loadStoredKraftPackages();
		if (saved.length > 0) return saved;
		if (isDemoShowcaseMode()) {
			const showcase = getDefaultShowcaseKraftPackages();
			saveStoredKraftPackages(showcase);
			return showcase;
		}
		return [];
	});

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<KraftPackageStatus | "all" | "unsealed">("all");
	const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
	const [studioInitialTab, setStudioInitialTab] = useState<"builder" | "scan" | "register">("builder");

	// Update local storage when packages change
	useEffect(() => {
		saveStoredKraftPackages(packages);
	}, [packages]);

	// Filtered packages
	const filteredPackages = useMemo(() => {
		let list = packages;
		if (statusFilter === "unsealed") {
			list = list.filter((p) => p.isUnsealed);
		} else if (statusFilter !== "all") {
			list = list.filter((p) => !p.isUnsealed && p.status === statusFilter);
		}

		if (!searchQuery.trim()) return list;
		const q = searchQuery.toLowerCase().trim();
		return list.filter(
			(p) =>
				p.toolSetNameRu.toLowerCase().includes(q) ||
				p.barcode128.toLowerCase().includes(q) ||
				p.batchId.toLowerCase().includes(q) ||
				p.autoclaveId.toLowerCase().includes(q) ||
				p.operatorName.toLowerCase().includes(q),
		);
	}, [packages, statusFilter, searchQuery]);

	// KPI Stats
	const stats = useMemo(() => {
		const base = calculateKraftBatchStatistics(packages);
		const unsealedCount = packages.filter((p) => p.isUnsealed).length;
		return {
			...base,
			unsealedCount,
		};
	}, [packages]);

	// Actions
	const handleBatchCreated = (newBatch: KraftPackageRecord[]) => {
		setPackages((prev) => [...newBatch, ...prev]);
		showToast(`Сформирована партия крафт-пакетов: ${newBatch.length} шт. Штрихкоды зарегистрированы.`, "success");
	};

	const handleToggleBreached = (id: string) => {
		setPackages((prev) =>
			prev.map((p) =>
				p.id === id
					? {
							...p,
							isBreached: !p.isBreached,
							status: !p.isBreached ? "recalled" : "sterile_valid",
						}
					: p,
			),
		);
		showToast("Статус целостности упаковки обновлен", "info");
	};

	const handleToggleIndicatorTest = (id: string) => {
		setPackages((prev) =>
			prev.map((p) => {
				if (p.id !== id) return p;
				const isCurrentlyDefect = p.isBreached || p.status === "recalled";
				const nextDefect = !isCurrentlyDefect;
				return {
					...p,
					isBreached: nextDefect,
					status: nextDefect ? "recalled" : "sterile_valid",
				};
			}),
		);
		showToast("Статус контроля индикатора обновлен", "info");
	};

	const handleUnsealChairside = (id: string) => {
		const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
		setPackages((prev) =>
			prev.map((p) =>
				p.id === id
					? {
							...p,
							isUnsealed: true,
							unsealedAt: new Date().toISOString(),
							unsealedBy: "Врач / Ассистент у кресла",
						}
					: p,
			),
		);
		showToast(`Крафт-пакет вскрыт у кресла (${nowStr}). Стерильность подтверждена.`, "success");
	};

	const handleDeletePackage = (id: string) => {
		setPackages((prev) => prev.filter((p) => p.id !== id));
		showToast("Запись крафт-пакета удалена из реестра", "info");
	};

	const handlePrintSingle = (pkg: KraftPackageRecord, size: "58x40" | "43x25" = "58x40") => {
		printThermalStickers([pkg], size);
		showToast(`Отправлено на печать: 1 этикетка ${size} мм (${pkg.barcode128})`, "success");
	};

	const handleExportCsv = () => {
		exportKraftBatchToCsv(packages);
		showToast("Реестр крафт-пакетов экспортирован в CSV", "success");
	};

	const handleCopyBarcode = (code: string) => {
		navigator.clipboard?.writeText(code);
		showToast(`Штрихкод скопирован: ${code}`, "success");
	};

	return (
		<div className="sanpin-tab-content flex flex-col gap-3">
			{/* Official Form Header */}
			<div className="sanpin-print-title">
				<h2>Учет крафт-пакетов и маркировка стерильности</h2>
				<p>
					Учет стерилизационных упаковок, печать термоэтикеток и контроль химических индикаторов
				</p>
			</div>

			{/* KPI Metric Cards Strip */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
				<div className="p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col">
					<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Всего упаковок</span>
					<span className="text-lg font-extrabold text-[var(--ink,#0f172a)] dark:text-white mt-0.5">
						{stats.totalPacks} шт.
					</span>
				</div>

				<div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col">
					<span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Стерильно (норма)</span>
					<span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
						{stats.sterileValidCount} шт.
					</span>
				</div>

				<div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col">
					<span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Истекает (≤7 дн.)</span>
					<span className="text-lg font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
						{stats.expiringSoonCount} шт.
					</span>
				</div>

				<div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col">
					<span className="text-[11px] font-medium text-rose-700 dark:text-rose-400">Просрочено / Брак</span>
					<span className="text-lg font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">
						{stats.expiredCount + stats.recalledCount} шт.
					</span>
				</div>

				<div className="p-2.5 rounded-lg border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col col-span-2 sm:col-span-1">
					<span className="text-[11px] font-medium text-sky-700 dark:text-sky-400">Вскрыто у кресла</span>
					<span className="text-lg font-extrabold text-sky-700 dark:text-sky-400 mt-0.5">
						{stats.unsealedCount} шт.
					</span>
				</div>
			</div>

			{/* Adaptive 1-Row Toolbar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] rounded-lg">
				{/* Search & Status Filters */}
				<div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
					<div className="relative flex-1 min-w-[160px] max-w-sm">
						<Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)]" />
						<input
							type="text"
							placeholder="Поиск по набору, штрихкоду, автоклаву..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] hover:text-ink cursor-pointer"
								aria-label="Очистить поиск"
							>
								<X size={12} />
							</button>
						)}
					</div>

					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as any)}
						className="h-8 px-2.5 text-xs rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white cursor-pointer shrink-0"
						aria-label="Фильтр статуса крафт-пакетов"
					>
						<option value="all">Все статусы</option>
						<option value="sterile_valid">Стерильно (валидно)</option>
						<option value="expiring_soon_7d">Истекает (≤7 дн.)</option>
						<option value="expired">Просрочено</option>
						<option value="unsealed">Вскрыто у кресла</option>
						<option value="recalled">Нарушена герметичность</option>
					</select>
				</div>

				{/* Primary CTA Buttons (Touch Ergonomics >= 44px on mobile) */}
				<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
					<button
						type="button"
						onClick={() => {
							setStudioInitialTab("scan");
							setIsStudioModalOpen(true);
						}}
						className="h-8 px-2.5 text-xs font-semibold rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px] sm:min-h-[32px]"
						title="Сканировать крафт-пакет сканером 2D DataMatrix или ввести штрихкод"
					>
						<QrCode size={14} className="text-[var(--primary,#0284c7)] shrink-0" />
						<span className="whitespace-nowrap">Сканер / Код</span>
					</button>

					<button
						type="button"
						onClick={handleExportCsv}
						className="h-8 px-2.5 text-xs font-semibold rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px] sm:min-h-[32px]"
						title="Экспорт реестра крафт-пакетов в CSV"
					>
						<Download size={14} className="shrink-0" />
						<span className="hidden md:inline whitespace-nowrap">Экспорт CSV</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setStudioInitialTab("builder");
							setIsStudioModalOpen(true);
						}}
						className="h-8 px-3 text-xs font-bold rounded-md bg-[var(--teal,#0d9488)] text-white hover:bg-teal-700 inline-flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 min-h-[44px] sm:min-h-[32px] touch-manipulation"
						data-testid="open-kraft-studio-builder-btn"
						title="Сформировать новую партию упаковок и напечатать наклейки"
					>
						<Plus size={14} className="shrink-0" />
						<span className="whitespace-nowrap">Сформировать партию и печать</span>
					</button>
				</div>
			</div>

			{/* =========================================================================
			    DESKTOP VIEW: Full Registry Table (Hidden on Mobile <= 768px)
			    ========================================================================= */}
			<div className="hidden md:block w-full overflow-x-auto min-w-0 border border-[var(--line,#e2e8f0)] dark:border-[#334155] rounded-lg bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)]">
				<table className="sanpin-table w-full min-w-0" style={{ minWidth: "1080px", tableLayout: "auto" }}>
					<thead>
						<tr>
							<th style={{ width: "180px", minWidth: "170px" }}>Штрихкод (DataMatrix)</th>
							<th style={{ width: "200px", minWidth: "190px" }}>Наименование набора</th>
							<th style={{ width: "160px", minWidth: "150px" }}>Материал / Размер</th>
							<th style={{ width: "110px", minWidth: "100px" }}>Стерилизация</th>
							<th style={{ width: "110px", minWidth: "100px" }}>Годен до</th>
							<th style={{ width: "110px", minWidth: "105px" }}>Индикатор</th>
							<th style={{ width: "130px", minWidth: "120px" }}>Статус</th>
							<th style={{ width: "110px", minWidth: "100px" }}>Автоклав</th>
							<th style={{ width: "130px", minWidth: "120px", textAlign: "right" }}>Действия</th>
						</tr>
					</thead>
					<tbody>
						{filteredPackages.length === 0 ? (
							<tr>
								<td colSpan={9} className="text-center py-10 text-[var(--muted,#64748b)]">
									<Package size={36} className="mx-auto mb-2 opacity-40" />
									<div className="font-semibold text-sm text-[var(--ink,#0f172a)] dark:text-white">
										{packages.length === 0 ? "Реестр крафт-пакетов пуст" : "Нет упаковок по заданным фильтрам"}
									</div>
									<div className="text-xs text-[var(--muted,#64748b)] mt-1">
										Сформируйте новую партию упаковок для маркировки и печати этикеток.
									</div>
									{packages.length === 0 && (
										<button
											type="button"
											onClick={() => {
												setStudioInitialTab("builder");
												setIsStudioModalOpen(true);
											}}
											className="mt-3 px-3 py-1.5 text-xs font-bold rounded-md bg-[var(--teal,#0d9488)] text-white hover:bg-teal-700 inline-flex items-center gap-1.5 cursor-pointer"
										>
											<Plus size={14} /> Создать первую партию
										</button>
									)}
								</td>
							</tr>
						) : (
							filteredPackages.map((pack) => {
								const matDef = getKraftMaterialDefinition(pack.packageType);
								const sizeDef = getKraftSizeDefinition(pack.packageSize);
								const indDef = getChemicalIndicatorDefinition(pack.indicatorId || "vinar_steritest_4");

								return (
									<tr key={pack.id} className="sanpin-log-row hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
										{/* Barcode & Copy */}
										<td style={{ width: "180px", minWidth: "170px" }}>
											<div className="flex items-center gap-1.5">
												<span
													className="font-mono text-xs font-bold text-[var(--primary,#0284c7)] bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 shrink-0 select-all"
													title={pack.barcode128}
												>
													{pack.barcode128}
												</span>
												<button
													type="button"
													onClick={() => handleCopyBarcode(pack.barcode128)}
													className="p-1 text-[var(--muted,#64748b)] hover:text-ink cursor-pointer shrink-0"
													title="Скопировать штрихкод"
													aria-label="Скопировать"
												>
													<Copy size={12} />
												</button>
											</div>
										</td>

										{/* Tool Set */}
										<td style={{ width: "200px", minWidth: "190px" }}>
											<div className="font-semibold text-xs text-[var(--ink,#0f172a)] dark:text-white">
												{pack.toolSetNameRu}
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
												Партия {pack.batchId} #{pack.serialNumber}
											</div>
										</td>

										{/* Package type & size */}
										<td style={{ width: "160px", minWidth: "150px" }}>
											<div className="text-xs text-[var(--ink,#0f172a)] dark:text-white">
												{matDef.shortLabelRu}
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)]">
												{sizeDef.dimensionsMmRu}
											</div>
										</td>

										{/* Pack Date */}
										<td style={{ width: "110px", minWidth: "100px" }} className="text-xs text-[var(--muted,#64748b)]">
											{pack.packDate.slice(0, 10)}
										</td>

										{/* Exp Date & Days remaining */}
										<td style={{ width: "110px", minWidth: "100px" }}>
											<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">
												{pack.expDate.slice(0, 10)}
											</div>
											<div
												className={`text-[11px] font-medium ${
													pack.daysRemaining <= 0
														? "text-rose-600 font-bold"
														: pack.daysRemaining <= 7
															? "text-amber-600 font-bold"
															: "text-emerald-600"
												}`}
											>
												{pack.daysRemaining <= 0 ? "Истек" : `${pack.daysRemaining} дн.`}
											</div>
										</td>

										{/* Chemical Indicator (Interactive 1-click test toggle) */}
										<td style={{ width: "120px", minWidth: "110px" }}>
											<button
												type="button"
												onClick={() => handleToggleIndicatorTest(pack.id)}
												className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer border ${
													pack.isBreached || pack.status === "recalled"
														? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
														: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
												}`}
												title={
													pack.isBreached || pack.status === "recalled"
														? "Индикатор забракован. Кликните для подтверждения нормы."
														: `Индикатор в норме (${indDef.brandNameRu}). Кликните для отметки брака.`
												}
												aria-label="Переключить статус индикатора"
											>
												{pack.isBreached || pack.status === "recalled" ? (
													<>
														<AlertTriangle size={12} className="text-rose-600 shrink-0" />
														<span>Брак теста</span>
													</>
												) : (
													<>
														<CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
														<span>
															{indDef.indicatorClass === "class_5_integrator" ? "Класс 5" : "Класс 4"}
														</span>
													</>
												)}
											</button>
										</td>

										{/* Status Badge */}
										<td style={{ width: "130px", minWidth: "120px" }}>
											{pack.isUnsealed ? (
												<span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
													<Unlock size={11} className="shrink-0" /> Вскрыт у кресла
												</span>
											) : pack.isBreached ? (
												<span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
													<ShieldAlert size={11} className="shrink-0" /> Нарушен
												</span>
											) : pack.status === "sterile_valid" ? (
												<span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
													<CheckCircle2 size={11} className="shrink-0" /> Стерильно
												</span>
											) : pack.status === "expiring_soon_7d" ? (
												<span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
													<Clock size={11} className="shrink-0" /> Истекает
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
													<AlertTriangle size={11} className="shrink-0" /> Просрочено
												</span>
											)}
										</td>

										{/* Autoclave / Cycle */}
										<td style={{ width: "110px", minWidth: "100px" }}>
											<span className="text-xs font-mono font-medium text-[var(--muted,#64748b)]">
												{pack.autoclaveId} / Ц#{pack.cycleNumber}
											</span>
										</td>

										{/* Actions */}
										<td style={{ width: "130px", minWidth: "120px", textAlign: "right" }}>
											<div className="flex items-center justify-end gap-1">
												{/* Быстрое вскрытие у кресла (Мандат 8e) */}
												{!pack.isUnsealed && (
													<button
														type="button"
														onClick={() => handleUnsealChairside(pack.id)}
														className="p-1 rounded text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
														title="Вскрыть крафт-пакет у кресла"
														aria-label="Вскрыть у кресла"
													>
														<Unlock size={14} />
													</button>
												)}

												{/* Thermal Print */}
												<button
													type="button"
													onClick={() => handlePrintSingle(pack, "58x40")}
													className="p-1 rounded text-[var(--primary,#0284c7)] hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
													title="Печать термоэтикетки 58×40 мм"
													aria-label="Печать этикетки"
												>
													<Printer size={14} />
												</button>

												{/* Toggle Breached */}
												<button
													type="button"
													onClick={() => handleToggleBreached(pack.id)}
													className={`p-1 rounded cursor-pointer ${
														pack.isBreached
															? "text-emerald-600 hover:bg-emerald-50"
															: "text-rose-600 hover:bg-rose-50"
													}`}
													title={pack.isBreached ? "Восстановить статус герметичности" : "Отметить нарушение целостности"}
													aria-label="Целостность"
												>
													<ShieldAlert size={14} />
												</button>

												{/* Delete */}
												<button
													type="button"
													onClick={() => handleDeletePackage(pack.id)}
													className="p-1 rounded text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
													title="Удалить запись"
													aria-label="Удалить"
												>
													<Trash2 size={14} />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* =========================================================================
			    MOBILE VIEW: Grouped List Cards (Apple HIG Touch Ergonomics <= 768px)
			    ========================================================================= */}
			<div className="block md:hidden flex flex-col gap-2">
				{filteredPackages.length === 0 ? (
					<div className="p-6 text-center rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--muted,#64748b)]">
						<Package size={36} className="mx-auto mb-2 opacity-40" />
						<div className="font-semibold text-sm text-[var(--ink,#0f172a)] dark:text-white">
							{packages.length === 0 ? "Реестр пуст" : "Нет записей по фильтрам"}
						</div>
					</div>
				) : (
					filteredPackages.map((pack) => (
						<div
							key={pack.id}
							className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] shadow-sm flex flex-col gap-2"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="font-mono text-xs font-bold text-[var(--primary,#0284c7)] bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
									{pack.barcode128}
								</span>
								{pack.isUnsealed ? (
									<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
										Вскрыт у кресла
									</span>
								) : pack.status === "sterile_valid" ? (
									<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
										Стерильно
									</span>
								) : (
									<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
										{pack.status}
									</span>
								)}
							</div>

							<div>
								<div className="font-semibold text-sm text-[var(--ink,#0f172a)] dark:text-white">
									{pack.toolSetNameRu}
								</div>
								<div className="text-xs text-[var(--muted,#64748b)] mt-0.5">
									Годен до {pack.expDate.slice(0, 10)} ({pack.daysRemaining} дн.) • {pack.autoclaveId} Ц#{pack.cycleNumber}
								</div>
							</div>

							<div className="flex items-center justify-between text-xs">
								<span className="text-[var(--muted,#64748b)]">Индикатор 4/5 кл:</span>
								<button
									type="button"
									onClick={() => handleToggleIndicatorTest(pack.id)}
									className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded border min-h-[36px] touch-manipulation cursor-pointer ${
										pack.isBreached || pack.status === "recalled"
											? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
											: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
									}`}
									title="Переключить статус теста химического индикатора"
								>
									{pack.isBreached || pack.status === "recalled" ? (
										<>
											<AlertTriangle size={12} className="text-rose-600 shrink-0" />
											<span>Брак теста</span>
										</>
									) : (
										<>
											<CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
											<span>Тест пройден</span>
										</>
									)}
								</button>
							</div>

							{/* Touch Buttons (minHeight 44px) */}
							<div className="flex items-center gap-2 pt-1 border-t border-[var(--line,#e2e8f0)] dark:border-[#334155]">
								{!pack.isUnsealed && (
									<button
										type="button"
										onClick={() => handleUnsealChairside(pack.id)}
										className="flex-1 h-11 px-3 text-xs font-bold rounded-lg bg-[var(--primary,#0284c7)] text-white inline-flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer"
									>
										<Unlock size={15} /> Вскрыть у кресла
									</button>
								)}
								<button
									type="button"
									onClick={() => handlePrintSingle(pack, "58x40")}
									className="h-11 px-3 text-xs font-semibold rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink inline-flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer"
								>
									<Printer size={15} /> Этикетка
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Kraft Packaging Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isStudioModalOpen}
				onClose={() => setIsStudioModalOpen(false)}
				onBatchCreated={handleBatchCreated}
			/>
		</div>
	);
}

export default SanpinKraftPacketsTab;
