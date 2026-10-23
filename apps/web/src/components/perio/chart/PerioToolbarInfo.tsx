/**
 * PerioToolbarInfo.tsx — Заголовок тулбара, диагноз МКБ-10 и индикатор статуса синхронизации.
 * Архитектурный слой Layer 4: Toolbar Header (Мандат 8b, <= 120 строк).
 */

import type { PeriodontalDiagnosisDetail } from "@dental/shared";
import { Check, ShieldCheck } from "lucide-react";
import React from "react";
import { PerioProbe } from "../../icons/DentalIcons";

export interface PerioToolbarInfoProps {
	readonly aapDiagnosis: PeriodontalDiagnosisDetail;
	readonly syncStatus?: "idle" | "loading" | "saving" | "synced" | "closed" | "error" | undefined;
}

export const PerioToolbarInfo: React.FC<PerioToolbarInfoProps> = React.memo(({ aapDiagnosis, syncStatus }) => {
	const badgeColor = aapDiagnosis.severity === "intact"
		? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
		: aapDiagnosis.severity === "gingivitis"
			? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
			: aapDiagnosis.severity === "moderate"
				? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
				: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";

	return (
		<div className="flex items-center gap-3 min-w-0">
			<div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 shrink-0">
				<PerioProbe size={20} />
			</div>
			<div className="min-w-0">
				<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
					<h3 className="text-base font-bold text-[var(--ink)] truncate">Карта пародонта</h3>
					<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border truncate max-w-xs shrink-0 ${badgeColor}`}>
						{aapDiagnosis.icd10Code} • {aapDiagnosis.diagnosisNameRu.split("(")[0]?.trim()}
					</span>
					{syncStatus && syncStatus !== "idle" && (
						<span
							className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
							data-testid="perio-sync-status-badge"
						>
							{syncStatus === "saving" || syncStatus === "loading" ? (
								<span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping shrink-0" />
							) : syncStatus === "synced" ? (
								<Check size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							) : syncStatus === "closed" ? (
								<ShieldCheck size={11} className="text-sky-600 dark:text-sky-400 shrink-0" />
							) : (
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
							)}
							<span>{syncStatus === "saving" ? "Сохранение..." : syncStatus === "loading" ? "Загрузка..." : syncStatus === "synced" ? "В карте" : syncStatus === "closed" ? "Зафиксирован" : "Черновик"}</span>
						</span>
					)}
				</div>
				<p className="text-xs text-[var(--muted)] mt-0.5 truncate">{aapDiagnosis.stageDescriptionRu}</p>
			</div>
		</div>
	);
});
PerioToolbarInfo.displayName = "PerioToolbarInfo";
