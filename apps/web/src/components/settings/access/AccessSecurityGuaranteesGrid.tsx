import { Coins, FileCheck, Lock, ShieldCheck } from "lucide-react";
import type React from "react";

const GUARANTEES = [
	{
		icon: ShieldCheck,
		title: "Защита данных",
		desc: "Телефоны, паспорта и СНИЛС маскируются для ассистентов. Врачи и администраторы видят необходимые контакты.",
	},
	{
		icon: Lock,
		title: "Финансовая изоляция",
		desc: "Сводный P&L и общая выручка клиники доступны только Директору и Главврачу. Врач видит личную выработку.",
	},
	{
		icon: Coins,
		title: "Сдельная оплата",
		desc: "Расчёт мотивации (% от приёма минус ЗТЛ и материалы) ведётся строго в целых копейках с нулевой погрешностью.",
	},
	{
		icon: FileCheck,
		title: "Подпись протоколов",
		desc: "Клинические протоколы подписывают исключительно врачи. Ассистенты и регистраторы лишены права подписи.",
	},
] as const;

export const AccessSecurityGuaranteesGrid: React.FC = () => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0" data-testid="security-guarantees-grid">
			{GUARANTEES.map((item) => {
				const Icon = item.icon;
				return (
					<div
						key={item.title}
						className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col justify-between gap-2 min-w-0 min-h-[88px]"
					>
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 flex items-center justify-center shrink-0">
								<Icon size={15} />
							</div>
							<span className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug">
								{item.title}
							</span>
						</div>
						<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 leading-relaxed break-words min-w-0 pl-9">
							{item.desc}
						</p>
					</div>
				);
			})}
		</div>
	);
};
