import type { SterilizationLogRecord } from "@dental/shared";
import { FileSpreadsheet, Plus, Printer, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast.js";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes.js";

export interface AutoclaveToolbarSheetItemsProps {
	readonly logs: SterilizationLogRecord[];
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly isLoggingBatch: boolean;
	readonly onClose: () => void;
	readonly onQuickShiftBatch: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onGenerateMonthlySterilizationLog?: () => void;
	readonly onGenerateMonthlyForm257?: () => void;
	readonly onOpenKraftModal: () => void;
}

export function AutoclaveToolbarSheetItems({
	logs, clinicDevices, isLoggingBatch, onClose,
	onQuickShiftBatch, onPrintBatchPouches, onOpenEquipmentModal,
	onOpenNewCycleModal, onGenerateMonthlySterilizationLog, onGenerateMonthlyForm257, onOpenKraftModal,
}: AutoclaveToolbarSheetItemsProps) {
	const handleMonthlyLog = onGenerateMonthlySterilizationLog || onGenerateMonthlyForm257 || (() => {});
	return (
		<>
			<button
				type="button" onClick={() => { onClose(); onQuickShiftBatch(); }}
				aria-busy={isLoggingBatch} className="sanpin-bottom-sheet-item"
				data-testid="sheet-quick-shift-batch-btn"
			>
				<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
				<div className="flex flex-col text-left">
					<span className="font-bold text-sm">Провести цикл автоклавирования на смену</span>
					<span className="text-xs text-[var(--muted)]">134°C, 2.1 бар, 5 мин • норма</span>
				</div>
			</button>

			<button
				type="button" onClick={() => {
					onClose();
					if (logs.length > 0 && logs[0]) onPrintBatchPouches(logs[0], 10);
					else showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
				}}
				className="sanpin-bottom-sheet-item" data-testid="sheet-batch-labels-btn"
			>
				<Printer size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
				<div className="flex flex-col text-left">
					<span className="font-bold text-sm">Печать пачки наклеек (10 шт.)</span>
					<span className="text-xs text-[var(--muted)]">Готовы к маркировке (срок 30 дней)</span>
				</div>
			</button>

			<button
				type="button" onClick={() => { onClose(); onOpenEquipmentModal(); }}
				className="sanpin-bottom-sheet-item" data-testid="sheet-equipment-fleet-btn"
			>
				<ShieldCheck size={18} className="text-blue-600 shrink-0" />
				<div className="flex flex-col text-left">
					<span className="font-bold text-sm">Парк оборудования ({clinicDevices.length} аппаратов)</span>
					<span className="text-xs text-[var(--muted)]">Паспорта, поверка и ТО</span>
				</div>
			</button>

			{onOpenNewCycleModal && (
				<button
					type="button" onClick={() => { onClose(); onOpenNewCycleModal(); }}
					className="sanpin-bottom-sheet-item" data-testid="sheet-manual-cycle-entry-btn"
				>
					<Plus size={18} className="text-sky-600 shrink-0" />
					<div className="flex flex-col text-left">
						<span className="font-bold text-sm">Внести цикл с параметрами</span>
						<span className="text-xs text-[var(--muted)]">Контрольные точки КТ-1..5</span>
					</div>
				</button>
			)}

			<button
				type="button" onClick={() => { onClose(); handleMonthlyLog(); }}
				className="sanpin-bottom-sheet-item" data-testid="sheet-monthly-journal-btn"
			>
				<FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
				<div className="flex flex-col text-left">
					<span className="font-bold text-sm">Журнал работы стерилизаторов за месяц</span>
					<span className="text-xs text-[var(--muted)]">Готовая сводная печать для проверок</span>
				</div>
			</button>

			<button
				type="button" onClick={() => { onClose(); onOpenKraftModal(); }}
				className="sanpin-bottom-sheet-item" data-testid="sheet-kraft-studio-btn"
			>
				<QrCode size={18} className="text-purple-600 shrink-0" />
				<div className="flex flex-col text-left">
					<span className="font-bold text-sm">Маркировка крафт-пакетов</span>
					<span className="text-xs text-[var(--muted)]">Студия генерации штрихкодов</span>
				</div>
			</button>
		</>
	);
}
