import { Radio, RefreshCw, ShieldCheck } from "lucide-react";
import React from "react";

interface Props {
	connectedCount: number;
	pendingCount: number;
	unconfiguredCount: number;
	isLoading: boolean;
	onRefresh: () => void;
}

export const MessengersOverviewHeader: React.FC<Props> = ({
	connectedCount,
	pendingCount,
	unconfiguredCount,
	isLoading,
	onRefresh,
}) => {
	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[var(--teal)] flex items-center justify-center shrink-0">
					<Radio size={20} />
				</div>
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="font-bold text-base leading-tight text-[var(--ink)] m-0">
							Центр каналов связи и оповещений
						</h3>
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-[var(--line)]">
							<ShieldCheck size={12} className="text-emerald-500" />
							<span>Защита данных</span>
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
						Telegram-бот, WhatsApp, SMS и рассылки для пациентов и врачей клиники
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-semibold">
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
						<span>{connectedCount} Онлайн</span>
					</span>
					{pendingCount > 0 && (
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
							<span className="w-2 h-2 rounded-full bg-amber-500" />
							<span>{pendingCount} Ожидает</span>
						</span>
					)}
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
						<span className="w-2 h-2 rounded-full bg-slate-400" />
						<span>{unconfiguredCount} Откл.</span>
					</span>
				</div>

				<button
					type="button"
					onClick={onRefresh}
					className="p-2 rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper-soft)] cursor-pointer"
					title="Обновить статусы каналов"
				>
					<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
				</button>
			</div>
		</div>
	);
};
