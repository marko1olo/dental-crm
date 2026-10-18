/**
 * apps/web/src/components/billing/sbp/SbpQrControls.tsx
 *
 * Action buttons for SBP card: manual confirm, poll status, copy link.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Check, RefreshCw, Copy, ShieldCheck } from "lucide-react";

interface SbpQrControlsProps {
	readonly sumRub: number;
	readonly crc16Hex: string;
	readonly sbpCheckMessage: string | null;
	readonly isCheckingSbp: boolean;
	readonly isCopied: boolean;
	readonly onManualConfirm: () => void;
	readonly onPollStatus: () => void;
	readonly onCopyLink: () => void;
}

export const SbpQrControls: React.FC<SbpQrControlsProps> = ({
	sumRub,
	crc16Hex,
	sbpCheckMessage,
	isCheckingSbp,
	isCopied,
	onManualConfirm,
	onPollStatus,
	onCopyLink,
}) => {
	return (
		<div className="flex-1 flex flex-col justify-between gap-3 text-center sm:text-left min-w-0">
			<div className="space-y-1">
				<div className="text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] font-bold">Сумма к оплате</div>
				<div className="text-2xl font-black font-mono text-[var(--ink,#0f172a)] tracking-tight" data-testid="sbp-display-amount">
					{sumRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] leading-tight">
					Пациент открывает камеру смартфона или приложение любого банка
				</div>
			</div>

			{sbpCheckMessage && (
				<div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">{sbpCheckMessage}</div>
			)}

			<div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
				<button
					type="button"
					onClick={onManualConfirm}
					className="w-full sm:flex-1 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
					data-testid="btn-confirm-sbp-payment"
					title="Подтвердить зачисление средств на расчетный счет клиники (Хоткей: Enter)"
				>
					<Check size={15} className="stroke-[2.5]" />
					<span className="truncate">Деньги поступили на счет клиники (ручное подтверждение)</span>
					<kbd className="hidden md:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-emerald-800/60 rounded border border-emerald-500/30">Enter</kbd>
				</button>

				<button
					type="button"
					onClick={onPollStatus}
					className="w-full sm:w-auto h-9 px-3 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
					data-testid="btn-check-sbp-status"
					title="Опросить банковский шлюз СБП"
				>
					<RefreshCw size={13} className={isCheckingSbp ? "animate-spin" : ""} />
					<span>Проверить</span>
				</button>

				<button
					type="button"
					onClick={onCopyLink}
					className="w-full sm:w-auto h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
					data-testid="btn-copy-sbp-link"
					title="Скопировать ссылку СБП"
				>
					{isCopied ? (
						<>
							<Check size={13} className="text-emerald-600" />
							<span className="text-emerald-600">Скопировано</span>
						</>
					) : (
						<>
							<Copy size={13} className="text-[var(--muted,#64748b)]" />
							<span>Ссылка СБП</span>
						</>
					)}
				</button>
			</div>

			<div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono flex items-center justify-center sm:justify-start gap-1">
				<ShieldCheck size={12} className="shrink-0" />
				<span className="truncate">Контрольная сумма CRC16: {crc16Hex}</span>
			</div>
		</div>
	);
};
