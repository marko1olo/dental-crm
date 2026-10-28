import { Activity, ChevronRight, FlaskConical, History, Stethoscope } from "lucide-react";
import type React from "react";
import { ToothActionInsertDiaryButton } from "./ToothActionInsertDiaryButton";
import type { ToothData } from "./ToothChart";

export interface ToothActionSecondaryButtonsProps {
	readonly toothNumber: number;
	readonly selectedTeeth: number[];
	readonly activeSurfaces: string[];
	readonly teethData: readonly ToothData[];
	readonly onClose: () => void;
	readonly onOpenContextDrawer: (toothNumber: number) => void;
	readonly onOpenHistory: (toothNumber: number) => void;
	readonly onOpenEndo: (toothNumber: number) => void;
	readonly onOneClickLabOrder: (targetTeeth: number[]) => void;
	readonly variant?: "grid" | "grouped-list" | undefined;
}

export const ToothActionSecondaryButtons: React.FC<
	ToothActionSecondaryButtonsProps
> = ({
	toothNumber,
	selectedTeeth,
	activeSurfaces,
	teethData,
	onClose,
	onOpenContextDrawer,
	onOpenHistory,
	onOpenEndo,
	onOneClickLabOrder,
	variant = "grid",
}) => {
	const handleLabOrder = () => {
		const targets =
			selectedTeeth.length > 0 && selectedTeeth.includes(toothNumber)
				? selectedTeeth
				: [toothNumber];
		void onOneClickLabOrder(targets);
		onClose();
	};

	const handleCustomLabOrder = () => {
		const targets =
			selectedTeeth.length > 0 && selectedTeeth.includes(toothNumber)
				? selectedTeeth
				: [toothNumber];
		window.dispatchEvent(
			new CustomEvent("dente-open-lab-order-modal", {
				detail: {
					toothFdi: targets.join(", "),
					toothNumber: targets.join(", "),
					material: "Katana STML",
					colorVita: "A2",
				},
			}),
		);
		onClose();
	};

	if (variant === "grouped-list") {
		return (
			<div className="w-full bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--line,#e2e8f0)] dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-[var(--line-subtle,#f1f5f9)] dark:divide-zinc-800/80">
				{/* 1. Карточка зуба */}
				<button
					type="button"
					data-testid="radial-menu-tooth-drawer-btn"
					onClick={() => {
						onOpenContextDrawer(toothNumber);
						onClose();
					}}
					className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-zinc-800/60 select-none bg-transparent"
				>
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
							<Stethoscope className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[15px] font-bold text-[var(--ink,#0f172a)] truncate">
								Карточка зуба
							</div>
							<div className="text-[12px] text-[var(--muted,#64748b)] truncate">
								Клинические детали, статус и заметки
							</div>
						</div>
					</div>
					<ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
				</button>

				{/* 2. История зуба */}
				<button
					type="button"
					onClick={() => {
						onOpenHistory(toothNumber);
						onClose();
					}}
					className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-zinc-800/60 select-none bg-transparent"
				>
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
							<History className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[15px] font-bold text-[var(--ink,#0f172a)] truncate">
								История зуба
							</div>
							<div className="text-[12px] text-[var(--muted,#64748b)] truncate">
								Хроника приёмов и снимков
							</div>
						</div>
					</div>
					<ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
				</button>

				{/* 3. Журнал каналов (Эндо) */}
				<button
					type="button"
					data-testid="radial-menu-endo-log-btn"
					onClick={() => {
						onOpenEndo(toothNumber);
						onClose();
					}}
					className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-zinc-800/60 select-none bg-transparent"
				>
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
							<Activity className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[15px] font-bold text-[var(--ink,#0f172a)] truncate">
								Журнал каналов (Эндо)
							</div>
							<div className="text-[12px] text-[var(--muted,#64748b)] truncate">
								Длина, апекслокация, мастер-файл
							</div>
						</div>
					</div>
					<ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
				</button>

				{/* 4. Наряд в ЗТЛ (Быстрый цирконий) */}
				<button
					type="button"
					data-testid="radial-menu-lab-order-btn"
					onClick={handleLabOrder}
					className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-zinc-800/60 select-none bg-transparent"
				>
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
							<FlaskConical className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[15px] font-bold text-[var(--ink,#0f172a)] truncate">
								Заказать в ЗТЛ (Katana STML)
							</div>
							<div className="text-[12px] text-[var(--muted,#64748b)] truncate">
								Быстрый заказ коронки (зуб {toothNumber} · Katana STML · A2)
							</div>
						</div>
					</div>
					<ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
				</button>

				{/* 5. Наряд в ЗТЛ с параметрами */}
				<button
					type="button"
					data-testid="radial-menu-lab-order-custom-btn"
					onClick={handleCustomLabOrder}
					className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-zinc-800/60 select-none bg-transparent"
				>
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
							<FlaskConical className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[15px] font-bold text-[var(--ink,#0f172a)] truncate">
								Наряд в ЗТЛ (выбор Vita / даты)
							</div>
							<div className="text-[12px] text-[var(--muted,#64748b)] truncate">
								Выбор оттенка, примерки и лаборатории
							</div>
						</div>
					</div>
					<ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
				</button>

				{/* 6. Вставить в дневник */}
				<ToothActionInsertDiaryButton
					toothNumber={toothNumber}
					activeSurfaces={activeSurfaces}
					teethData={teethData}
					onClose={onClose}
					variant="grouped-list"
				/>
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				data-testid="radial-menu-tooth-drawer-btn"
				onClick={() => {
					onOpenContextDrawer(toothNumber);
					onClose();
				}}
				className="col-span-2 flex items-center justify-center min-h-[44px] sm:min-h-[38px] p-3 sm:p-2 rounded-xl border border-teal-600 bg-teal-600 hover:bg-teal-500 text-white transition-all duration-150 font-black text-sm shadow-sm cursor-pointer min-w-0 text-center leading-tight active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
			>
				<Stethoscope className="w-4 h-4 inline mr-2 text-white shrink-0" />
				<span className="min-w-0 break-words">
					Карточка зуба / Клинические детали
				</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onOpenHistory(toothNumber);
					onClose();
				}}
				className="col-span-2 flex items-center justify-center min-h-[40px] sm:min-h-[34px] p-2.5 sm:p-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-white/15 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 transition-all duration-150 font-bold text-sm cursor-pointer min-w-0 text-center leading-tight active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
			>
				<History className="w-4 h-4 inline mr-2 text-indigo-500 dark:text-indigo-400 shrink-0" />
				<span className="min-w-0 break-words">История зуба</span>
			</button>
			<button
				type="button"
				data-testid="radial-menu-endo-log-btn"
				onClick={() => {
					onOpenEndo(toothNumber);
					onClose();
				}}
				className="col-span-2 flex items-center justify-center min-h-[40px] sm:min-h-[34px] p-2.5 sm:p-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-white/15 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 transition-all duration-150 font-bold text-sm cursor-pointer min-w-0 text-center leading-tight active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
			>
				<Activity className="w-4 h-4 inline mr-2 text-rose-500 dark:text-rose-400 shrink-0" />
				<span className="min-w-0 break-words">Журнал каналов (Эндо)</span>
			</button>
			<button
				type="button"
				data-testid="radial-menu-lab-order-btn"
				onClick={handleLabOrder}
				className="col-span-2 flex items-center justify-center min-h-[40px] sm:min-h-[34px] p-2.5 sm:p-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-white/15 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 transition-all duration-150 font-bold text-sm cursor-pointer min-w-0 text-center leading-tight active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 shadow-2xs"
			>
				<FlaskConical className="w-4 h-4 inline mr-2 text-amber-500 dark:text-amber-400 shrink-0" />
				<span className="min-w-0 break-words">
					Наряд в ЗТЛ (Цирконий A2, +7 дн.)
				</span>
			</button>
			<button
				type="button"
				data-testid="radial-menu-lab-order-custom-btn"
				onClick={handleCustomLabOrder}
				className="col-span-2 flex items-center justify-center min-h-[40px] sm:min-h-[34px] p-2.5 sm:p-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-white/15 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 transition-all duration-150 font-bold text-sm cursor-pointer min-w-0 text-center leading-tight active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 shadow-2xs"
			>
				<FlaskConical className="w-4 h-4 inline mr-2 text-teal-600 dark:text-teal-400 shrink-0" />
				<span className="min-w-0 break-words">
					Наряд в ЗТЛ (выбор Vita / даты примерки)
				</span>
			</button>
			<ToothActionInsertDiaryButton
				toothNumber={toothNumber}
				activeSurfaces={activeSurfaces}
				teethData={teethData}
				onClose={onClose}
			/>
		</>
	);
};
