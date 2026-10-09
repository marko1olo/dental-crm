import type { SterilizationLogRecord } from "@dental/shared";
import {
	Award,
	FileSpreadsheet,
	Plus,
	Printer,
	QrCode,
	ShieldCheck,
	Sparkles,
	Tag,
	X,
} from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../GlobalToast";
import type { ClinicAutoclaveDevice } from "../AutoclaveEquipmentModal";

export interface AutoclaveMobileActionSheetProps {
	readonly isToolbarSheetOpen: boolean;
	readonly onCloseToolbarSheet: () => void;
	readonly logs: SterilizationLogRecord[];
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly isLoggingBatch: boolean;
	readonly onQuickShiftBatch: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onOpenNewCycleModal?: () => void;
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenKraftModal: () => void;
	readonly selectedLogForSheet: SterilizationLogRecord | null;
	readonly onCloseCycleSheet: () => void;
	readonly stampedRows: Record<string, boolean>;
	readonly onStampVerification: (logId: string) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileActionSheet({
	isToolbarSheetOpen,
	onCloseToolbarSheet,
	logs,
	clinicDevices,
	isLoggingBatch,
	onQuickShiftBatch,
	onPrintBatchPouches,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
	onGenerateMonthlyForm257,
	onOpenKraftModal,
	selectedLogForSheet,
	onCloseCycleSheet,
	stampedRows,
	onStampVerification,
	onPrintSinglePouch,
	onOpenKraftForLog,
}: AutoclaveMobileActionSheetProps) {
	if (typeof document === "undefined") {
		return null;
	}

	return (
		<>
			{/* =========================================================================
			    APPLE HIG MOBILE BOTTOM SHEET 1: Toolbar Actions
			    ========================================================================= */}
			{isToolbarSheetOpen &&
				createPortal(
					<div
						className="sanpin-bottom-sheet-backdrop"
						onClick={onCloseToolbarSheet}
						role="dialog"
						aria-modal="true"
						aria-label="Панель действий автоклава"
					>
						<div
							className="sanpin-bottom-sheet"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="sanpin-bottom-sheet-handle" />

							<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
								<h3 className="text-base font-bold text-ink m-0">Действия автоклава</h3>
								<button
									type="button"
									onClick={onCloseToolbarSheet}
									className="sanpin-touch-btn p-1.5 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer"
									style={{
										minHeight: "44px",
										minWidth: "44px",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
									}}
									aria-label="Закрыть шторку"
								>
									<X size={20} />
								</button>
							</div>

							{/* Primary: Quick shift batch */}
							<button
								type="button"
								onClick={() => {
									onCloseToolbarSheet();
									onQuickShiftBatch();
								}}
								aria-busy={isLoggingBatch}
								className="sanpin-bottom-sheet-item"
								data-testid="sheet-quick-shift-batch-btn"
							>
								<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Зафиксировать цикл смены</span>
									<span className="text-xs text-[var(--muted)]">134°C, 2.1 бар, 5 мин • 100% норма</span>
								</div>
							</button>

							{/* Batch pouch labels */}
							<button
								type="button"
								onClick={() => {
									onCloseToolbarSheet();
									if (logs.length > 0 && logs[0]) {
										onPrintBatchPouches(logs[0], 10);
									} else {
										showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
									}
								}}
								className="sanpin-bottom-sheet-item"
								data-testid="sheet-batch-labels-btn"
							>
								<Printer size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Печать пачки наклеек (10 шт.)</span>
									<span className="text-xs text-[var(--muted)]">Готовы к маркировке (срок 30 дней)</span>
								</div>
							</button>

							{/* Autoclaves Equipment */}
							<button
								type="button"
								onClick={() => {
									onCloseToolbarSheet();
									onOpenEquipmentModal();
								}}
								className="sanpin-bottom-sheet-item"
								data-testid="sheet-equipment-fleet-btn"
							>
								<ShieldCheck size={18} className="text-blue-600 shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Парк оборудования ({clinicDevices.length} аппаратов)</span>
									<span className="text-xs text-[var(--muted)]">Паспорта, поверка и ТО</span>
								</div>
							</button>

							{/* Manual Entry */}
							{onOpenNewCycleModal && (
								<button
									type="button"
									onClick={() => {
										onCloseToolbarSheet();
										onOpenNewCycleModal();
									}}
									className="sanpin-bottom-sheet-item"
									data-testid="sheet-manual-cycle-entry-btn"
								>
									<Plus size={18} className="text-sky-600 shrink-0" />
									<div className="flex flex-col text-left">
										<span className="font-bold text-sm">Внести цикл с параметрами</span>
										<span className="text-xs text-[var(--muted)]">Контрольные точки КТ-1..5</span>
									</div>
								</button>
							)}

							{/* Monthly Form 257 */}
							<button
								type="button"
								onClick={() => {
									onCloseToolbarSheet();
									onGenerateMonthlyForm257();
								}}
								className="sanpin-bottom-sheet-item"
								data-testid="sheet-monthly-journal-btn"
							>
								<FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Журнал работы стерилизаторов за месяц</span>
									<span className="text-xs text-[var(--muted)]">Готовая сводная печать для проверок</span>
								</div>
							</button>

							{/* Kraft Barcode Studio */}
							<button
								type="button"
								onClick={() => {
									onCloseToolbarSheet();
									onOpenKraftModal();
								}}
								className="sanpin-bottom-sheet-item"
								data-testid="sheet-kraft-studio-btn"
							>
								<QrCode size={18} className="text-purple-600 shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Маркировка крафт-пакетов</span>
									<span className="text-xs text-[var(--muted)]">Студия генерации штрихкодов</span>
								</div>
							</button>

							{/* Close CTA */}
							<button
								type="button"
								onClick={onCloseToolbarSheet}
								className="w-full min-h-[48px] h-12 mt-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink font-bold text-sm border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer"
							>
								Закрыть
							</button>
						</div>
					</div>,
					document.body
				)}

			{/* =========================================================================
			    APPLE HIG MOBILE BOTTOM SHEET 2: Specific Cycle Card Actions
			    ========================================================================= */}
			{selectedLogForSheet &&
				createPortal(
					<div
						className="sanpin-bottom-sheet-backdrop"
						onClick={onCloseCycleSheet}
						role="dialog"
						aria-modal="true"
						aria-label={`Опции цикла №${selectedLogForSheet.cycleNumber}`}
					>
						<div
							className="sanpin-bottom-sheet"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="sanpin-bottom-sheet-handle" />

							<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
								<div>
									<h3 className="text-base font-bold text-ink m-0">Цикл №{selectedLogForSheet.cycleNumber}</h3>
									<span className="text-xs text-[var(--muted)]">{selectedLogForSheet.deviceName || "Автоклав"}</span>
								</div>
								<button
									type="button"
									onClick={onCloseCycleSheet}
									className="sanpin-touch-btn p-1.5 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer"
									style={{
										minHeight: "44px",
										minWidth: "44px",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
									}}
									aria-label="Закрыть"
								>
									<X size={20} />
								</button>
							</div>

							{/* Print Single Label */}
							<button
								type="button"
								onClick={() => {
									const log = selectedLogForSheet;
									onCloseCycleSheet();
									onPrintSinglePouch(log);
								}}
								className="sanpin-bottom-sheet-item"
							>
								<Tag size={18} className="text-[var(--brand-primary,#2563eb)] shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Печать 1 наклейки (58x40 мм)</span>
									<span className="text-xs text-[var(--muted)]">С текущим штрихкодом и датой</span>
								</div>
							</button>

							{/* Print Batch 10 Labels */}
							<button
								type="button"
								onClick={() => {
									const log = selectedLogForSheet;
									onCloseCycleSheet();
									onPrintBatchPouches(log, 10);
								}}
								className="sanpin-bottom-sheet-item"
							>
								<Printer size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Печать пачки 10 шт (30 дней)</span>
									<span className="text-xs text-[var(--muted)]">Для серии упаковок текущего цикла</span>
								</div>
							</button>

							{/* Open in Kraft studio */}
							<button
								type="button"
								onClick={() => {
									const log = selectedLogForSheet;
									onCloseCycleSheet();
									onOpenKraftForLog(log);
								}}
								className="sanpin-bottom-sheet-item"
							>
								<QrCode size={18} className="text-purple-600 shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Открыть в студии термоэтикеток</span>
									<span className="text-xs text-[var(--muted)]">Настройка формата, срока и лотков</span>
								</div>
							</button>

							{/* Stamp ECP */}
							{!(
								stampedRows[selectedLogForSheet.id] ||
								Boolean(selectedLogForSheet.notes?.includes("ЭЦП"))
							) && (
								<button
									type="button"
									onClick={() => {
										const id = selectedLogForSheet.id;
										onCloseCycleSheet();
										onStampVerification(id);
									}}
									className="sanpin-bottom-sheet-item"
								>
									<Award size={18} className="text-blue-600 shrink-0" />
									<div className="flex flex-col text-left">
										<span className="font-bold text-sm">Поставить штамп заверки (ЭЦП)</span>
										<span className="text-xs text-[var(--muted)]">Электронная подпись медсестры ЦСО</span>
									</div>
								</button>
							)}

							{/* Close CTA */}
							<button
								type="button"
								onClick={onCloseCycleSheet}
								className="w-full min-h-[48px] h-12 mt-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink font-bold text-sm border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer"
							>
								Закрыть
							</button>
						</div>
					</div>,
					document.body
				)}
		</>
	);
}
