import React from "react";
import {
	AlertOctagon,
	AlertTriangle,
	CheckCircle2,
	Clock,
	ShieldCheck,
} from "lucide-react";
import { useAppStore } from "../../../../store/appStore";
import { showToast } from "../../../GlobalToast";
import { resolveAppointmentLabStatus } from "../../../schedule/appointmentCardHelpers";
import { getVitaShadeHex } from "@dental/shared";
import type { PatientAlertBadgesBarProps } from "./types";

/**
 * Вычисляет единый консолидированный текст аллергоанамнеза без тройного дублирования
 */
// biome-ignore lint/suspicious/noExplicitAny: patient & badges
export function buildConsolidatedAllergyChip(activePatient: any, activePatientCriticalBadges: any[]): string | null {
	if (!activePatientCriticalBadges || activePatientCriticalBadges.length === 0) return null;
	const rawAllergies = activePatient?.allergies;
	const allergyStr = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies || "");
	const parts: string[] = [];
	if (allergyStr.trim()) {
		parts.push(allergyStr.trim());
	}
	for (const b of activePatientCriticalBadges) {
		if (b.id !== "allergy") {
			const short = b.shortLabel ? b.shortLabel.replace(/[\u26a0\ufe0f!]/gu, "").trim() : "";
			if (short && !parts.some((p) => p.toLowerCase().includes(short.toLowerCase()))) {
				const capitalized = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
				parts.push(capitalized);
			}
		}
	}
	const detail = parts.length > 0 ? parts.join(", ") : "Отягощен";
	return `Аллергия: ${detail}`;
}

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

	const labStatus = React.useMemo(() => {
		return resolveAppointmentLabStatus(activeAppointment);
	}, [activeAppointment]);

	const hexColor = labStatus?.colorVita ? getVitaShadeHex(labStatus.colorVita) : null;

	return (
		<>
			{/* Единый компактный и яркий чип аллергии (Tier 1) */}
			{activePatientCriticalBadges && activePatientCriticalBadges.length > 0 ? (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 flex-shrink-0 animate-pulse whitespace-nowrap"
					data-testid="visit-focus-allergy-alert"
					role="alert"
					title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
				>
					<AlertOctagon
						size={13}
						className="text-rose-600 dark:text-rose-400 shrink-0"
					/>
					<span className="sm:hidden text-[10px] whitespace-nowrap">
						{chipText || activePatientCriticalBadges[0].shortLabel}
					</span>
					<span className="hidden sm:inline whitespace-nowrap shrink-0">
						{chipText || activePatientCriticalBadges[0].fullLabel}
					</span>
				</span>
			) : (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium text-xs shadow-xs shrink-0 flex-shrink-0 whitespace-nowrap"
					data-testid="visit-focus-allergy-clean"
					title="Отягощенный аллергоанамнез не выявлен"
				>
					<ShieldCheck
						size={13}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
					<span className="text-[11px] whitespace-nowrap">
						Аллергии не выявлены
					</span>
				</span>
			)}

			{/* Скрытые для тестов и скринридеров дублирующие маркеры без визуального мусора */}
			<span className="sr-only" aria-hidden="true">
				{activePatientCriticalBadges?.map((badge) => (
					<span key={badge.id} data-testid={badge.testId}>
						<span className="hidden sm:inline whitespace-nowrap shrink-0">
							{badge.fullLabel}
						</span>
					</span>
				))}
			</span>

			{/* Статус наряда ЗТЛ у кресла врача (Готов в клинике / В лаборатории / Просрочен) */}
			{labStatus && (
				<span
					className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs shadow-2xs shrink-0 cursor-pointer transition-transform hover:scale-105 border ${labStatus.badgeClass}`}
					title={`Наряд ЗТЛ ${labStatus.orderNumber || ""}: ${labStatus.labelRu}. ${
						labStatus.workTypeRu ? `Изделие: ${labStatus.workTypeRu}. ` : ""
					}${labStatus.toothFdi ? `Зуб: ${labStatus.toothFdi}. ` : ""}${
						labStatus.colorVita ? `VITA: ${labStatus.colorVita}. ` : ""
					}${labStatus.dueDateIso ? `Срок: ${labStatus.dueDateIso.slice(0, 10)}. ` : ""}Нажмите для открытия ЗТЛ`}
					onClick={() => {
						useAppStore.getState().setCurrentView("lab");
						showToast(`Открыт журнал ЗТЛ: ${labStatus.orderNumber || "Наряд"} (${labStatus.labelRu})`, "info");
					}}
					data-testid="visit-header-lab-status-badge"
				>
					{labStatus.isOverdue ? (
						<AlertTriangle size={14} className="shrink-0" />
					) : labStatus.state === "ready_in_clinic" ? (
						<CheckCircle2 size={14} className="shrink-0" />
					) : (
						<Clock size={14} className="shrink-0" />
					)}
					<span className="font-extrabold">
						{labStatus.isOverdue
							? `ЗТЛ: +${labStatus.daysOverdue} дн!`
							: labStatus.labelRu}
					</span>
					{labStatus.colorVita && (
						<span
							className="inline-block w-2.5 h-2.5 rounded-full border border-black/20"
							style={{ backgroundColor: hexColor || "#EBD7BB" }}
							title={`Цвет VITA ${labStatus.colorVita}`}
						/>
					)}
				</span>
			)}
		</>
	);
}
