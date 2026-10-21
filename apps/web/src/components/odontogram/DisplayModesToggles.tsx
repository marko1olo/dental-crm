import type { OdontogramViewMode } from "@dental/shared";
import { Activity, Eye, EyeOff } from "lucide-react";
import type React from "react";

export interface DisplayModesTogglesProps {
	readonly showWisdomTeeth: boolean;
	readonly setShowWisdomTeeth: React.Dispatch<React.SetStateAction<boolean>>;
	readonly activeMode: OdontogramViewMode;
	readonly showPulpAndCanals: boolean;
	readonly setShowPulpAndCanals: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DisplayModesToggles: React.FC<DisplayModesTogglesProps> = ({
	showWisdomTeeth,
	setShowWisdomTeeth,
	activeMode,
	showPulpAndCanals,
	setShowPulpAndCanals,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={() => setShowWisdomTeeth((prev) => !prev)}
				className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
					showWisdomTeeth
						? "bg-indigo-500/10 border-indigo-400/40 shadow-xs"
						: "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
				}`}
				title="Показать или скрыть зубы мудрости (18, 28, 38, 48)"
				data-testid="btn-odontogram-wisdom-missing"
			>
				<span className="flex items-center gap-2.5 min-w-0">
					{showWisdomTeeth ? (
						<Eye
							size={16}
							className="shrink-0 text-indigo-600 dark:text-indigo-400"
						/>
					) : (
						<EyeOff
							size={16}
							className="shrink-0 text-slate-500 dark:text-slate-400"
						/>
					)}
					<div className="flex flex-col text-left min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							Зубы мудрости (8-ки)
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							Третьи моляры (18, 28, 38, 48)
						</span>
					</div>
				</span>
				<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0 ml-2">
					{showWisdomTeeth ? "ВКЛ" : "ВЫКЛ"}
				</span>
			</button>

			{activeMode === "anatomical_svg" && (
				<button
					type="button"
					onClick={() => setShowPulpAndCanals((prev) => !prev)}
					className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
						showPulpAndCanals
							? "bg-rose-500/15 border-rose-400/40 shadow-xs"
							: "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
					}`}
					title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
					data-testid="btn-odontogram-pulp-canals"
				>
					<span className="flex items-center gap-2.5 min-w-0">
						<Activity
							size={16}
							className={`shrink-0 ${showPulpAndCanals ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}
						/>
						<div className="flex flex-col text-left min-w-0">
							<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
								Каналы и пульпа
							</span>
							<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
								Рентген-прозрачность эмали для эндодонтии
							</span>
						</div>
					</span>
					<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0 ml-2">
						{showPulpAndCanals ? "ВКЛ" : "ВЫКЛ"}
					</span>
				</button>
			)}
		</>
	);
};
