import React from "react";
import {
	Activity,
	Check,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";

export interface PediatricQuickProtocolsProps {
	onApplyPrimaryNorm: () => void;
	onApplyFirstMolarNorm: () => void;
	onApplyEarlyMixedNorm: () => void;
	onApplyPermanentNorm: () => void;
	onApplyProcedurePreset: (presetId: "saforide" | "fissurit" | "pulpotec") => void;
	onInsertCariogramToClinicalNote?: (() => void) | undefined;
}

export const PediatricQuickProtocols: React.FC<PediatricQuickProtocolsProps> = ({
	onApplyPrimaryNorm,
	onApplyFirstMolarNorm,
	onApplyEarlyMixedNorm,
	onApplyPermanentNorm,
	onApplyProcedurePreset,
	onInsertCariogramToClinicalNote,
}) => {
	const handleInsertToCard = onInsertCariogramToClinicalNote || (() => {});
	return (
		<div className="p-3 sm:p-4 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-900/60 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-2.5 shadow-2xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Zap className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-black text-[var(--teal,#0d9488)]">
						Клинические протоколы и физиологическая норма
					</span>
				</div>
				<span className="text-[11px] font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
					Клинические стандарты • Готовый дневник приёма
				</span>
			</div>

			{/* Quick Action Buttons Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
				{/* 1. 3 года: Временный прикус — норма */}
				<button
					type="button"
					onClick={onApplyPrimaryNorm}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму временного прикуса (3 года): 20 интактных молочных зубов (51–85), кариеса нет, резорбция 0%"
					data-testid="pediatric-preset-3y-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							3 года: Молочный
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							51–85 интактны
						</div>
					</div>
					<Check className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 2. 6 лет: Первый моляр — норма */}
				<button
					type="button"
					onClick={onApplyFirstMolarNorm}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму (6 лет): прорезывание первых моляров (16, 26, 36, 46) + 20 молочных зубов"
					data-testid="pediatric-preset-6y-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							6 лет: 1-й моляр
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							16, 26, 36, 46 интактны
						</div>
					</div>
					<Check className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 3. 9 лет: Сменный прикус — норма */}
				<button
					type="button"
					onClick={onApplyEarlyMixedNorm}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму сменного прикуса (9 лет): резцы 11..42, моляры 16..46, молочные 53..85"
					data-testid="pediatric-preset-9y-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							9 лет: Сменный
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							11..42, моляры 16..46
						</div>
					</div>
					<Check className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 4. 12 лет: Постоянный прикус — норма */}
				<button
					type="button"
					onClick={onApplyPermanentNorm}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму постоянного прикуса (12 лет): 28 постоянных зубов 17..27, 47..37 без 8-ок"
					data-testid="pediatric-preset-12y-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							12 лет: Постоянный
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							28 зубов без 8-ок
						</div>
					</div>
					<Check className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 5. Серебрение Saforide (серебрение резцов) */}
				<button
					type="button"
					onClick={() => onApplyProcedurePreset("saforide")}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Клинический протокол: Серебрение эмали Saforide 38% (51, 52, 61, 62)"
					data-testid="pediatric-preset-saforide-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							Saforide серебро
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							Резцы 51, 52, 61, 62
						</div>
					</div>
					<Sparkles className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 6. Герметизация фиссур Fissurit (герметизация моляров) */}
				<button
					type="button"
					onClick={() => onApplyProcedurePreset("fissurit")}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Клинический протокол: Запечатывание фиссур Fissurit FX (16, 26, 36, 46)"
					data-testid="pediatric-preset-fissurit-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							Fissurit герметик
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							Моляры 16, 26, 36, 46
						</div>
					</div>
					<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 7. Витальная пульпотомия Pulpotec */}
				<button
					type="button"
					onClick={() => onApplyProcedurePreset("pulpotec")}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Клинический протокол: Пульпотомия (ампутация пульпы) препаратом Pulpotec"
					data-testid="pediatric-preset-pulpotec-btn"
				>
					<div className="min-w-0">
						<div className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							Pulpotec витальный
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							Моляр 54 витальный
						</div>
					</div>
					<Activity className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>

				{/* 8. Вставить протокол в медицинскую карту */}
				<button
					type="button"
					onClick={handleInsertToCard}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Мгновенно перенести текущий протокол, Cariogram и поведение по Франклу в дневник приёма"
					data-testid="pediatric-preset-insert-card-btn"
				>
					<div className="min-w-0">
						<div className="font-bold whitespace-nowrap text-[var(--teal,#0d9488)]">
							В карту
						</div>
						<div className="text-[10px] text-[var(--ink-muted,#64748b)] whitespace-nowrap">
							Перенос в дневник
						</div>
					</div>
					<Zap className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				</button>
			</div>
		</div>
	);
};
