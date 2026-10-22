import type { PsoCleaningLog } from "@dental/shared";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import React from "react";
import { STATUTORY_PSO_REAGENTS } from "./sanpinAzopyramEngine.js";

export interface PsoMobileCardItemProps {
	readonly log: PsoCleaningLog;
	readonly isStamped: boolean;
	readonly nurseName: string;
	readonly onStampVerification: (logId: string) => void;
}

export function PsoMobileCardItem({ log, isStamped, nurseName, onStampVerification }: PsoMobileCardItemProps) {
	const isApproved = log.isBatchApproved ?? true;
	const reagentLot = STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber;
	const rawDate = log.timestamp || log.createdAt;
	const safeDate = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();

	return (
		<div className="sanpin-mobile-card touch-manipulation" data-testid={`pso-sample-card-${log.id}`}>
			<div className="sanpin-mobile-card-header">
				<div className="flex items-baseline gap-2">
					<span className="text-sm font-extrabold text-[var(--ink)] tracking-tight">
						{safeDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
					</span>
					<span className="text-xs text-[var(--muted)] font-medium">
						{safeDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</span>
				</div>

				<span
					className={`sanpin-tag shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5 ${isApproved ? "sanpin-tag-success" : "sanpin-tag-error"}`}
					title={isApproved ? "Партия допущена (проба отрицательная)" : "Брак очистки (повторная очистка)"}
				>
					{isApproved ? (
						<>
							<CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
							<span>Норма (Отрицательно)</span>
						</>
					) : (
						<>
							<XCircle size={13} className="shrink-0 text-rose-600" />
							<span>БРАК ОЧИСТКИ</span>
						</>
					)}
				</span>
			</div>

			<div className="sanpin-mobile-card-body">
				<div className="text-xs font-bold text-[var(--ink)] leading-snug">
					{log.instrumentName || "Стоматологический инструментарий"}
				</div>

				<div className="text-xs text-[var(--muted)] flex items-center gap-2">
					<span>Объём партии: <strong className="text-[var(--ink)]">{log.batchItemCount} шт.</strong></span>
					<span>·</span>
					<span>Контроль (1%): <strong className="text-[var(--teal,#0d9488)]">{log.testedSampleCount} шт.</strong></span>
				</div>

				<div className="flex flex-wrap items-center gap-1.5 pt-1">
					<span className={`sanpin-tag text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${log.isAzopyramNegative ? "sanpin-tag-success" : "sanpin-tag-error"}`}>
						{log.isAzopyramNegative ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
						<span>Азопирам (кровь): {log.isAzopyramNegative ? "Отрицательно" : "Положительно"}</span>
					</span>
					<span className={`sanpin-tag text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${log.isPhenolphthaleinNegative ? "sanpin-tag-success" : "sanpin-tag-error"}`}>
						{log.isPhenolphthaleinNegative ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
						<span>Щёлочь: {log.isPhenolphthaleinNegative ? "Отрицательно" : "Положительно"}</span>
					</span>
				</div>

				<div className="text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line-subtle,#f1f5f9)] dark:border-[#334155]/50 flex flex-wrap justify-between gap-1">
					<span>Моющее: <span className="font-semibold text-[var(--ink)]">{log.detergentBrand || "Биолот 0.5% + Аламинол 1%"}</span></span>
					<span>Реактив: <span className="font-mono font-medium">{reagentLot}</span></span>
				</div>

				<div className="flex items-center justify-between pt-2">
					<div className="text-xs text-[var(--muted)]">
						<span>Оператор: </span>
						<span className="font-bold text-[var(--ink)]">{log.operatorName || nurseName}</span>
					</div>

					{isStamped ? (
						<span className="sanpin-tag sanpin-tag-success text-[11px] font-bold py-1 px-2 rounded-md inline-flex items-center gap-1">
							<CheckCircle2 size={12} />
							<span>ЭЦП</span>
						</span>
					) : (
						<button
							type="button"
							onClick={() => onStampVerification(log.id)}
							className="sanpin-btn sanpin-btn-secondary min-h-[44px] h-11 text-xs font-bold px-3 rounded-xl inline-flex items-center gap-1.5 touch-manipulation cursor-pointer"
							title="Заверить пробу электронной подписью ответственного"
						>
							<Award size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Заверить (ЭЦП)</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
