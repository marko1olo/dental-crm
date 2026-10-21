import React from "react";
import { ShieldCheck } from "lucide-react";
import type { StagedPaymentScheduleBreakdown as Staged304030Schedule } from "@dental/shared";

export interface StagedPayment304030SectionProps {
	readonly schedule304030: Staged304030Schedule;
}

export const StagedPayment304030Section: React.FC<StagedPayment304030SectionProps> = ({
	schedule304030,
}) => {
	return (
		<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
			<div className="flex items-center gap-2.5 mb-3">
				<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
					<ShieldCheck size={18} />
				</div>
				<div>
					<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
						Поэтапная оплата по факту визитов
					</h3>
					<p className="text-xs text-[var(--muted)] m-0">
						Деньги списываются поэтапно, защищая бюджет пациента и материалы клиники
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{/* Шаг 1: Аванс 30% */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold text-[var(--teal)]">Этап 1: Аванс 30%</span>
							<span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] font-medium">
								Перед стартом
							</span>
						</div>
						<div className="text-base sm:text-lg font-extrabold text-[var(--ink)] font-mono mb-1">
							{schedule304030.stage1AdvanceTherapyRub.toLocaleString("ru-RU")} ₽
						</div>
						<p className="text-[11.5px] text-[var(--muted)] m-0">
							Санация полости рта, бронь расходных материалов и имплантов
						</p>
					</div>
				</div>

				{/* Шаг 2: Промежуточный 40% */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold text-purple-600 dark:text-purple-400">
								Этап 2: Хирургия 40%
							</span>
							<span className="text-[10.5px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
								День операции
							</span>
						</div>
						<div className="text-base sm:text-lg font-extrabold text-[var(--ink)] font-mono mb-1">
							{schedule304030.stage2SurgeryImplantRub.toLocaleString("ru-RU")} ₽
						</div>
						<p className="text-[11.5px] text-[var(--muted)] m-0">
							Установка дентальных имплантатов и костно-пластические работы
						</p>
					</div>
				</div>

				{/* Шаг 3: Финал 30% */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
								Этап 3: Финал 30%
							</span>
							<span className="text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
								При сдаче работы
							</span>
						</div>
						<div className="text-base sm:text-lg font-extrabold text-[var(--ink)] font-mono mb-1">
							{schedule304030.stage3OrthopedicsRub.toLocaleString("ru-RU")} ₽
						</div>
						<p className="text-[11.5px] text-[var(--muted)] m-0">
							Постоянная фиксация коронок и оформление гарантийного талона
						</p>
					</div>
				</div>
			</div>
		</section>
	);
};
