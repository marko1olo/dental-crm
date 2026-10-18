/**
 * apps/web/src/components/billing/sbp/SbpQrStateBanners.tsx
 *
 * Success and expired state displays for SbpDynamicQrCard.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";

interface SbpQrPaidBannerProps {
	readonly sumRub: number;
	readonly paymentId: string;
}

export const SbpQrPaidBanner: React.FC<SbpQrPaidBannerProps> = ({ sumRub, paymentId }) => {
	return (
		<div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between gap-3 animate-in zoom-in-95 duration-150">
			<div className="flex items-center gap-2.5">
				<div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
					<CheckCircle2 size={20} />
				</div>
				<div>
					<div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
						Оплата СБП успешно зачислена!
					</div>
					<div className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
						Сумма: {sumRub.toLocaleString("ru-RU")} ₽ • ID: {paymentId.slice(0, 12)}
					</div>
				</div>
			</div>
			<div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full bg-emerald-500/20" data-testid="btn-sbp-paid-badge">
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
		<div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col items-center justify-center gap-3 text-center">
			<div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
				<Clock size={20} />
			</div>
			<div>
				<div className="text-sm font-bold text-amber-900 dark:text-amber-200">
					Время действия динамического QR-кода истекло
				</div>
				<span className="text-xs text-amber-700 dark:text-amber-300">
					Сформируйте новый динамический код для пациента
				</span>
			</div>
			<button
				type="button"
				onClick={onRefresh}
				className="h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
				data-testid="btn-sbp-refresh"
			>
				<RefreshCw size={14} />
				<span>Сформировать новый QR</span>
			</button>
		</div>
	);
};
