import React from "react";
import type { ExecutivePeriod } from "@dental/shared";
import { AlertCircle, Calendar, CalendarPlus, CreditCard } from "lucide-react";

export interface MobileExecutiveEmptyStateBannerProps {
	readonly isEmpty: boolean;
	readonly period: ExecutivePeriod;
	readonly onSelectPeriod: (p: ExecutivePeriod) => void;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function MobileExecutiveEmptyStateBanner({
	isEmpty,
	period,
	onSelectPeriod,
	onNavigateToSection,
}: MobileExecutiveEmptyStateBannerProps) {
	if (!isEmpty) return null;

	const handleNav = (section: string) => {
		if (onNavigateToSection) {
			onNavigateToSection(section);
		} else if (typeof window !== "undefined") {
			window.location.hash = `#${section}`;
		}
	};

	return (
		<div
			className="rounded-2xl p-4 my-3 border border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/20 shadow-xs"
			role="status"
			aria-label="Сообщение о пустом периоде"
			data-testid="mobile-executive-empty-banner"
		>
			<div className="flex items-start gap-3 mb-3">
				<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
					<AlertCircle size={20} aria-hidden="true" />
				</div>
				<div className="min-w-0">
					<div className="text-[14px] font-bold text-[var(--ink)] leading-tight">
						За выбранный период данных нет
					</div>
					<div className="text-[12px] text-[var(--muted)] mt-1 leading-normal">
						Запишите первых пациентов в расписание клиники или оформите приём оплаты в кассе.
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<button
					type="button"
					className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-transform"
					onClick={() => handleNav("schedule")}
				>
					<CalendarPlus size={16} aria-hidden="true" />
					<span>Записать пациента в расписание</span>
				</button>

				<div className="flex gap-2">
					<button
						type="button"
						className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-[12px] font-medium flex items-center justify-center gap-1.5 active:bg-[var(--paper-soft)]"
						onClick={() => handleNav("shift")}
					>
						<CreditCard size={15} className="text-teal-600" aria-hidden="true" />
						<span>Касса и чеки</span>
					</button>

					{period !== "month" && (
						<button
							type="button"
							className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-[12px] font-medium flex items-center justify-center gap-1.5 active:bg-[var(--paper-soft)]"
							onClick={() => onSelectPeriod("month")}
						>
							<Calendar size={15} className="text-teal-600" aria-hidden="true" />
							<span>За месяц</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
