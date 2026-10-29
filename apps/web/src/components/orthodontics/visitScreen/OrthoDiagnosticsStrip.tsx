import React from "react";
import { Camera, Compass } from "lucide-react";
import type { AnbClass } from "../orthoProtocolTypes";

export interface OrthoDiagnosticsStripProps {
	readonly onOpenPhotoModal: () => void;
	readonly onOpenCephModal: () => void;
	readonly anbClass: AnbClass;
	readonly setAnbClass: (cls: AnbClass) => void;
	readonly setAnbAngle: (angle: number) => void;
	readonly isPhotoCompleted?: boolean;
}

export const OrthoDiagnosticsStrip: React.FC<OrthoDiagnosticsStripProps> = ({
	onOpenPhotoModal,
	onOpenCephModal,
	anbClass,
	setAnbClass,
	setAnbAngle,
	isPhotoCompleted,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 flex-wrap">
			<div className="flex items-center gap-2 w-full sm:w-auto">
				<button
					type="button"
					onClick={onOpenPhotoModal}
					className="secondary-button flex-1 sm:flex-initial min-h-[40px] sm:min-h-[36px] h-9 px-2.5 text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer border-[var(--line)]"
					title="Клинический фотопротокол 12 позиций"
				>
					<Camera size={14} className={isPhotoCompleted ? "text-emerald-500" : "text-teal-600 dark:text-teal-400"} />
					<span>Фотопротокол</span>
					{isPhotoCompleted && (
						<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Фотопротокол зафиксирован" />
					)}
				</button>
				<button
					type="button"
					onClick={onOpenCephModal}
					className="secondary-button flex-1 sm:flex-initial min-h-[40px] sm:min-h-[36px] h-9 px-2.5 text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer border-[var(--line)]"
					title="Разметка ТРГ и цефалометрический анализ"
				>
					<Compass size={14} className="text-teal-600 dark:text-teal-400" />
					<span>ТРГ Цефалометрия</span>
				</button>
			</div>

			<div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]/50">
				<span className="text-[11px] font-bold text-[var(--muted)]">ANB класс:</span>
				<div className="flex items-center gap-1">
					{(["I", "II", "III"] as const).map((cls) => {
					const isActive = anbClass === cls;
					return (
						<button
							key={cls}
							type="button"
							onClick={() => {
								setAnbClass(cls);
								setAnbAngle(cls === "I" ? 3.0 : cls === "II" ? 5.5 : -1.5);
							}}
							className={`px-2 py-1 rounded text-xs font-bold min-h-[30px] border transition-all ${
								isActive
									? "bg-[var(--paper-soft)] text-[var(--teal)] border-[var(--teal)] shadow-2xs font-extrabold"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							{cls}
						</button>
					);
				})}
				</div>
			</div>
		</div>
	);
};
