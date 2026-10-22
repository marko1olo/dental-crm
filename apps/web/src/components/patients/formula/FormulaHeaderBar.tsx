/**
 * apps/web/src/components/patients/formula/FormulaHeaderBar.tsx
 *
 * Верхняя панель зубной формулы: прикус, индекс КПУ, 1-клик быстрые действия (Мандаты 8e, 8b)
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import { ToothMolar, ToothDeciduous } from "../../icons/DentalIcons";
import type { DentitionMode, KpuStats } from "./formulaTypes";

interface FormulaHeaderBarProps {
	readonly patientAge: number | null;
	readonly dentitionMode: DentitionMode;
	readonly onDentitionModeChange: (mode: DentitionMode) => void;
	readonly kpuStats: KpuStats;
	readonly onMarkIntact: () => void;
	readonly onMarkWisdomMissing: () => void;
}

export const FormulaHeaderBar: React.FC<FormulaHeaderBarProps> = React.memo(
	function FormulaHeaderBar({
		patientAge, dentitionMode, onDentitionModeChange, kpuStats, onMarkIntact, onMarkWisdomMissing,
	}) {
		return (
			<div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[var(--glass-border)]">
				<div className="flex items-center gap-2 flex-wrap">
					<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
						<ToothMolar className="w-4 h-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-black m-0 text-[var(--ink)]">Зубная формула пациента</h3>
							{patientAge !== null && (
								<span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--glass-border)] text-[var(--muted)]">
									{patientAge} лет
								</span>
							)}
						</div>
						<p className="text-[11px] text-[var(--muted)] m-0">
							Интерактивная одонтограмма FDI • Синхронизация с медицинской картой
						</p>
					</div>

					<div className="flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)] ml-1 sm:ml-2">
						{(["adult", "mixed", "pediatric"] as const).map((mode) => (
							<button
								key={mode}
								type="button"
								onClick={() => onDentitionModeChange(mode)}
								className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
									dentitionMode === mode
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{mode === "pediatric" && <ToothDeciduous className="w-3 h-3 text-amber-500" />}
								<span>{mode === "adult" ? "Постоянный" : mode === "mixed" ? "Сменный" : "Детский"}</span>
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<div
						className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)] text-xs font-bold"
						title={`Индекс КПУ (Кариес: ${kpuStats.c}, Пломбировано: ${kpuStats.p}, Удалено: ${kpuStats.u})`}
					>
						<span className="text-[var(--muted)]">КПУ:</span>
						<span className="font-mono text-rose-500 font-extrabold">{kpuStats.c}К</span>
						<span className="text-[var(--glass-border)]">•</span>
						<span className="font-mono text-teal-600 font-extrabold">{kpuStats.p}П</span>
						<span className="text-[var(--glass-border)]">•</span>
						<span className="font-mono text-slate-500 font-extrabold">{kpuStats.u}У</span>
						<span className="text-[var(--glass-border)]">=</span>
						<span className="font-mono font-black text-[var(--ink)]">{kpuStats.total}</span>
					</div>

					<button
						type="button"
						data-testid="btn-formula-mark-intact"
						onClick={onMarkIntact}
						className="min-h-[30px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
						title="Отметить весь зубной ряд как здоровый и санированный"
					>
						<ShieldCheck className="w-3.5 h-3.5" />
						<span>Интактный</span>
					</button>

					<button
						type="button"
						data-testid="btn-formula-mark-wisdom-missing"
						onClick={onMarkWisdomMissing}
						className="min-h-[30px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
						title="Отметить зубы 18, 28, 38, 48 как отсутствующие"
					>
						<span>Без 8-рок</span>
					</button>
				</div>
			</div>
		);
	},
);

FormulaHeaderBar.displayName = "FormulaHeaderBar";
