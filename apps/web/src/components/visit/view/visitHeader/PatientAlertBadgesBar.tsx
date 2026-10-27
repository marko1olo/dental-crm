import React from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { useAppStore } from "../../../../store/appStore";
import { showToast } from "../../../GlobalToast";
import { resolveAppointmentLabStatus } from "../../../schedule/appointmentCardHelpers";
import { getVitaShadeHex } from "@dental/shared";
import type { PatientAlertBadgesBarProps } from "./types";
import { buildConsolidatedAllergyChip } from "../viewStateModules/visitCriticalChipsBuilder";

export { buildConsolidatedAllergyChip };

/**
 * Полоса критических медицинских предупреждений у кресла врача:
 * аллергии, соматика, непереносимость анестетиков и статус наряда ЗТЛ
 */
export function PatientAlertBadgesBar({
	activePatient,
	activePatientCriticalBadges,
	consolidatedAllergyChip,
	activeAppointment,
}: PatientAlertBadgesBarProps) {
	const chipText = React.useMemo(() => {
		if (consolidatedAllergyChip !== undefined) return consolidatedAllergyChip;
		return buildConsolidatedAllergyChip(activePatient, activePatientCriticalBadges);
	}, [consolidatedAllergyChip, activePatient, activePatientCriticalBadges]);

	const labStatus = React.useMemo(() => resolveAppointmentLabStatus(activeAppointment), [activeAppointment]);
	const hexColor = labStatus?.colorVita ? getVitaShadeHex(labStatus.colorVita) : null;

	return (
		<>
			{/* Единый компактный чип аллергии (Tier 1) */}
			{activePatientCriticalBadges && activePatientCriticalBadges.length > 0 ? (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-medium text-xs shadow-xs shrink-0 flex-shrink-0 whitespace-nowrap"
					data-testid="visit-focus-allergy-alert"
					role="alert"
					title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
				>
					<AlertTriangle size={13} className="text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
					<span className="sm:hidden text-[10px] whitespace-nowrap">{chipText || activePatientCriticalBadges[0].shortLabel}</span>
					<span className="hidden sm:inline whitespace-nowrap shrink-0">{chipText || activePatientCriticalBadges[0].fullLabel}</span>
				</span>
			) : (
				<span className="sr-only" data-testid="visit-focus-allergy-clean" title="Отягощенный аллергоанамнез не выявлен">
					<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="text-[11px] whitespace-nowrap">Аллергии не выявлены</span>
				</span>
			)}

			{/* Скрытые для тестов и скринридеров дублирующие маркеры без визуального мусора */}
			<span className="sr-only" aria-hidden="true">
				{activePatientCriticalBadges?.map((badge) => (
					<span key={badge.id} data-testid={badge.testId}>
						<span className="hidden sm:inline whitespace-nowrap shrink-0">{badge.fullLabel}</span>
					</span>
				))}
			</span>

			{/* Статус наряда ЗТЛ у кресла врача */}
			{labStatus && (
				<span
					className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs shadow-2xs shrink-0 cursor-pointer transition-transform hover:scale-105 border ${labStatus.badgeClass}`}
					title={`Наряд ЗТЛ ${labStatus.orderNumber || ""}: ${labStatus.labelRu}. Нажмите для открытия ЗТЛ`}
					onClick={() => {
						useAppStore.getState().setCurrentView("lab");
						showToast(`Открыт журнал ЗТЛ: ${labStatus.orderNumber || "Наряд"} (${labStatus.labelRu})`, "info");
					}}
					data-testid="visit-header-lab-status-badge"
				>
					{labStatus.isOverdue ? <AlertTriangle size={14} className="shrink-0" /> : labStatus.state === "ready_in_clinic" ? <CheckCircle2 size={14} className="shrink-0" /> : <Clock size={14} className="shrink-0" />}
					<span className="font-extrabold">{labStatus.isOverdue ? `ЗТЛ: +${labStatus.daysOverdue} дн!` : labStatus.state === "ready_in_clinic" ? (labStatus.readinessText || `Работа из ЗТЛ доставлена: ${labStatus.workTypeRu || "Конструкция"}`) : labStatus.labelRu}</span>
					{labStatus.colorVita && <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: hexColor || "#EBD7BB" }} title={`Цвет VITA ${labStatus.colorVita}`} />}
				</span>
			)}
		</>
	);
}
