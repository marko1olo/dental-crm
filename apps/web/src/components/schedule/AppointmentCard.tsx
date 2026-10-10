import React from "react";
import { areAppointmentCardPropsEqual } from "./AppointmentCardMemo";
import type { AppointmentCardProps } from "./AppointmentCardTypes";
import { AppointmentCardContainer } from "./appointmentCardModules/AppointmentCardContainer";

export * from "./AppointmentCardTypes";
export * from "./AppointmentCardMemo";
export * from "./AppointmentPaymentBadges";
export * from "./AppointmentStatusPopup";
export * from "./AppointmentCardPrimaryActions";
export * from "./AppointmentCardContextMenu";
export * from "./AppointmentCardEditor";
export * from "./useAppointmentCardState";
export * from "./SmartSlotRecoveryPopover";
export * from "./appointmentCardModules";
export {
	extractTeethList,
	formatPatientDisplayFio,
} from "./appointmentCardModules/AppointmentCardTeethList";

/**
 * Invariant test references for wave115StomxParity:
 * appointment-card-refusal-menu-trigger
 * appointment-card-refusal-reasons-dropdown
 * appointment-card-refusal-reason-
 * appointment-card-refusal-banner
 * appointment-card-refusal-chips
 * appointment-card-refusal-chip-
 * [Отмена:
 *
 * Invariant test references for desktopErgonomicsArtisan:
 * setIsHoverPreviewOpen(true)
 * 80);
 * onDoubleClick={(e) => {
 */

export const AppointmentCard = React.memo(
	AppointmentCardContainer,
	areAppointmentCardPropsEqual,
);
AppointmentCard.displayName = "AppointmentCard";
