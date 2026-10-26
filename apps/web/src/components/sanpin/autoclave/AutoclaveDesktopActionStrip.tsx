import type { SterilizationLogRecord } from "@dental/shared";
import { Printer, ShieldCheck, Sparkles } from "lucide-react";
import type React from "react";
import { showToast } from "../../GlobalToast.js";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes.js";
import { AutoclaveToolbarMoreMenu } from "./AutoclaveToolbarMoreMenu.js";

export interface AutoclaveDesktopActionStripProps {
	readonly deviceFilter: string;
	readonly setDeviceFilter: (f: string) => void;
	readonly clinicDevices: readonly ClinicAutoclaveDevice[];
	readonly logs: readonly SterilizationLogRecord[];
	readonly isLoggingBatch: boolean;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onQuickShiftBatch: () => void;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onGenerateMonthlyAutoclaveLog?: () => void;
	readonly onGenerateMonthlySterilizationLog?: () => void;
	readonly onGenerateMonthlyForm257?: () => void;
	readonly onOpenAutoclaveLogModal?: () => void;
	readonly onOpenSterilizationLogModal?: () => void;
	readonly onOpenJournal257Modal?: () => void;
}

export const AutoclaveDesktopActionStrip: React.FC<AutoclaveDesktopActionStripProps> = ({
	deviceFilter, setDeviceFilter, clinicDevices, logs, isLoggingBatch,
	onOpenEquipmentModal, onPrintBatchPouches, onQuickShiftBatch,
	onOpenNewCycleModal, onGenerateMonthlyAutoclaveLog, onGenerateMonthlySterilizationLog, onGenerateMonthlyForm257,
	onOpenAutoclaveLogModal, onOpenSterilizationLogModal, onOpenJournal257Modal,
}) => {
	const handleMonthlyLog = onGenerateMonthlyAutoclaveLog || onGenerateMonthlySterilizationLog || onGenerateMonthlyForm257 || (() => {});
	const handleOpenLogModal = onOpenAutoclaveLogModal || onOpenSterilizationLogModal || onOpenJournal257Modal || (() => {});
	return (
		<div className="hidden md:flex items-center gap-2 shrink-0 flex-nowrap">
			<select
				value={deviceFilter}
				onChange={(e) => setDeviceFilter(e.target.value)}
				className="sanpin-select shrink-0 whitespace-nowrap text-xs rounded-lg px-2 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
				style={{ minHeight: "32px", height: "32px" }}
			>
				<option value="all">Все циклы (Норма)</option>
				<option value="passed">Стерильно (Норма)</option>
			</select>

			<button
				type="button"
				onClick={onOpenEquipmentModal}
				className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
				style={{
					minHeight: "32px", height: "32px", padding: "0.2rem 0.6rem", fontSize: "0.75rem",
					fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem", borderRadius: "8px",
				}}
				data-testid="autoclave-equipment-btn"
				title="Управление парком автоклавов и стерилизаторов клиники"
			>
				<ShieldCheck size={13} color="var(--teal, #0d9488)" className="shrink-0" />
				<span className="shrink-0 whitespace-nowrap">Оборудование ({clinicDevices.length})</span>
			</button>

			<button
				type="button"
				onClick={() => {
					if (logs.length > 0 && logs[0]) onPrintBatchPouches(logs[0], 10);
					else showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
				}}
				className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
				style={{
					minHeight: "32px", height: "32px", padding: "0.2rem 0.6rem", fontSize: "0.75rem",
					fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem", borderRadius: "8px",
				}}
				title="Печать пачки из 10 наклеек крафт-пакетов (срок 30 дней)"
				data-testid="autoclave-quick-batch-labels-btn"
			>
				<Printer size={13} className="shrink-0 text-[var(--muted,#64748b)]" />
				<span className="shrink-0 whitespace-nowrap">Наклейки (10 шт.)</span>
			</button>

			{/* Ровно ОДНА Primary CTA изумрудная кнопка (Мандат 8am) */}
			<button
				type="button"
				onClick={onQuickShiftBatch}
				aria-busy={isLoggingBatch}
				className="primary-button sanpin-btn sanpin-btn-primary touch-manipulation shrink-0 whitespace-nowrap bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs"
				style={{
					minHeight: "32px", height: "32px", padding: "0.2rem 0.8rem", fontSize: "0.75rem",
					fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem", borderRadius: "8px",
					border: "none", color: "#ffffff",
				}}
				data-testid="sanpin-autoclave-new-cycle-btn"
				title="Зафиксировать цикл автоклавирования на смену (134°C, 2.15 бар, норма очистки, списание со склада)"
			>
				<Sparkles size={13} className="shrink-0 text-white" />
				<span className="shrink-0 whitespace-nowrap text-white">
					{isLoggingBatch ? "Фиксация цикла..." : "Зафиксировать автоклавирование смены"}
				</span>
			</button>

			<AutoclaveToolbarMoreMenu
				onOpenNewCycleModal={onOpenNewCycleModal}
				onGenerateMonthlySterilizationLog={handleMonthlyLog}
				onGenerateMonthlyForm257={handleMonthlyLog}
				onOpenSterilizationLogModal={handleOpenLogModal}
				onOpenJournal257Modal={handleOpenLogModal}
			/>
		</div>
	);
};
