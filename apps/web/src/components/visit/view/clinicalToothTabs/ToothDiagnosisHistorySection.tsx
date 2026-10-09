import React from "react";
import { Clock, History, ShieldAlert, Sparkles } from "lucide-react";

export interface ToothDiagnosisHistorySectionProps {
	code: string;
	state: string;
	toothServicesCount: number;
	toothTotalRub: number;
}

export function ToothDiagnosisHistorySection({
	code,
	state,
	toothServicesCount,
	toothTotalRub,
}: ToothDiagnosisHistorySectionProps) {
	const stateLabels: Record<string, { label: string; desc: string; colorClass: string }> = {
		idle: {
			label: "Интактен / Здоров",
			desc: "Кариозных полостей не выявлено, пломб нет.",
			colorClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
		},
		done: {
			label: "Санирован",
			desc: "Ранее лечен, установлена пломба или коронка.",
			colorClass: "text-[var(--teal)] bg-[var(--teal-subtle)]",
		},
		treatment: {
			label: "В процессе лечения",
			desc: "Пульпит / периодонтит, требуется терапия каналов.",
			colorClass: "text-red-500 bg-red-50 dark:bg-red-950/30",
		},
		watch: {
			label: "Кариес / Наблюдение",
			desc: "Кариозное поражение или клиновидный дефект.",
			colorClass: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
		},
		missing: {
			label: "Отсутствует",
			desc: "Зуб удален или первичная адентия.",
			colorClass: "text-slate-400 bg-slate-100 dark:bg-slate-800",
		},
	};

	const currentMeta = stateLabels[state] || stateLabels.idle;

	return (
		<div className="_ccm-history-section mb-3 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
					<History className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>Клинический статус & История зуба {code}</span>
				</span>
				<span
					className={`text-[10px] font-medium px-2 py-0.5 rounded ${currentMeta.colorClass}`}
				>
					{currentMeta.label}
				</span>
			</div>

			<p className="text-[11px] text-[var(--muted)] mb-2">
				{currentMeta.desc}
			</p>

			<div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--line-subtle)]">
				<span className="text-[var(--text)] flex items-center gap-1">
					<Clock className="w-3 h-3 text-[var(--muted)]" />
					<span>В текущем визите: {toothServicesCount} услуг</span>
				</span>
				<span className="font-semibold text-[var(--text-strong)]">
					{toothTotalRub > 0 ? `${toothTotalRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
				</span>
			</div>
		</div>
	);
}
