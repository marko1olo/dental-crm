/**
 * apps/web/src/components/visit/intakeCockpitModules/IntakeVitalSignsBar.tsx
 *
 * Компактная полоса ввода витальных показателей (АД, пульс, температура)
 * и автоматического контроля противопоказаний к адреналину (эпинефрину 1:100 000).
 * Строго пассивное предупреждение без блокировки работы врача (Мандат 8e).
 */

import React from "react";
import { Activity, AlertTriangle, Check, HeartPulse } from "lucide-react";
import type {
	IntakeAdrenalineAssessment,
	IntakeVitalSignsBarProps,
	IntakeVitalSignsState,
} from "./intakeCockpitTypes";

export const DEFAULT_NORMAL_VITAL_SIGNS: IntakeVitalSignsState = {
	systolicBp: 120,
	diastolicBp: 80,
	pulseBpm: 72,
	temperatureC: 36.6,
};

/**
 * Создаёт эталонные нормальные витальные показатели (АД 120/80, ЧСС 72, Т 36.6 °C).
 */
export function createDefaultNormalVitalSigns(): IntakeVitalSignsState {
	return { ...DEFAULT_NORMAL_VITAL_SIGNS };
}

/**
 * Оценивает противопоказания к вазоконстриктору (адреналину / эпинефрину 1:100 000)
 * на основе текущего АД, пульса и сердечно-сосудистых стоп-факторов.
 */
export function evaluateIntakeAdrenalineContraindication(
	vitals: IntakeVitalSignsState,
	hasCardiovascularStopFactor = false,
): IntakeAdrenalineAssessment {
	const isHighBpCrisis =
		vitals.systolicBp >= 160 || vitals.diastolicBp >= 100;
	const isElevatedBp =
		vitals.systolicBp >= 140 ||
		vitals.diastolicBp >= 90 ||
		vitals.pulseBpm >= 105;

	if (isHighBpCrisis) {
		return {
			isAdrenalineContraindicated: true,
			isHighBpCrisis: true,
			recommendedAnestheticHintRu:
				"Рекомендован Мепивакаин 3% без вазоконстриктора (АД >= 160/100)",
			warningReasonRu: `Высокое АД (${vitals.systolicBp}/${vitals.diastolicBp} мм рт. ст.): ограничение адреналина 1:100 000`,
		};
	}

	if (hasCardiovascularStopFactor || isElevatedBp) {
		return {
			isAdrenalineContraindicated: true,
			isHighBpCrisis: false,
			recommendedAnestheticHintRu:
				"Ограничение адреналина: эпинефрин не выше 1:200 000 или Мепивакаин 3%",
			warningReasonRu: hasCardiovascularStopFactor
				? "Сердечно-сосудистый риск: ограничение адреналина 1:100 000"
				: `Повышенное АД/ЧСС (${vitals.systolicBp}/${vitals.diastolicBp}, пульс ${vitals.pulseBpm}): эпинефрин не выше 1:200 000`,
		};
	}

	return {
		isAdrenalineContraindicated: false,
		isHighBpCrisis: false,
		recommendedAnestheticHintRu:
			"Противопоказаний к стандартной карпульной анестезии не выявлено",
		warningReasonRu: null,
	};
}

export function IntakeVitalSignsBar({
	vitals,
	hasCardiovascularStopFactor,
	onUpdateVitals,
	onApplyNormalVitals,
}: IntakeVitalSignsBarProps) {
	const assessment = React.useMemo(
		() =>
			evaluateIntakeAdrenalineContraindication(
				vitals,
				hasCardiovascularStopFactor,
			),
		[vitals, hasCardiovascularStopFactor],
	);

	return (
		<div
			className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-3"
			data-testid="intake-vital-signs-bar"
		>
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1.5">
					<HeartPulse size={16} className="text-[var(--brand)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Витальные показатели:
					</span>
				</div>

				{/* АД Систолическое / Диастолическое */}
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<span className="text-[11px] font-semibold text-[var(--muted)]">
						АД:
					</span>
					<input
						type="number"
						min={60}
						max={260}
						value={vitals.systolicBp}
						onChange={(e) =>
							onUpdateVitals({
								systolicBp: Number(e.target.value) || 120,
							})
						}
						className="w-12 text-center text-xs font-bold bg-transparent text-[var(--ink)] focus:outline-none"
						aria-label="Систолическое артериальное давление"
						data-testid="input-intake-bp-systolic"
					/>
					<span className="text-xs font-bold text-[var(--muted)]">/</span>
					<input
						type="number"
						min={40}
						max={160}
						value={vitals.diastolicBp}
						onChange={(e) =>
							onUpdateVitals({
								diastolicBp: Number(e.target.value) || 80,
							})
						}
						className="w-12 text-center text-xs font-bold bg-transparent text-[var(--ink)] focus:outline-none"
						aria-label="Диастолическое артериальное давление"
						data-testid="input-intake-bp-diastolic"
					/>
					<span className="text-[10px] text-[var(--muted)]">мм рт. ст.</span>
				</div>

				{/* Пульс (ЧСС) */}
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<Activity size={13} className="text-[var(--muted)] shrink-0" />
					<span className="text-[11px] font-semibold text-[var(--muted)]">
						Пульс:
					</span>
					<input
						type="number"
						min={40}
						max={200}
						value={vitals.pulseBpm}
						onChange={(e) =>
							onUpdateVitals({
								pulseBpm: Number(e.target.value) || 72,
							})
						}
						className="w-11 text-center text-xs font-bold bg-transparent text-[var(--ink)] focus:outline-none"
						aria-label="Частота сердечных сокращений (уд/мин)"
						data-testid="input-intake-pulse"
					/>
					<span className="text-[10px] text-[var(--muted)]">уд/мин</span>
				</div>

				{/* Температура */}
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<span className="text-[11px] font-semibold text-[var(--muted)]">
						T°:
					</span>
					<input
						type="number"
						step="0.1"
						min={35.0}
						max={41.5}
						value={vitals.temperatureC}
						onChange={(e) =>
							onUpdateVitals({
								temperatureC: Number(e.target.value) || 36.6,
							})
						}
						className="w-12 text-center text-xs font-bold bg-transparent text-[var(--ink)] focus:outline-none"
						aria-label="Температура тела (°C)"
						data-testid="input-intake-temperature"
					/>
					<span className="text-[10px] text-[var(--muted)]">°C</span>
				</div>

				<button
					type="button"
					onClick={onApplyNormalVitals}
					className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer inline-flex items-center gap-1"
					data-testid="btn-intake-vitals-norm"
					title="Установить норму: АД 120/80, пульс 72 уд/мин, температура 36.6 °C"
				>
					<Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Норма 120/80</span>
				</button>
			</div>

			{/* Индикатор переносимости вазоконстриктора (адреналина) */}
			{assessment.isAdrenalineContraindicated ? (
				<div
					className={`px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${
						assessment.isHighBpCrisis
							? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
							: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
					}`}
					data-testid="intake-adrenaline-contraindication-badge"
				>
					<AlertTriangle size={14} className="shrink-0" />
					<span>{assessment.recommendedAnestheticHintRu}</span>
				</div>
			) : (
				<div
					className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5"
					data-testid="intake-adrenaline-safe-badge"
				>
					<Check size={13} className="shrink-0" />
					<span>Адреналин 1:100 000 / 1:200 000 допустим</span>
				</div>
			)}
		</div>
	);
}
