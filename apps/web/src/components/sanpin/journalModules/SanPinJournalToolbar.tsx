/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalToolbar.tsx
 *
 * Layer 4: Presentation subcomponent - Top toolbar for SanPin Sterilization Journal.
 * - Device selection, period switcher (day/week/month), text search, chairside barcode input.
 * - Batch autoclave quick norm triggers (25/15 pouches), PSO quick norm trigger.
 * - Norms autofill trigger, scanner modal trigger, Form 257/u print and CSV export.
 * - 0 emojis, strict clinical typography (32-36px density).
 */

import React from "react";
import {
	Printer,
	QrCode,
	Search,
	Sparkles,
	Download,
	Plus,
	Settings,
	Layers,
	ShieldCheck,
} from "lucide-react";
import type { SanPinJournalPeriod } from "./sanpinJournalTypes";

export interface SanPinJournalToolbarProps {
	readonly selectedAutoclave: string;
	readonly onSelectAutoclave: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly directScanCode: string;
	readonly onDirectScanChange: (code: string) => void;
	readonly onDirectScanSubmit: (code: string) => void;
	readonly isAutofilling: boolean;
	readonly onAutofillNorms: () => void;
	readonly onOpenScannerModal: () => void;
	readonly onPrintForm257: () => void;
	readonly onExportCsv: () => void;
	readonly onOpenEquipmentModal?: () => void;
	readonly onOpenNewCycleModal?: () => void;
	readonly period?: SanPinJournalPeriod;
	readonly onPeriodChange?: (p: SanPinJournalPeriod) => void;
	readonly onQuickBatchNorm?: (batchSize: number, regime: "134" | "121") => void;
	readonly onQuickPsoNorm?: () => void;
}

const BTN_BASE: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: 5,
	height: 30,
	padding: "0 10px",
	borderRadius: 6,
	fontSize: "0.75rem",
	fontWeight: 600,
	whiteSpace: "nowrap",
	cursor: "pointer",
};

