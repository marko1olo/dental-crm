import type { Appointment, Dashboard } from "@dental/shared";
import {
	AlertTriangle,
	Armchair,
	ChevronRight as ChevronRightIcon,
	Clock,
	CreditCard,
	Phone,
	Plus,
	Stethoscope,
	User,
} from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { openVisitWithBackendSync } from "../appointmentCardActions/visitSyncHelper";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import {
	extractToothBadge,
	getStatusTheme,
	resolveMobileAllergyBadge,
	type StatusTheme,
	type TimelineItem,
} from "./scheduleMobileAgendaTypes";

export interface ScheduleMobileTimelineRowProps {
	item: TimelineItem;
	effectiveDateKey: string;
	selectedDoctorId: string | null;
	selectedChairId: string | null;
	dashboard: Dashboard;
	patientName: (patients: any[], id: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
	onSelectMobileAppt: (appt: Appointment) => void;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

/**
 * ScheduleMobileTimelineRow — Canonical SSOT for Mobile Agenda Timeline Rows.
 * Conforms to Apple iOS HIG: 44x44px touch targets, Natural Thumb Zone,
 * 1-tap call button, 1-tap chair/visit/checkout actions, and 0px horizontal drift.
 */
export const ScheduleMobileTimelineRow: React.FC<
	ScheduleMobileTimelineRowProps
> = ({
	item,
	effectiveDateKey,
	selectedDoctorId,
	selectedChairId,
	dashboard,
	patientName,
	appointmentLabels,
	onSlotClick,
	onSelectMobileAppt,
	onQuickStatusChange,
	onOpenVisit,
}) => {
	if (item.type === "gap") {
		return (
			<div
				className="schedule-mobile-gap-row min-h-[44px] border border-dashed border-[var(--teal,#0d9488)]/40 hover:border-[var(--teal,#0d9488)] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] select-none"
				onClick={() => {
					if (onSlotClick) {
						onSlotClick({
							dateKey: effectiveDateKey,
							startsAt: item.startsAt,
							endsAt: item.endsAt,
							doctorUserId: selectedDoctorId || null,
							chairId: selectedChairId || null,
							durationMinutes: item.durationMinutes,
						});
					}
				}}
				role="button"
				tabIndex={0}
				aria-label={`Свободное окно: ${item.durationMinutes} мин с ${item.startsAtLocal} до ${item.endsAtLocal}`}
			>
				<div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
					<Clock size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>
						Свободно ({item.durationMinutes} мин) · {item.startsAtLocal} –{" "}
						{item.endsAtLocal}
					</span>
				</div>
				<span className="text-[var(--teal,#0d9488)] font-bold text-xs flex items-center gap-1 min-h-[44px] min-w-[44px] items-center justify-center">
					<Plus size={15} /> Записать
				</span>
			</div>
		);
	}

	const appt = item.appointment;
	const pat = dashboard?.patients?.find((p: any) => p.id === appt.patientId);
	const fullPatientName = patientName(
		dashboard?.patients ?? [],
		appt.patientId,
	);
	const pName = formatPatientDisplayFio(fullPatientName);
	const doc = dashboard?.clinicSettings?.staff?.find(
		(s: any) => s.id === appt.doctorUserId,
	);
	const chair = dashboard?.clinicSettings?.chairs?.find(
		(c: any) => c.id === appt.chairId,
	);
	const statusTheme: StatusTheme = getStatusTheme(
		appt.status,
		appointmentLabels,
	);
	const toothBadge = extractToothBadge(appt);
	const allergyText = resolveMobileAllergyBadge(appt, pat);
	const rawBal = pat?.balanceRub ?? (pat as any)?.balance;
	const balance =
		rawBal !== undefined &&
		rawBal !== null &&
		rawBal !== "" &&
		Number.isFinite(Number(rawBal))
			? Number(rawBal)
			: null;
	const patientPhone = pat?.phone || (appt as any)?.patientPhone || null;

	const handleStartTreatment = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onQuickStatusChange) onQuickStatusChange(appt.id, "in_treatment");
		await openVisitWithBackendSync(
			appt,
			pat,
			onOpenVisit ? () => onOpenVisit(appt) : undefined,
		);
		showToast(`Пациент «${pName}» в кресле: открыта медкарта`, "success");
	};

	const handleOpenActiveVisit = async (e: React.MouseEvent) => {
		e.stopPropagation();
		await openVisitWithBackendSync(
			appt,
			pat,
			onOpenVisit ? () => onOpenVisit(appt) : undefined,
		);
	};

	const handleOpenCheckout = (e: React.MouseEvent) => {
		e.stopPropagation();
		const pid = pat?.id || appt.patientId;
		if (pid) usePatientStore.getState().setSelectedPatientId(pid);
		window.dispatchEvent(
			new CustomEvent("dente:open-payment-modal", {
				detail: { patientId: pid, patientName: pName, amountRub: 15400 },
			}),
		);
	};

