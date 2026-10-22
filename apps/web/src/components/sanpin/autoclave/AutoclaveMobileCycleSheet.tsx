import type { SterilizationLogRecord } from "@dental/shared";
import { Award, Printer, QrCode, Tag, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

export interface AutoclaveMobileCycleSheetProps {
	readonly selectedLog: SterilizationLogRecord | null;
	readonly onClose: () => void;
	readonly isStamped: boolean;
	readonly onStampVerification: (logId: string) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileCycleSheet({
	selectedLog,
	onClose,
	isStamped,
	onStampVerification,
	onPrintSinglePouch,
	onPrintBatchPouches,
	onOpenKraftForLog,
}: AutoclaveMobileCycleSheetProps) {
	if (!selectedLog || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			className="sanpin-bottom-sheet-backdrop"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={`Опции цикла №${selectedLog.cycleNumber}`}
		>
			<div className="sanpin-bottom-sheet" onClick={(e) => e.stopPropagation()}>
				<div className="sanpin-bottom-sheet-handle" />

				<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
					<div>
						<h3 className="text-base font-bold text-ink m-0">Цикл №{selectedLog.cycleNumber}</h3>
						<span className="text-xs text-[var(--muted)]">{selectedLog.deviceName || "Автоклав"}</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-touch-btn p-1.5 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer"
						style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				<button
					type="button"
					onClick={() => { onClose(); onPrintSinglePouch(selectedLog); }}
					className="sanpin-bottom-sheet-item"
				>
					<Tag size={18} className="text-[var(--brand-primary,#2563eb)] shrink-0" />
					<div className="flex flex-col text-left">
						<span className="font-bold text-sm">Печать 1 наклейки (58x40 мм)</span>
						<span className="text-xs text-[var(--muted)]">С текущим штрихкодом и датой</span>
					</div>
				</button>

				<button
					type="button"
					onClick={() => { onClose(); onPrintBatchPouches(selectedLog, 10); }}
					className="sanpin-bottom-sheet-item"
				>
					<Printer size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
					<div className="flex flex-col text-left">
						<span className="font-bold text-sm">Печать пачки 10 шт (30 дней)</span>
						<span className="text-xs text-[var(--muted)]">Для серии упаковок текущего цикла</span>
					</div>
				</button>

				<button
					type="button"
					onClick={() => { onClose(); onOpenKraftForLog(selectedLog); }}
					className="sanpin-bottom-sheet-item"
				>
					<QrCode size={18} className="text-purple-600 shrink-0" />
					<div className="flex flex-col text-left">
						<span className="font-bold text-sm">Открыть в студии термоэтикеток</span>
						<span className="text-xs text-[var(--muted)]">Настройка формата, срока и лотков</span>
					</div>
				</button>

				{!isStamped && (
					<button
						type="button"
						onClick={() => { onClose(); onStampVerification(selectedLog.id); }}
						className="sanpin-bottom-sheet-item"
					>
						<Award size={18} className="text-blue-600 shrink-0" />
						<div className="flex flex-col text-left">
							<span className="font-bold text-sm">Поставить штамп заверки (ЭЦП)</span>
							<span className="text-xs text-[var(--muted)]">Электронная подпись медсестры ЦСО</span>
						</div>
					</button>
				)}

				<button
					type="button"
					onClick={onClose}
					className="w-full min-h-[48px] h-12 mt-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink font-bold text-sm border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer"
				>
					Закрыть
				</button>
			</div>
		</div>,
		document.body
	);
}
