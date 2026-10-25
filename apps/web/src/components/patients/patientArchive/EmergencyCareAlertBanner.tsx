import React from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { showToast } from "../../GlobalToast";

export const EmergencyCareAlertBanner: React.FC = () => {
	return (
		<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex flex-col gap-2 mt-2">
			<div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
				<AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
				<span>Неотложная помощь при острой боли:</span>
			</div>
			<span>
				Отказ в медицинской помощи при острой боли или неотложном состоянии недопустим.
				Блокировка записи в ЧС не отменяет права пациента на неотложный приём у дежурного врача.
			</span>
			<div className="flex items-center gap-2 pt-1">
				<button
					type="button"
					onClick={() => {
						showToast(
							"Режим экстренной записи активирован (острая боль). Блокировка ЧС обойдена для неотложного слота.",
							"info",
						);
					}}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-xs"
					title="Разрешить запись пациента с острой болью"
				>
					<Zap size={14} className="text-white shrink-0" aria-hidden="true" />
					<span>Экстренная запись (Острая боль / Неотложный приём)</span>
				</button>
			</div>
		</div>
	);
};
