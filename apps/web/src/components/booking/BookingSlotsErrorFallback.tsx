import { AlertCircle, Phone, RotateCw, WifiOff } from "lucide-react";
import type React from "react";

export interface BookingSlotsErrorFallbackProps {
	readonly slotError: string;
	readonly onRetry?: (() => void) | undefined;
}

export const BookingSlotsErrorFallback: React.FC<BookingSlotsErrorFallbackProps> = ({
	slotError,
	onRetry,
}) => {
	const isNetworkOrOffline =
		slotError.toLowerCase().includes("интернет") ||
		slotError.toLowerCase().includes("сетев") ||
		slotError.toLowerCase().includes("таймаут") ||
		slotError.toLowerCase().includes("связи") ||
		slotError.toLowerCase().includes("offline") ||
		slotError.toLowerCase().includes("timeout") ||
		slotError.toLowerCase().includes("connection") ||
		slotError.toLowerCase().includes("connect");

	return (
		<div className="dbw-slots-section" aria-live="polite">
			<div
				className="dbw-slots-offline-container text-center p-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20"
				data-testid="slots-offline-fallback"
			>
				<div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
					{isNetworkOrOffline ? <WifiOff size={24} /> : <AlertCircle size={24} />}
				</div>
				<h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
					{isNetworkOrOffline
						? "Связь с сервером клиники временно недоступна"
						: "Не удалось загрузить доступные интервалы"}
				</h4>
				<p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-4">
					{slotError}
				</p>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<a
						href="tel:+78000000000"
						className="primary-button inline-flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm min-h-[44px]"
						data-testid="call-clinic-btn"
					>
						<Phone size={16} />
						<span>Позвонить в клинику</span>
					</a>
					{onRetry && (
						<button
							type="button"
							className="secondary-button inline-flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm min-h-[44px]"
							onClick={onRetry}
							data-testid="retry-slots-btn"
						>
							<RotateCw size={16} />
							<span>Повторить попытку</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
