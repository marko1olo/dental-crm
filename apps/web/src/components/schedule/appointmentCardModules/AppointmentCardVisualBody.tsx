import React from "react";
import { Stethoscope, Zap } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import {
	AppointmentStatusBadgeSelector,
	AppointmentBalanceBadge,
	AppointmentAlertBadges,
	AppointmentMedicalBadges,
} from "../AppointmentPaymentBadges";
import { AppointmentCardPrimaryActions } from "../AppointmentCardPrimaryActions";
import { AppointmentCardContextMenu } from "../AppointmentCardContextMenu";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import { formatPatientDisplayFio } from "./AppointmentCardTeethList";
import type { AppointmentCardVisualBodyProps } from "./types";

export function AppointmentCardVisualBody({
	props,
	state,
	isMicroDensity,
	isTwoLineMode,
	appointmentSuggestions,
	onOpenVisit,
	openAppointmentEditor,
	setIsMobileSheetOpen,
}: AppointmentCardVisualBodyProps) {
	const {
		appointment,
		dashboard,
		openScheduleSuggestion,
		formatTime,
		repeatAppointment,
		copyAppointmentToBuffer,
		appointmentLabels,
		appointmentEditing,
	} = props;

	const {
		appointmentDoctor,
		appointmentPatient,
		appointmentPatientName,
		patientBalance,
		isCito,
		displayStatus,
		isQuickStatusUpdating,
		isLockedStatus,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
		activeScheduleCollision,
		appointmentHasOpenVisit,
		cardTeeth,
		allergyAlert,
		somaticAlert,
		appointmentChair,
	} = state;

	if (isMicroDensity && !appointmentEditing) {
		return (
			/* 1. РЕЖИМ 15–20 МИНУТ: Автоматический 1-строчный микро-компакт режим */
			<div
				className="appointment-card-micro-row flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full select-none"
				data-testid="appointment-card-micro-row"
				data-density="micro"
			>
				<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
					<span className="appointment-card-time font-bold text-xs text-[var(--ink)] shrink-0 font-mono tracking-tight">
						{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
					</span>
					<h3
						className="text-xs font-bold truncate shrink-0 max-w-[140px] sm:max-w-[180px] text-[var(--ink)] hover:text-[var(--teal)] transition-colors cursor-pointer m-0 p-0"
						title={`Пациент: ${appointmentPatientName}${appointmentDoctor?.fullName ? ` · Врач: ${appointmentDoctor.fullName}` : ""}`}
						onDoubleClick={(e) => {
							e.stopPropagation();
							const pid = appointmentPatient?.id || appointment.patientId;
							if (pid) {
								usePatientStore.getState().setSelectedPatientId(pid);
								if (typeof window !== "undefined") {
									window.location.hash = "#visit";
								}
								if (onOpenVisit) {
									onOpenVisit();
								} else {
									useAppStore.getState().setCurrentView("visit");
								}
								showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
							} else {
								openAppointmentEditor(appointment);
							}
						}}
						onClick={(e) => {
							if (typeof window !== "undefined" && window.innerWidth < 768) {
								e.stopPropagation();
								setIsMobileSheetOpen(true);
							}
						}}
					>
						<span className="truncate block">
							{formatPatientDisplayFio(appointmentPatientName)}
						</span>
					</h3>
					<span className="text-[var(--muted)] opacity-50 shrink-0 select-none">•</span>
					<span
						className="text-xs text-[var(--muted)] truncate flex-1 min-w-0 font-medium"
						title={appointment?.reason || "Осмотр"}
						data-testid="appointment-card-reason"
					>
						{appointment?.reason || "Осмотр"}
					</span>
					{isCito && (
						<span
							className="text-[10px] px-1 py-0.2 rounded bg-rose-600 text-white font-extrabold shrink-0 animate-pulse inline-flex items-center gap-0.5"
							title="Срочный приём (острая боль)"
							data-testid="appointment-cito-badge"
						>
							<Zap size={10} className="shrink-0" aria-hidden="true" />
							<span>СРОЧНО</span>
						</span>
					)}
					{patientBalance !== null && patientBalance < 0 && (
						<span
							className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0 whitespace-nowrap font-bold"
							title={`Задолженность: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`}
							data-testid="appointment-debt-badge"
						>
							Долг: {Math.abs(patientBalance).toLocaleString("ru-RU")} ₽
						</span>
					)}
					{patientBalance !== null && patientBalance > 0 && (
						<span
							className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 whitespace-nowrap font-bold"
							title={`Аванс: ${patientBalance.toLocaleString("ru-RU")} ₽`}
						>
							Аванс
						</span>
					)}
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{displayStatus === "in_treatment" ? (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								const pid = appointmentPatient?.id || appointment.patientId;
								if (pid) {
									usePatientStore.getState().setSelectedPatientId(pid);
								}
								if (typeof window !== "undefined") {
									window.location.hash = "#visit";
								}
								if (onOpenVisit) {
									onOpenVisit();
								} else {
									useAppStore.getState().setCurrentView("visit");
								}
								showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
							}}
							className="h-6 px-1.5 rounded-md bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/40 hover:bg-[var(--teal)] hover:text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-all shrink-0"
							title="Открыть карту приёма пациента (#visit)"
							data-testid="appointment-micro-open-visit-btn"
						>
							<Stethoscope size={11} className="shrink-0" />
							<span className="hidden sm:inline">Приём</span>
						</button>
					) : (displayStatus === "arrived" || displayStatus === "planned" || displayStatus === "confirmed") ? (
						<button
							type="button"
							disabled={isQuickStatusUpdating}
							onClick={(e) => {
								e.stopPropagation();
								void handleQuickStatusChange("in_treatment");
								const pid = appointmentPatient?.id || appointment.patientId;
								if (pid) {
									usePatientStore.getState().setSelectedPatientId(pid);
								}
								if (typeof window !== "undefined") {
									window.location.hash = "#visit";
								}
								if (onOpenVisit) {
									onOpenVisit();
								} else {
									useAppStore.getState().setCurrentView("visit");
								}
								showToast("Пациент в кресле: открыта медицинская карта", "success");
							}}
							className="h-6 px-1.5 rounded-md bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-all shrink-0"
							title="Начать приём в кресле (#visit)"
							data-testid="appointment-micro-start-visit-btn"
						>
							<Stethoscope size={11} className="shrink-0" />
							<span className="hidden sm:inline">В кресло</span>
						</button>
					) : null}
					<AppointmentStatusBadgeSelector
						appointmentId={appointment.id}
						displayStatus={displayStatus}
						appointmentLabels={appointmentLabels}
						isQuickStatusUpdating={isQuickStatusUpdating}
						isLocked={isLockedStatus}
						compactMicro={true}
						onStatusChange={(status) => void handleQuickStatusChange(status)}
					/>
					<AppointmentCardContextMenu
						appointment={appointment}
						dashboard={dashboard}
						appointmentSuggestions={appointmentSuggestions}
						appointmentPatient={appointmentPatient}
						appointmentPatientName={appointmentPatientName}
						appointmentDoctor={appointmentDoctor}
						isQuickStatusUpdating={isQuickStatusUpdating}
						openScheduleSuggestion={openScheduleSuggestion}
						handleShiftAppointmentTime={handleShiftAppointmentTime}
						handleQuickStatusChange={handleQuickStatusChange}
						repeatAppointment={repeatAppointment}
						copyAppointmentToBuffer={copyAppointmentToBuffer}
						openAppointmentEditor={openAppointmentEditor}
					/>
				</div>
			</div>
		);
	}

	if (isTwoLineMode && !appointmentEditing) {
		return (
			/* 2. РЕЖИМ 30–45 МИНУТ: Двухстрочный режим (время + ФИО, снизу процедура и врач) */
			<div
				className="appointment-card-two-line flex flex-col gap-1 min-w-0 max-w-full w-full select-none"
				data-testid="appointment-card-two-line"
				data-density="compact-2line"
			>
				{/* Строка 1: Время + Пациент + Статус + Баланс + Алерты + Действия */}
				<div className="flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full">
					<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
						<div className="appointment-card-time font-semibold text-xs text-[var(--ink)] flex items-center gap-1 shrink-0">
							{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
							<span className="font-normal text-[var(--muted)]">
								{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}
							</span>
						</div>
						<h3
							className="text-xs sm:text-sm font-bold truncate min-w-0 leading-snug cursor-pointer hover:text-[var(--teal)] transition-colors m-0 p-0"
							style={{ color: "var(--ink)" }}
							title={`Пациент: ${appointmentPatientName}${appointmentDoctor?.fullName ? ` · Врач: ${appointmentDoctor.fullName}` : ""}`}
							onDoubleClick={(e) => {
								e.stopPropagation();
								const pid = appointmentPatient?.id || appointment.patientId;
								if (pid) {
									usePatientStore.getState().setSelectedPatientId(pid);
									if (typeof window !== "undefined") {
										window.location.hash = "#visit";
									}
									if (onOpenVisit) {
										onOpenVisit();
									} else {
										useAppStore.getState().setCurrentView("visit");
									}
									showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
								} else {
									openAppointmentEditor(appointment);
								}
							}}
							onClick={(e) => {
								if (typeof window !== "undefined" && window.innerWidth < 768) {
									e.stopPropagation();
									setIsMobileSheetOpen(true);
								}
							}}
						>
							<span className="truncate block min-w-0 max-w-full">
								{formatPatientDisplayFio(appointmentPatientName)}
							</span>
						</h3>
					</div>

					<div className="flex items-center gap-1 shrink-0">
						<AppointmentStatusBadgeSelector
							appointmentId={appointment.id}
							displayStatus={displayStatus}
							appointmentLabels={appointmentLabels}
							isQuickStatusUpdating={isQuickStatusUpdating}
							isLocked={isLockedStatus}
							compactMicro={true}
							onStatusChange={(status) => void handleQuickStatusChange(status)}
						/>
						<AppointmentBalanceBadge balance={patientBalance} />
						<AppointmentAlertBadges
							isCito={isCito}
							collisionMessage={activeScheduleCollision?.message ?? null}
							hasOpenVisit={appointmentHasOpenVisit}
						/>
						<AppointmentCardPrimaryActions
							appointment={appointment}
							displayStatus={displayStatus}
							appointmentEditing={appointmentEditing}
							isQuickStatusUpdating={isQuickStatusUpdating}
							appointmentPatient={appointmentPatient}
							appointmentPatientName={appointmentPatientName}
							onOpenVisit={onOpenVisit}
							handleQuickStatusChange={handleQuickStatusChange}
							handleShiftAppointmentTime={handleShiftAppointmentTime}
							repeatAppointment={repeatAppointment}
							openAppointmentEditor={openAppointmentEditor}
						/>
						<AppointmentCardContextMenu
							appointment={appointment}
							dashboard={dashboard}
							appointmentSuggestions={appointmentSuggestions}
							appointmentPatient={appointmentPatient}
							appointmentPatientName={appointmentPatientName}
							appointmentDoctor={appointmentDoctor}
							isQuickStatusUpdating={isQuickStatusUpdating}
							openScheduleSuggestion={openScheduleSuggestion}
							handleShiftAppointmentTime={handleShiftAppointmentTime}
							handleQuickStatusChange={handleQuickStatusChange}
							repeatAppointment={repeatAppointment}
							copyAppointmentToBuffer={copyAppointmentToBuffer}
							openAppointmentEditor={openAppointmentEditor}
						/>
					</div>
				</div>

				{/* Строка 2: Процедура + Зубы/Аллергия + Врач */}
				<div className="flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full text-xs pt-0.5 border-t border-[var(--line)]/50">
					<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
						<span
							className="text-xs text-[var(--muted)] font-medium truncate shrink-0 max-w-[180px]"
							title={appointment?.reason || "Консультация"}
						>
							{appointment?.reason || "Консультация"}
						</span>
						<AppointmentMedicalBadges
							cardTeeth={cardTeeth}
							allergyAlert={allergyAlert}
							somaticAlert={somaticAlert}
						/>
					</div>

					{appointmentDoctor?.fullName && (
						<div className="flex items-center gap-1 text-[11px] text-[var(--muted)] font-medium shrink-0 ml-auto truncate max-w-[140px]" title={`Врач: ${appointmentDoctor.fullName}`}>
							<span className="truncate">
								{formatDoctorShortName(appointmentDoctor.fullName)}
							</span>
						</div>
					)}
				</div>
			</div>
		);
	}

	/* 3. РЕЖИМ 60+ МИНУТ: Полноценный развернутый блок */
	return (
		<div
			className="appointment-card-expanded flex flex-col gap-1.5 min-w-0 max-w-full w-full"
			data-testid="appointment-card-expanded"
			data-density="expanded"
		>
			<div className="appointment-card-header border-b border-[var(--line)] pb-2 mb-1 flex justify-between items-center gap-2 min-w-0 flex-wrap">
				<div className="appointment-card-time font-semibold text-sm text-[var(--ink)] flex items-center gap-2 shrink-0">
					{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
					<span className="font-normal text-[var(--muted)]">
						{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}
					</span>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					{!appointmentEditing && (
						<AppointmentStatusBadgeSelector
							appointmentId={appointment.id}
							displayStatus={displayStatus}
							appointmentLabels={appointmentLabels}
							isQuickStatusUpdating={isQuickStatusUpdating}
							isLocked={isLockedStatus}
							onStatusChange={(status) => void handleQuickStatusChange(status)}
						/>
					)}
					<AppointmentBalanceBadge balance={patientBalance} />
					<AppointmentAlertBadges
						isCito={isCito}
						collisionMessage={activeScheduleCollision?.message ?? null}
						hasOpenVisit={appointmentHasOpenVisit}
					/>
					<AppointmentCardPrimaryActions
						appointment={appointment}
						displayStatus={displayStatus}
						appointmentEditing={appointmentEditing}
						isQuickStatusUpdating={isQuickStatusUpdating}
						appointmentPatient={appointmentPatient}
						appointmentPatientName={appointmentPatientName}
						onOpenVisit={onOpenVisit}
						handleQuickStatusChange={handleQuickStatusChange}
						handleShiftAppointmentTime={handleShiftAppointmentTime}
						repeatAppointment={repeatAppointment}
						openAppointmentEditor={openAppointmentEditor}
					/>
					<AppointmentCardContextMenu
						appointment={appointment}
						dashboard={dashboard}
						appointmentSuggestions={appointmentSuggestions}
						appointmentPatient={appointmentPatient}
						appointmentPatientName={appointmentPatientName}
						appointmentDoctor={appointmentDoctor}
						isQuickStatusUpdating={isQuickStatusUpdating}
						openScheduleSuggestion={openScheduleSuggestion}
						handleShiftAppointmentTime={handleShiftAppointmentTime}
						handleQuickStatusChange={handleQuickStatusChange}
						repeatAppointment={repeatAppointment}
						copyAppointmentToBuffer={copyAppointmentToBuffer}
						openAppointmentEditor={openAppointmentEditor}
					/>
				</div>
			</div>

			<div className="appointment-card-body min-w-0 max-w-full">
				<h3
					className="text-base font-semibold truncate min-w-0 max-w-full leading-snug cursor-pointer hover:text-[var(--teal)] transition-colors"
					style={{ color: "var(--ink)", minWidth: 0, maxWidth: "100%" }}
					title={`Пациент: ${appointmentPatientName}${appointmentDoctor?.fullName ? ` · Врач: ${appointmentDoctor.fullName}` : ""}${appointmentChair?.name ? ` · Кресло: ${appointmentChair.name}` : ""}`}
					onDoubleClick={(e) => {
						e.stopPropagation();
						if (appointmentPatient?.id) {
							usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							if (onOpenVisit) {
								onOpenVisit();
							} else {
								useAppStore.getState().setCurrentView("visit");
							}
							showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
						} else {
							openAppointmentEditor(appointment);
						}
					}}
					onClick={(e) => {
						if (typeof window !== "undefined" && window.innerWidth < 768) {
							e.stopPropagation();
							setIsMobileSheetOpen(true);
						}
					}}
				>
					<span className="truncate block min-w-0 max-w-full">
						{formatPatientDisplayFio(appointmentPatientName)}
					</span>
				</h3>
				<div className="flex items-center gap-1.5 min-w-0 max-w-full mt-0.5 flex-wrap">
					<span
						className="chip chip-reason text-xs font-medium text-[var(--muted)] max-w-full min-w-0 inline-flex items-center justify-start text-left"
						title={appointment?.reason || "Консультация"}
					>
						<span className="truncate block min-w-0">
							{appointment?.reason || "Консультация"}
						</span>
					</span>
					<AppointmentMedicalBadges
						cardTeeth={cardTeeth}
						allergyAlert={allergyAlert}
						somaticAlert={somaticAlert}
					/>
				</div>
			</div>
		</div>
	);
}
