import { Check } from "lucide-react";
import type React from "react";

export const DuplicateSafetyChecklist: React.FC = () => {
	return (
		<div className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-2">
			<p className="text-[11px] font-black uppercase text-[var(--muted)] tracking-wider">
				Гарантии безопасности клинических данных:
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
				<div className="flex items-start gap-1.5">
					<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
					<span>
						<strong>Балансы и авансы:</strong> суммируются с точностью до
						копейки (0% потерь).
					</span>
				</div>
				<div className="flex items-start gap-1.5">
					<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
					<span>
						<strong>Аллергии и анамнез:</strong> строгое объединение (Strict
						UNION, ни один риск не теряется).
					</span>
				</div>
				<div className="flex items-start gap-1.5">
					<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
					<span>
						<strong>Приёмы и КТ:</strong> все визиты, снимки и планы лечения
						переносятся в основную карту.
					</span>
				</div>
				<div className="flex items-start gap-1.5">
					<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
					<span>
						<strong>Неразрушающий аудит:</strong> карта дубликата архивируется с
						сохранением полной истории (ничего не удаляется).
					</span>
				</div>
			</div>
		</div>
	);
};
