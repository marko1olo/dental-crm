import { Clock, X } from "lucide-react";
import React from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";

export interface TelephonyToastHeaderProps {
	isAnswered: boolean;
	isEnded: boolean;
	provider?: string | undefined;
	isConnected: boolean;
	elapsedSeconds: number;
	onDismiss: () => void;
}

export function TelephonyToastHeader({
	isAnswered,
	isEnded,
	provider,
	isConnected,
	elapsedSeconds,
	onDismiss,
}: TelephonyToastHeaderProps): React.JSX.Element {
	return (
		<div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--line,#e2e8f0)]">
			<div className="flex items-center gap-2 min-w-0">
				<span className="relative flex h-2.5 w-2.5 shrink-0">
					<span
						className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
							isAnswered ? "bg-teal-400" : "bg-emerald-400"
						}`}
					/>
					<span
						className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
							isAnswered ? "bg-teal-500" : "bg-emerald-500"
						}`}
					/>
				</span>
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)] shrink-0">
					{isEnded ? "Завершён" : isAnswered ? "Разговор" : "Входящий звонок"}
				</span>
				<span
					className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,#99f6e4)] shrink-0"
					title={`Провайдер телефонии: ${provider || "АТС"}`}
				>
					{(provider || "АТС").toUpperCase()}
				</span>
				<span
					className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`}
					title={isConnected ? "Телефония онлайн" : "Подключение..."}
				/>
			</div>

			<div className="flex items-center gap-1 shrink-0">
				<div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f1f5f9)] px-2 py-0.5 rounded-md border border-[var(--line,#e2e8f0)]">
					<Clock size={11} className="text-[var(--teal,#0d9488)]" />
					<span>{formatDurationTimer(elapsedSeconds)}</span>
				</div>

				<button
					type="button"
					onClick={onDismiss}
					className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted,#64748b)] hover:text-rose-600 transition-colors"
					title="Закрыть уведомление"
					aria-label="Закрыть уведомление"
					data-testid="toast-action-close"
				>
					<X size={15} />
				</button>
			</div>
		</div>
	);
}
