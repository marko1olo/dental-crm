import type React from "react";
import { SurfaceSelector } from "./ToothChart";

const SURFACE_CHIPS = [
	{
		label: "MOD",
		surfs: ["M", "O", "D"],
		title: "Медиально-окклюзионно-дистальная (MOD)",
	},
	{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная (MO)" },
	{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная (OD)" },
	{ label: "O", surfs: ["O"], title: "Окклюзионная (O/Жевательная)" },
	{ label: "M", surfs: ["M"], title: "Медиальная (M)" },
	{ label: "D", surfs: ["D"], title: "Дистальная (D)" },
	{ label: "V", surfs: ["V"], title: "Вестибулярная (V)" },
	{ label: "L", surfs: ["L"], title: "Язычная / Нёбная (L)" },
	{ label: "К", surfs: ["K"], title: "Контактная / Коронковая (К)" },
	{ label: "А", surfs: ["A"], title: "Апикальная (А)" },
] as const;

export interface ToothActionSurfacesAccordionProps {
	readonly activeSurfaces: string[];
	readonly setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ToothActionSurfacesAccordion: React.FC<
	ToothActionSurfacesAccordionProps
> = ({ activeSurfaces, setActiveSurfaces }) => {
	return (
		<details className="odontogram-surfaces-accordion col-span-2 group rounded-xl bg-[var(--odontogram-surface,#f1f5f9)] dark:bg-zinc-800/60 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700/50 p-2 transition-all">
			<summary className="flex items-center justify-between cursor-pointer select-none px-1 text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] dark:hover:text-zinc-100 transition-colors">
				<span className="flex items-center gap-1.5">
					<span>Указать поверхности (опционально)</span>
					<span className="text-[10px] text-[var(--muted,#64748b)] font-normal group-open:hidden">
						▾ раскрыть
					</span>
					<span className="text-[10px] text-[var(--muted,#64748b)] font-normal hidden group-open:inline">
						▴ свернуть
					</span>
				</span>
				<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)]">
					{activeSurfaces.length > 0
						? `[${activeSurfaces.join("")}]`
						: "вся коронка"}
				</span>
			</summary>
			<div className="flex flex-col gap-1 mt-2 pt-2 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700/50">
				<div className="flex items-center justify-between gap-1 flex-nowrap overflow-x-auto py-0.5">
					{SURFACE_CHIPS.map((chip) => {
						const isSelected =
							chip.surfs.length > 0 &&
							chip.surfs.every((s) => activeSurfaces.includes(s));
						return (
							<button
								key={chip.label}
								type="button"
								onClick={() => {
								setActiveSurfaces((prev) =>
									isSelected
										? prev.filter((s) => !chip.surfs.some((cs) => cs === s))
										: Array.from(new Set([...prev, ...chip.surfs])),
								);
								}}
								className={`flex-1 min-h-[44px] sm:min-h-[32px] min-w-[44px] px-2 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center ${
									isSelected
										? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
										: "bg-[var(--odontogram-paper,#ffffff)] dark:bg-zinc-900 text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-200 border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-[var(--odontogram-surface-hover,#e2e8f0)]"
								}`}
								title={chip.title}
								data-testid={`odontogram-module-surf-${chip.label}`}
							>
								{chip.label}
							</button>
						);
					})}
				</div>
				<details className="mt-1">
					<summary className="text-[11px] text-[var(--muted,#64748b)] cursor-pointer hover:underline text-center">
						Анатомическая 2D схема
					</summary>
					<div className="flex justify-center p-1">
						<SurfaceSelector
							selected={activeSurfaces}
							onChange={setActiveSurfaces}
							size={80}
						/>
					</div>
				</details>
			</div>
		</details>
	);
};
