/**
 * apps/web/src/components/billing/sbp/SbpQrControls.tsx
 *
 * Action buttons for the SBP card: manual confirm (single Primary CTA),
 * status check and copy link (secondary). Amount stays the visual anchor.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Check, RefreshCw, Copy } from "lucide-react";

interface SbpQrControlsProps {
	readonly sumRub: number;
	readonly sbpCheckMessage: string | null;
	readonly isCheckingSbp: boolean;
	readonly isCopied: boolean;
	readonly hideManualConfirm: boolean;
	readonly onManualConfirm: () => void;
	readonly onPollStatus: () => void;
	readonly onCopyLink: () => void;
}

export const SbpQrControls: React.FC<SbpQrControlsProps> = ({
	sumRub,
	sbpCheckMessage,
	isCheckingSbp,
	isCopied,
	hideManualConfirm,
	onManualConfirm,
	onPollStatus,
	onCopyLink,
}) => {
	return (
		<div className="flex-1 flex flex-col justify-between gap-3 text-center sm:text-left min-w-0">
			<div className="space-y-1">
				<div className="text-[11px] font-bold text-[var(--muted,#64748b)]">Сумма к оплате</div>
				<div className="text-3xl font-extrabold font-mono text-[var(--ink,#0f172a)] tracking-tight" data-testid="sbp-display-amount">
					{sumRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] leading-tight">
					Пациент сканирует код камерой или приложением любого банка
				</div>
			</div>

			{sbpCheckMessage && (
				<div className="text-[11px] font-medium text-[var(--ink-muted,#475569)]">{sbpCheckMessage}</div>
			)}

			<div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
				{!hideManualConfirm && (
					<button
						type="button"
						onClick={onManualConfirm}
						className="w-full sm:flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
						data-testid="btn-confirm-sbp-payment"
						title="Подтвердить зачисление средств на расчётный счёт клиники. Быстрое подтверждение — клавишей Enter"
					>
						<Check size={15} className="stroke-[2.5]" />
						<span className="truncate">Деньги поступили на счёт клиники</span>
						<kbd className="hidden md:inline-block ml-1 px-1 py-0.5 text-[9px] font-mono bg-black/25 rounded border border-white/30">Enter</kbd>
					</button>
				)}

				<button
					type="button"
					onClick={onPollStatus}
					className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
					data-testid="btn-check-sbp-status"
					title="Проверить зачисление через сервер кассы"
				>
					<RefreshCw size={13} className={isCheckingSbp ? "animate-spin" : ""} />
					<span>Проверить зачисление</span>
				</button>

				<button
					type="button"
					onClick={onCopyLink}
					className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
					data-testid="btn-copy-sbp-link"
					title="Скопировать ссылку СБП"
				>
					{isCopied ? (
						<>
							<Check size={13} className="text-[var(--success,var(--emerald,#16a34a))]" />
							<span>Скопировано</span>
						</>
					) : (
						<>
							<Copy size={13} className="text-[var(--muted,#64748b)]" />
							<span>Ссылка СБП</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};
