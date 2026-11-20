import React from "react";
import { Check } from "lucide-react";

interface PediatricOrthoNormGridProps {
	readonly orthoFrenulumNormal: boolean;
	readonly setOrthoFrenulumNormal: React.Dispatch<React.SetStateAction<boolean>>;
	readonly orthoNasalBreathing: boolean;
	readonly setOrthoNasalBreathing: React.Dispatch<React.SetStateAction<boolean>>;
	readonly orthoNoHarmfulHabits: boolean;
	readonly setOrthoNoHarmfulHabits: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PediatricOrthoNormGrid: React.FC<PediatricOrthoNormGridProps> = ({
	orthoFrenulumNormal,
	setOrthoFrenulumNormal,
	orthoNasalBreathing,
	setOrthoNasalBreathing,
	orthoNoHarmfulHabits,
	setOrthoNoHarmfulHabits,
}) => {
	const isAllNormal = orthoFrenulumNormal && orthoNasalBreathing && orthoNoHarmfulHabits;

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3">
			<div className="mb-2 flex items-center justify-between">
				<span className="text-xs font-semibold text-[var(--ink)]">
					Первичный осмотр — ортодонтическая норма:
				</span>
				<span className="text-[11px] font-medium text-[var(--primary)]">
					{isAllNormal ? "Физиологическая норма (100%)" : "Выявлены отклонения / требуется консультация ортодонта"}
				</span>
			</div>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="pediatric-ortho-norm-grid">
				<button
					type="button"
					onClick={() => setOrthoFrenulumNormal((prev) => !prev)}
					className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
						orthoFrenulumNormal
							? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)] ring-1 ring-[var(--primary)]/20"
							: "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)] ring-1 ring-[var(--warning-line)]"
					}`}
					title="Анатомическое прикрепление уздечек губ и языка"
					data-testid="pediatric-ortho-frenulum-toggle"
				>
					<div className="min-w-0 pr-1">
						<div className="text-xs font-semibold truncate">Уздечки губ и языка</div>
						<div className="text-[11px] opacity-80 truncate">{orthoFrenulumNormal ? "Норма прикрепления" : "Патология / укорочение"}</div>
					</div>
					{orthoFrenulumNormal ? <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" /> : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)]">Аномалия</span>}
				</button>

				<button
					type="button"
					onClick={() => setOrthoNasalBreathing((prev) => !prev)}
					className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
						orthoNasalBreathing
							? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)] ring-1 ring-[var(--primary)]/20"
							: "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)] ring-1 ring-[var(--warning-line)]"
					}`}
					title="Тип дыхания ребенка (носовое / ротовое)"
					data-testid="pediatric-ortho-breathing-toggle"
				>
					<div className="min-w-0 pr-1">
						<div className="text-xs font-semibold truncate">Носовое дыхание</div>
						<div className="text-[11px] opacity-80 truncate">{orthoNasalBreathing ? "Свободное через нос" : "Ротовое дыхание"}</div>
					</div>
					{orthoNasalBreathing ? <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" /> : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)]">Нарушено</span>}
				</button>

				<button
					type="button"
					onClick={() => setOrthoNoHarmfulHabits((prev) => !prev)}
					className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
						orthoNoHarmfulHabits
							? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)] ring-1 ring-[var(--primary)]/20"
							: "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)] ring-1 ring-[var(--warning-line)]"
					}`}
					title="Вредные привычки: сосание пальца, соски, посторонних предметов"
					data-testid="pediatric-ortho-habits-toggle"
				>
					<div className="min-w-0 pr-1">
						<div className="text-xs font-semibold truncate">Вредные привычки</div>
						<div className="text-[11px] opacity-80 truncate">{orthoNoHarmfulHabits ? "Отсутствуют (норма)" : "Выявлены (палец/соска)"}</div>
					</div>
					{orthoNoHarmfulHabits ? <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" /> : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)]">Выявлены</span>}
				</button>
			</div>
		</div>
	);
};
