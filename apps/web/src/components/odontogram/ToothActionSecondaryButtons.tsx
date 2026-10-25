import { Activity, FlaskConical, History, Stethoscope } from "lucide-react";
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
}) => {
	const handleLabOrder = () => {
		const targets =
			selectedTeeth.length > 0 && selectedTeeth.includes(toothNumber)
				? selectedTeeth
				: [toothNumber];
		void onOneClickLabOrder(targets);
		onClose();
	};

	return (
		<>
			<button
				type="button"
				data-testid="radial-menu-tooth-drawer-btn"
				onClick={() => {
					onOpenContextDrawer(toothNumber);
					onClose();
				}}
				className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-teal-500/10 text-teal-800 dark:text-teal-200 border-teal-500/30 hover:bg-teal-500/20 cursor-pointer min-w-0 text-center leading-tight active:scale-95"
			>
				<Stethoscope className="w-4 h-4 inline mr-2 text-teal-600 shrink-0" />
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
				className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/20 cursor-pointer min-w-0 text-center leading-tight"
			>
				<History className="w-4 h-4 inline mr-2 shrink-0" />
				<span className="min-w-0 break-words">История зуба</span>
			</button>
			<button
				type="button"
				data-testid="radial-menu-endo-log-btn"
				onClick={() => {
					onOpenEndo(toothNumber);
					onClose();
				}}
				className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 hover:bg-rose-500/20 cursor-pointer min-w-0 text-center leading-tight"
			>
				<Activity className="w-4 h-4 inline mr-2 shrink-0" />
				<span className="min-w-0 break-words">Журнал каналов (Эндо)</span>
			</button>
			<button
				type="button"
				data-testid="radial-menu-lab-order-btn"
				onClick={handleLabOrder}
				className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-black text-sm bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30 hover:bg-amber-500/25 cursor-pointer min-w-0 text-center leading-tight shadow-2xs active:scale-95"
			>
				<FlaskConical className="w-4 h-4 inline mr-2 text-amber-600 shrink-0" />
				<span className="min-w-0 break-words">
					Наряд в ЗТЛ (Цирконий A2, +7 дн.)
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
