/**
 * apps/web/src/components/visit/anamnesisTab/SomaticQuickNormBar.tsx
 *
 * Layer 1: Панель быстрых пресетов «Физиологическая норма», заголовок,
 * вызов клинических шаблонов StomX и статусный баннер соматической безопасности.
 */

import React from "react";
import {
	AlertCircle,
	AlertOctagon,
	Plus,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";

export interface SomaticQuickNormBarProps {
	readonly activePat?: { fullName?: string } | null | undefined;
	readonly totalCriticalAlerts: boolean;
	readonly selectedRisks: readonly string[];
	readonly selectedAllergies: Record<string, string>;
	readonly selectedAllergyCount: number;
	readonly onOpenStomxTemplates?: (() => void) | undefined;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onApplyToDiary: () => void;
}

export const SomaticQuickNormBar: React.FC<SomaticQuickNormBarProps> = ({
	activePat,
	totalCriticalAlerts,
	selectedRisks,
	selectedAllergies,
	selectedAllergyCount,
	onOpenStomxTemplates,
	onApplyPhysiologicalNorm,
	onApplyToDiary,
}) => {
	return (
		<>
			{/* Top Bar: Заголовок и главные CTA кнопки */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div
						className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shrink-0 transition-colors ${
							totalCriticalAlerts
								? "bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] border-2 border-[#ef4444]"
								: selectedRisks.length > 0 || selectedAllergyCount > 0
									? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
									: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
						}`}
					>
						{selectedRisks.length === 0 && selectedAllergyCount === 0 ? (
							<ShieldCheck className="w-5 h-5" />
						) : totalCriticalAlerts ? (
							<ShieldAlert className="w-5 h-5" />
						) : (
							<Stethoscope className="w-5 h-5" />
						)}
					</div>
					<div className="min-w-0">
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
							Клинический анамнез и безопасность пациента
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							{activePat?.fullName ? `${activePat.fullName} • ` : ""}
							Форма 043/у (Приказ 834н): аллергены, соматические стоп-факторы, опыт анестезии
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap shrink-0">
					<button
						type="button"
						onClick={
							onOpenStomxTemplates ??
							(() =>
								window.dispatchEvent(
									new CustomEvent("dente-open-stomx-templates"),
								))
						}
						className="anamnesis-top-btn anamnesis-top-btn--teal"
						data-testid="btn-open-stomt-templates-anamnesis"
						title="Открыть каталог 448 клинических шаблонов (Терапия, Ортопедия, Хирургия, Имплантология, Пародонтология)"
						data-catalog-source="Клинические шаблоны StomX (448)"
					>
						<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>Клинические шаблоны (448)</span>
					</button>

					{/* 1-Click Кнопка соматической нормы (Мандат 8e, 8k) */}
					<button
						type="button"
						onClick={onApplyPhysiologicalNorm}
						className="anamnesis-top-btn anamnesis-top-btn--norm"
						data-testid="btn-somatic-norm-one-click"
						title="Зафиксировать физиологическую норму: соматически здоров, аллергоанамнез не отягощен"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>Соматически здоров / Норма</span>
					</button>

					<button
						type="button"
						onClick={onApplyToDiary}
						className="anamnesis-top-btn anamnesis-top-btn--secondary"
						data-testid="btn-apply-anamnesis-to-diary"
						title="Перенести данные в дневник приёма и синхронизировать с ЭМК"
					>
						<Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
						<span>В дневник приёма</span>
					</button>
				</div>
			</div>

			{/* Статусный баннер: Анатомический красный (#ef4444) или Спокойный Изумрудный */}
			{totalCriticalAlerts ? (
				<div
					className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-100 text-xs shadow-xs"
					data-testid="visit-anamnesis-critical-alert"
					role="alert"
				>
					<AlertOctagon className="w-5 h-5 text-[#ef4444] shrink-0" />
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="font-bold text-[#ef4444]">
							Клинические стоп-факторы безопасности у кресла:
						</span>
						<span className="text-[11.5px] text-rose-900 dark:text-rose-200">
							{selectedAllergyCount > 0
								? `Аллергии: ${Object.entries(selectedAllergies).map(([a, r]) => `${a} (${r})`).join(", ")}. `
								: ""}
							{selectedRisks.length > 0
								? `Соматические риски: ${selectedRisks.join(", ")}. `
								: ""}
							Обязательна коррекция местного анестетика, профилактика анафилаксии, оценка риска кровотечения и остеонекроза (MRONJ).
						</span>
					</div>
				</div>
			) : selectedRisks.length > 0 || selectedAllergyCount > 0 ? (
				<div
					className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs font-semibold"
					data-testid="visit-anamnesis-alert-banner"
				>
					<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						Отмечены соматические особенности:{" "}
						{selectedRisks.join(", ")}
						{selectedAllergyCount > 0
							? `; Аллергии: ${Object.keys(selectedAllergies).join(", ")}`
							: ""}
						. Учитывать при премедикации и выборе концентрации вазоконстриктора.
					</span>
				</div>
			) : null}
		</>
	);
};