	return (
		<div className="schedule-mobile-appt-row flex gap-2 items-start w-full min-w-0 max-w-full">
			{/* Left Time Column (Prominent 09:30 - 10:30) */}
			<div className="schedule-mobile-time-col flex flex-col items-center justify-start shrink-0 w-12 pt-1 font-mono">
				<span className="text-[13px] font-bold text-[var(--ink)] leading-none">
					{item.startsAtLocal}
				</span>
				<span className="text-[10px] font-medium text-[var(--muted)] mt-1 opacity-70 leading-none">
					{item.endsAtLocal}
				</span>
			</div>

			{/* Main Visit Card */}
			<div
				className="schedule-mobile-card flex-1 min-w-0 bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-2.5 relative overflow-hidden shadow-xs cursor-pointer active:scale-[0.99] transition-all"
				data-testid="schedule-mobile-appt-card"
				onClick={() => onSelectMobileAppt(appt)}
				role="button"
				tabIndex={0}
				aria-label={`Приём: ${fullPatientName}, ${item.startsAtLocal}, статус: ${statusTheme.label}`}
			>
				{/* 4px Status Stripe */}
				<div
					className={`schedule-mobile-status-stripe absolute top-0 left-0 bottom-0 w-1 ${statusTheme.stripe} rounded-l-2xl`}
				/>

				<div
					className="schedule-mobile-card-content flex flex-col gap-1.5 pl-1.5 min-w-0 flex-1"
					data-testid={`appointment-card-clickable-${appt.id}`}
				>
					{/* Header: Patient Name + Tooth Badge + Status Badge */}
					<div className="schedule-mobile-card-header flex items-center justify-between gap-1.5 min-w-0">
						<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
							<span
								className="text-[14px] font-semibold text-[var(--ink)] truncate"
								title={fullPatientName}
							>
								{pName}
							</span>
							{toothBadge && (
								<span className="schedule-mobile-tooth-badge px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
									{toothBadge}
								</span>
							)}
						</div>

						<div className="flex items-center gap-1 shrink-0">
							<span
								className={`schedule-mobile-status-badge text-[11px] font-bold px-2 py-0.5 rounded-lg ${statusTheme.badgeBg} whitespace-nowrap`}
							>
								{statusTheme.label}
							</span>
							<ChevronRightIcon
								size={16}
								className="text-[var(--muted)] opacity-60 shrink-0"
							/>
						</div>
					</div>

					{/* Procedure / Reason */}
					<div className="text-[12px] text-[var(--muted)] font-normal truncate min-w-0">
						{appt.reason || "Первичный осмотр / консультация"}
					</div>

					{/* Footer: Metadata chips & Touch CTAs */}
					<div className="schedule-mobile-card-footer flex items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/50 mt-1 min-w-0 flex-wrap">
						{/* Meta Chips: Doctor, Chair, Balance, Allergy */}
						<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] min-w-0 flex-1 flex-wrap">
							{doc && (
								<span className="flex items-center gap-1 truncate max-w-[130px]">
									<User size={11} className="shrink-0 text-[var(--teal,#0d9488)]" />
									<span className="truncate">{formatDoctorShortName(doc.fullName)}</span>
								</span>
							)}
							{chair && (
								<span className="flex items-center gap-1 shrink-0">
									<Armchair size={11} className="shrink-0 text-[var(--muted)]" />
									<span className="truncate">{chair.name}</span>
								</span>
							)}
							{balance !== null && balance !== 0 && (
								<span
									className={`font-mono font-bold text-[10px] px-1 py-0.2 rounded ${
										balance > 0
											? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
											: "text-rose-700 dark:text-rose-300 bg-rose-500/10"
									}`}
								>
									{balance > 0 ? `+${balance.toLocaleString("ru-RU")} ₽` : `${balance.toLocaleString("ru-RU")} ₽`}
								</span>
							)}
							{allergyText && (
								<span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold text-[10px] shrink-0">
									<AlertTriangle size={10} /> {allergyText}
								</span>
							)}
						</div>

						{/* 1-Tap Touch Actions: Call Button + Status Transition CTA */}
						<div className="flex items-center gap-1.5 shrink-0 ml-auto">
							{patientPhone && (
								<a
									href={`tel:${patientPhone.replace(/[^\d+]/g, "")}`}
									onClick={(e) => e.stopPropagation()}
									className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center hover:bg-[var(--paper-hover)] active:scale-95 transition-all"
									title={`Позвонить пациенту: ${patientPhone}`}
									aria-label={`Позвонить пациенту ${pName}`}
								>
									<Phone size={15} className="text-[var(--teal,#0d9488)]" />
								</a>
							)}

							{appt.status === "in_treatment" ? (
								<button
									type="button"
									className="schedule-mobile-chair-action-btn btn-active-visit min-h-[44px] px-3 rounded-xl bg-[var(--teal,#0d9488)]/15 border border-[var(--teal,#0d9488)]/40 text-[var(--teal,#0d9488)] font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
									onClick={handleOpenActiveVisit}
									title="Открыть карту приёма"
									data-testid={`mobile-chair-btn-${appt.id}`}
								>
									<Stethoscope size={15} />
									<span>В приём</span>
								</button>
							) : appt.status === "completed" ? (
								<button
									type="button"
									className="schedule-mobile-chair-action-btn btn-pay min-h-[44px] px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
									onClick={handleOpenCheckout}
									title="Принять оплату / Касса"
									data-testid={`mobile-pay-btn-${appt.id}`}
								>
									<CreditCard size={15} />
									<span>Чек</span>
								</button>
							) : (
								<button
									type="button"
									className="schedule-mobile-chair-action-btn btn-chair min-h-[44px] px-3 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
									onClick={handleStartTreatment}
									title="Пациент в кресле (Начать приём)"
									data-testid={`mobile-chair-btn-${appt.id}`}
								>
									<Stethoscope size={15} />
									<span>В кресло</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
