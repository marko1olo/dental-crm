import type { SterilizationLogRecord } from "@dental/shared";
import {
	Award,
	CheckCircle2,
	Gauge,
	MoreHorizontal,
	Plus,
	Printer,
	QrCode,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React from "react";
import type { ClinicAutoclaveDevice } from "../AutoclaveEquipmentModal";
import type { AutoclaveLogsSlice } from "./types";
import { getPackagingLabel } from "./types";

export interface AutoclaveMobileCardsProps {
	readonly logsSlice: AutoclaveLogsSlice;
	readonly filteredLogs: SterilizationLogRecord[];
	readonly loading: boolean;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly stampedRows: Record<string, boolean>;
	readonly isLoggingBatch: boolean;
	readonly onStampVerification: (logId: string) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onQuickShiftBatch: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onSelectLogForSheet: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileCards({
	logsSlice,
	filteredLogs,
	loading,
	clinicDevices,
	stampedRows,
	isLoggingBatch,
	onStampVerification,
	onOpenEquipmentModal,
	onPrintSinglePouch,
	onQuickShiftBatch,
	onOpenKraftModal,
	onSelectLogForSheet,
}: AutoclaveMobileCardsProps) {
	return (
		<div
			className="md:hidden flex flex-col gap-3 p-1.5"
			data-testid="autoclave-mobile-cards-container"
		>
			{loading ? (
				<div className="sanpin-mobile-card text-center p-6 text-sm text-[var(--muted)]">
					Загрузка журнала стерилизаторов...
				</div>
			) : clinicDevices.length === 0 ? (
				<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
					<ShieldCheck size={38} className="text-[var(--brand-primary,#2563eb)]" />
					<div className="font-bold text-base text-ink">В клинике не зарегистрировано автоклавов</div>
					<p className="text-xs text-[var(--muted)] leading-relaxed">
						Зарегистрируйте автоклав клиники для ведения журнала стерилизации и формирования
						крафт-пакетов.
					</p>
					<button
						type="button"
						onClick={onOpenEquipmentModal}
						className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
						data-testid="add-first-autoclave-mobile-btn"
					>
						<Plus size={16} /> <span>Зарегистрировать автоклав</span>
					</button>
				</div>
			) : filteredLogs.length === 0 ? (
				<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
					<Sparkles size={34} className="text-[var(--brand-primary,#2563eb)]" />
					<div className="font-bold text-base text-ink">Журнал стерилизации пуст</div>
					<p className="text-xs text-[var(--muted)] leading-relaxed">
						В выбранном периоде нет записей циклов стерилизации.
					</p>
					<div className="flex flex-col gap-2 w-full pt-1">
						<button
							type="button"
							onClick={onQuickShiftBatch}
							aria-busy={isLoggingBatch}
							className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
						>
							<Plus size={16} /> <span>Зафиксировать цикл смены</span>
						</button>
						<button
							type="button"
							onClick={onOpenKraftModal}
							className="sanpin-btn sanpin-btn-secondary w-full min-h-[44px] h-11 text-xs font-semibold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
						>
							<QrCode size={16} /> <span>Печать крафт-пакетов</span>
						</button>
					</div>
				</div>
			) : (
				logsSlice.visibleItems.map((log) => {
					const isStamped =
						stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
					const rawDate =
						log.timestamp || (log as any).date || (log as any).createdAt;
					const safeDate =
						rawDate && !isNaN(new Date(rawDate).getTime())
							? new Date(rawDate)
							: new Date();
					const deviceName =
						log.deviceName || (log as any).sterilizerName || "Автоклав B-класса";
					const packagingName = getPackagingLabel(log.packagingType);

					return (
						<div
							key={log.id}
							className="sanpin-mobile-card touch-manipulation"
							data-testid={`autoclave-cycle-card-${log.id}`}
						>
							{/* Header: Cycle number, time and Status Badge */}
							<div className="sanpin-mobile-card-header">
								<div className="flex items-baseline gap-2">
									<span className="text-base font-extrabold text-ink tracking-tight">
										№{log.cycleNumber}
									</span>
									<span className="text-xs text-[var(--muted)] font-medium">
										{safeDate.toLocaleDateString("ru-RU", {
											day: "2-digit",
											month: "2-digit",
										})}{" "}
										{safeDate.toLocaleTimeString("ru-RU", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>

								<span
									className="sanpin-tag sanpin-tag-success shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5"
									title="Стерилизация завершена успешно (100% норма)"
								>
									<CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
									<span>Стерильно 100%</span>
								</span>
							</div>

							{/* Body: Key Parameters */}
							<div className="sanpin-mobile-card-body">
								{/* Device Name */}
								<div className="flex items-center gap-1.5 font-bold text-xs text-ink">
									<Gauge size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span className="truncate">{deviceName}</span>
								</div>

								{/* Instruments / Items */}
								<div className="text-xs text-ink leading-snug">
									<span className="text-[var(--muted)] font-medium">Загрузка: </span>
									<span className="font-semibold">
										{log.itemsDescription || "Стоматологический набор"}
									</span>
								</div>

								{/* Chips: Regime & Packaging & Indicator Class */}
								<div className="flex flex-wrap items-center gap-1.5 pt-1">
									<span className="sanpin-tag sanpin-tag-neutral text-[11px] font-bold px-2 py-0.5 rounded-md">
										{log.temperatureCelsius || 134}°C · {log.pressureBar || 2.1} бар ·{" "}
										{log.durationMin || 5} мин
									</span>

									<span className="sanpin-tag sanpin-tag-neutral text-[11px] font-medium px-2 py-0.5 rounded-md">
										{packagingName}
									</span>

									<span className="sanpin-tag sanpin-tag-success text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
										<CheckCircle2 size={11} />
										{log.indicatorType === "class6_emulating"
											? "Класс VI"
											: "Класс V (Норма)"}
									</span>
								</div>

								{/* Shelf life & Barcode info */}
								<div className="grid grid-cols-2 gap-2 pt-1.5 text-xs border-t border-[var(--line-subtle,rgba(226,232,240,0.5))] dark:border-[#334155]/50">
									<div>
										<span className="text-[var(--muted)] block text-[10px] uppercase font-bold tracking-wider">
											Годен до
										</span>
										{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
											<span className="font-bold text-emerald-600 dark:text-emerald-400">
												{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
											</span>
										) : (
											<span className="text-[var(--muted)]">Вскрыть сразу</span>
										)}
									</div>

									<div className="text-right">
										<span className="text-[var(--muted)] block text-[10px] uppercase font-bold tracking-wider">
											Штрихкод
										</span>
										{log.barcode ? (
											<span className="font-mono font-bold text-xs text-[var(--brand-primary,#2563eb)] bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
												{log.barcode}
											</span>
										) : (
											<span className="text-[var(--muted)]">—</span>
										)}
									</div>
								</div>

								{/* Operator name */}
								<div className="text-[11px] text-[var(--muted)] pt-0.5">
									Ответственный:{" "}
									<span className="font-semibold text-ink">
										{log.operatorName || "Медсестра ЦСО"}
									</span>
								</div>
							</div>

							{/* Action Buttons: Touch-Ergonomic >= 44x44px */}
							<div className="sanpin-mobile-card-actions">
								{/* 1. Quick Barcode Label Print (Touch target >= 44x44px) */}
								<button
									type="button"
									onClick={() => onPrintSinglePouch(log)}
									className="sanpin-touch-btn flex-1 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--teal,#0d9488)] dark:text-[#2dd4bf] border border-[var(--teal,#0d9488)] font-bold text-xs touch-manipulation cursor-pointer"
									style={{ minHeight: "44px", height: "44px" }}
									title="Печать 1 термоэтикетки со штрихкодом (58x40 мм)"
									data-testid={`mobile-print-label-btn-${log.id}`}
								>
									<Printer size={16} />
									<span>Печать наклейки</span>
								</button>

								{/* 2. Nurse ECP Stamp Button (Touch target >= 44x44px) */}
								{isStamped ? (
									<span
										className="sanpin-touch-btn flex-1 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold text-xs"
										style={{ minHeight: "44px", height: "44px" }}
										title="Смена и цикл заверены цифровым штампом ЭЦП"
									>
										<CheckCircle2 size={16} />
										<span>Заверено ЭЦП</span>
									</span>
								) : (
									<button
										type="button"
										onClick={() => onStampVerification(log.id)}
										className="sanpin-touch-btn flex-1 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--brand-primary,#2563eb)] border border-[var(--brand-primary,#2563eb)] font-bold text-xs touch-manipulation cursor-pointer"
										style={{ minHeight: "44px", height: "44px" }}
										title="Поставить цифровую заверку/штамп медсестры"
										data-testid={`mobile-stamp-ecp-btn-${log.id}`}
									>
										<Award size={16} />
										<span>Заверить (ЭЦП)</span>
									</button>
								)}

								{/* 3. More options (Bottom Sheet Trigger, >= 44x44px) */}
								<button
									type="button"
									onClick={() => onSelectLogForSheet(log)}
									className="sanpin-touch-btn inline-flex items-center justify-center rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer shrink-0"
									style={{
										minHeight: "44px",
										minWidth: "44px",
										height: "44px",
										width: "44px",
									}}
									aria-label="Все опции цикла"
									data-testid={`mobile-cycle-more-btn-${log.id}`}
								>
									<MoreHorizontal size={18} />
								</button>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
}
