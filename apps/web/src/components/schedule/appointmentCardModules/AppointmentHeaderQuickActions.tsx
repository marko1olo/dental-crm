import { MoreVertical } from "lucide-react";
import type React from "react";
import { GridAppointmentMenu } from "../GridAppointmentMenu";
import { GridAppointmentQuickActions } from "../GridAppointmentQuickActions";
import type { AppointmentQuickActionsMenuProps } from "./appointmentCardTypes";

export const AppointmentHeaderQuickActions: React.FC<
	AppointmentQuickActionsMenuProps
> = (props) => {
	const {
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

	return (
		<div className="flex items-center gap-1 shrink-0">
			{/* 1-Click Stage Transitions */}
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
					className="icon-button secondary-button appointment-action-more h-[22px] w-[22px] min-h-[22px] min-w-[22px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none shrink-0 touch-manipulation relative before:absolute before:-inset-2 before:content-[''] before:z-10 sm:before:hidden"
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
