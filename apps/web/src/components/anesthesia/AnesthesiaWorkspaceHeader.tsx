import React from 'react';
import { Moon, Sun } from 'lucide-react';

export interface AnesthesiaWorkspaceHeaderProps {
	isDark: boolean;
	toggleTheme: () => void;
	hasLidocaineAllergy: boolean;
	setHasLidocaineAllergy: React.Dispatch<React.SetStateAction<boolean>>;
	hasArticaineAllergy: boolean;
	setHasArticaineAllergy: React.Dispatch<React.SetStateAction<boolean>>;
	hasCardio: boolean;
	setHasCardio: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AnesthesiaWorkspaceHeader({
	isDark,
	toggleTheme,
	hasLidocaineAllergy,
	setHasLidocaineAllergy,
	hasArticaineAllergy,
	setHasArticaineAllergy,
	hasCardio,
	setHasCardio,
}: AnesthesiaWorkspaceHeaderProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] pb-3">
			<div>
				<div className="flex items-center gap-2">
					<h1 className="text-lg sm:text-xl font-black text-[var(--ink,#0f172a)]">
						Обезболивание и местная анестезия у кресла
					</h1>
					<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30">
						Клинический блок DENTE
					</span>
				</div>
				<p className="text-xs text-[var(--muted,#64748b)]">
					Быстрый выбор препарата в 1 клик, безопасное дозирование и протокол приёма
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={toggleTheme}
					className="secondary-button text-xs font-bold px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] transition-all cursor-pointer inline-flex items-center gap-1.5"
					data-testid="toggle-theme-btn"
				>
					{isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
					<span>{isDark ? '☀️ Светлая' : '🌙 Тёмная'}</span>
				</button>

				<button
					type="button"
					onClick={() => setHasLidocaineAllergy((prev) => !prev)}
					className={`secondary-button text-xs font-bold px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border transition-all cursor-pointer ${
						hasLidocaineAllergy
							? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500 font-black'
							: 'bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]'
					}`}
					data-testid="toggle-lidocaine-allergy"
				>
					{hasLidocaineAllergy ? '✓ Аллергия на лидокаин' : '+ Аллергия на лидокаин'}
				</button>

				<button
					type="button"
					onClick={() => setHasArticaineAllergy((prev) => !prev)}
					className={`secondary-button text-xs font-bold px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border transition-all cursor-pointer ${
						hasArticaineAllergy
							? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500 font-black'
							: 'bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]'
					}`}
					data-testid="toggle-articaine-allergy"
				>
					{hasArticaineAllergy ? '✓ Аллергия на артикаин' : '+ Аллергия на артикаин'}
				</button>

				<button
					type="button"
					onClick={() => setHasCardio((prev) => !prev)}
					className={`secondary-button text-xs font-bold px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border transition-all cursor-pointer ${
						hasCardio
							? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500 font-black'
							: 'bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]'
					}`}
					data-testid="toggle-cardio-risk"
				>
					{hasCardio ? '✓ ССЗ кардио-риск' : '+ Кардио-риск'}
				</button>
			</div>
		</div>
	);
}
