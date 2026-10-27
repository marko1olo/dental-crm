import React from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import { showToast } from "../../GlobalToast";
import type { AppointmentPatientSummaryProps } from "./appointmentCardTypes";

export const AppointmentPatientSummary: React.FC<AppointmentPatientSummaryProps> = ({
	appointment: a,
	pName,
	aStart,
	aEnd,
	isCito,
	durationMin,
	patientAgeLabel,
	patObj,
}) => {
	const handlePatientClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (a.patientId) {
			usePatientStore.getState().setSelectedPatientId(a.patientId);
			useAppStore.getState().setCurrentView("patients");
			showToast(`Карта пациента: ${pName}`, "info");
		}
	};

	const hasAllergy = Boolean(
		patObj?.allergies &&
			typeof patObj.allergies === "string" &&
			patObj.allergies.trim().length > 0,
	);

	return (
		<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
			{/* Time Range: clear start - end time for long visits (e.g. 14:00 - 16:00) */}
			<span
				className="font-bold text-xs text-[var(--ink)] font-mono shrink-0"
				title={`Время приёма: ${aStart}–${aEnd}`}
			>
				{durationMin > 30 && aEnd && aEnd !== aStart ? `${aStart} - ${aEnd}` : aStart}
			</span>

			{/* Duration Badge for long visits (>= 60 min, e.g. 1 час, 2ч, 3ч) */}
			{durationMin >= 60 && (
				<span
					className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line-strong)] text-[var(--ink)] shrink-0 font-mono select-none"
					title={`Продолжительность: ${durationMin >= 120 ? `${Math.floor(durationMin / 60)} ч ${durationMin % 60 ? `${durationMin % 60} мин` : ""}`.trim() : `${durationMin} мин`}`}
					data-testid={`appointment-duration-badge-${a.id}`}
				>
					{durationMin >= 120
						? `${Math.floor(durationMin / 60)} ч${durationMin % 60 ? ` ${durationMin % 60}м` : ""}`
						: `${durationMin} мин`}
				</span>
			)}

			{/* CITO / Urgent Pain Alert */}
			{isCito && (
				<span
					className="text-[9px] px-1 py-0.5 rounded bg-rose-600 text-white font-black shrink-0 animate-pulse flex items-center gap-0.5"
					title="Срочный приём (острая боль)"
					data-testid="appointment-cito-overbooking-badge"
				>
					<Zap size={9} className="fill-white" />
					<span>СРОЧНО</span>
				</span>
			)}

			{/* Patient FIO & Age */}
			<div
				className="flex items-center gap-1 min-w-0 flex-1 truncate hover:underline cursor-pointer tracking-tight"
				title={`Пациент: ${pName}${patientAgeLabel ? ` (${patientAgeLabel})` : ""}. Нажмите для перехода в карточку`}
				onClick={handlePatientClick}
			>
				<span className="font-bold text-[13px] text-[var(--ink)] truncate min-w-0">
					{formatPatientDisplayFio(pName)}
				</span>
				{patientAgeLabel && durationMin >= 60 && (
					<span className="text-[11px] text-[var(--muted)] font-normal shrink-0 whitespace-nowrap">
						· {patientAgeLabel}
					</span>
				)}
			</div>

			{/* Allergy Pill Warning */}
			{hasAllergy && (
				<span
					className="text-[9px] font-bold px-1 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0 hidden sm:inline-flex items-center gap-0.5"
					title={`Аллергия у пациента: ${patObj.allergies}`}
				>
					<AlertTriangle size={9} className="text-rose-600 shrink-0" />
					<span className="truncate max-w-[80px]">Аллергия</span>
				</span>
			)}
		</div>
	);
};
