/**
 * apps/web/src/components/billing/sbp/SbpQrStateBanners.tsx
 *
 * Success, expired and failure state displays for SbpDynamicQrCard.
 * Machine identifiers are never shown: the cashier thinks in roubles and
 * patient names, not in operation hashes.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CheckCircle2, Clock, RefreshCw, WifiOff, Loader2 } from "lucide-react";

interface SbpQrPaidBannerProps {
	readonly sumRub: number;
}

export const SbpQrPaidBanner: React.FC<SbpQrPaidBannerProps> = ({ sumRub }) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--success,#22c55e)]/40 bg-[var(--ok-bg,rgba(74,222,128,0.15))] flex items-center justify-between gap-3 animate-in zoom-in-95 duration-150">
			<div className="flex items-center gap-2.5">
				<div className="w-9 h-9 rounded-full bg-[var(--ok-fg,#16a34a)] text-white flex items-center justify-center shrink-0">
					<CheckCircle2 size={20} />
				</div>
				<div>
					<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
						Оплата по СБП принята
					</div>
					<div className="text-xs text-[var(--ink-muted,#475569)] font-mono">
						Сумма: {sumRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>
			<div className="text-xs font-bold text-[var(--success,#15803d)] px-2.5 py-1 rounded-full bg-[var(--paper-strong,#ffffff)] border border-[var(--success,#22c55e)]/30" data-testid="btn-sbp-paid-badge">
				Оплачено
			</div>
		</div>
	);
};

interface SbpQrExpiredBannerProps {
	readonly onRefresh: () => void;
}

export const SbpQrExpiredBanner: React.FC<SbpQrExpiredBannerProps> = ({ onRefresh }) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--warning,#d97706)]/30 bg-[var(--warn-bg,#fef3c7)] flex flex-col items-center justify-center gap-3 text-center">
			<div className="w-10 h-10 rounded-full bg-[var(--warn-bg,#fef3c7)] text-[var(--warning,#b45309)] flex items-center justify-center">
				<Clock size={20} />
			</div>
			<div>
				<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
					Время действия QR-кода истекло
				</div>
				<span className="text-xs text-[var(--ink-muted,#475569)]">
					Сформируйте новый код для пациента
				</span>
			</div>
			<button
				type="button"
				onClick={onRefresh}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
				data-testid="btn-sbp-refresh"
			>
				<RefreshCw size={14} />
				<span>Сформировать новый QR</span>
			</button>
		</div>
	);
};

interface SbpQrUnavailableBannerProps {
	readonly messageRu: string;
	readonly onRefresh: () => void;
}

export const SbpQrUnavailableBanner: React.FC<SbpQrUnavailableBannerProps> = ({ messageRu, onRefresh }) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--danger,#ef4444)]/30 bg-[var(--bad-bg,#fee2e2)] flex flex-col items-center justify-center gap-3 text-center">
			<div className="w-10 h-10 rounded-full bg-[var(--bad-bg,#fee2e2)] text-[var(--danger,#b91c1c)] flex items-center justify-center">
				<WifiOff size={20} />
			</div>
			<div>
				<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
					QR-код сейчас не сформирован
				</div>
				<span className="text-xs text-[var(--ink-muted,#475569)]">{messageRu}</span>
			</div>
			<button
				type="button"
				onClick={onRefresh}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
				data-testid="btn-sbp-retry"
			>
				<RefreshCw size={14} />
				<span>Повторить попытку</span>
			</button>
		</div>
	);
};

interface SbpQrLoadingStateProps {
	readonly sumRub: number;
}

export const SbpQrLoadingState: React.FC<SbpQrLoadingStateProps> = ({ sumRub }) => {
	return (
		<div className="flex flex-col sm:flex-row items-center gap-4" data-testid="sbp-qr-loading">
			<div className="shrink-0 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center" style={{ width: "176px", height: "176px" }}>
				<Loader2 size={28} className="animate-spin text-[var(--muted,#64748b)]" />
			</div>
			<div className="flex-1 space-y-1 min-w-0 text-center sm:text-left">
				<div className="text-[11px] font-bold text-[var(--muted,#64748b)]">Сумма к оплате</div>
				<div className="text-3xl font-extrabold font-mono text-[var(--ink,#0f172a)] tracking-tight" data-testid="sbp-display-amount">
					{sumRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="text-xs text-[var(--muted,#64748b)]">
					Запрашиваем платёжный код у банка-эквайера...
				</div>
			</div>
		</div>
	);
};
