import React from "react";

export interface BactericidalMobileCardsProps {
	readonly logs: any[];
	readonly loading: boolean;
}

export function BactericidalMobileCards({ logs, loading }: BactericidalMobileCardsProps) {
	return (
		<div className="md:hidden flex flex-col gap-3 p-1.5" data-testid="bactericidal-mobile-cards-container">
			{loading ? (
				<div className="sanpin-mobile-card p-6 text-center text-sm text-[var(--muted)]">
					Загрузка журнала сеансов...
				</div>
			) : logs.length === 0 ? (
				<div className="sanpin-mobile-card p-6 text-center text-sm text-[var(--muted)]">
					Сеансы бактерицидной обработки не зафиксированы.
				</div>
			) : (
				logs.map((log) => (
					<div
						key={log.id}
						className="sanpin-mobile-card touch-manipulation"
						data-testid={`bactericidal-session-card-${log.id}`}
					>
						<div className="sanpin-mobile-card-header">
							<div className="flex items-baseline gap-2">
								<span className="text-sm font-extrabold text-[var(--ink)] tracking-tight">
									{log.date}
								</span>
								<span className="text-xs text-[var(--muted)]">
									{new Date(log.sessionStartTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									{" — "}
									{new Date(log.sessionEndTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
								</span>
							</div>
							<span className="sanpin-tag sanpin-tag-success shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5">
								{log.durationMinutes} мин ({log.durationHours} ч)
							</span>
						</div>

						<div className="sanpin-mobile-card-body">
							<div className="font-semibold text-sm text-[var(--ink)]">{log.roomName}</div>
							<div className="text-xs text-[var(--muted)]">
								{log.deviceBrand} (№{log.serialNumber})
							</div>

							<div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--line-subtle,#e2e8f0)] text-xs">
								<span className="sanpin-tag sanpin-tag-neutral">
									{log.operatingMode === "continuous_presence"
										? "В присутствии людей"
										: log.operatingMode === "pre_op_preparation"
											? "Предоперационная подготовка"
											: log.operatingMode === "post_cleaning"
												? "Заключительная после уборки"
												: "Периодический"}
								</span>
								<div>
									<span className="text-[var(--muted)]">Наработка: </span>
									<strong className="text-sm text-[var(--brand-primary)]">{log.cumulativeHoursAfterSession} ч</strong>
								</div>
							</div>

							<div className="text-xs text-[var(--muted)] mt-1.5">
								Ответственный: <span className="text-[var(--ink)] font-medium">{log.operatorName || "Медсестра кабинета"}</span>
							</div>
						</div>
					</div>
				))
			)}
		</div>
	);
}
