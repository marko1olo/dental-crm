/**
 * AnamnesisHeaderBanner.tsx — Верхняя шапка соматического статуса и 1-кликовая норма.
 */

import React from "react";
import {
	AlertOctagon,
	CheckCircle2,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type { PatientSafetyEvaluationResult } from "../../patients/safetyMath";

export interface AnamnesisHeaderBannerProps {
	readonly patientName?: string | null | undefined;
	readonly isNorm: boolean;
	readonly evaluation: PatientSafetyEvaluationResult;
	readonly onApplyPhysiologicalNorm: () => void;
}

export const AnamnesisHeaderBanner: React.FC<AnamnesisHeaderBannerProps> = ({
	patientName,
	isNorm,
	evaluation,
	onApplyPhysiologicalNorm,
}) => {
	return (
		<>
			{/* Top Bar: Заголовок и 1-кликовая Норма */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 pb-3.5">
				<div className="flex items-center gap-3">
					<div
						className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shrink-0 transition-colors ${
							isNorm
								? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80"
								: evaluation.hasCriticalStopFlags
									? "bg-rose-50 dark:bg-rose-950/50 text-[#ef4444] border-2 border-[#ef4444]"
									: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
						}`}
					>
						{isNorm ? (
							<ShieldCheck className="w-5 h-5" />
						) : (
							<ShieldAlert className="w-5 h-5" />
						)}
					</div>
					<div className="min-w-0">
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0 truncate">
							Анамнез жизни, соматический статус и аллергии
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate">
							{patientName ? `${patientName} • ` : ""}
							Безопасность у кресла: 1-клик норма, быстрые чипы аллергенов
						</p>
					</div>
				</div>

				{/* 1-Click Кнопка соматической нормы (Мандат 8e, 8k) */}
				<div className="flex items-center gap-2 flex-wrap shrink-0">
					<button
						type="button"
						onClick={onApplyPhysiologicalNorm}
						className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[36px] sm:min-h-[36px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-98 select-none shrink-0"
						data-testid="mark-somatic-norm-btn"
						title="Зафиксировать соматическое здоровье: аллергоанамнез не отягощен"
						aria-label="Физиологическая норма"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>✓ Соматически здоров (Норма)</span>
					</button>
				</div>
			</div>

			{/* Статусный баннер нормы или критического предупреждения */}
			{isNorm ? (
				<div
					className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold"
					data-testid="somatic-status-norm-banner"
				>
					<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>
						Физиологическая норма: соматически здоров, аллергоанамнез не отягощен.
						Противопоказаний к анестетикам и амбулаторной стоматологии нет.
					</span>
				</div>
			) : (
				<div
					className={`flex flex-col gap-2 p-3.5 rounded-xl border text-xs ${
						evaluation.hasCriticalStopFlags
							? "bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-100 shadow-xs"
							: "bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-amber-950 dark:text-amber-100"
					}`}
					data-testid="somatic-status-alert-banner"
					role="alert"
				>
					<div className="flex items-center gap-2 font-bold">
						<AlertOctagon
							className={`w-4 h-4 shrink-0 ${
								evaluation.hasCriticalStopFlags
									? "text-[#ef4444]"
									: "text-amber-600 dark:text-amber-400"
							}`}
						/>
						<span>
							Обнаружено клинических факторов риска:{" "}
							{evaluation.activeFlags.length}
						</span>
					</div>
					<div className="flex flex-wrap gap-1.5 min-w-0">
						{evaluation.activeFlags.map((flag) => (
							<span
								key={flag.id}
								className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border truncate max-w-full ${
									flag.severity === "critical"
										? "bg-[#ef4444] text-white border-[#ef4444]"
										: "bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-700"
								}`}
								title={flag.description || flag.titleRu}
							>
								{flag.shortBadge || flag.titleRu}
							</span>
						))}
					</div>
				</div>
			)}
		</>
	);
};
