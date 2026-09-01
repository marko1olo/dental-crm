/**
 * AspirationTestCockpit.tsx — Dominant Interactive Aspiration Test Cockpit
 * Standards: Минздрав РФ, СтАР, ФАР
 */

import React from 'react';
import {
	AlertOctagon,
	CheckCircle2,
	HeartPulse,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
} from 'lucide-react';
import {
	AspirationAttemptRecord,
	AspirationTestStatus,
	InjectionVelocityPlan,
	VascularRiskAssessment,
} from './aspirationSafetyEngine';
import { TechniqueSpecification } from './anesthesiaTechniqueTypes';

export interface AspirationTestCockpitProps {
	readonly currentTechnique: TechniqueSpecification;
	readonly vascularAssessment: VascularRiskAssessment;
	readonly velocityPlan: InjectionVelocityPlan;
	readonly aspirationStatus: AspirationTestStatus;
	readonly isTwoPlaneConfirmed: boolean;
	readonly onTwoPlaneChange: (checked: boolean) => void;
	readonly attempts: readonly AspirationAttemptRecord[];
	readonly positiveEmergencyOpen: boolean;
	readonly onNegativeAspiration: () => void;
	readonly onPositiveAspiration: () => void;
	readonly onReplaceCarpuleAndRetest: () => void;
}

