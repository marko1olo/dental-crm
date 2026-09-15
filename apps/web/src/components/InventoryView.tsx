import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	ChevronDown,
	Edit2,
	MoreHorizontal,
	Package,
	PackageCheck,
	Plus,
	Printer,
	QrCode,
	Search,
	Settings,
	ShieldCheck,
	Sparkles,
	Syringe,
	Trash2,
	TrendingUp,
	Truck,
	Warehouse,
	X,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import { money } from "../AppHelpers";
import { showToast } from "./GlobalToast";
import { InventoryConfirmDialog } from "./inventory/InventoryConfirmDialog";
import { MaterialBomsSettingsPanel } from "./inventory/MaterialBomsSettingsPanel";
import { useInventoryLogic } from "./inventory/useInventoryLogic";
import { WarehouseTransferModal } from "./inventory/transfers/WarehouseTransferModal";
import { ClinicalWriteoffModal } from "./inventory/writeoff/ClinicalWriteoffModal";
import { WarehouseInventoryAuditModal } from "./inventory/WarehouseInventoryAuditModal";
import { MdlpDisposalQueueModal } from "./inventory/mdlp/index.js";
import { WarehousePackageWriteOffBar } from "./inventory/WarehousePackageWriteOffBar";
import { WarehouseManagerModal } from "./inventory/WarehouseManagerModal";
import { MdlpScanningModal } from "./mdlp/MdlpScanningModal";

/**
 * Как показать срок годности расходника.
 *
 * Три состояния, а не два: просроченный материал использовать нельзя вообще,
 * истекающий надо успеть израсходовать, остальное просто дата. Раньше первые
 * два не различались и красились цветом var(--tomato) — токена с таким именем
 * в проекте нет, так что предупреждение не было видно.
 *
 * Дни считаются по календарным датам, а не по разнице в миллисекундах: срок
 * указан днём, и «осталось 0 дней» должно значить «истекает сегодня», а не
 * зависеть от времени суток.
 */
function expirationState(isoDate: string): {
	label: string;
	className: string;
} {
	const readable = new Date(`${isoDate}T00:00:00`).toLocaleDateString("ru-RU");
	const startOfDay = (value: Date) =>
		Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
	const expires = new Date(`${isoDate}T00:00:00`);
	const daysLeft = Math.round(
		(startOfDay(expires) - startOfDay(new Date())) / 86400000,
	);

	if (daysLeft < 0) {
		return {
			label: `Просрочен с ${readable}`,
			className: "inventory-expiry-expired",
		};
	}
	if (daysLeft === 0) {
		return {
			label: `Истекает сегодня, ${readable}`,
			className: "inventory-expiry-expired",
		};
	}
	if (daysLeft <= 30) {
		return {
			label: `Годен до ${readable} — ${daysLabel(daysLeft)}`,
			className: "inventory-expiry-soon",
		};
	}
	return { label: `Годен до ${readable}`, className: "" };
}

/**
 * Количество штук по-человечески.
 *
 * Правила списания приходят с сервера не разобранными (rulesList объявлен any[]),
 * а колонки quantity_to_deduct и stock_quantity объявлены numeric без mode
 * "number" — drizzle отдаёт их СТРОКАМИ прямо из базы, вместе с нулями до
 * заявленной точности. На экране это выглядело как «Списание: 1.0000 шт. |
 * Текущий остаток: 10.000 шт.»: машинная запись с точкой вместо запятой, которую
 * кладовщику читать незачем.
 *
 * toLocaleString здесь уместен именно потому, что он отбрасывает хвостовые нули:
 * «1.0000» становится «1», «1.5000» — «1,5». Для денег так делать нельзя (там
 * пропадали бы копейки, для них есть money()), а для штук это ровно то, что
 * человек пишет от руки.
 */
