import type { GeneralCleaningLog } from "@dental/shared";
import { CheckCircle2, UserCheck } from "lucide-react";
import React from "react";

export interface GeneralCleaningMobileCardsProps {
	readonly logs: readonly GeneralCleaningLog[];
	readonly loading: boolean;
	readonly onVerify: (id: string) => void;
}

export function GeneralCleaningMobileCards({
	logs,
	loading,
	onVerify,
}: GeneralCleaningMobileCardsProps) {
	return (
		<div className="md:hidden flex flex-col gap-3 p-1.5" data-testid="cleaning-mobile-cards-container">
			{loading ? (
				<div className="sanpin-mobile-card p-6 text-center text-sm text-[var(--muted)]">
					Загрузка журнала генеральных уборок...
				</div>
			) : logs.length === 0 ? (
				<div className="sanpin-mobile-card p-6 text-center text-sm text-[var(--muted)]">
					Записи генеральных уборок не найдены.
				</div>
			) : (
				logs.map((log) => (
					<div
						key={log.id}
						className="sanpin-mobile-card touch-manipulation"
						data-testid={`cleaning-log-card-${log.id}`}
					>
						<div className="sanpin-mobile-card-header">
							<div className="flex items-baseline gap-2">
								<span className="text-sm font-extrabold text-[var(--ink)] tracking-tight">
									{log.scheduledDate}
								</span>
								<span className="sanpin-tag sanpin-tag-neutral text-xs">
									{log.cleaningType === "general" ? "Генеральная" : "Текущая"}
								</span>
							</div>
							{log.status === "verified_by_inspector" ? (
								<span className="sanpin-tag sanpin-tag-success shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5">
									<CheckCircle2 size={12} /> Проверено
								</span>
							) : (
								<button
									type="button"
									onClick={() => onVerify(log.id)}
									className="sanpin-btn sanpin-btn-secondary min-h-[44px] h-11 px-3 text-xs font-bold inline-flex items-center gap-1.5 rounded-lg touch-manipulation cursor-pointer"
									data-testid={`cleaning-verify-btn-${log.id}`}
								>
									<UserCheck size={14} /> <span>Заверить</span>
								</button>
							)}
						</div>

						<div className="sanpin-mobile-card-body">
							<div className="font-semibold text-sm text-[var(--ink)]">
								{log.roomName} <span className="text-xs text-[var(--muted)] font-normal">({log.treatedAreaM2} м²)</span>
							</div>

							<div className="mt-1.5 text-xs text-[var(--ink)]">
								<span className="text-[var(--muted)]">Дезсредство: </span>
								<strong>{log.disinfectantName}</strong> ({log.solutionConcentrationPercent}%, {log.exposureTimeMinutes} мин)
							</div>

							<div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--line-subtle,#e2e8f0)] text-xs">
								<div>
									<span className="text-[var(--muted)]">УФ: </span>
									<strong className="text-[var(--brand-primary)]">{log.uvIrradiationMinutes} мин</strong>
									<span className="text-[var(--muted)] ml-2">Проветривание: </span>
									<strong>{log.ventilationMinutes} мин</strong>
								</div>
								<div className="text-[var(--muted)]">
									Факт: {new Date(log.actualDateTime).toLocaleDateString("ru-RU")}
								</div>
							</div>

							<div className="text-xs text-[var(--muted)] mt-1.5">
								Исполнитель: <span className="text-[var(--ink)] font-medium">{log.operatorName || "Санитарка / Медсестра"}</span>
							</div>
						</div>
					</div>
				))
			)}
		</div>
	);
}