export const AspirationTestCockpit: React.FC<AspirationTestCockpitProps> = ({
	currentTechnique,
	vascularAssessment,
	velocityPlan,
	aspirationStatus,
	isTwoPlaneConfirmed,
	onTwoPlaneChange,
	attempts,
	positiveEmergencyOpen,
	onNegativeAspiration,
	onPositiveAspiration,
	onReplaceCarpuleAndRetest,
}) => {
	const isNegative =
		aspirationStatus === 'negative_safe' || aspirationStatus === 'repositioned_and_retested';
	const isPositive =
		aspirationStatus === 'positive_burst' || aspirationStatus === 'positive_trace';

	return (
		<div className="flex flex-col gap-4">
			{/* Vascular Risk Speedometer Card */}
			<div
				className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
					currentTechnique.vascularRiskTier === 'critical_high'
						? 'bg-rose-950/20 border-rose-500/40'
						: currentTechnique.vascularRiskTier === 'moderate'
							? 'bg-amber-950/20 border-amber-500/40'
							: 'bg-emerald-950/20 border-emerald-500/40'
				}`}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<HeartPulse className="w-5 h-5 text-rose-400" />
						<span className="font-bold text-sm">Риск внутрисосудистого попадания</span>
					</div>
					<span className="text-base font-extrabold font-mono text-rose-400">
						{vascularAssessment.adjustedVascularRiskPercent}%
					</span>
				</div>

				{/* Progress track */}
				<div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
					<div
						className={`h-full transition-all duration-300 ${
							vascularAssessment.adjustedVascularRiskPercent >= 15
								? 'bg-rose-500'
								: vascularAssessment.adjustedVascularRiskPercent >= 8
									? 'bg-amber-500'
									: 'bg-emerald-500'
						}`}
						style={{
							width: `${Math.min(100, vascularAssessment.adjustedVascularRiskPercent * 4)}%`,
						}}
					/>
				</div>

				<p className="text-xs text-zinc-300 leading-relaxed">
					{vascularAssessment.clinicalRecommendationsRu}
				</p>

				{/* Two-plane aspiration check */}
				<label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mt-1 cursor-pointer select-none">
					<input
						type="checkbox"
						checked={isTwoPlaneConfirmed}
						onChange={(e) => onTwoPlaneChange(e.target.checked)}
						className="w-4 h-4 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-0"
					/>
					<span>Аспирационная проба в двух плоскостях (поворот 90–180°)</span>
				</label>
			</div>

			{/* GIANT ACTION BUTTONS FOR ASPIRATION */}
			<div className="flex flex-col gap-3">
				{/* NEGATIVE ASPIRATION BUTTON */}
				<button
					type="button"
					onClick={onNegativeAspiration}
					className={`w-full p-4 rounded-xl border font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-3 transition-all min-h-[56px] shadow-lg ${
						isNegative
							? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50 shadow-emerald-900/30'
							: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-300 hover:scale-[1.01]'
					}`}
				>
					<CheckCircle2 className="w-6 h-6 shrink-0" />
					<span className="truncate">АСПИРАЦИОННАЯ ПРОБА: ОТРИЦАТЕЛЬНАЯ</span>
				</button>

				{/* POSITIVE ASPIRATION BUTTON */}
				<button
					type="button"
					onClick={onPositiveAspiration}
					className={`w-full p-4 rounded-xl border font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-3 transition-all min-h-[56px] shadow-lg ${
						isPositive
							? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/50 shadow-rose-900/40 animate-pulse'
							: 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/50 text-rose-300 hover:scale-[1.01]'
					}`}
				>
					<AlertOctagon className="w-6 h-6 shrink-0" />
					<span className="truncate">ПОЛОЖИТЕЛЬНАЯ (Кровь в карпуле — СТОП)</span>
				</button>
			</div>

			{/* POSITIVE EMERGENCY PROTOCOL ACCORDION/CARD */}
			{positiveEmergencyOpen && (
				<div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
					<div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
						<ShieldAlert className="w-5 h-5 shrink-0" />
						<span>ПРОТОКОЛ ПРИ ПОЛОЖИТЕЛЬНОЙ АСПИРАЦИИ:</span>
					</div>

					<ul className="text-xs text-rose-200 flex flex-col gap-1.5 list-disc list-inside">
						<li>
							<strong>НЕ ВВОДИТЬ раствор!</strong> Немедленно остановить давление на поршень.
						</li>
						<li>Извлечь иглу из тканей или подтянуть назад на 2–3 мм.</li>
						<li>
							<strong>Утилизировать</strong> инфицированную кровью карпулу и иглу в отходы класса Б.
						</li>
						<li>
							Установить <strong>новую стерильную карпулу</strong> и новую иглу.
						</li>
						<li>Скорректировать угол и глубину вкола перед повторной пробой.</li>
					</ul>

					<button
						type="button"
						onClick={onReplaceCarpuleAndRetest}
						className="w-full py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
					>
						<RotateCcw className="w-4 h-4" />
						<span>Карпула и игла заменены • Готов к повторной пробе</span>
					</button>
				</div>
			)}

			{/* SAFE INJECTION VELOCITY PACER CARD */}
			{isNegative && (
				<div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col gap-2">
					<div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
						<div className="flex items-center gap-1.5">
							<ShieldCheck className="w-4 h-4" />
							<span>Разрешено безопасное введение:</span>
						</div>
						<span className="font-mono">≤ 1.0 мл / мин</span>
					</div>
					<p className="text-xs text-emerald-200 leading-tight">
						{velocityPlan.safeInjectionInstructionsRu}
					</p>
				</div>
			)}

			{/* ATTEMPT AUDIT TRAIL LOG */}
			{attempts.length > 0 && (
				<div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1.5 text-xs">
					<div className="font-semibold text-zinc-400 flex items-center justify-between">
						<span>Журнал попыток аспирации:</span>
						<span className="font-mono text-[11px]">{attempts.length} фиксаций</span>
					</div>
					<div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
						{attempts.map((att) => (
							<div
								key={att.attemptNumber}
								className={`p-1.5 rounded-md flex items-center justify-between border ${
									att.overallResult === 'positive'
										? 'bg-rose-950/30 border-rose-800 text-rose-300'
										: 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
								}`}
							>
								<span className="font-bold">Попытка {att.attemptNumber}:</span>
								<span>
									{att.overallResult === 'positive' ? 'Кровь в карпуле' : 'Отрицательная'}
								</span>
								<span className="text-[10px] text-zinc-400 font-mono">
									{new Date(att.timestampIso).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit',
										second: '2-digit',
									})}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
