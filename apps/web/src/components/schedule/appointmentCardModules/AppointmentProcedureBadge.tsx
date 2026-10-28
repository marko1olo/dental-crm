import React from "react";
import { AlertTriangle, Check, Clock, FileText, Globe } from "lucide-react";
import { DentalToothIcon } from "../DentalToothIcon";
import { useAppStore } from "../../../store/appStore";
import { showToast } from "../../GlobalToast";
import type { AppointmentProcedureBadgeProps } from "./appointmentCardTypes";

export const AppointmentProcedureBadge: React.FC<AppointmentProcedureBadgeProps> = ({
	appointment: a,
	procedureLabel,
	teethList,
	docTheme,
	durationMin,
	labStatusInfo,
}) => {
	const handleLabClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		useAppStore.getState().setCurrentView("lab");
		if (typeof window !== "undefined") {
			window.location.hash = "#lab";
		}
		showToast(
			`ЗТЛ: ${labStatusInfo.labelRu} (${labStatusInfo.orderNumber || "Наряд"})`,
			"info",
		);
	};

	return (
		<div
			className="appointment-card-row-procedure flex items-center gap-1.5 flex-wrap w-full min-w-0 text-xs text-[var(--ink)]"
			data-testid={`appointment-card-procedure-row-${a.id}`}
		>
			{/* Procedure Icon & Label */}
			<div className="flex items-center gap-1.5 min-w-0 flex-1">
				<DentalToothIcon size={12} className="shrink-0 text-[var(--teal)] opacity-85" />
				<span
					className={`font-semibold text-xs text-[var(--ink)] ${
						durationMin >= 45 ? "line-clamp-2 leading-snug break-words" : "truncate"
					} min-w-0 flex-1`}
					title={procedureLabel}
				>
					{procedureLabel}
				</span>
			</div>

			{/* Badges Container */}
			<div className="flex items-center gap-1 shrink-0 flex-wrap">
				{/* FDI Tooth Formula Badges */}
				{teethList.map((tooth) => (
					<span
						key={tooth}
						className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[var(--teal)]/10 text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 shrink-0"
						title={`Зуб по формуле FDI: ${tooth}`}
					>
						Зуб {tooth}
					</span>
				))}

				{/* Doctor Specialty Theme Badge */}
				{docTheme && (
					<span
						className={`text-[9px] px-1 py-0.5 rounded border shrink-0 font-bold ${docTheme.badgeClass}`}
						title={`Специализация врача: ${docTheme.label}`}
						data-testid={`card-specialty-badge-${a.id}`}
					>
						{docTheme.label}
					</span>
				)}

				{/* Treatment Plan Badge */}
				{Boolean((a as any).treatmentPlanId || (a as any).planNumber) && (
					<span
						className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-bold shrink-0 flex items-center gap-0.5"
						title={`План лечения: ${(a as any).planNumber || (a as any).treatmentPlanId}`}
						data-testid={`appointment-treatment-plan-badge-${a.id}`}
					>
						<FileText size={9} className="shrink-0" />
						<span>План</span>
					</span>
				)}

				{/* Online Booking Badge */}
				{Boolean(
					(a?.comment && /онлайн|виджет|online|сайт/i.test(a.comment)) ||
					(a?.reason && /онлайн|виджет|online|сайт/i.test(a.reason))
				) && (
					<span
						className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30 font-bold shrink-0 flex items-center gap-0.5"
						title="Онлайн-запись через сайт"
						data-testid={`appointment-online-booking-badge-${a.id}`}
					>
						<Globe size={9} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
						<span>Онлайн</span>
					</span>
				)}

				{/* Strictly One ZTL Lab Badge */}
				{labStatusInfo && (
					<span
						className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 transition-transform hover:scale-105 cursor-pointer ${labStatusInfo.badgeClass}`}
						title={
							labStatusInfo.state === "ready_in_clinic"
								? `${labStatusInfo.readinessText || `Работа из ЗТЛ доставлена: ${labStatusInfo.workTypeRu || "Конструкция"}${labStatusInfo.toothFdi ? ` зуб ${labStatusInfo.toothFdi}` : ""}`}. Нажмите для перехода в ЗТЛ`
								: `Статус наряда ЗТЛ: ${labStatusInfo.labelRu}${
										labStatusInfo.workTypeRu ? ` (${labStatusInfo.workTypeRu})` : ""
									}${labStatusInfo.colorVita ? ` VITA ${labStatusInfo.colorVita}` : ""}. Нажмите для перехода в ЗТЛ`
						}
						onClick={handleLabClick}
						data-testid={`appointment-lab-badge-${a.id}`}
					>
						{labStatusInfo.isOverdue ? (
							<AlertTriangle size={10} className="shrink-0" />
						) : labStatusInfo.state === "ready_in_clinic" ? (
							<Check size={10} className="shrink-0 stroke-[3]" />
						) : (
							<Clock size={10} className="shrink-0" />
						)}
						<span>
							{labStatusInfo.isOverdue
								? `⚠️ ЗТЛ задерживает: +${labStatusInfo.daysOverdue} дн`
								: labStatusInfo.state === "ready_in_clinic"
									? "✓ Работа из ЗТЛ в клинике"
									: labStatusInfo.shortLabelRu}
						</span>
					</span>
				)}
			</div>
		</div>
	);
};
