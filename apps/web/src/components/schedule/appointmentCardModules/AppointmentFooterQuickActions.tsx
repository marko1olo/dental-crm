import { CreditCard, FileText, Phone, UserCheck } from "lucide-react";
import type React from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import type { AppointmentQuickActionsMenuProps } from "./appointmentCardTypes";
import { triggerAppointmentCheckout } from "./appointmentCheckoutHelper";

export const AppointmentFooterQuickActions: React.FC<
	AppointmentQuickActionsMenuProps
> = (props) => {
	const { appointment: a, pName, patObj, docObj, onQuickStatusChange } = props;

	const handleCheckoutClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		triggerAppointmentCheckout(a, pName, patObj?.phone, patObj?.id);
	};

	const handleOpenVisitClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		const patientId = a.patientId || patObj?.id;
		if (patientId) usePatientStore.getState().setSelectedPatientId(patientId);
		if (a.status !== "in_treatment" && a.status !== "completed") {
			if (onQuickStatusChange) onQuickStatusChange(a.id, "in_treatment");
		}
		useAppStore.getState().setCurrentView("visit");
		if (typeof window !== "undefined") window.location.hash = "#visit";
		showToast(`Открыт приём: ${pName}`, "info");
	};

	return (
		<div
			className="appointment-card-row-footer flex items-center justify-between gap-1.5 w-full min-w-0 pt-1 border-t border-[var(--line)]/50 mt-auto"
			data-testid={`appointment-card-footer-${a.id}`}
		>
			<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-medium min-w-0 flex-1 overflow-hidden">
				{docObj && (
					<span
						className="truncate flex items-center gap-1 text-[var(--ink)] opacity-90 shrink-0 max-w-[150px]"
						title={`Врач: ${docObj.fullName}`}
					>
						<UserCheck
							size={11}
							className="shrink-0 text-[var(--teal)] opacity-70"
						/>
						<span className="truncate whitespace-nowrap">
							{formatDoctorShortName(docObj.fullName)}
						</span>
					</span>
				)}
				{patObj?.phone ? (
					<span
						className="hidden 2xl:inline-flex items-center gap-1 text-[var(--muted)] shrink-0 whitespace-nowrap"
						title={`Телефон: ${patObj.phone}`}
					>
						<Phone size={10} className="shrink-0 opacity-70" />
						<span className="whitespace-nowrap font-mono text-[10.5px]">
							{patObj.phone}
						</span>
					</span>
				) : null}
			</div>

			{a.status === "completed" ? (
				<button
					type="button"
					onClick={handleCheckoutClick}
					className="primary-button appointment-action-pay h-[24px] min-h-[24px] px-2.5 py-0.5 rounded-lg border border-violet-400/50 bg-violet-500/15 hover:bg-violet-500/25 text-violet-950 dark:text-violet-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 shadow-2xs active:scale-95 touch-manipulation"
					title={`К оплате на кассе: ${pName}`}
					aria-label={`К оплате на кассе ${pName}`}
					data-testid={`appointment-action-pay-${a.id}`}
				>
					<CreditCard
						size={11}
						className="shrink-0 text-violet-600 dark:text-violet-400"
					/>
					<span className="appointment-action-label whitespace-nowrap">
						К оплате
					</span>
				</button>
			) : (
				<button
					type="button"
					onClick={handleOpenVisitClick}
					className="primary-button appointment-action-visit h-[24px] min-h-[24px] px-2.5 py-0.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal)]/15 hover:bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] dark:text-teal-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 shadow-2xs active:scale-95 touch-manipulation"
					title={`Открыть приём: ${pName}`}
					aria-label={`Открыть приём ${pName}`}
					data-testid={`appointment-action-start-${a.id}`}
				>
					<FileText size={11} className="shrink-0 text-[var(--teal)]" />
					<span className="appointment-action-label whitespace-nowrap">
						В приём →
					</span>
				</button>
			)}
		</div>
	);
};
