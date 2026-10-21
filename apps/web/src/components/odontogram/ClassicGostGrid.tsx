import React from "react";

export interface ClassicGostGridProps {
	readonly pediatricMode?: boolean | undefined;
	readonly topQ1: readonly number[];
	readonly topQ2: readonly number[];
	readonly bottomQ4: readonly number[];
	readonly bottomQ3: readonly number[];
	readonly renderCell: (toothNumber: number, isUpper: boolean) => React.ReactNode;
}

export const ClassicGostGrid: React.FC<ClassicGostGridProps> = ({
	pediatricMode,
	topQ1,
	topQ2,
	bottomQ4,
	bottomQ3,
	renderCell,
}) => {
	return (
		<div className="gost-scroll-container w-full overflow-x-auto flex justify-center py-2">
			<div className="inline-flex flex-col items-center gap-2 mx-auto">
				{/* UPPER JAW */}
				<div className="w-fit flex flex-col items-center gap-1.5">
					<div className="w-full flex items-center justify-between text-xs font-bold text-[var(--odontogram-ink-muted)] px-1">
						<span className="text-left">
							{pediatricMode ? "Правая сторона (55 → 51)" : "Правая сторона (18 → 11)"}
						</span>
						<span className="text-center font-extrabold text-[var(--odontogram-ink)]">
							Верхняя челюсть (Maxilla)
						</span>
						<span className="text-right">
							{pediatricMode ? "Левая сторона (61 → 65)" : "Левая сторона (21 → 28)"}
						</span>
					</div>
					<div className="flex items-center justify-center gap-2">
						<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
							{topQ1.map((num) => renderCell(num, true))}
						</div>
						<div
							className="w-[2px] h-16 bg-indigo-500/50 dark:bg-indigo-400/50 rounded-full mx-1 shrink-0"
							title="Сагиттальная средняя линия"
						/>
						<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
							{topQ2.map((num) => renderCell(num, true))}
						</div>
					</div>
				</div>

				{/* Occlusal Plane Cross Divider */}
				<div className="w-full flex items-center justify-center gap-3 my-1">
					<div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[var(--odontogram-border-strong)] to-[var(--odontogram-border-strong)]" />
					<span className="text-xs font-black uppercase tracking-wider text-[var(--odontogram-ink-muted)] px-2.5 py-0.5 rounded-full bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] whitespace-nowrap shadow-2xs">
						Окклюзионная плоскость
					</span>
					<div className="h-[1.5px] flex-1 bg-gradient-to-r from-[var(--odontogram-border-strong)] via-[var(--odontogram-border-strong)] to-transparent" />
				</div>

				{/* LOWER JAW */}
				<div className="w-fit flex flex-col items-center gap-1.5">
					<div className="flex items-center justify-center gap-2">
						<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
							{bottomQ4.map((num) => renderCell(num, false))}
						</div>
						<div
							className="w-[2px] h-16 bg-indigo-500/50 dark:bg-indigo-400/50 rounded-full mx-1 shrink-0"
							title="Сагиттальная средняя линия"
						/>
						<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
							{bottomQ3.map((num) => renderCell(num, false))}
						</div>
					</div>
					<div className="w-full flex items-center justify-between text-xs font-bold text-[var(--odontogram-ink-muted)] px-1">
						<span className="text-left">
							{pediatricMode ? "Правая сторона (85 → 81)" : "Правая сторона (48 → 41)"}
						</span>
						<span className="text-center font-extrabold text-[var(--odontogram-ink)]">
							Нижняя челюсть (Mandible)
						</span>
						<span className="text-right">
							{pediatricMode ? "Левая сторона (71 → 75)" : "Левая сторона (31 → 38)"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
