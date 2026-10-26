import React from "react";
import { RefreshCw, Smartphone } from "lucide-react";

export interface LanTelemetryStatusProps {
	readonly pingMs: number | null;
	readonly connectedPeersCount: number;
	readonly formattedTime: string;
	readonly isRefreshing: boolean;
	readonly onRefresh: () => void;
}

export const LanTelemetryStatus: React.FC<LanTelemetryStatusProps> = ({
	pingMs,
	connectedPeersCount,
	formattedTime,
	isRefreshing,
	onRefresh,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2 text-xs">
			<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
				<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
				<span>LAN готов</span>
			</div>

			{pingMs !== null && (
				<div className="flex items-center gap-1 text-[var(--muted,#64748b)]">
					<span>Пинг:</span>
					<span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
						{`${pingMs} мс`}
					</span>
				</div>
			)}

			<div className="flex items-center gap-1 text-[var(--muted,#64748b)]">
				<Smartphone className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
				<span>Подключено:</span>
				<span className="font-mono font-semibold text-[var(--ink,#0f172a)]">
					{connectedPeersCount}
				</span>
			</div>

			<div className="text-[var(--muted,#64748b)] flex items-center gap-1">
				<span>QR активен:</span>
				<span className="font-mono text-[var(--ink,#0f172a)] font-medium">
					{formattedTime}
				</span>
			</div>

			<button
				type="button"
				onClick={onRefresh}
				data-testid="lan-qr-refresh-btn"
				className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--teal,#0d9488)] hover:bg-[var(--paper-card,#f1f5f9)] transition-colors flex items-center justify-center cursor-pointer"
				title="Обновить QR-код"
				aria-label="Обновить QR-код"
			>
				<RefreshCw
					className={`w-4 h-4 ${
						isRefreshing ? "animate-spin text-[var(--teal,#0d9488)]" : ""
					}`}
				/>
			</button>
		</div>
	);
};