function quantityLabel(value: unknown): string {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return "—";
	return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

/** Русское склонение дней: 1 день, 2 дня, 5 дней. */
function daysLabel(count: number): string {
	const lastTwo = count % 100;
	const last = count % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return `осталось ${count} дней`;
	if (last === 1) return `остался ${count} день`;
	if (last >= 2 && last <= 4) return `осталось ${count} дня`;
	return `осталось ${count} дней`;
}

export const InventoryView: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const inventory = useInventoryLogic(organizationId);
	const {
		items,
		isLoading,
		loadError,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		auth,
		dashboard,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scannedBarcode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isScannerActive,
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		selectService,
		rulesList,
		isLoadingRules,
		rulesError,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		fetchRules,
		handleAddRule,
		handleDeleteRule,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setEditingItem,
		formData,
		setFormData,
		confirmDialog,
		setConfirmDialog,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		isAdjustingStock,
		isSavingItem,
		isSavingRule,
		fetchItems,
		handleQuickWriteoffStandardKit,
		isWritingOffStandardKit,
		handleQuickWriteoffCarpules,
		isWritingOffCarpules,
		handleQuickWriteoffAnestheticCarpule,
		handleQuickWriteoffSterilizationKit,
		handleQuickWriteoffShiftBundle,
		isWritingOffShiftBundle,
		handleQuickWriteoffVisitBundle,
		isWritingOffVisitBundle,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		handleAdjustStock,
		filteredItems,
		totalValue,
		lowStockCount,
		totalItems,
		getHeaders,
	} = inventory;
	const [isClinicalWriteoffOpen, setIsClinicalWriteoffOpen] = useState(false);
	const [isWarehouseTransferOpen, setIsWarehouseTransferOpen] = useState(false);
	const [isInventoryAuditOpen, setIsInventoryAuditOpen] = useState(false);
	const [isMdlpDisposalOpen, setIsMdlpDisposalOpen] = useState(false);
	const [isWarehouseManagerOpen, setIsWarehouseManagerOpen] = useState(false);
	const [isMdlpScanningOpen, setIsMdlpScanningOpen] = useState(false);
	const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
	const [isQuickPackagesOpen, setIsQuickPackagesOpen] = useState(false);
	const opsMenuRef = React.useRef<HTMLDivElement>(null);
	const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
	const rowMenuRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (opsMenuRef.current && !opsMenuRef.current.contains(e.target as Node)) {
				setIsOpsMenuOpen(false);
			}
			if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
				setActiveMenuRowId(null);
			}
		};
		if (isOpsMenuOpen || activeMenuRowId) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isOpsMenuOpen, activeMenuRowId]);

	/*
	 * ЭТО ЗНАЧЕНИЯ CSS, А НЕ ИМЕНА КЛАССОВ.
	 *
	 * Здесь стояло:
	 *   const paperBg = "bg-white dark:bg-slate-900";
	 *   const borderColor = "border-slate-200 dark:border-slate-800";
	 * и эти строки подставлялись в inline-стили как значения свойств —
	 * `style={{ background: paperBg, border: `1px solid ${borderColor}` }}`,
	 * 46 вхождений на весь экран. Имя класса Tailwind значением цвета не
	 * является: браузер отбрасывает такое объявление целиком и берёт начальное
	 * значение. Ошибки при этом нет ни в сборке, ни в консоли.
	 *
	 * Что было видно на экране (проверено снимком раздела «Склад»): ни одной
	 * карточки. Прозрачный фон, нулевая граница, плитки «Позиций» и «В дефиците»
	 * висят в воздухе, таблица без контейнера. Пока склад открывался вкладкой
	 * настроек, рамку давала панель настроек вокруг, и подмена не бросалась в
	 * глаза — на своём разделе стало видно сразу.
	 *
	 * Токены темы, а не hex: значения обязаны различаться в светлой, тёмной и
	 * ночной теме, и подставлять цвет по месту нельзя (см. .agents/UI_STANDARDS.md).
	 */
	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	const renderRulesTab = () => {
		return <MaterialBomsSettingsPanel organizationId={organizationId} />;
	};

	/*
	 * Предпросмотр движения остатка — честный, без прикрытия нулём.
	 *
	 * БЫЛО: строка «Будет: …» считалась через Math.max(0, …). Списание 50 штук
	 * при остатке 10 рисовало «Будет: 0 шт.» — ровно как законное списание в ноль,
	 * и кладовщик нажимал «Списать».
	 *
	 * Уточнение по проверенному коду сервера (apps/api/src/routes/inventory.ts,
	 * PATCH .../stock): он берёт Math.max(-currentStock, adjustment) и ТИХО урезает
	 * списание до остатка, отвечая успехом. Значит итог на экране совпадал с базой
	 * (ноль), а исчезало другое — сам факт, что 40 штук из 50 не списаны. «Остаток
	 * изменён», отчёт по расходу меньше, чем человек списывал, и спорить не с чем.
	 * Поэтому расхождение надо показать ДО записи: либо количество набрано неверно,
	 * либо остаток на складе неверный, и то и другое разбирают до нажатия.
	 */
	const adjustAmountNumber = Number.parseInt(adjustAmount, 10);
	const adjustHasAmount =
		Number.isFinite(adjustAmountNumber) && adjustAmountNumber > 0;
	const adjustDelta =
		(adjustType === "in" ? 1 : -1) * (adjustHasAmount ? adjustAmountNumber : 0);
	const adjustResultQuantity = adjustingItem
		? adjustingItem.stockQuantity + adjustDelta
		: 0;
	const adjustExceedsStock = Boolean(
		adjustingItem && adjustType === "out" && adjustResultQuantity < 0,
	);

	if (isLoading && items.length === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					color: "var(--muted)",
					gap: 12,
				}}
			>
				<Package size={20} />
				Загрузка склада...
			</div>
		);
	}

	return (
		<div
			style={{
				maxWidth: "100%",
				width: "100%",
				boxSizing: "border-box",
				margin: "0 auto",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				gap: 0,
				overflow: "hidden",
				background: paperBg,
			}}
		>
			{/* 1-LINE COMPACT TOOLBAR (Mandates 8d, 8e, 8p, Apple HIG standard) */}
			<div
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex flex-nowrap items-center justify-between gap-2 shrink-0 overflow-x-auto"
				role="toolbar"
				aria-label="Панель склада материалов"
			>
				{/* Left: Section Identity, Sub-tabs, and Inline KPI */}
				<div className="flex items-center gap-2 overflow-x-auto shrink-0 min-w-0">
					<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)] shrink-0">
						<Package size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Склад материалов</span>
					</div>

					{/* Subtabs switcher */}
					<div className="flex items-center gap-1 bg-[var(--paper-soft,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line,#e2e8f0)] shrink-0">
						<button
							type="button"
							onClick={() => setActiveSubTab("inventory")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 py-1 sm:py-0 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeSubTab === "inventory"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-inventory-items"
						>
							<span>Остатки</span>
							<span className="text-[10px] opacity-70">({items.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveSubTab("rules")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 py-1 sm:py-0 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeSubTab === "rules"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-inventory-rules"
						>
							<span>Правила списания</span>
							<span className="text-[10px] opacity-70">({rulesList.length})</span>
						</button>
					</div>

					{/* Compact Inline KPI */}
					<div className="hidden md:flex items-center gap-2 text-xs text-[var(--muted,#64748b)] shrink-0 pl-1 border-l border-[var(--line,#e2e8f0)]">
						<span>
							Позиций: <strong className="text-[var(--ink,#0f172a)]">{totalItems}</strong>
						</span>
						<span>•</span>
						<span>
							В дефиците:{" "}
							<strong
								className={
									lowStockCount > 0
										? "text-rose-600 dark:text-rose-400 font-bold"
										: "text-teal-600 dark:text-teal-400"
								}
							>
								{lowStockCount}
							</strong>
						</span>
						{totalValue > 0 && (
							<>
								<span>•</span>
								<span className="inline-flex items-center gap-1">
									Стоимость:{" "}
									<strong className="text-teal-600 dark:text-teal-400">
										{money(totalValue)}
									</strong>
								</span>
							</>
						)}
					</div>
				</div>

				{/* Right: Search, Quick Packages Toggle, Carpule Disposal, Ops Menu, Add Item */}
				<div className="flex items-center gap-1.5 shrink-0">
					{/* Compact Search Input */}
					<div
						style={{
							position: "relative",
							display: "flex",
							alignItems: "center",
						}}
					>
						<Search
							size={13}
							color="var(--muted)"
							style={{
								position: "absolute",
								left: 8,
								pointerEvents: "none",
							}}
						/>
						<input
							type="text"
							placeholder="Поиск..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="!pl-7 w-32 sm:w-48 text-xs min-h-[44px] sm:min-h-[28px] sm:h-7"
							style={{
								padding: "4px 8px 4px 28px",
								borderRadius: 6,
								border: `1px solid ${borderColor}`,
								background: paperBg,
								color: "var(--ink)",
								outline: "none",
								boxSizing: "border-box",
							}}
							data-testid="inventory-search-input"
						/>
					</div>

					{/* Quick Packages Accordion Toggle */}
					<button
						type="button"
						onClick={() => setIsQuickPackagesOpen((prev) => !prev)}
						className="min-h-[44px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors border"
						style={{
							background: isQuickPackagesOpen ? "var(--teal-soft)" : paperSoftBg,
							color: isQuickPackagesOpen ? "var(--teal-dark, #0f766e)" : "var(--ink)",
							borderColor: isQuickPackagesOpen ? "var(--teal)" : borderColor,
							whiteSpace: "nowrap",
						}}
						title="Пакетное списание расходников в 1 клик (Мандаты 8e, 8k)"
						data-testid="btn-toggle-quick-packages"
					>
						<Zap
							size={13}
							className={isQuickPackagesOpen ? "text-teal-600 dark:text-teal-400" : "text-amber-500"}
						/>
						<span className="hidden sm:inline">Пакеты</span>
					</button>

					{/* 1-Click Carpules Write-off */}
					<button
						type="button"
						data-testid="nurse-quick-carpules-btn"
						disabled={isWritingOffCarpules}
						onClick={() => handleQuickWriteoffCarpules()}
						className="secondary-button"
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 5,
							padding: "4px 10px",
							minHeight: "36px",
							borderRadius: 8,
							fontWeight: 700,
							fontSize: 12,
							whiteSpace: "nowrap",
							cursor: "pointer",
							background: paperSoftBg,
							border: `1px solid ${borderColor}`,
							color: "var(--ink)",
						}}
						title="Списать пустую карпулу анестетика медсестрой в 1 клик (СанПиН 3.3686-21, ПКУ без комиссии из 3 человек)"
					>
						<Syringe size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">
							{isWritingOffCarpules ? "Списание..." : "Карпулы"}
						</span>
					</button>

					{/* Operations Dropdown Menu (Hick's Law grouping) */}
					<div ref={opsMenuRef} style={{ position: "relative", display: "inline-block" }}>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setIsOpsMenuOpen((prev) => !prev)}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								padding: "4px 10px",
								minHeight: "36px",
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: paperSoftBg,
								color: "var(--ink)",
								fontWeight: 600,
								fontSize: 12,
								cursor: "pointer",
								whiteSpace: "nowrap",
							}}
							title="Операции со складом: Списание по наряду, ТОРГ-13, ИНВ-3/19, МДЛП, Техкарты"
							aria-expanded={isOpsMenuOpen}
							data-testid="btn-warehouse-ops-menu"
						>
							<PackageCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="hidden md:inline">Операции</span>
							<ChevronDown
								size={12}
								style={{
									transform: isOpsMenuOpen ? "rotate(180deg)" : "none",
									transition: "transform 0.15s ease",
								}}
							/>
						</button>

								{isOpsMenuOpen && (
									<div
										style={{
											position: "absolute",
											right: 0,
											top: "calc(100% + 4px)",
											background: paperBg,
											border: `1px solid ${borderColor}`,
											borderRadius: 10,
											boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
											padding: 6,
											zIndex: 50,
											minWidth: 260,
											display: "flex",
											flexDirection: "column",
											gap: 2,
										}}
										role="menu"
									>
										<button
											type="button"
											className="secondary-button"
											data-testid="warehouse-manager-trigger"
											onClick={() => {
												setIsWarehouseManagerOpen(true);
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="Управление складами и остатками: экспресс-пресеты, овердрафт и списание"
											role="menuitem"
										>
											<Warehouse size={16} className="text-teal-600 shrink-0" />
											<span>Управление складами и остатками</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="mdlp-scanning-trigger"
											onClick={() => {
												setIsMdlpScanningOpen(true);
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="Честный Знак / МДЛП сканирование DataMatrix кодов (Схемы 701/531)"
											role="menuitem"
										>
											<QrCode size={16} className="text-teal-600 shrink-0" />
											<span>Честный Знак / МДЛП сканирование</span>
										</button>
										<button
											type="button"
											className="secondary-button"
											data-testid="clinical-writeoff-trigger"
											onClick={() => {
												setIsClinicalWriteoffOpen(true);
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="Клиническое списание расходников по нормам Приказа Минздрава 804н (Акты 0504230, М-11 и ТОРГ-16)"
											role="menuitem"
										>
											<PackageCheck size={16} className="text-teal-600 shrink-0" />
											<span>Списание по наряду (804н)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="warehouse-transfer-trigger"
											onClick={() => {
												setIsWarehouseTransferOpen(true);
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="Межфилиальное перемещение ТМЦ по накладным ТОРГ-13"
											role="menuitem"
										>
											<Truck size={16} className="shrink-0" />
											<span>Перемещение (ТОРГ-13)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="warehouse-inventory-audit-trigger"
											onClick={() => {
												setIsInventoryAuditOpen(true);
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="Складская инвентаризация: Опись ИНВ-3, Сличительная ведомость ИНВ-19 и FEFO контроль"
											role="menuitem"
										>
											<PackageCheck size={16} className="text-teal-600 shrink-0" />
											<span>Инвентаризация (ИНВ-3/19)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="mdlp-disposal-trigger"
											onClick={() => {
												setIsMdlpDisposalOpen(true);
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="Официальный вывод из оборота лекарственных препаратов по Схеме 10560 ИС МДЛП (Честный ЗНАК)"
											role="menuitem"
										>
											<Package size={16} className="text-teal-600 shrink-0" />
											<span>МДЛП (Схема 10560)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-standard-kit-btn"
											onClick={() => {
												handleQuickWriteoffStandardKit();
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="1-клик списание базового набора приёма (перчатки, маска, слюноотсос, нагрудник, валики)"
											role="menuitem"
										>
											<PackageCheck size={16} className="text-teal-600 shrink-0" />
											<span>Списать базовый набор (1 клик)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-anesthetic-carpule-btn"
											onClick={() => {
												handleQuickWriteoffAnestheticCarpule();
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="1-клик списание пустой карпулы анестетика (Септанест/Убистезин) медсестрой без комиссии из 3 человек"
											role="menuitem"
										>
											<Syringe size={16} className="text-teal-600 shrink-0" />
											<span>Списать карпулу анестетика (Септанест/Убистезин)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-sterilization-kit-btn"
											onClick={() => {
												handleQuickWriteoffSterilizationKit();
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="1-клик списание набора стерилизации: 1 лоток со смотровым инструментом в крафт-пакете + 2 пары перчаток"
											role="menuitem"
										>
											<PackageCheck size={16} className="text-teal-600 shrink-0" />
											<span>Набор стерилизации: 1 лоток + перчатки</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-carpules-btn"
											onClick={() => {
												handleQuickWriteoffCarpules();
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
											}}
											title="1-клик списание пустых карпул анестетиков медсестрой (без комиссии из 3 человек)"
											role="menuitem"
										>
											<Syringe size={16} className="text-teal-600 shrink-0" />
											<span>Списать карпулу (без комиссии)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-visit-therapy-btn"
											onClick={() => {
												handleQuickWriteoffVisitBundle("therapy");
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
												minHeight: "44px",
											}}
											title="1-клик списание набора визита «Терапия»: карпула + игла + перчатки + слюноотсос + валики + нагрудник"
											role="menuitem"
										>
											<Sparkles size={16} className="text-teal-600 shrink-0" />
											<span>Списать визит: Терапия (1 клик)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-visit-surgery-btn"
											onClick={() => {
												handleQuickWriteoffVisitBundle("surgery");
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
												minHeight: "44px",
											}}
											title="1-клик списание набора визита «Хирургия»: карпула + игла + скальпель + шовный материал + губка"
											role="menuitem"
										>
											<Sparkles size={16} className="text-teal-600 shrink-0" />
											<span>Списать визит: Хирургия (1 клик)</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-shift-therapy-btn"
											onClick={() => {
												handleQuickWriteoffShiftBundle("therapy");
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
												minHeight: "44px",
											}}
											title="1-клик списание расхода смены (Терапия)"
											role="menuitem"
										>
											<Sparkles size={16} className="text-teal-600 shrink-0" />
											<span>Списать смену: Терапия</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-shift-ortho-btn"
											onClick={() => {
												handleQuickWriteoffShiftBundle("orthopedics");
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
												minHeight: "44px",
											}}
											title="1-клик списание расхода смены (Ортопедия)"
											role="menuitem"
										>
											<PackageCheck size={16} className="text-teal-600 shrink-0" />
											<span>Списать смену: Ортопедия</span>
										</button>

										<button
											type="button"
											className="secondary-button"
											data-testid="nurse-menu-quick-shift-surgery-btn"
											onClick={() => {
												handleQuickWriteoffShiftBundle("surgery");
												setIsOpsMenuOpen(false);
											}}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "8px 12px",
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--ink)",
												fontWeight: 500,
												fontSize: 13,
												cursor: "pointer",
												textAlign: "left",
												width: "100%",
												minHeight: "44px",
											}}
											title="1-клик списание расхода смены (Хирургия)"
											role="menuitem"
										>
											<ShieldCheck size={16} className="text-teal-600 shrink-0" />
											<span>Списать смену: Хирургия</span>
										</button>
									</div>
								)}
							</div>

					{/* Add Inventory Item Button */}
					<button
						type="button"
						className="primary-button"
						onClick={openAddModal}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 5,
							padding: "4px 12px",
							minHeight: "36px",
							borderRadius: 8,
							fontWeight: 700,
							fontSize: 12,
							whiteSpace: "nowrap",
							background: "var(--teal)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							cursor: "pointer",
						}}
						data-testid="btn-add-inventory-item"
					>
						<Plus size={14} />
						<span>Позиция</span>
					</button>
				</div>
			</div>

			{/* Mobile Metrics Grid (Mandates 8c, 8d, 8p, 8n) */}
			{activeSubTab === "inventory" && (
				<div
					className="md:hidden grid grid-cols-2 gap-2 p-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] shrink-0"
					data-testid="warehouse-mobile-metrics-grid"
				>
					<div className="flex flex-col p-2 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg">
						<span className="text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							Позиций
						</span>
						<span className="text-sm font-bold text-[var(--ink,#0f172a)]">{totalItems}</span>
					</div>
					<div className="flex flex-col p-2 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg">
						<span className="text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							В дефиците
						</span>
						<span
							className={`text-sm font-bold ${
								lowStockCount > 0
									? "text-rose-600 dark:text-rose-400"
									: "text-teal-600 dark:text-teal-400"
							}`}
						>
							{lowStockCount}
						</span>
					</div>
					<div className="col-span-2 sm:col-span-1 flex flex-col p-2 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg">
						<span className="text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							Стоимость склада
						</span>
						<span className="text-sm font-bold text-teal-600 dark:text-teal-400">
							{totalValue > 0 ? money(totalValue) : "0 ₽"}
						</span>
					</div>
				</div>
			)}

			{/* Accordion 1-Click Clinical Packages Write-Off Bar (Mandates 8e, 8k, 8n) */}
			{activeSubTab === "inventory" && isQuickPackagesOpen && (
				<div
					style={{
						padding: "10px 14px",
						background: paperSoftBg,
						borderBottom: `1px solid ${borderColor}`,
						flexShrink: 0,
					}}
				>
					<WarehousePackageWriteOffBar
						warehouseItems={items}
						organizationId={organizationId}
						allowSoftOverdraft={true}
						onWriteOffComplete={() => fetchItems()}
					/>
				</div>
			)}

			{/* MAIN CONTENT AREA */}
			<div
				style={{
					padding: "8px 12px",
					flex: 1,
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				{activeSubTab === "rules" ? (
					<div style={{ flex: 1, overflowY: "auto" }}>{renderRulesTab()}</div>
				) : (
					/* TABLE */
					<div
						style={{
							flex: 1,
							overflowX: "auto",
							overflowY: "auto",
							background: paperBg,
							borderRadius: 12,
							border: `1px solid ${borderColor}`,
						}}
					>
						<table
							style={{
								width: "100%",
								minWidth: "780px",
								borderCollapse: "collapse",
								textAlign: "left",
							}}
						>
							<thead
								style={{
									position: "sticky",
									top: 0,
									background: paperSoftBg,
									zIndex: 10,
								}}
							>
								<tr>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Наименование
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Остаток
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Мин. запас
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Цена / ед.
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Партия / Срок
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Штрихкод
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
											textAlign: "right",
										}}
									>
										Действия
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.length === 0 ? (
									<tr>
										{/* В шапке семь колонок: при colSpan={5} текст съезжал влево. */}
										<td
											colSpan={7}
											style={{
												padding: 48,
												textAlign: "center",
												color: "var(--muted)",
											}}
										>
											{/*
												ТРИ РАЗНЫХ ПУСТЫХ ЭКРАНА, А НЕ ОДИН.

												Здесь стояло «Склад пуст. Добавьте первый материал.» на
												любую пустоту, включая ту, при которой добавлять нельзя:
												пока организация не определена (профиль клиники ещё не
												пришёл, вход просрочен), запрос остатков вообще не
												уходит — hook снимает признак загрузки и оставляет
												список пустым. Кладовщик читал «склад пуст» и заносил
												материалы заново поверх настоящих остатков.
											*/}
											{/*
												Отказ сервера — отдельное состояние, а не пустота.

												При упавшем запросе список остаётся пустым, и здесь
												показывалось «Склад пуст. Добавьте первый материал.»
												Уведомление об ошибке к этому времени уже погасло, так
												что экран прямо предлагал занести материалы заново
												поверх настоящих остатков. Теперь видно, что остатки не
												загружены, и есть чем повторить запрос.
											*/}
											{loadError ? (
												<span
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														gap: 14,
													}}
												>
													<AlertTriangle
														size={22}
														style={{ color: "var(--bad-fg, #ef4444)" }}
													/>
													<span style={{ color: "var(--ink)", fontSize: 15 }}>
														{loadError}
													</span>
													<button
														type="button"
														onClick={() => fetchItems()}
														disabled={isLoading}
														style={{
															padding: "10px 20px",
															borderRadius: 8,
															border: `1px solid ${borderColor}`,
															background: paperSoftBg,
															color: "var(--ink)",
															fontWeight: 600,
															fontSize: 14,
															cursor: isLoading ? "wait" : "pointer",
														}}
													>
														{isLoading ? "Загружаем..." : "Повторить"}
													</button>
												</span>
											) : !organizationId ? (
												"Склад не загружен: клиника не определена. Обновите страницу или войдите в кабинет заново — добавлять материалы сейчас нельзя, настоящие остатки не показаны."
											) : searchQuery ? (
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														gap: 8,
													}}
												>
													<Search size={28} style={{ color: "var(--muted)" }} />
													<span style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>
														Материалы не найдены по запросу «{searchQuery}»
													</span>
													<span style={{ color: "var(--muted)", fontSize: 12 }}>
														Проверьте правильность наименования, артикула SKU или штрихкода партии.
													</span>
												</div>
											) : (
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														gap: 12,
														maxWidth: 480,
														margin: "0 auto",
													}}
												>
													<Package size={40} style={{ color: "var(--teal, #0d9488)" }} />
													<span style={{ color: "var(--ink)", fontWeight: 700, fontSize: 16 }}>
														На складе пока нет материалов и партий
													</span>
													<span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
														Оформите первую приходную накладную для оприходования медикаментов, анестетиков, пломбировочных материалов и расходников.
													</span>
													<button
														type="button"
														onClick={() => openAddModal()}
														style={{
															minHeight: "44px",
															padding: "10px 24px",
															borderRadius: 10,
															background: "var(--teal, #0d9488)",
															color: "var(--on-teal, #ffffff)",
															fontWeight: 700,
															fontSize: 14,
															border: "none",
															boxShadow: "var(--shadow-1)",
															cursor: "pointer",
															display: "inline-flex",
															alignItems: "center",
															gap: 8,
															marginTop: 6,
														}}
														data-testid="empty-state-add-first-material-btn"
													>
														<Plus size={16} />
														<span>+ Оформить первую приходную накладную</span>
													</button>
												</div>
											)}
										</td>
									</tr>
								) : (
									filteredItems?.map((item) => {
										const isLowStock =
											item.stockQuantity <= item.criticalThreshold;
										/*
										 * БЫЛО: `Number(item.unitCostRub) || 0`.
										 * Нечитаемая/пустая/битая цена становилась нулём:
										 * строка склада показывала материал бесплатным,
										 * «итого» по позиции считалось от нуля, а шапка
										 * totalValue (parseKopecks) могла показывать другое.
										 * money() уже умеет «не определено» для NaN — но
										 * до неё ноль подставляли здесь.
										 * СТАЛО: конечное число оставляем; иначе null и
										 * честный money(null)/без ложного «итого».
										 */
										const unitCostRaw = Number(item.unitCostRub);
										const unitCost = Number.isFinite(unitCostRaw)
											? unitCostRaw
											: null;
										const lineValue =
											unitCost !== null && Number.isFinite(item.stockQuantity)
												? item.stockQuantity * unitCost
												: null;
										return (
											<tr
												key={item.id}
												style={{
													borderBottom: `1px solid ${borderColor}`,
													transition: "background 0.15s",
												}}
											>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--ink)",
														fontWeight: 500,
													}}
												>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 8,
														}}
													>
														{isLowStock && (
															<AlertTriangle size={15} color="var(--bad-fg, #ef4444)" className="shrink-0" />
														)}
														<span className="truncate max-w-[280px]" title={item.name}>
															{item.name}
														</span>
													</div>
												</td>
												<td style={{ padding: "14px 20px" }}>
													<span
														style={{
															background: isLowStock
																? "rgba(239, 68, 68, 0.1)"
																: "rgba(16, 185, 129, 0.1)",
															color: isLowStock
																? "var(--bad-fg, #ef4444)"
																: "var(--teal)",
															padding: "4px 10px",
															borderRadius: 6,
															fontWeight: 600,
															fontSize: 14,
															border: isLowStock
																? "1px solid rgba(239, 68, 68, 0.3)"
																: "1px solid rgba(16, 185, 129, 0.2)",
														}}
													>
														{item.stockQuantity} шт.
													</span>
												</td>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--muted)",
														fontSize: 14,
													}}
												>
													{item.criticalThreshold} шт.
												</td>
												<td style={{ padding: "14px 20px", fontSize: 14 }}>
													{/*
													 * БЫЛО: unitCost > 0 / lineValue > 0 после Number||0.
													 * Неизвестная цена уже null; сравнение с 0 схлопывало
													 * «не определено» и честный ноль в одно «—».
													 * СТАЛО: null → money(null) («не определено»);
													 * конечное число (в т.ч. 0) → money; итого только
													 * когда lineValue известен.
													 */}
													{unitCost !== null ? (
														<div>
															<div
																style={{ color: "var(--ink)", fontWeight: 500 }}
															>
																{/*
															  Деньги показывает общая money() из AppHelpers.

															  Стояло `unitCost.toLocaleString("ru-RU") + " ₽"`:
															  цена 1250,50 печаталась как «1 250,5 ₽», потому что
															  toLocaleString по умолчанию лишний ноль опускает.
															  На деньгах это читается так, будто пятьдесят копеек
															  превратились в пять.
															*/}
																{money(unitCost)}
															</div>
															{lineValue !== null && (
																<div
																	style={{
																		color: "var(--muted)",
																		fontSize: 12,
																	}}
																>
																	итого: {money(lineValue)}
																</div>
															)}
														</div>
													) : (
														<span
															style={{
																color: "var(--muted)",
																fontStyle: "italic",
															}}
														>
															{money(null)}
														</span>
													)}
												</td>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--muted)",
														fontSize: 14,
													}}
												>
													{/*
													  Просрочку и «вот-вот истечёт» надо различать.

													  Раньше оба случая красились одинаково и цветом
													  var(--tomato) — токена с таким именем в проекте нет
													  вовсе, поэтому предупреждение попросту не
													  показывалось: текст оставался обычным. Просроченный
													  материал нельзя использовать совсем, а истекающий
													  надо успеть израсходовать — это разные решения
													  кладовщика, и выглядеть они обязаны по-разному.
													*/}
													{item.expirationDate ? (
														(() => {
															const state = expirationState(
																item.expirationDate,
															);
															return (
																<div
																	style={{
																		display: "flex",
																		flexDirection: "column",
																	}}
																>
																	<span className={state.className}>
																		{state.label}
																	</span>
																	{item.lotNumber ? (
																		<span style={{ fontSize: 12 }}>
																			Партия: {item.lotNumber}
																		</span>
																	) : null}
																</div>
															);
														})()
													) : item.lotNumber ? (
														<span style={{ fontSize: 12 }}>
															Партия: {item.lotNumber}
														</span>
													) : (
														<span style={{ fontStyle: "italic", opacity: 0.5 }}>
															Не указан
														</span>
													)}
												</td>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--muted)",
														fontSize: 14,
													}}
												>
													{item.barcode ? (
														<span
															style={{
																fontFamily: "monospace",
																background: "rgba(0,0,0,0.05)",
																padding: "2px 6px",
																borderRadius: 4,
															}}
														>
															{item.barcode}
														</span>
													) : (
														<span style={{ fontStyle: "italic", opacity: 0.5 }}>
															Нет
														</span>
													)}
												</td>
												<td
													style={{ padding: "14px 20px", textAlign: "right" }}
												>
													<div
														style={{
															display: "flex",
															justifyContent: "flex-end",
															alignItems: "center",
															gap: 6,
														}}
													>
														{/* Action 1: Списать расход (Direct primary action) */}
														<button
															type="button"
															onClick={() => {
																setAdjustingItem(item);
																setAdjustType("out");
																setAdjustAmount("");
															}}
															className="min-h-[36px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
															style={{
																background: "var(--bad-bg, rgba(239, 68, 68, 0.1))",
																color: "var(--bad-fg, #ef4444)",
																border: "1px solid rgba(239, 68, 68, 0.25)",
																whiteSpace: "nowrap",
															}}
															title="Списать расход материала (Primary Action: Расход)"
															data-testid={`btn-item-writeoff-${item.id}`}
														>
															<ArrowUpFromLine size={13} />
															<span>Списать расход</span>
														</button>

														{/* Action 2: Приход/Накладная (Direct primary action) */}
														<button
															type="button"
															onClick={() => {
																setAdjustingItem(item);
																setAdjustType("in");
																setAdjustAmount("");
															}}
															className="min-h-[36px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
															style={{
																background: "var(--teal-soft)",
																color: "var(--teal-dark, #0f766e)",
																border: "1px solid var(--teal)",
																whiteSpace: "nowrap",
															}}
															title="Оприходовать материал на склад / накладная (Primary Action: Приход)"
															data-testid={`btn-item-arrival-${item.id}`}
														>
															<ArrowDownToLine size={13} />
															<span>Приход/Накладная</span>
														</button>

														{/* Secondary Actions Menu (MoreHorizontal) - Miller's Law <=2 direct controls */}
														<div
															style={{ position: "relative", display: "inline-flex" }}
															ref={activeMenuRowId === item.id ? rowMenuRef : null}
														>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setActiveMenuRowId((prev) =>
																		prev === item.id ? null : item.id,
																	);
																}}
																className="min-h-[36px] sm:min-h-0 sm:h-8 w-8 rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors"
																style={{
																	background: "var(--paper-soft, rgba(0,0,0,0.04))",
																	color: "var(--muted)",
																	border: "1px solid var(--line, rgba(0,0,0,0.08))",
																}}
																title="Дополнительные действия с позицией"
																aria-label="Меню дополнительных действий склада"
																aria-haspopup="menu"
																aria-expanded={activeMenuRowId === item.id}
																data-testid={`btn-item-more-${item.id}`}
															>
																<MoreHorizontal size={15} />
															</button>
															{activeMenuRowId === item.id && (
																<div
																	style={{
																		position: "absolute",
																		right: 0,
																		top: "100%",
																		marginTop: 4,
																		background: "var(--paper-strong)",
																		border: "1px solid var(--line)",
																		borderRadius: 8,
																		boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
																		padding: 4,
																		zIndex: 50,
																		minWidth: 190,
																		display: "flex",
																		flexDirection: "column",
																		gap: 2,
																		textAlign: "left",
																	}}
																	role="menu"
																	aria-label="Меню позиции склада"
																	onClick={(e) => e.stopPropagation()}
																>
																	<button
																		type="button"
																		onClick={() => {
																			setActiveMenuRowId(null);
																			if (item.barcode) {
																				navigator.clipboard?.writeText(item.barcode);
																				showToast(`Штрихкод скопирован: ${item.barcode}`, "info");
																			} else {
																				showToast("У позиции нет штрихкода (задайте в редактировании)", "info");
																			}
																		}}
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: 8,
																			padding: "8px 12px",
																			fontSize: 12,
																			fontWeight: 500,
																			color: "var(--ink)",
																			background: "none",
																			border: "none",
																			borderRadius: 6,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																		}}
																		role="menuitem"
																	>
																		<QrCode size={14} className="text-teal-600 shrink-0" />
																		<span>Штрихкод {item.barcode ? `(${item.barcode})` : ""}</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => {
																			setActiveMenuRowId(null);
																			setIsWarehouseManagerOpen(true);
																		}}
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: 8,
																			padding: "8px 12px",
																			fontSize: 12,
																			fontWeight: 500,
																			color: "var(--ink)",
																			background: "none",
																			border: "none",
																			borderRadius: 6,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																		}}
																		role="menuitem"
																	>
																		<TrendingUp size={14} className="text-blue-600 shrink-0" />
																		<span>История движений</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => {
																			setActiveMenuRowId(null);
																			showToast(`Печать этикетки «${item.name}» (штрихкод: ${item.barcode || "б/ш"}) отправлена`, "info");
																		}}
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: 8,
																			padding: "8px 12px",
																			fontSize: 12,
																			fontWeight: 500,
																			color: "var(--ink)",
																			background: "none",
																			border: "none",
																			borderRadius: 6,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																		}}
																		role="menuitem"
																	>
																		<Printer size={14} className="text-indigo-600 shrink-0" />
																		<span>Печать этикетки</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => {
																			setActiveMenuRowId(null);
																			setIsInventoryAuditOpen(true);
																		}}
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: 8,
																			padding: "8px 12px",
																			fontSize: 12,
																			fontWeight: 500,
																			color: "var(--ink)",
																			background: "none",
																			border: "none",
																			borderRadius: 6,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																		}}
																		role="menuitem"
																	>
																		<ShieldCheck size={14} className="text-emerald-600 shrink-0" />
																		<span>Инвентаризация (сверка)</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => {
																			setActiveMenuRowId(null);
																			openEditModal(item);
																		}}
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: 8,
																			padding: "8px 12px",
																			fontSize: 12,
																			fontWeight: 500,
																			color: "var(--ink)",
																			background: "none",
																			border: "none",
																			borderRadius: 6,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																		}}
																		role="menuitem"
																	>
																		<Edit2 size={14} className="text-amber-600 shrink-0" />
																		<span>Редактировать</span>
																	</button>
																	<div
																		style={{
																			height: 1,
																			background: "var(--line, #e2e8f0)",
																			margin: "2px 0",
																		}}
																	/>
																	<button
																		type="button"
																		onClick={() => {
																			setActiveMenuRowId(null);
																			handleDeleteItem(item.id, item.name);
																		}}
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: 8,
																			padding: "8px 12px",
																			fontSize: 12,
																			fontWeight: 600,
																			color: "var(--bad-fg, #ef4444)",
																			background: "none",
																			border: "none",
																			borderRadius: 6,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																		}}
																		role="menuitem"
																	>
																		<Trash2 size={14} className="shrink-0" />
																		<span>Удалить</span>
																	</button>
																</div>
															)}
														</div>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* ADD/EDIT MODAL */}
			{showModal && (
				<button
					type="button"
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						border: "none",
						padding: 0,
					}}
					onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
					onKeyDown={(e) =>
						e.target === e.currentTarget &&
						(e.key === "Enter" || e.key === " ") &&
						setShowModal(false)
					}
				>
					<div
						role="dialog"
						aria-modal="true"
						style={{
							background: paperBg,
							width: 440,
							maxWidth: "95vw",
							borderRadius: 16,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
						}}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginBottom: 20,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								{editingItem ? "Редактировать материал" : "Добавить материал"}
							</h2>
							<button
								type="button"
								onClick={() => setShowModal(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>
						<form
							onSubmit={handleSaveItem}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									htmlFor="inv-item-name"
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Наименование *
								</label>
								<input
									id="inv-item-name"
									type="text"
									required
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="Перчатки нитриловые, Альгинат..."
								/>
							</div>
							<div style={{ display: "flex", gap: 12 }}>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label
										htmlFor="inv-item-threshold"
										style={{
											fontSize: 13,
											color: "var(--muted)",
											fontWeight: 500,
										}}
									>
										Минимальный остаток (шт)
									</label>
									<input
										id="inv-item-threshold"
										type="number"
										min="0"
										required
										value={formData.threshold}
										onChange={(e) =>
											setFormData({ ...formData, threshold: e.target.value })
										}
										placeholder="например: 5"
										style={{
											padding: "10px 14px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											outline: "none",
										}}
									/>
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label
										htmlFor="inv-item-price"
										style={{
											fontSize: 13,
											color: "var(--muted)",
											fontWeight: 500,
										}}
									>
										Цена за единицу (₽)
									</label>
									{/*
									  Поле цены принимает запятую, а не глотает её.

									  Стояло type="number" при подсказке «например 12,50». Запятая
									  делает содержимое такого поля недопустимым, и браузер отдаёт
									  из value пустую строку — набранная цена видна человеку, но в
									  программу не попадает и сохраняется нулём. Обычное текстовое
									  поле сохраняет введённое как есть; разбирает его общая
									  normalizeRubAmountInput при сохранении, там же и «12.50».
									  inputMode="decimal" оставляет на телефоне цифровую клавиатуру.
									*/}
									<input
										id="inv-item-price"
										type="text"
										inputMode="decimal"
										value={formData.unitCostRub}
										onChange={(e) =>
											setFormData({ ...formData, unitCostRub: e.target.value })
										}
										placeholder="цена за единицу, например 12,50"
										style={{
											padding: "10px 14px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											outline: "none",
										}}
									/>
								</div>
							</div>

							{/*
							  Партия и срок годности — на поверхности.

							  Колонка «Партия / Срок» на экране была давно и всегда писала
							  «Не указан»: полей для ввода не существовало, а в таблице
							  inventory_items не было и колонок. Просроченный композит или
							  анестетик — это вред пациенту, поэтому срок стоит рядом с
							  ценой, а не спрятан под «показать больше».
							*/}
							<div className="inventory-form-row">
								<label className="inventory-form-field">
									Партия
									<input
										type="text"
										value={formData.lotNumber}
										onChange={(e) =>
											setFormData({ ...formData, lotNumber: e.target.value })
										}
										placeholder="номер с упаковки, если есть"
									/>
								</label>
								<label className="inventory-form-field">
									Срок годности
									<input
										type="date"
										value={formData.expirationDate}
										onChange={(e) =>
											setFormData({
												...formData,
												expirationDate: e.target.value,
											})
										}
									/>
								</label>
							</div>

							{/*
							  Артикул и штрихкод нужны не каждому, поэтому убраны под
							  раскрытие: у соло-врача их обычно нет вовсе. Форма присылала
							  оба поля и раньше, но ввести их было негде.
							*/}
							<details className="inventory-form-more">
								<summary>Артикул и штрихкод</summary>
								<div className="inventory-form-row">
									<label className="inventory-form-field">
										Артикул
										<input
											type="text"
											value={formData.sku}
											onChange={(e) =>
												setFormData({ ...formData, sku: e.target.value })
											}
											placeholder="код поставщика"
										/>
									</label>
									<label className="inventory-form-field">
										Штрихкод
										<input
											type="text"
											value={formData.barcode}
											onChange={(e) =>
												setFormData({ ...formData, barcode: e.target.value })
											}
											placeholder="или отсканируйте сканером"
										/>
									</label>
								</div>
							</details>

							{/*
							  Кнопка запирается на время запроса: новый материал создаётся
							  через POST, и второе нажатие добавляло вторую такую же позицию
							  на одну полку. Остаток потом ведут по одной, а списывают со
							  второй.
							*/}
							<button
								type="submit"
								className="primary-button"
								disabled={isSavingItem}
								style={{
									marginTop: 8,
									justifyContent: "center",
									opacity: isSavingItem ? 0.6 : 1,
									cursor: isSavingItem ? "wait" : "pointer",
								}}
							>
								{isSavingItem ? "Сохраняем..." : "Сохранить"}
							</button>
						</form>
					</div>
				</button>
			)}

			{/* ADJUST STOCK MODAL */}
			{adjustingItem && (
				<button
					type="button"
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						border: "none",
						padding: 0,
					}}
					onClick={(e) =>
						e.target === e.currentTarget && setAdjustingItem(null)
					}
					onKeyDown={(e) =>
						e.target === e.currentTarget &&
						(e.key === "Enter" || e.key === " ") &&
						setAdjustingItem(null)
					}
				>
					<div
						style={{
							background: paperBg,
							width: 380,
							maxWidth: "95vw",
							borderRadius: 16,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginBottom: 16,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								{adjustType === "in" ? "Приход на склад" : "Списание со склада"}
							</h2>
							<button
								type="button"
								onClick={() => setAdjustingItem(null)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>
						<p
							style={{
								margin: "0 0 4px 0",
								color: "var(--muted)",
								fontSize: 13,
							}}
						>
							Материал
						</p>
						<p
							style={{
								margin: "0 0 20px 0",
								color: "var(--teal)",
								fontWeight: 600,
								fontSize: 15,
							}}
						>
							{adjustingItem.name}
						</p>
						<p
							style={{
								margin: "0 0 16px 0",
								color: "var(--muted)",
								fontSize: 13,
							}}
						>
							Текущий остаток:{" "}
							<strong style={{ color: "var(--ink)" }}>
								{adjustingItem.stockQuantity} шт.
							</strong>
						</p>

						{/* Toggle direction */}
						<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
							{(["in", "out"] as const)?.map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setAdjustType(t)}
									style={{
										flex: 1,
										padding: "8px 0",
										borderRadius: 8,
										border: `1px solid ${adjustType === t ? (t === "in" ? "var(--teal)" : "var(--bad-fg, #ef4444)") : borderColor}`,
										background:
											adjustType === t
												? t === "in"
													? "var(--teal-soft)"
													: "var(--bad-bg, rgba(239, 68, 68, 0.12))"
												: "transparent",
										color:
											adjustType === t
												? t === "in"
													? "var(--teal-dark, #0f766e)"
													: "var(--bad-fg, #ef4444)"
												: "var(--muted)",
										fontWeight: 600,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: 6,
										transition: "all 0.15s",
									}}
								>
									{t === "in" ? (
										<>
											<ArrowDownToLine size={14} /> Приход
										</>
									) : (
										<>
											<ArrowUpFromLine size={14} /> Списание
										</>
									)}
								</button>
							))}
						</div>

						<form
							onSubmit={handleAdjustStock}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									htmlFor="inv-adjust-amount"
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Количество (шт.)
								</label>
								<input
									id="inv-adjust-amount"
									type="number"
									min="1"
									required
									value={adjustAmount}
									onChange={(e) => setAdjustAmount(e.target.value)}
									style={{
										padding: "14px 16px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										fontSize: 22,
										fontWeight: 700,
										outline: "none",
										textAlign: "center",
									}}
								/>
							</div>
							{adjustHasAmount && (
								<p
									style={{
										margin: 0,
										textAlign: "center",
										color: "var(--muted)",
										fontSize: 13,
									}}
								>
									Будет:{" "}
									<strong style={{ color: adjustExceedsStock ? "var(--bad-fg, #ef4444)" : "var(--ink)" }}>
										{adjustResultQuantity} шт.{adjustExceedsStock ? " (дефицит)" : ""}
									</strong>
								</p>
							)}
							{adjustExceedsStock && (
								<p
									style={{
										margin: 0,
										padding: "10px 14px",
										borderRadius: 8,
										background: "var(--bad-bg, rgba(239,68,68,0.12))",
										border: "1px solid var(--bad-fg, #ef4444)",
										color: "var(--ink)",
										fontSize: 13,
										lineHeight: 1.45,
									}}
									data-testid="adjust-stock-overdraft-warning"
								>
									Внимание: остаток отрицательный (овердрафт), требуется оприходование накладной. Задержка оприходования накладной поставщика не блокирует оказание медицинской помощи.
								</p>
							)}
							<button
								type="submit"
								disabled={isAdjustingStock}
								style={{
									padding: "12px",
									borderRadius: 8,
									border: "none",
									fontWeight: 600,
									color: "var(--on-teal, #ffffff)",
									cursor: isAdjustingStock ? "not-allowed" : "pointer",
									background: adjustType === "in" ? "var(--teal)" : "var(--bad-fg, #ef4444)",
									fontSize: 15,
									opacity: isAdjustingStock ? 0.6 : 1,
								}}
							>
								{isAdjustingStock
									? "Сохраняем..."
									: adjustType === "in"
										? "Оприходовать"
										: adjustExceedsStock
											? "Списать (Мягкий овердрафт)"
											: "Списать"}
							</button>
						</form>
					</div>
				</button>
			)}

			{/*
			  Окно подтверждения удаления.

			  Состояние confirmDialog заполнялось обработчиками корзины давно, но
			  рисовать его было нечем — здесь ничего не стояло. Нажатие на корзину
			  у материала и у правила списания не давало вообще никакого отклика.
			*/}
			{confirmDialog?.isOpen ? (
				<InventoryConfirmDialog
					title={confirmDialog.title}
					message={confirmDialog.message}
					onConfirm={confirmDialog.onConfirm}
					onCancel={() => setConfirmDialog(null)}
				/>
			) : null}

			<ClinicalWriteoffModal
				isOpen={isClinicalWriteoffOpen}
				onClose={() => setIsClinicalWriteoffOpen(false)}
				onConfirmWriteoff={async (doc) => {
					try {
						let deductedCount = 0;
						for (const line of doc.lines) {
							if (line.actualQuantity <= 0) continue;
							const matchingItem = items.find(
								(it) => it.name.toLowerCase() === line.nameRu.toLowerCase(),
							);
							if (matchingItem) {
								const res = await fetch(
									`/api/inventory/${organizationId}/${matchingItem.id}/stock`,
									{
										method: "PATCH",
										headers: getHeaders({ "Content-Type": "application/json" }),
										body: JSON.stringify({
											adjustment: -line.actualQuantity,
											allowOverdraft: true,
											reason: `Акт 804н ${doc.actNumber}: ${line.nameRu}`,
										}),
									},
								);
								if (res.ok) deductedCount++;
							}
						}
						showToast(
							`Акт списания 804н зарегистрирован (проведено ${deductedCount} поз., мягкий овердрафт разрешен)`,
							"success",
						);
					} catch (e) {
						console.error(e);
						showToast("Ошибка при фиксации акта списания", "error");
					} finally {
						setIsClinicalWriteoffOpen(false);
						fetchItems();
					}
				}}
			/>

			<WarehouseTransferModal
				isOpen={isWarehouseTransferOpen}
				onClose={() => setIsWarehouseTransferOpen(false)}
				onDocumentSaved={async () => {
					setIsWarehouseTransferOpen(false);
					fetchItems();
				}}
			/>

			<WarehouseInventoryAuditModal
				isOpen={isInventoryAuditOpen}
				onClose={() => setIsInventoryAuditOpen(false)}
				onApplyAudit={async () => {
					setIsInventoryAuditOpen(false);
					fetchItems();
				}}
				onDocumentSaved={() => {
					fetchItems();
				}}
			/>

			<MdlpDisposalQueueModal
				isOpen={isMdlpDisposalOpen}
				onClose={() => setIsMdlpDisposalOpen(false)}
				onConfirmDisposal={async () => {
					setIsMdlpDisposalOpen(false);
					fetchItems();
				}}
			/>

			<WarehouseManagerModal
				isOpen={isWarehouseManagerOpen}
				onClose={() => setIsWarehouseManagerOpen(false)}
				initialItems={items}
				onConfirmWriteoff={async () => {
					setIsWarehouseManagerOpen(false);
					fetchItems();
				}}
			/>

			<MdlpScanningModal
				isOpen={isMdlpScanningOpen}
				onClose={() => setIsMdlpScanningOpen(false)}
				initialMode="disposal_531"
			/>
		</div>
	);
};





