import React from "react";
import { ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { ToothState } from "./ToothChart";

export interface ClassicGostPresetsBarProps {
	readonly pediatricMode?: boolean | undefined;
	readonly allTargetTeeth: number[];
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
}

export const ClassicGostPresetsBar: React.FC<ClassicGostPresetsBarProps> = ({
	pediatricMode,
	allTargetTeeth,
	onQuickStateChange,
}) => {
	const handleAllHealthy = () => {
		if (onQuickStateChange) {
			onQuickStateChange(allTargetTeeth, "Healthy", undefined);
			showToast("Зубная формула: Все зубы здоровы / интактный зубной ряд (норма)", "success");
		}
	};

	const handleWisdomMissing = () => {
		if (onQuickStateChange) {
			const wisdomTeeth = [18, 28, 38, 48];
			onQuickStateChange(wisdomTeeth, "Missing", undefined);
			showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие (0)", "info");
		}
	};

	const handleProhygiene = () => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-prohygiene-protocol", {
					detail: { immediate: true },
				}),
			);
		}
		showToast("Протокол профессиональной гигиены сформирован", "success");
	};

	return (
		<div className="gost-presets-bar w-full flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] rounded-xl shadow-xs">
			<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--odontogram-ink)]">
				<Zap size={13} className="text-amber-500 shrink-0" />
				<span>Клинические экспресс-протоколы:</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					data-testid="gost-preset-all-healthy"
					onClick={handleAllHealthy}
					title="Установить всем зубам статус Здоров (Интактный ряд по умолчанию)"
					className="inline-flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-900 dark:text-emerald-100 border-2 border-emerald-500 dark:border-emerald-400 shadow-xs transition-all active:scale-97 cursor-pointer"
				>
					<ShieldCheck size={13} className="text-emerald-700 dark:text-emerald-300 shrink-0" />
					<span>Все здоровы</span>
					<span className="text-[11px] font-normal opacity-80">(Интактный)</span>
				</button>

				{!pediatricMode && (
					<button
						type="button"
						data-testid="gost-preset-wisdom-missing"
						onClick={handleWisdomMissing}
						title="Отметить третьи моляры (18, 28, 38, 48) как отсутствующие (0)"
						className="inline-flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg text-xs font-bold bg-zinc-500/15 hover:bg-zinc-500/25 active:bg-zinc-500/35 text-zinc-900 dark:text-zinc-100 border-2 border-zinc-400 dark:border-zinc-400 shadow-xs transition-all active:scale-97 cursor-pointer"
					>
						<X size={13} className="text-zinc-700 dark:text-zinc-300 shrink-0" />
						<span>Без 8-ок</span>
						<span className="text-[11px] font-normal opacity-80">(Отсутствуют)</span>
					</button>
				)}

				<button
					type="button"
					data-testid="gost-preset-prohygiene"
					onClick={handleProhygiene}
					title="Сформировать протокол профессиональной гигиены полости рта"
					className="inline-flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 active:bg-sky-500/35 text-sky-900 dark:text-sky-100 border-2 border-sky-500 dark:border-sky-400 shadow-xs transition-all active:scale-97 cursor-pointer"
				>
					<Sparkles size={13} className="text-sky-700 dark:text-sky-300 shrink-0" />
					<span>Профгигиена</span>
					<span className="text-[11px] font-normal opacity-80">(Выполнена)</span>
				</button>
			</div>
		</div>
	);
};
