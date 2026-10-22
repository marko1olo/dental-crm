import type { SterilizationLogRecord } from "@dental/shared";
import { CheckCircle2, Gauge } from "lucide-react";
import React from "react";
import { AutoclaveMobileCardActionButtons } from "./AutoclaveMobileCardActionButtons.js";
import { getPackagingLabel } from "./types.js";

export interface AutoclaveMobileCycleCardItemProps {
	readonly log: SterilizationLogRecord;
	readonly isStamped: boolean;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onStampVerification: (logId: string) => void;
	readonly onSelectLogForSheet: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileCycleCardItem({
	log,
	isStamped,
	onPrintSinglePouch,
	onStampVerification,
	onSelectLogForSheet,
}: AutoclaveMobileCycleCardItemProps) {
	const rawDate = log.timestamp || (log as any).date || (log as any).createdAt;
	const safeDate = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();
	const deviceName = log.deviceName || (log as any).sterilizerName || "Автоклав B-класса";
	const packagingName = getPackagingLabel(log.packagingType);

	return (
		<div className="sanpin-mobile-card touch-manipulation" data-testid={`autoclave-cycle-card-${log.id}`}>
			<div className="sanpin-mobile-card-header">
				<div className="flex items-baseline gap-2">
					<span className="text-base font-extrabold text-ink tracking-tight">№{log.cycleNumber}</span>
					<span className="text-xs text-[var(--muted)] font-medium">
						{safeDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
						{safeDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</span>
				</div>
				<span className="sanpin-tag sanpin-tag-success shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5" title="Стерилизация завершена успешно (100% норма)">
					<CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
					<span>Стерильно 100%</span>
				</span>
			</div>

			<div className="sanpin-mobile-card-body">
				<div className="flex items-center gap-1.5 font-bold text-xs text-ink">
					<Gauge size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate">{deviceName}</span>
				</div>
				<div className="text-xs text-ink leading-snug">
					<span className="text-[var(--muted)] font-medium">Загрузка: </span>
					<span className="font-semibold">{log.itemsDescription || "Стоматологический набор"}</span>
				</div>

				<div className="flex flex-wrap items-center gap-1.5 pt-1">
					<span className="sanpin-tag sanpin-tag-neutral text-[11px] font-bold px-2 py-0.5 rounded-md">
						{log.temperatureCelsius || 134}°C · {log.pressureBar || 2.1} бар · {log.durationMin || 5} мин
					</span>
					<span className="sanpin-tag sanpin-tag-neutral text-[11px] font-medium px-2 py-0.5 rounded-md">
						{packagingName}
					</span>
					<span className="sanpin-tag sanpin-tag-success text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
						<CheckCircle2 size={11} />
						{log.indicatorType === "class6_emulating" ? "Класс VI" : "Класс V (Норма)"}
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2 pt-1.5 text-xs border-t border-[var(--line-subtle,rgba(226,232,240,0.5))] dark:border-[#334155]/50">
					<div>
						<span className="text-[var(--muted)] block text-[10px] uppercase font-bold tracking-wider">Годен до</span>
						{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
							<span className="font-bold text-emerald-600 dark:text-emerald-400">{new Date(log.expiresAt).toLocaleDateString("ru-RU")}</span>
						) : (
							<span className="text-[var(--muted)]">Вскрыть сразу</span>
						)}
					</div>
					<div className="text-right">
						<span className="text-[var(--muted)] block text-[10px] uppercase font-bold tracking-wider">Штрихкод</span>
						{log.barcode ? (
							<span className="font-mono font-bold text-xs text-[var(--brand-primary,#2563eb)] bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
								{log.barcode}
							</span>
						) : (
							<span className="text-[var(--muted)]">—</span>
						)}
					</div>
				</div>

				<div className="text-[11px] text-[var(--muted)] pt-0.5">
					Ответственный: <span className="font-semibold text-ink">{log.operatorName || "Медсестра ЦСО"}</span>
				</div>
			</div>

			<AutoclaveMobileCardActionButtons
				log={log}
				isStamped={isStamped}
				onPrintSinglePouch={onPrintSinglePouch}
				onStampVerification={onStampVerification}
				onSelectLogForSheet={onSelectLogForSheet}
			/>
		</div>
	);
}
