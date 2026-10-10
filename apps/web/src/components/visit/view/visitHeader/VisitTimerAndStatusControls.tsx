import React from "react";
import { CalendarCheck, CheckCircle2, UserCheck } from "lucide-react";
import { VisitTimer } from "../../VisitTimer";
import { DoctorShiftEarningsWidget } from "../../../doctor/DoctorShiftEarningsWidget";
import { SoftPresenceIndicator } from "../../../presence/SoftPresenceIndicator";
import { usePatientStore } from "../../../../store/patientStore";
import { useAppStore } from "../../../../store/appStore";
import { showToast } from "../../../GlobalToast";
import type { SoftPeerPresence } from "../../../../hooks/useSoftPresence";
import type { ShiftDayQueue } from "./types";

export interface VisitShiftQueueControlsProps {
	shiftDayQueue: ShiftDayQueue;
	isQueueLobbyDropdownOpen: boolean;
	setIsQueueLobbyDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
	queueLobbyDropdownRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * 3-Стадийная оперативная очередь смены StomX / DENTE
 * [ Ожидает в холле | На приёме в кресле | Готов к оплате в кассе ]
 */
export function VisitShiftQueueControls({
	shiftDayQueue,
	isQueueLobbyDropdownOpen,
	setIsQueueLobbyDropdownOpen,
	queueLobbyDropdownRef,
}: VisitShiftQueueControlsProps) {
	return (
		<div
			className="!hidden xl:!inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0 text-xs font-semibold select-none relative"
			data-testid="visit-shift-queue-tabs"
			ref={queueLobbyDropdownRef as any}
			role="group"
			aria-label="Оперативная очередь смены врача"
		>
			{/* Вкладка 1: Ожидающие в холле */}
			<button
				type="button"
				onClick={() => {
					if (shiftDayQueue.arrived > 0) {
						setIsQueueLobbyDropdownOpen((prev) => !prev);
					} else {
						showToast("В холле клиники сейчас нет ожидающих пациентов", "info");
					}
				}}
				className={`min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
					shiftDayQueue.arrived > 0
						? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/25"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="visit-queue-tab-arrived"
				title={`Ожидает приёма: ${shiftDayQueue.arrived} пациентов в холле клиники`}
				aria-label={`Ожидает приёма: ${shiftDayQueue.arrived}`}
			>
				<UserCheck
					size={12}
					className="shrink-0 text-amber-600 dark:text-amber-400"
				/>
				<span className="text-[11px] whitespace-nowrap">Ожидает</span>
				<span
					data-testid="visit-queue-count-arrived"
					className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white"
				>
					{shiftDayQueue.arrived}
				</span>
			</button>

			{/* Popover для вызова ожидающего пациента */}
			{isQueueLobbyDropdownOpen && shiftDayQueue.arrivedPatients.length > 0 && (
				<div
					className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl p-2 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
					role="menu"
				>
					<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1 flex justify-between">
						<span>Ожидают в холле ({shiftDayQueue.arrived})</span>
					</div>
					{shiftDayQueue.arrivedPatients.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => {
								setIsQueueLobbyDropdownOpen(false);
								if (p.patientId) {
									usePatientStore.getState().setSelectedPatientId(p.patientId);
								}
								showToast(`Вызов в кресло: ${p.name}`, "success");
							}}
							className="w-full text-left p-1.5 rounded-lg hover:bg-[var(--teal-soft)] border border-transparent hover:border-[var(--teal)]/30 flex items-center justify-between transition-colors cursor-pointer"
							title="Принять в кресло"
						>
							<span className="font-bold text-xs truncate">{p.name}</span>
							<span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
								{p.time}
							</span>
						</button>
					))}
				</div>
			)}

			{/* Вкладка 2: В кресле на приёме */}
			<span
				className="min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 bg-[var(--teal,var(--brand-primary))] text-white font-bold text-[11px] shadow-2xs"
				data-testid="visit-queue-tab-in-treatment"
				title="Текущий пациент на приёме в кресле прямо сейчас"
			>
				<CalendarCheck size={12} className="shrink-0" />
				<span>На приёме</span>
				<span
					data-testid="visit-queue-count-in-treatment"
					className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/30 text-white"
				>
					{shiftDayQueue.inTreatment > 0 ? shiftDayQueue.inTreatment : 1}
				</span>
			</span>

			{/* Вкладка 3: Готов к оплате */}
			<button
				type="button"
				onClick={() => {
					useAppStore.getState().setCurrentView("finance");
					showToast("Переход в кассу для оформления чека", "info");
				}}
				className={`min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
					shiftDayQueue.awaitingPayment > 0
						? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="visit-queue-tab-completed"
				title={`Ожидает оплаты: ${shiftDayQueue.awaitingPayment} (приём завершён, готов к оплате)`}
			>
				<CheckCircle2
					size={12}
					className="shrink-0 text-[var(--teal,#0d9488)]"
				/>
				<span className="text-[11px] whitespace-nowrap">Оплата</span>
				<span
					data-testid="visit-queue-count-completed"
					className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--teal,#0d9488)] text-white"
				>
					{shiftDayQueue.awaitingPayment}
				</span>
			</button>
		</div>
	);
}

export interface VisitTimerAndPresenceControlsProps {
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	activePeers?: readonly SoftPeerPresence[] | undefined;
	summaryText?: string | null | undefined;
}

/**
 * Секундомер визита, виджет выработки смены врача и индикатор мягкого присутствия
 */
export function VisitTimerAndPresenceControls({
	activeAppointment,
	activeDoctor,
	activePeers = [],
	summaryText = null,
}: VisitTimerAndPresenceControlsProps) {
	const appointmentStartTime =
		activeAppointment?.startTime ||
		activeAppointment?.startAt ||
		activeAppointment?.createdAt ||
		null;

	const doctorId = activeDoctor?.id || activeDoctor?.userId || "doc-1";
	const doctorName = activeDoctor?.fullName || activeDoctor?.name || "Лечащий врач";

	return (
		<>
			<span className="hidden sm:inline-flex shrink-0">
				<VisitTimer createdAt={appointmentStartTime} />
			</span>
			<span className="hidden md:inline-flex shrink-0">
				<DoctorShiftEarningsWidget
					doctorId={doctorId}
					doctorName={doctorName}
				/>
			</span>
			<SoftPresenceIndicator
				activePeers={activePeers}
				summaryText={summaryText}
			/>
		</>
	);
}

/**
 * Объединенный компонент таймера и статусов смены
 */
export function VisitTimerAndStatusControls(
	props: VisitTimerAndPresenceControlsProps & VisitShiftQueueControlsProps,
) {
	return (
		<>
			<VisitTimerAndPresenceControls
				activeAppointment={props.activeAppointment}
				activeDoctor={props.activeDoctor}
				activePeers={props.activePeers}
				summaryText={props.summaryText}
			/>
			<VisitShiftQueueControls
				shiftDayQueue={props.shiftDayQueue}
				isQueueLobbyDropdownOpen={props.isQueueLobbyDropdownOpen}
				setIsQueueLobbyDropdownOpen={props.setIsQueueLobbyDropdownOpen}
				queueLobbyDropdownRef={props.queueLobbyDropdownRef}
			/>
		</>
	);
}
