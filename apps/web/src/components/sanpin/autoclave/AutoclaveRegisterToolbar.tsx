import type { SterilizationLogRecord } from "@dental/shared";
import {
	ChevronDown,
	FileSpreadsheet,
	MoreVertical,
	Plus,
	Printer,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { ClinicAutoclaveDevice } from "../AutoclaveEquipmentModal";

export interface AutoclaveRegisterToolbarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly deviceFilter: string;
	readonly setDeviceFilter: (f: string) => void;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly logs: SterilizationLogRecord[];
	readonly isLoggingBatch: boolean;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onQuickShiftBatch: () => void;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly onOpenMobileSheet: () => void;
}

export function AutoclaveRegisterToolbar({
	searchQuery,
	setSearchQuery,
	deviceFilter,
	setDeviceFilter,
	clinicDevices,
	logs,
	isLoggingBatch,
	onOpenEquipmentModal,
	onPrintBatchPouches,
	onQuickShiftBatch,
	onOpenNewCycleModal,
	onGenerateMonthlyForm257,
	onOpenJournal257Modal,
	onOpenMobileSheet,
}: AutoclaveRegisterToolbarProps) {
	const [isDesktopMoreMenuOpen, setIsDesktopMoreMenuOpen] = useState(false);
	const desktopMoreMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				desktopMoreMenuRef.current &&
				!desktopMoreMenuRef.current.contains(event.target as Node)
			) {
				setIsDesktopMoreMenuOpen(false);
			}
		};
		if (isDesktopMoreMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isDesktopMoreMenuOpen]);

	return (
		<div className="sanpin-table-toolbar min-w-0 max-w-full flex items-center justify-between gap-2 p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
			{/* Search Field (Shared) */}
			<div className="dente-search-wrap flex-1 min-w-[120px] max-w-[240px]">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					placeholder="Поиск по аппарату, штрихкоду..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="dente-search-input !h-8"
					data-testid="autoclave-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						className="dente-search-clear"
						onClick={() => setSearchQuery("")}
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

			{/* Desktop Toolbar Action Strip (Hidden on Mobile <= 768px) */}
			<div className="hidden md:flex items-center gap-1.5 shrink-0 flex-nowrap">
				<select
					value={deviceFilter}
					onChange={(e) => setDeviceFilter(e.target.value)}
					className="sanpin-select shrink-0 whitespace-nowrap text-xs rounded-lg px-2"
					style={{ minHeight: "32px", height: "32px" }}
				>
					<option value="all">Все циклы (Норма)</option>
					<option value="passed">Стерильно (Норма)</option>
				</select>

				{/* Action: Оборудование ЦСО */}
				<button
					type="button"
					onClick={onOpenEquipmentModal}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
					style={{
						minHeight: "32px",
						height: "32px",
						padding: "0.2rem 0.55rem",
						fontSize: "0.75rem",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "0.3rem",
						borderRadius: "8px",
					}}
					data-testid="autoclave-equipment-btn"
					title="Управление парком автоклавов и стерилизаторов клиники"
				>
					<ShieldCheck size={13} color="var(--teal, #0d9488)" className="shrink-0" />
					<span className="shrink-0 whitespace-nowrap">
						Оборудование ({clinicDevices.length})
					</span>
				</button>

				{/* Action: Печать маркировок (пачка 10 шт. / 30 дн.) */}
				<button
					type="button"
					onClick={() => {
						if (logs.length > 0 && logs[0]) {
							onPrintBatchPouches(logs[0], 10);
						} else {
							showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
						}
					}}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
					style={{
						minHeight: "32px",
						height: "32px",
						padding: "0.2rem 0.55rem",
						fontSize: "0.75rem",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "0.3rem",
						borderRadius: "8px",
						color: "var(--teal, #0d9488)",
						borderColor: "var(--teal, #0d9488)",
						background: "var(--paper-strong, #ffffff)",
					}}
					title="Печать пачки из 10 наклеек крафт-пакетов (срок 30 дней)"
					data-testid="autoclave-quick-batch-labels-btn"
				>
					<Printer size={13} className="shrink-0" />
					<span className="shrink-0 whitespace-nowrap">Наклейки (10 шт.)</span>
				</button>

				{/* Action: + Зафиксировать цикл стерилизации (134°C, 2.1 бар) */}
				<button
					type="button"
					onClick={onQuickShiftBatch}
					aria-busy={isLoggingBatch}
					className="sanpin-btn touch-manipulation shrink-0 whitespace-nowrap"
					style={{
						minHeight: "32px",
						height: "32px",
						padding: "0.2rem 0.65rem",
						fontSize: "0.75rem",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "0.3rem",
						borderRadius: "8px",
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
						boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
						cursor: "pointer",
					}}
					data-testid="sanpin-autoclave-new-cycle-btn"
					title="Цикл стерилизации завершён: зафиксировать параметры 134°C / 2.1 бар в журнале"
				>
					<Sparkles size={13} className="shrink-0" />
					<span className="shrink-0 whitespace-nowrap">
						{isLoggingBatch ? "Фиксация..." : "Цикл завершён (134°C)"}
					</span>
				</button>

				{/* Desktop Dropdown: [⋮ Дополнительно] */}
				<div
					ref={desktopMoreMenuRef}
					className="shrink-0"
					style={{ position: "relative", display: "inline-block", zIndex: 60 }}
				>
					<button
						type="button"
						onClick={() => setIsDesktopMoreMenuOpen((prev) => !prev)}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
						style={{
							minHeight: "32px",
							minWidth: "32px",
							height: "32px",
							padding: "0.25rem 0.45rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.25rem",
							borderRadius: "8px",
							flexShrink: 0,
						}}
						aria-expanded={isDesktopMoreMenuOpen}
						title="Дополнительные операции: журнал работы стерилизаторов (автоклавов), крафт-пакеты"
						data-testid="autoclave-more-options-btn"
					>
						<MoreVertical size={14} color="var(--brand-primary, #2563eb)" />
						<ChevronDown
							size={11}
							style={{
								transform: isDesktopMoreMenuOpen ? "rotate(180deg)" : "none",
								transition: "transform 0.15s ease",
							}}
						/>
					</button>

					{isDesktopMoreMenuOpen && (
						<div
							style={{
								position: "absolute",
								right: 0,
								top: "calc(100% + 4px)",
								minWidth: "260px",
								background: "var(--paper-strong, #ffffff)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
								boxShadow:
									"0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
								zIndex: 1000,
								padding: "0.35rem",
								display: "flex",
								flexDirection: "column",
								gap: "0.2rem",
							}}
						>
							{/* Внести цикл вручную */}
							{onOpenNewCycleModal && (
								<button
									type="button"
									onClick={() => {
										setIsDesktopMoreMenuOpen(false);
										onOpenNewCycleModal();
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="open-new-cycle-modal-btn"
								>
									<Plus size={15} color="#0284c7" />
									<span>Внести цикл (параметры, КТ-1..5)</span>
								</button>
							)}

							{/* Журнал работы стерилизаторов (автоклавов) за месяц */}
							<button
								type="button"
								onClick={() => {
									setIsDesktopMoreMenuOpen(false);
									onGenerateMonthlyForm257();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="generate-monthly-form257-btn"
							>
								<Sparkles size={15} color="#0d9488" />
								<span>Журнал работы стерилизаторов за месяц</span>
							</button>

							{/* Журнал работы стерилизаторов (автоклавов) */}
							<button
								type="button"
								onClick={() => {
									setIsDesktopMoreMenuOpen(false);
									onOpenJournal257Modal();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="open-journal-257-studio-btn"
							>
								<FileSpreadsheet size={15} color="#059669" />
								<span>Журнал работы стерилизаторов (автоклавов)</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Mobile Toolbar Single-Row Actions (Visible on Mobile <= 768px per Apple HIG) */}
			<div className="flex md:hidden items-center gap-1.5 shrink-0">
				<select
					value={deviceFilter}
					onChange={(e) => setDeviceFilter(e.target.value)}
					className="sanpin-select shrink-0 text-xs rounded-xl px-2.5 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] touch-manipulation"
					style={{ minHeight: "44px", height: "44px" }}
					aria-label="Фильтр статуса циклов"
				>
					<option value="all">Все циклы</option>
					<option value="passed">Стерильно</option>
				</select>

				<button
					type="button"
					onClick={onOpenMobileSheet}
					className="sanpin-touch-btn inline-flex items-center justify-center p-2 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] dark:border-[#334155] shadow-sm touch-manipulation cursor-pointer"
					style={{ minHeight: "44px", minWidth: "44px", height: "44px", width: "44px" }}
					aria-label="Действия автоклава и журналы"
					data-testid="autoclave-mobile-actions-trigger"
				>
					<SlidersHorizontal size={18} className="text-[var(--brand-primary,#2563eb)]" />
				</button>
			</div>
		</div>
	);
}