export const SanPinJournalToolbar: React.FC<SanPinJournalToolbarProps> = ({
	selectedAutoclave,
	onSelectAutoclave,
	searchQuery,
	onSearchChange,
	directScanCode,
	onDirectScanChange,
	onDirectScanSubmit,
	isAutofilling,
	onAutofillNorms,
	onOpenScannerModal,
	onPrintForm257,
	onExportCsv,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
	period = "day",
	onPeriodChange,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	return (
		<div
			className="sanpin-journal-toolbar"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: "8px 12px",
				borderRadius: 8,
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				maxWidth: "100%",
				overflowX: "clip",
			}}
		>
			{/* Row 1: Title, Period Switcher, Autoclave Filter, Search & Scanner Input */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					<span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink, #1e293b)" }}>
						Журнал стерилизации (СанПиН 3.3686-21, Форма 257/у)
					</span>

					{onPeriodChange && (
						<div style={{ display: "inline-flex", background: "var(--paper, #fff)", border: "1px solid var(--line, #cbd5e1)", borderRadius: 6, padding: 2, gap: 2 }}>
							{(["day", "week", "month"] as const).map((p) => {
								const label = p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц";
								const active = period === p;
								return (
									<button
										key={p}
										type="button"
										onClick={() => onPeriodChange(p)}
										style={{
											height: 26,
											padding: "0 8px",
											borderRadius: 4,
											border: "none",
											background: active ? "var(--teal, #0d9488)" : "transparent",
											color: active ? "#ffffff" : "var(--muted, #64748b)",
											fontSize: "0.75rem",
											fontWeight: active ? 600 : 500,
											cursor: "pointer",
										}}
									>
										{label}
									</button>
								);
							})}
						</div>
					)}

					<select
						value={selectedAutoclave}
						onChange={(e) => onSelectAutoclave(e.target.value)}
						style={{ height: 32, padding: "0 8px", borderRadius: 6, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", fontSize: "0.8125rem", color: "var(--ink, #1e293b)" }}
					>
						<option value="all">Все автоклавы</option>
						<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
						<option value="АК-02">АК-02 (W&H Lina 17)</option>
					</select>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
						<Search size={14} style={{ position: "absolute", left: 8, color: "var(--muted, #64748b)" }} />
						<input
							type="text"
							placeholder="Поиск по крафт-пакету..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							style={{ height: 32, paddingLeft: 28, paddingRight: 8, borderRadius: 6, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", fontSize: "0.8125rem", color: "var(--ink, #1e293b)", width: 175 }}
						/>
					</div>

					<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
						<QrCode size={14} style={{ position: "absolute", left: 8, color: "var(--teal, #0d9488)" }} />
						<input
							type="text"
							placeholder="Сканировать крафт-пакет..."
							value={directScanCode}
							onChange={(e) => onDirectScanChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && directScanCode.trim()) {
									e.preventDefault();
									onDirectScanSubmit(directScanCode.trim());
								}
							}}
							style={{ height: 32, paddingLeft: 28, paddingRight: 8, borderRadius: 6, border: "1px solid var(--teal, #0d9488)", background: "var(--paper, #fff)", fontSize: "0.8125rem", color: "var(--ink, #1e293b)", width: 175 }}
							title="Сканирование крафт-пакета или штрихкода набора у кресла в 1 секунду без всплывающих окон (нажмите Enter)"
						/>
					</div>
				</div>
			</div>

			{/* Row 2: Batch Fast Actions & Administrative Buttons */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--line-subtle, #f1f5f9)", paddingTop: 6 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
					{onQuickBatchNorm && (
						<>
							<button
								type="button"
								onClick={() => onQuickBatchNorm(25, "134")}
								disabled={isAutofilling}
								style={{ ...BTN_BASE, border: "1px solid var(--teal, #0d9488)", background: "var(--paper, #fff)", color: "var(--teal, #0d9488)", cursor: isAutofilling ? "wait" : "pointer" }}
								title="Пакетная фиксация цикла автоклава 134°C на 25 лотков с авто-списанием расходников"
							>
								<Layers size={13} />
								<span>Партия 134°C (25 лотков)</span>
							</button>

							<button
								type="button"
								onClick={() => onQuickBatchNorm(15, "121")}
								disabled={isAutofilling}
								style={{ ...BTN_BASE, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #1e293b)", cursor: isAutofilling ? "wait" : "pointer" }}
								title="Пакетная фиксация щадящего цикла 121°C на 15 наборов (оптика/наконечники)"
							>
								<Layers size={13} />
								<span>Партия 121°C (15 наборов)</span>
							</button>
						</>
					)}

					{onQuickPsoNorm && (
						<button
							type="button"
							onClick={onQuickPsoNorm}
							disabled={isAutofilling}
							style={{ ...BTN_BASE, border: "1px solid rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.08)", color: "var(--emerald-600, #059669)", cursor: isAutofilling ? "wait" : "pointer" }}
							title="Регистрация контроля ПСО (азопирам + фенолфталеин) отрицательно (100% норма, Форма 366/у)"
						>
							<ShieldCheck size={13} />
							<span>ПСО норма</span>
						</button>
					)}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={onAutofillNorms}
						disabled={isAutofilling}
						style={{ ...BTN_BASE, border: "1px solid var(--teal, #0d9488)", background: "var(--teal, #0d9488)", color: "#ffffff", cursor: isAutofilling ? "wait" : "pointer", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
						data-testid="autofill-norms-btn"
						title="Автоматическое заполнение журнала работы автоклавов (Форма 257/у СанПиН) по нормам"
					>
						<Sparkles size={13} />
						<span>{isAutofilling ? "Заполнение..." : "Заполнить по нормам"}</span>
					</button>

					<button
						type="button"
						onClick={onOpenScannerModal}
						style={{ ...BTN_BASE, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #1e293b)" }}
					>
						<QrCode size={13} />
						<span>Сканер крафт-пакетов</span>
					</button>

					{onOpenNewCycleModal && (
						<button
							type="button"
							onClick={onOpenNewCycleModal}
							style={{ ...BTN_BASE, border: "1px solid var(--primary, #0284c7)", background: "var(--primary, #0284c7)", color: "#ffffff" }}
							data-testid="start-cycle-btn"
						>
							<Plus size={13} />
							<span>Запустить цикл</span>
						</button>
					)}

					{onOpenEquipmentModal && (
						<button
							type="button"
							onClick={onOpenEquipmentModal}
							style={{ ...BTN_BASE, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #1e293b)" }}
							data-testid="equipment-modal-btn"
						>
							<Settings size={13} />
							<span>Оборудование ЦСО</span>
						</button>
					)}

					<button
						type="button"
						onClick={onPrintForm257}
						style={{ ...BTN_BASE, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #1e293b)" }}
						data-testid="print-form-257-btn"
					>
						<Printer size={13} />
						<span>Печать Формы 257/у</span>
					</button>

					<button
						type="button"
						onClick={onExportCsv}
						style={{ ...BTN_BASE, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--muted, #64748b)" }}
						title="Экспорт в CSV"
					>
						<Download size={13} />
						<span>Экспорт</span>
					</button>
				</div>
			</div>
		</div>
	);
};
