import React from "react";
import { CreditCard, FileText, MoreVertical, Phone, UserCheck } from "lucide-react";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import { showToast } from "../../GlobalToast";
import { GridAppointmentMenu } from "../GridAppointmentMenu";
import { GridAppointmentQuickActions } from "../GridAppointmentQuickActions";
import type { AppointmentQuickActionsMenuProps } from "./appointmentCardTypes";

export interface QuickActionsProps extends AppointmentQuickActionsMenuProps {
	variant?: "header" | "footer";
}

export const AppointmentQuickActionsMenu: React.FC<QuickActionsProps> = (props) => {
	const {
		variant = "header",
		appointment: a,
		pName,
		patObj,
		docObj,
		effectiveChairs,
		doctors,
		dashboard,
		isHovered,
		isMenuOpen,
		onAppointmentClick,
		onToggleMenu,
		onCloseMenu,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onReassignChair,
		onReassignDoctor,
		onFreeSlotToWaitlist,
	} = props;

	const handleCheckoutClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		const patientId = patObj?.id || a.patientId;
		if (patientId) usePatientStore.getState().setSelectedPatientId(patientId);
		const rawPrice =
			(a as any).priceRub ?? (a as any).amountRub ?? (a as any).totalRub;
		const resolvedPriceRub =
			rawPrice !== null &&
			rawPrice !== undefined &&
			String(rawPrice).trim() !== "" &&
			Number.isFinite(Number(rawPrice))
				? Math.max(0, Number(rawPrice))
				: 2500;
		const pendingCheckout = {
			patientId: patientId || "",
			patientName: pName,
			patientPhone: patObj?.phone || "",
			visitId: a.id,
			services: [
				{
					name:
						(a as any).serviceTitle ||
						(a as any).comment ||
						"Стоматологический приём",
					priceRub: resolvedPriceRub,
					quantity: 1,
					totalRub: resolvedPriceRub,
				},
			],
			totalDueRub: resolvedPriceRub,
			receiptNumber: `REC-${Date.now().toString().slice(-5)}`,
			timestamp: Date.now(),
			autoOpen: true,
		};
		try {
			sessionStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
			localStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
		} catch (err) {
			console.warn("[AppointmentQuickActionsMenu] Checkout write error:", err);
		}
		useAppStore.getState().setCurrentView("finance");
		if (typeof window !== "undefined") {
			window.location.hash = "#finance";
			window.dispatchEvent(new CustomEvent("dente:pending-checkout-ready"));
		}
		showToast(`Касса: оплата визита ${pName}`, "info");
	};

	const handleOpenVisitClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (a.patientId) usePatientStore.getState().setSelectedPatientId(a.patientId);
		useAppStore.getState().setCurrentView("visit");
		if (typeof window !== "undefined") window.location.hash = "#visit";
		showToast(`Открыт приём: ${pName}`, "info");
	};

	if (variant === "footer") {
		return (
			<div
				className="appointment-card-row-footer flex items-center justify-between gap-1.5 w-full min-w-0 pt-1 border-t border-[var(--line)]/50 mt-auto"
				data-testid={`appointment-card-footer-${a.id}`}
			>
				{/* Doctor name & Phone */}
				<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-medium min-w-0 flex-1 overflow-hidden">
					{docObj && (
						<span
							className="truncate flex items-center gap-1 text-[var(--ink)] opacity-90 shrink-0 max-w-[150px]"
							title={`Врач: ${docObj.fullName}`}
						>
							<UserCheck size={11} className="shrink-0 text-[var(--teal)] opacity-70" />
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

				{/* Smart Contextual Action Button [В приём →] vs [К оплате] */}
				{a.status === "completed" ? (
					<button
						type="button"
						onClick={handleCheckoutClick}
						className="appointment-action-pay h-[24px] min-h-[24px] px-2.5 py-0.5 rounded-lg border border-violet-400/50 bg-violet-500/15 hover:bg-violet-500/25 text-violet-950 dark:text-violet-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 shadow-2xs active:scale-95 touch-manipulation"
						title={`К оплате на кассе: ${pName}`}
						aria-label={`К оплате на кассе ${pName}`}
						data-testid={`appointment-action-pay-${a.id}`}
					>
						<CreditCard size={11} className="shrink-0 text-violet-600 dark:text-violet-400" />
						<span className="appointment-action-label whitespace-nowrap">К оплате</span>
					</button>
				) : (
					<button
						type="button"
						onClick={handleOpenVisitClick}
						className="appointment-action-visit h-[24px] min-h-[24px] px-2.5 py-0.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal)]/15 hover:bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] dark:text-teal-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 shadow-2xs active:scale-95 touch-manipulation"
						title={`Открыть приём: ${pName}`}
						aria-label={`Открыть приём ${pName}`}
						data-testid={`appointment-action-start-${a.id}`}
					>
						<FileText size={11} className="shrink-0 text-[var(--teal)]" />
						<span className="appointment-action-label whitespace-nowrap">В приём →</span>
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1 shrink-0">
			{/* DentalPRO 1-Click Stage Transitions */}
			{onQuickStatusChange && (
				<GridAppointmentQuickActions
					appointment={a}
					pName={pName}
					patObj={patObj}
					isHovered={isHovered}
					onQuickStatusChange={onQuickStatusChange}
				/>
			)}

			{/* Actions menu trigger */}
			<div className="relative shrink-0">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggleMenu(a.id);
					}}
					className="appointment-action-more h-[22px] w-[22px] min-h-[22px] min-w-[22px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none shrink-0 touch-manipulation relative before:absolute before:-inset-2 before:content-[''] before:z-10 sm:before:hidden"
					title="Все действия визита"
					aria-label="Дополнительные действия визита"
					aria-expanded={isMenuOpen}
				>
					<MoreVertical size={11} />
				</button>
				<GridAppointmentMenu
					appointment={a}
					pName={pName}
					patObj={patObj}
					docObj={docObj}
					effectiveChairs={effectiveChairs}
					doctors={doctors}
					dashboard={dashboard}
					isMenuOpen={isMenuOpen}
					onAppointmentClick={onAppointmentClick}
					onCloseMenu={onCloseMenu}
					onQuickStatusChange={onQuickStatusChange}
					onAdjustDuration={onAdjustDuration}
					onShiftLateness={onShiftLateness}
					onReassignChair={onReassignChair}
					onReassignDoctor={onReassignDoctor}
					onFreeSlotToWaitlist={onFreeSlotToWaitlist}
				/>
			</div>
		</div>
	);
};
