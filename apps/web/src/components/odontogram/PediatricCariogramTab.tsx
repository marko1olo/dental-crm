import React from "react";
import { Activity, Check, Info, ShieldCheck, Sparkles } from "lucide-react";
import {
	type CariogramInput,
	type CariogramResult,
	type CariogramRiskLevel,
} from "./pediatricDentitionEngine";

export type { CariogramRiskLevel };

export interface PediatricCariogramTabProps {
	cariogramInput: CariogramInput;
	onCariogramInputChange: (input: CariogramInput) => void;
	cariogramResult: CariogramResult;
}

export const PediatricCariogramTab: React.FC<PediatricCariogramTabProps> = ({
	cariogramInput,
	onCariogramInputChange,
	cariogramResult,
}) => {
	const currentLevel: CariogramRiskLevel = (cariogramInput.cariesRiskLevel as CariogramRiskLevel) || "low";

	const handleSelectRiskLevel = (level: CariogramRiskLevel) => {
		onCariogramInputChange({
			...cariogramInput,
			cariesRiskLevel: level,
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* 1-Click 3-State Risk Selector */}
			<div className="p-6 rounded-3xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
					<div>
						<h3 className="text-base sm:text-lg font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
							Клиническая оценка риска кариеса (1 клик)
						</h3>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium">
							Выберите статус кариесогенного риска для автоматического формирования протокола профилактики
						</p>
					</div>
					<span
						className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider"
						style={{
							backgroundColor: cariogramResult.badgeBg,
							color: cariogramResult.badgeColor,
						}}
					>
						{cariogramResult.riskCategoryNameRu}
					</span>
				</div>

				{/* 3 Radio Chips */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
					{/* 1. Low Risk */}
					<button
						type="button"
						onClick={() => handleSelectRiskLevel("low")}
						data-testid="cariogram-risk-low-btn"
						className={`relative p-4 rounded-2xl border text-left transition-all min-h-[56px] cursor-pointer flex items-center justify-between gap-3 ${
							currentLevel === "low"
								? "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-bold"
								: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] hover:border-emerald-400/50 text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<div className="flex items-center gap-3">
							<span className="w-4 h-4 rounded-full bg-emerald-500 shrink-0" />
							<div>
								<div className="text-sm font-black text-emerald-800 dark:text-emerald-300">
									Низкий риск
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Шанс избежать: 85%
								</div>
							</div>
						</div>
						{currentLevel === "low" && (
							<Check className="w-5 h-5 text-emerald-600 shrink-0" />
						)}
					</button>

					{/* 2. Moderate Risk */}
					<button
						type="button"
						onClick={() => handleSelectRiskLevel("moderate")}
						data-testid="cariogram-risk-moderate-btn"
						className={`relative p-4 rounded-2xl border text-left transition-all min-h-[56px] cursor-pointer flex items-center justify-between gap-3 ${
							currentLevel === "moderate"
								? "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 dark:text-amber-100 font-bold"
								: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] hover:border-amber-400/50 text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<div className="flex items-center gap-3">
							<span className="w-4 h-4 rounded-full bg-amber-500 shrink-0" />
							<div>
								<div className="text-sm font-black text-amber-800 dark:text-amber-300">
									Умеренный риск
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Шанс избежать: 55%
								</div>
							</div>
						</div>
						{currentLevel === "moderate" && (
							<Check className="w-5 h-5 text-amber-600 shrink-0" />
						)}
					</button>

					{/* 3. High Risk */}
					<button
						type="button"
						onClick={() => handleSelectRiskLevel("high")}
						data-testid="cariogram-risk-high-btn"
						className={`relative p-4 rounded-2xl border text-left transition-all min-h-[56px] cursor-pointer flex items-center justify-between gap-3 ${
							currentLevel === "high"
								? "bg-red-500/15 border-red-500 ring-2 ring-red-500/30 text-red-950 dark:text-red-100 font-bold"
								: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] hover:border-red-400/50 text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<div className="flex items-center gap-3">
							<span className="w-4 h-4 rounded-full bg-red-500 shrink-0" />
							<div>
								<div className="text-sm font-black text-red-800 dark:text-red-300">
									Высокий риск
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Шанс избежать: 20%
								</div>
							</div>
						</div>
						{currentLevel === "high" && (
							<Check className="w-5 h-5 text-red-600 shrink-0" />
						)}
					</button>
				</div>
			</div>

			{/* Preventive Program Summary */}
			<div className="p-6 rounded-3xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
						Индивидуальный план детской профилактики
					</h4>
					<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
						Диспансерный осмотр: 1 раз в {cariogramResult.preventiveProgram.hygieneRecallIntervalMonths} мес.
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs sm:text-sm text-[var(--odontogram-ink,var(--ink,#0f172a))] font-medium">
					<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-3 shadow-xs">
						<ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">Профессиональная гигиена</div>
							<div className="text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">{cariogramResult.preventiveProgram.professionalHygieneRu}</div>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-3 shadow-xs">
						<Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">Фторирование и реминерализация</div>
							<div className="text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">{cariogramResult.preventiveProgram.fluorideVarnishProtocolRu}</div>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-3 shadow-xs">
						<Activity className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">Домашний уход</div>
							<div className="text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">{cariogramResult.preventiveProgram.homeCareProtocolRu}</div>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-3 shadow-xs">
						<Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">Диета и питание</div>
							<div className="text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">{cariogramResult.preventiveProgram.dietaryGuidanceRu}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
